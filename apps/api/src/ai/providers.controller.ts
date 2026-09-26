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
import { Throttle } from '@nestjs/throttler';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CreateProviderDto, FallbackDto, UpdateProviderDto } from './dto';
import { ProvidersService } from './providers.service';

@Controller('providers')
@UseGuards(JwtAuthGuard)
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.providers.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProviderDto) {
    return this.providers.create(user.id, dto);
  }

  @Patch('fallback')
  fallback(@CurrentUser() user: AuthUser, @Body() dto: FallbackDto) {
    return this.providers.setFallback(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto,
  ) {
    return this.providers.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.providers.remove(user.id, id);
  }

  @Post(':id/default')
  makeDefault(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.providers.makeDefault(user.id, id);
  }

  @Post(':id/health')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  health(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.providers.health(user.id, id);
  }
}
