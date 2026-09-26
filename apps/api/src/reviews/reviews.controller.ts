import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CreateReviewDto } from './dto';
import { ReviewsService } from './reviews.service';

@Controller('projects/:projectId/reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Query('mode') mode?: string,
    @Query('q') q?: string,
  ) {
    return this.reviews.list(user.id, projectId, { mode, q });
  }

  @Get(':reviewId')
  get(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
  ) {
    return this.reviews.get(user.id, projectId, reviewId);
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  create(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviews.create(user.id, projectId, dto);
  }
}
