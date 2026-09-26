import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { readZipSafely } from '../files/zip-safe';
import { classifyPushCommits, FileChanges } from './changes';
import { ConnectGithubDto, UpdateGithubDto } from './dto';
import { GithubClient } from './github.client';
import { assertBranch, parseGithubRepoUrl } from './github-url';
import { ChangePipelineService } from './pipeline.service';
import { verifyGithubSignature } from './signature';

@Injectable()
export class GithubService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly files: FilesService,
    private readonly client: GithubClient,
    private readonly pipeline: ChangePipelineService,
    private readonly config: ConfigService,
  ) {}

  async get(userId: string, projectId: string) {
    await this.projects.requireProject(userId, projectId);
    return this.prisma.githubRepository.findUnique({ where: { projectId } });
  }

  async connect(userId: string, projectId: string, dto: ConnectGithubDto) {
    await this.projects.requireProject(userId, projectId);
    const { owner, repo } = parseGithubRepoUrl(dto.url);
    const meta = await this.client.getRepo(owner, repo);
    if (meta.private) {
      throw new BadRequestException(
        'Private repositories are not supported yet',
      );
    }
    const branch = assertBranch(dto.branch?.trim() || meta.defaultBranch);
    const archive = await this.client.archive(owner, repo, branch);
    let extracted;
    try {
      extracted = readZipSafely(archive);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Could not read the repository archive',
      );
    }
    await this.files.replaceAll(projectId, extracted);
    const sha = await this.client.initialSha(owner, repo, branch);
    return this.prisma.githubRepository.upsert({
      where: { projectId },
      create: {
        projectId,
        owner,
        repo,
        url: `https://github.com/${owner}/${repo}`,
        branch,
        lastSeenSha: sha,
        continuousTesting: true,
      },
      update: {
        owner,
        repo,
        url: `https://github.com/${owner}/${repo}`,
        branch,
        lastSeenSha: sha,
      },
    });
  }

  async update(userId: string, projectId: string, dto: UpdateGithubDto) {
    const repo = await this.requireRepo(userId, projectId);
    return this.prisma.githubRepository.update({
      where: { id: repo.id },
      data: {
        continuousTesting: dto.continuousTesting,
        branch: dto.branch ? assertBranch(dto.branch) : undefined,
      },
    });
  }

  async disconnect(userId: string, projectId: string) {
    const repo = await this.requireRepo(userId, projectId);
    await this.prisma.githubRepository.delete({ where: { id: repo.id } });
    return { ok: true };
  }

  async check(userId: string, projectId: string) {
    const repo = await this.requireRepo(userId, projectId);
    const head = await this.client.headSha(repo.owner, repo.repo, repo.branch);
    if (!repo.lastSeenSha || repo.lastSeenSha === head) {
      if (!repo.lastSeenSha) {
        await this.prisma.githubRepository.update({
          where: { id: repo.id },
          data: { lastSeenSha: head },
        });
      }
      return { changed: false, sha: head, branch: repo.branch };
    }
    const changes = await this.client.compare(
      repo.owner,
      repo.repo,
      repo.lastSeenSha,
      head,
    );
    await this.applyChanges(repo.owner, repo.repo, projectId, head, changes);
    await this.prisma.githubRepository.update({
      where: { id: repo.id },
      data: { lastSeenSha: head },
    });
    if (!repo.continuousTesting) {
      return {
        changed: true,
        sha: head,
        branch: repo.branch,
        changes,
        tested: false,
      };
    }
    const pipeline = await this.pipeline.run({
      userId,
      projectId,
      commitSha: head,
      branch: repo.branch,
      changes,
    });
    return {
      changed: true,
      sha: head,
      branch: repo.branch,
      changes,
      tested: true,
      testsAffected: pipeline.testsAffected,
      runId: pipeline.run.id,
      reportId: pipeline.reportId,
    };
  }

  async handleWebhook(
    rawBody: Buffer,
    signature: string | undefined,
    event: string | undefined,
    payload: unknown,
  ) {
    const secret = this.config.get<string>('GITHUB_WEBHOOK_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException(
        'GitHub webhook secret is not configured',
      );
    }
    if (!verifyGithubSignature(rawBody, signature, secret)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    if (event !== 'push') return { ok: true, ignored: true };
    const body = payload as {
      ref?: string;
      after?: string;
      repository?: { private?: boolean; full_name?: string };
      commits?: { added?: string[]; modified?: string[]; removed?: string[] }[];
    };
    if (body.repository?.private)
      return { ok: true, ignored: true, reason: 'private' };
    const [owner, repo] = (body.repository?.full_name ?? '').split('/');
    const branch = (body.ref ?? '').replace('refs/heads/', '');
    if (!owner || !repo || !branch || !body.after) {
      throw new BadRequestException(
        'Push payload is missing repository information',
      );
    }
    const links = await this.prisma.githubRepository.findMany({
      where: { owner, repo, branch },
      include: { project: { select: { userId: true } } },
    });
    const changes = classifyPushCommits(body.commits ?? []);
    const results = [];
    for (const link of links) {
      await this.applyChanges(owner, repo, link.projectId, body.after, changes);
      await this.prisma.githubRepository.update({
        where: { id: link.id },
        data: { lastSeenSha: body.after },
      });
      if (!link.continuousTesting) {
        results.push({ projectId: link.projectId, tested: false });
        continue;
      }
      const pipeline = await this.pipeline.run({
        userId: link.project.userId,
        projectId: link.projectId,
        commitSha: body.after,
        branch,
        changes,
      });
      results.push({
        projectId: link.projectId,
        tested: true,
        runId: pipeline.run.id,
        reportId: pipeline.reportId,
      });
    }
    return { ok: true, results };
  }

  private async applyChanges(
    owner: string,
    repo: string,
    projectId: string,
    sha: string,
    changes: FileChanges,
  ) {
    const paths = [...changes.added, ...changes.modified];
    if (paths.length > 30) {
      throw new BadRequestException(
        'Too many changed files to import in one check',
      );
    }
    await this.files.deletePaths(projectId, changes.deleted);
    const updates = [];
    for (const filePath of paths) {
      const content = await this.client.fileContent(owner, repo, filePath, sha);
      if (content.length > 500_000) continue;
      updates.push({ path: filePath, content });
    }
    await this.files.upsertFiles(projectId, updates);
  }

  private async requireRepo(userId: string, projectId: string) {
    await this.projects.requireProject(userId, projectId);
    const repo = await this.prisma.githubRepository.findUnique({
      where: { projectId },
    });
    if (!repo)
      throw new NotFoundException('GitHub repository is not connected');
    return repo;
  }
}
