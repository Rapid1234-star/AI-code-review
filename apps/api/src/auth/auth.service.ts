import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  private readonly dummyHash = bcrypt.hashSync('not-a-real-password', 12);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with that email already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name: dto.name.trim() },
      select: { id: true, email: true, name: true },
    });
    return { user, token: await this.sign(user.id, user.email) };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    const hash = user?.passwordHash ?? this.dummyHash;
    const matches = await bcrypt.compare(dto.password, hash);
    if (!user || !matches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return {
      user: { id: user.id, email: user.email, name: user.name },
      token: await this.sign(user.id, user.email),
    };
  }

  private sign(sub: string, email: string) {
    return this.jwt.signAsync({ sub, email });
  }
}
