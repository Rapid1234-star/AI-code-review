import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async requireProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        userId,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? '',
      },
    });
  }

  list(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { files: true, reviews: true, testRuns: true } },
        github: {
          select: { url: true, branch: true, continuousTesting: true },
        },
        testRuns: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: { status: true, number: true },
        },
      },
    });
  }

  async get(userId: string, projectId: string) {
    const project = await this.requireProject(userId, projectId);
    const stats = await this.stats(projectId);
    return { ...project, stats };
  }

  async remove(userId: string, projectId: string) {
    await this.requireProject(userId, projectId);
    await this.prisma.project.delete({ where: { id: projectId } });
    return { ok: true };
  }

  async stats(projectId: string) {
    const [
      fileAgg,
      reviewCount,
      latestReview,
      testRunCount,
      latestRun,
      github,
    ] = await Promise.all([
      this.prisma.projectFile.aggregate({
        where: { projectId },
        _count: true,
        _sum: { lineCount: true },
      }),
      this.prisma.review.count({ where: { projectId } }),
      this.prisma.review.findFirst({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        include: { issues: { select: { severity: true } } },
      }),
      this.prisma.testRun.count({ where: { projectId } }),
      this.prisma.testRun.findFirst({
        where: { projectId },
        orderBy: { startedAt: 'desc' },
        select: { status: true, number: true, startedAt: true },
      }),
      this.prisma.githubRepository.findUnique({
        where: { projectId },
        select: {
          url: true,
          branch: true,
          continuousTesting: true,
          lastSeenSha: true,
        },
      }),
    ]);

    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const issue of latestReview?.issues ?? []) {
      counts[issue.severity] += 1;
    }

    return {
      fileCount: fileAgg._count,
      lineCount: fileAgg._sum.lineCount ?? 0,
      reviewCount,
      critical: counts.critical,
      high: counts.high,
      medium: counts.medium,
      low: counts.low,
      testRunCount,
      latestTestStatus: latestRun?.status ?? null,
      latestTestNumber: latestRun?.number ?? null,
      githubConnected: Boolean(github),
      github,
    };
  }
}
