import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './dto';

@Controller('projects/:projectId/chat/sessions')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('projectId') projectId: string) {
    return this.chat.list(user.id, projectId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Param('projectId') projectId: string) {
    return this.chat.create(user.id, projectId);
  }

  @Get(':sessionId')
  get(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.chat.get(user.id, projectId, sessionId);
  }

  @Post(':sessionId/messages')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  message(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: ChatMessageDto,
  ) {
    return this.chat.message(user.id, projectId, sessionId, dto.content);
  }
}
