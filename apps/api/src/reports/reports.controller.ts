import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('projects/:projectId/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('projectId') projectId: string) {
    return this.reports.list(user.id, projectId);
  }

  @Get(':reportId/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
    @Res() res: Response,
  ) {
    const report = await this.reports.get(user.id, projectId, reportId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="strix-report-${report.testRun.number}.html"`,
    );
    res.send(report.html);
  }
}
