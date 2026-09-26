import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UsersService } from '../users/users.service';
import { AuthUser } from './auth-user';

export const SESSION_COOKIE = 'strix_session';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const token = request.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!token) {
      throw new UnauthorizedException('Sign in required');
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      const user = await this.users.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Sign in required');
      }
      request.user = { id: user.id, email: user.email, name: user.name };
      return true;
    } catch {
      throw new UnauthorizedException('Sign in required');
    }
  }
}
