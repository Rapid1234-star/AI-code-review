import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string) {
    const [projectCount, runs, reviews] = await Promise.all([
      this.prisma.project.count({ where: { userId } }),
      this.prisma.testRun.findMany({
        where: {
          project: { userId },
          status: { in: ['passed', 'failed', 'error'] },
        },
        orderBy: { startedAt: 'desc' },
        take: 8,
        include: { project: { select: { id: true, name: true } } },
      }),
      this.prisma.review.findMany({
        where: { project: { userId } },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          project: { select: { id: true, name: true } },
          issues: { select: { severity: true } },
        },
      }),
    ]);
    const finished = await this.prisma.testRun.groupBy({
      by: ['status'],
      where: { project: { userId }, status: { in: ['passed', 'failed'] } },
      _count: true,
    });
    const passed = finished.find((row) => row.status === 'passed')?._count ?? 0;
    const failed = finished.find((row) => row.status === 'failed')?._count ?? 0;
    const latestIssues = reviews[0]?.issues ?? [];
    return {
      projectCount,
      passRate:
        passed + failed === 0
          ? null
          : Math.round((passed / (passed + failed)) * 100),
      critical: latestIssues.filter((issue) => issue.severity === 'critical')
        .length,
      high: latestIssues.filter((issue) => issue.severity === 'high').length,
      recentRuns: runs.map((run) => ({
        id: run.id,
        projectId: run.project.id,
        projectName: run.project.name,
        number: run.number,
        status: run.status,
        startedAt: run.startedAt,
      })),
      recentReviews: reviews.map((review) => ({
        id: review.id,
        projectId: review.project.id,
        projectName: review.project.name,
        mode: review.mode,
        createdAt: review.createdAt,
        issueCount: review.issues.length,
      })),
    };
  }
}
