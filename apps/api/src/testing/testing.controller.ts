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
import { ReportsService } from '../reports/reports.service';
import { GenerateTestsDto, RunTestsDto } from './dto';
import { TestExecutionService } from './test-execution.service';
import { TestGenerationService } from './test-generation.service';

@Controller('projects/:projectId')
@UseGuards(JwtAuthGuard)
export class TestingController {
  constructor(
    private readonly generation: TestGenerationService,
    private readonly execution: TestExecutionService,
    private readonly reports: ReportsService,
  ) {}

  @Get('tests')
  list(@CurrentUser() user: AuthUser, @Param('projectId') projectId: string) {
    return this.generation.list(user.id, projectId);
  }

  @Post('tests/generate')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  generate(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: GenerateTestsDto,
  ) {
    return this.generation.generate(user.id, projectId, dto.filePaths);
  }

  @Get('test-runs')
  listRuns(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    return this.execution.listRuns(user.id, projectId, { status, q });
  }

  @Get('test-runs/:runId')
  getRun(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
  ) {
    return this.execution.getRun(user.id, projectId, runId);
  }

  @Post('test-runs')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async run(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: RunTestsDto,
  ) {
    const run = await this.execution.run({
      userId: user.id,
      projectId,
      testIds: dto.testIds,
      trigger: 'manual',
    });
    const report = await this.reports.generate(user.id, projectId, run.id);
    return { run, reportId: report.id };
  }
}
