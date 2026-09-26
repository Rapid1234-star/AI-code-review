import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ConnectGithubDto, UpdateGithubDto } from './dto';
import { GithubService } from './github.service';

@Controller('projects/:projectId/github')
@UseGuards(JwtAuthGuard)
export class GithubController {
  constructor(private readonly github: GithubService) {}

  @Get()
  get(@CurrentUser() user: AuthUser, @Param('projectId') projectId: string) {
    return this.github.get(user.id, projectId);
  }

  @Post()
  connect(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: ConnectGithubDto,
  ) {
    return this.github.connect(user.id, projectId, dto);
  }

  @Patch()
  update(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateGithubDto,
  ) {
    return this.github.update(user.id, projectId, dto);
  }

  @Delete()
  disconnect(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ) {
    return this.github.disconnect(user.id, projectId);
  }

  @Post('check')
  check(@CurrentUser() user: AuthUser, @Param('projectId') projectId: string) {
    return this.github.check(user.id, projectId);
  }
}
