import { Injectable, Logger } from '@nestjs/common';
import { AiProvider } from '@prisma/client';
import { redact } from '../common/redact';
import { PrismaService } from '../prisma/prisma.service';
import { mockAnalysis, mockChat, mockReview, mockTests } from './mock.provider';
import { completeChat } from './openai-compatible.provider';
import { ProvidersService } from './providers.service';
import {
  AnalysisOutput,
  ReviewOutput,
  TestsOutput,
  parseAnalysis,
  parseReview,
  parseTests,
  withStructuredRetry,
} from './schemas';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type AiResult<T> = {
  data: T;
  providerName: string;
  usedFallback: boolean;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly providers: ProvidersService,
    private readonly prisma: PrismaService,
  ) {}

  generateReview(
    userId: string,
    messages: ChatMessage[],
    files: { path: string }[],
  ): Promise<AiResult<ReviewOutput>> {
    return this.structured(userId, messages, parseReview, () =>
      mockReview(files),
    );
  }

  generateTests(
    userId: string,
    messages: ChatMessage[],
    files: { path: string }[],
  ): Promise<AiResult<TestsOutput>> {
    return this.structured(userId, messages, parseTests, () =>
      mockTests(files),
    );
  }

  analyzeFailures(
    userId: string,
    messages: ChatMessage[],
    testName: string,
  ): Promise<AiResult<AnalysisOutput>> {
    return this.structured(userId, messages, parseAnalysis, () =>
      mockAnalysis(testName),
    );
  }

  async chat(userId: string, messages: ChatMessage[]) {
    return this.text(userId, messages, () =>
      mockChat(messages.at(-1)?.content ?? ''),
    );
  }

  private async structured<T>(
    userId: string,
    messages: ChatMessage[],
    parse: (raw: string) => T,
    mock: () => string,
  ): Promise<AiResult<T>> {
    const run = async (provider: AiProvider, repairHint?: string) => {
      const prompt = repairHint
        ? [...messages, { role: 'user' as const, content: repairHint }]
        : messages;
      return this.invoke(provider, prompt, true, mock);
    };
    const primary = await this.providers.requireDefault(userId);
    try {
      const data = await withStructuredRetry(
        (hint) => run(primary, hint),
        parse,
      );
      return { data, providerName: primary.name, usedFallback: false };
    } catch (error) {
      const fallback = await this.fallbackFor(userId, primary.id);
      if (!fallback) throw error;
      this.logger.warn(
        `Provider ${primary.id} failed structured output: ${redact(this.messageOf(error))}`,
      );
      const data = await withStructuredRetry(
        (hint) => run(fallback, hint),
        parse,
      );
      this.logger.warn(`Served by fallback provider ${fallback.id}`);
      return { data, providerName: fallback.name, usedFallback: true };
    }
  }

  private async text(
    userId: string,
    messages: ChatMessage[],
    mock: () => string,
  ) {
    const primary = await this.providers.requireDefault(userId);
    try {
      const text = await this.invoke(primary, messages, false, mock);
      return { text, providerName: primary.name, usedFallback: false };
    } catch (error) {
      const fallback = await this.fallbackFor(userId, primary.id);
      if (!fallback) throw error;
      this.logger.warn(
        `Provider ${primary.id} failed: ${redact(this.messageOf(error))}. Trying fallback ${fallback.id}`,
      );
      const text = await this.invoke(fallback, messages, false, mock);
      return { text, providerName: fallback.name, usedFallback: true };
    }
  }

  private async invoke(
    provider: AiProvider,
    messages: ChatMessage[],
    jsonMode: boolean,
    mock: () => string,
  ) {
    if (!provider.enabled) {
      throw new Error(`Provider ${provider.name} is disabled`);
    }
    if (provider.providerType === 'mock') {
      if (!this.providers.mockAllowed()) {
        throw new Error('Mock providers are disabled');
      }
      return mock();
    }
    return completeChat(
      {
        baseUrl: provider.baseUrl,
        apiKey: this.providers.decrypt(provider),
        model: provider.model,
      },
      messages,
      jsonMode,
    );
  }

  private async fallbackFor(userId: string, primaryId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { fallbackProvider: true },
    });
    const fallback = user?.fallbackProvider;
    if (!fallback || !fallback.enabled || fallback.id === primaryId)
      return null;
    return fallback;
  }

  private messageOf(error: unknown) {
    return error instanceof Error ? error.message : 'Provider request failed';
  }
}
