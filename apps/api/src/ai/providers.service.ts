import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from '@prisma/client';
import { CryptoService } from '../common/crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { completeChat } from './openai-compatible.provider';
import {
  CreateProviderDto,
  FallbackDto,
  UpdateProviderDto,
  assertBaseUrl,
} from './dto';

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
  ) {}

  async list(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fallbackProviderId: true },
    });
    const providers = await this.prisma.aiProvider.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return providers.map((provider) =>
      this.present(provider, provider.id === user?.fallbackProviderId),
    );
  }

  async create(userId: string, dto: CreateProviderDto) {
    this.assertMockAllowed(dto.providerType);
    const count = await this.prisma.aiProvider.count({ where: { userId } });
    const provider = await this.prisma.aiProvider.create({
      data: {
        userId,
        name: dto.name.trim(),
        providerType: dto.providerType,
        baseUrl: this.baseUrl(dto.baseUrl, dto.providerType),
        apiKeyCipher: this.crypto.encrypt(dto.apiKey),
        apiKeyLastFour: dto.apiKey.slice(-4),
        model: dto.model.trim(),
        enabled: dto.enabled ?? true,
        isDefault: count === 0,
      },
    });
    return this.present(provider, false);
  }

  async update(userId: string, id: string, dto: UpdateProviderDto) {
    const existing = await this.require(userId, id);
    const provider = await this.prisma.aiProvider.update({
      where: { id: existing.id },
      data: {
        name: dto.name?.trim(),
        baseUrl: dto.baseUrl
          ? this.baseUrl(dto.baseUrl, existing.providerType)
          : undefined,
        model: dto.model?.trim(),
        enabled: dto.enabled,
        ...(dto.apiKey
          ? {
              apiKeyCipher: this.crypto.encrypt(dto.apiKey),
              apiKeyLastFour: dto.apiKey.slice(-4),
            }
          : {}),
      },
    });
    return this.present(provider, false);
  }

  async remove(userId: string, id: string) {
    const existing = await this.require(userId, id);
    await this.prisma.user.updateMany({
      where: { id: userId, fallbackProviderId: existing.id },
      data: { fallbackProviderId: null },
    });
    await this.prisma.aiProvider.delete({ where: { id: existing.id } });
    if (existing.isDefault) {
      const next = await this.prisma.aiProvider.findFirst({
        where: { userId, enabled: true },
        orderBy: { createdAt: 'asc' },
      });
      if (next) {
        await this.prisma.aiProvider.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
    return { ok: true };
  }

  async makeDefault(userId: string, id: string) {
    const existing = await this.require(userId, id);
    await this.prisma.$transaction([
      this.prisma.aiProvider.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      this.prisma.aiProvider.update({
        where: { id: existing.id },
        data: { isDefault: true, enabled: true },
      }),
    ]);
    return { ok: true };
  }

  async setFallback(userId: string, dto: FallbackDto) {
    if (!dto.providerId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { fallbackProviderId: null },
      });
      return { ok: true };
    }
    await this.require(userId, dto.providerId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { fallbackProviderId: dto.providerId },
    });
    return { ok: true };
  }

  async health(userId: string, id: string) {
    const provider = await this.require(userId, id);
    const started = Date.now();
    try {
      if (provider.providerType === 'mock') {
        this.assertMockAllowed('mock');
        return {
          ok: true,
          latencyMs: Date.now() - started,
          model: provider.model,
        };
      }
      await completeChat(
        {
          baseUrl: provider.baseUrl,
          apiKey: this.crypto.decrypt(provider.apiKeyCipher),
          model: provider.model,
        },
        [{ role: 'user', content: 'Reply with the single word OK' }],
        false,
      );
      return {
        ok: true,
        latencyMs: Date.now() - started,
        model: provider.model,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Connection failed';
      return {
        ok: false,
        latencyMs: Date.now() - started,
        model: provider.model,
        message,
      };
    }
  }

  async requireDefault(userId: string) {
    const provider = await this.prisma.aiProvider.findFirst({
      where: { userId, isDefault: true, enabled: true },
    });
    if (!provider) {
      throw new BadRequestException('Configure an AI provider in Settings');
    }
    return provider;
  }

  async require(userId: string, id: string) {
    const provider = await this.prisma.aiProvider.findFirst({
      where: { id, userId },
    });
    if (!provider) throw new NotFoundException('Provider not found');
    return provider;
  }

  decrypt(provider: AiProvider) {
    return this.crypto.decrypt(provider.apiKeyCipher);
  }

  mockAllowed() {
    return (
      this.config.get<string>('AI_ALLOW_MOCK') === 'true' &&
      this.config.get<string>('NODE_ENV') !== 'production'
    );
  }

  private assertMockAllowed(type: string) {
    if (type === 'mock' && !this.mockAllowed()) {
      throw new BadRequestException('Mock providers are disabled');
    }
  }

  private baseUrl(value: string, type: string) {
    if (type === 'mock') return 'http://mock.local/v1';
    try {
      return assertBaseUrl(value);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid base URL',
      );
    }
  }

  private present(provider: AiProvider, isFallback: boolean) {
    return {
      id: provider.id,
      name: provider.name,
      providerType: provider.providerType,
      baseUrl: provider.baseUrl,
      model: provider.model,
      enabled: provider.enabled,
      isDefault: provider.isDefault,
      isFallback,
      hasKey: true,
      lastFour: provider.apiKeyLastFour,
      createdAt: provider.createdAt,
    };
  }
}
