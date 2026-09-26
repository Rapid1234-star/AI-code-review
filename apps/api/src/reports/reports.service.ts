import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { renderReport } from './report-html';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async list(userId: string, projectId: string) {
    await this.projects.requireProject(userId, projectId);
    return this.prisma.report.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        testRun: {
          select: { id: true, number: true, status: true, commitSha: true },
        },
      },
    });
  }

  async generate(userId: string, projectId: string, testRunId: string) {
    const project = await this.projects.requireProject(userId, projectId);
    const run = await this.prisma.testRun.findFirst({
      where: { id: testRunId, projectId },
      include: { results: true, report: true },
    });
    if (!run) throw new NotFoundException('Test run not found');
    if (run.report) return run.report;
    const [github, review] = await Promise.all([
      this.prisma.githubRepository.findUnique({ where: { projectId } }),
      this.prisma.review.findFirst({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const changed = parseChanges(run.changedFiles);
    const html = renderReport({
      projectName: project.name,
      runNumber: run.number,
      status: run.status,
      commitSha: run.commitSha,
      branch: run.branch ?? github?.branch ?? null,
      createdAt: run.startedAt.toISOString(),
      durationMs: run.durationMs,
      passed: run.results.filter((result) => result.status === 'passed').length,
      failed: run.results.filter((result) => result.status === 'failed').length,
      skipped: run.results.filter((result) => result.status === 'skipped')
        .length,
      repository: github?.url ?? null,
      changedFiles: changed,
      reviewSummary: review?.summary ?? null,
      errorMessage: run.errorMessage,
      results: run.results.map((result) => ({
        name: result.name,
        file: result.file,
        status: result.status,
        durationMs: result.durationMs,
        error: result.error,
        stack: result.stack,
        aiAnalysis: result.aiAnalysis,
        aiRecommendation: result.aiRecommendation,
        aiAffectedFile: result.aiAffectedFile,
      })),
    });
    return this.prisma.report.create({
      data: { projectId, testRunId, html },
    });
  }

  async get(userId: string, projectId: string, reportId: string) {
    await this.projects.requireProject(userId, projectId);
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, projectId },
      include: { testRun: { select: { number: true } } },
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }
}

function parseChanges(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const record = value as {
    added?: unknown;
    modified?: unknown;
    deleted?: unknown;
  };
  return {
    added: asStrings(record.added),
    modified: asStrings(record.modified),
    deleted: asStrings(record.deleted),
  };
}

function asStrings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string')
    : [];
}
