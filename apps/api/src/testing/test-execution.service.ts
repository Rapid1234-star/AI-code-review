import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TestStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import {
  ParsedTest,
  buildSandboxArgs,
  parseReporterOutput,
  runProcess,
} from './sandbox';

type ChangeSet = {
  commit?: string;
  added: string[];
  modified: string[];
  deleted: string[];
  testsAffected: number;
};

@Injectable()
export class TestExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly ai: AiService,
    private readonly config: ConfigService,
  ) {}

  async listRuns(
    userId: string,
    projectId: string,
    filters: { status?: string; q?: string },
  ) {
    await this.projects.requireProject(userId, projectId);
    const runs = await this.prisma.testRun.findMany({
      where: { projectId },
      orderBy: { startedAt: 'desc' },
      include: { _count: { select: { results: true } } },
    });
    return runs.filter((run) => {
      if (filters.status && run.status !== filters.status) return false;
      if (
        filters.q &&
        !`${run.commitSha ?? ''} ${run.number}`.includes(filters.q)
      ) {
        return false;
      }
      return true;
    });
  }

  async getRun(userId: string, projectId: string, runId: string) {
    await this.projects.requireProject(userId, projectId);
    const run = await this.prisma.testRun.findFirst({
      where: { id: runId, projectId },
      include: { results: { orderBy: { name: 'asc' } } },
    });
    if (!run) throw new NotFoundException('Test run not found');
    return run;
  }

  async recordEmpty(input: {
    userId: string;
    projectId: string;
    commitSha: string;
    branch: string;
    changes: { added: string[]; modified: string[]; deleted: string[] };
  }) {
    await this.projects.requireProject(input.userId, input.projectId);
    const number =
      (await this.prisma.testRun.count({
        where: { projectId: input.projectId },
      })) + 1;
    return this.prisma.testRun.create({
      data: {
        projectId: input.projectId,
        number,
        status: TestStatus.passed,
        trigger: 'github',
        commitSha: input.commitSha,
        branch: input.branch,
        durationMs: 0,
        finishedAt: new Date(),
        changedFiles: {
          ...input.changes,
          commit: input.commitSha,
          testsAffected: 0,
        },
      },
    });
  }

  async run(input: {
    userId: string;
    projectId: string;
    testIds?: string[];
    trigger: 'manual' | 'github';
    commitSha?: string;
    branch?: string;
    changes?: ChangeSet;
  }) {
    await this.projects.requireProject(input.userId, input.projectId);
    const tests = await this.prisma.generatedTest.findMany({
      where: {
        projectId: input.projectId,
        ...(input.testIds?.length ? { id: { in: input.testIds } } : {}),
      },
    });
    if (tests.length === 0) {
      throw new BadRequestException('Generate tests before running them');
    }
    const files = await this.prisma.projectFile.findMany({
      where: { projectId: input.projectId },
    });
    const number =
      (await this.prisma.testRun.count({
        where: { projectId: input.projectId },
      })) + 1;
    const run = await this.prisma.testRun.create({
      data: {
        projectId: input.projectId,
        number,
        status: TestStatus.running,
        trigger: input.trigger,
        commitSha: input.commitSha,
        branch: input.branch,
        changedFiles: input.changes ?? undefined,
      },
    });

    const workspace = await mkdtemp(path.join(tmpdir(), 'strix-'));
    const inputDir = path.join(workspace, 'input');
    const started = Date.now();
    try {
      await mkdir(path.join(inputDir, '.strix-tests'), { recursive: true });
      for (const file of files) {
        await writeProjectFile(inputDir, file.path, file.content);
      }
      for (const test of tests) {
        const relative = test.testPath.replace(/\\/g, '/');
        await writeProjectFile(inputDir, relative, test.content);
      }
      const containerName = `strix-${randomUUID()}`;
      const image =
        this.config.get<string>('SANDBOX_IMAGE') ?? 'strix-sandbox:local';
      const timeout = Number(
        this.config.get<string>('SANDBOX_TIMEOUT_MS') ?? 60_000,
      );
      let docker: Awaited<ReturnType<typeof runProcess>>;
      try {
        docker = await runProcess(
          'docker',
          buildSandboxArgs({ inputPath: inputDir, image, containerName }),
          timeout,
        );
      } catch (error) {
        const missing =
          error instanceof Error && 'code' in error && error.code === 'ENOENT';
        await this.finishError(
          run.id,
          missing
            ? 'Docker is not available. Test execution stays inside the sandbox and will not run on the host.'
            : 'The sandbox could not be started.',
          Date.now() - started,
        );
        return this.getRun(input.userId, input.projectId, run.id);
      }
      if (docker.timedOut) {
        await runProcess('docker', ['kill', containerName], 10_000).catch(
          () => undefined,
        );
        await this.finishError(
          run.id,
          'Test run timed out.',
          Date.now() - started,
        );
        return this.getRun(input.userId, input.projectId, run.id);
      }
      let parsed: ParsedTest[] = [];
      try {
        parsed = parseReporterOutput(docker.stdout);
      } catch {
        parsed = [];
      }
      if (parsed.length === 0) {
        await this.finishError(
          run.id,
          docker.stderr.slice(0, 1000) ||
            'The sandbox did not return test results.',
          Date.now() - started,
        );
        return this.getRun(input.userId, input.projectId, run.id);
      }
      const failures = parsed.filter((test) => test.status === 'failed');
      const analyses = new Map<
        string,
        { likelyCause: string; recommendation: string; affectedFile: string }
      >();
      let providerName: string | undefined;
      let usedFallback = false;
      if (failures.length > 0) {
        try {
          const analysis = await this.ai.analyzeFailures(
            input.userId,
            [
              {
                role: 'system',
                content:
                  'You explain test failures. This is a hypothesis, not a confirmed fact. Return only JSON: {"analyses":[{"testName": string, "likelyCause": string, "affectedFile": string, "recommendation": string}]}.',
              },
              {
                role: 'user',
                content: JSON.stringify({
                  failures: failures.map((failure) => ({
                    name: failure.name,
                    error: failure.error,
                    stack: failure.stack,
                  })),
                  files: files.slice(0, 8).map((file) => ({
                    path: file.path,
                    excerpt: file.content.slice(0, 1500),
                  })),
                }),
              },
            ],
            failures[0].name,
          );
          providerName = analysis.providerName;
          usedFallback = analysis.usedFallback;
          for (const item of analysis.data.analyses) {
            analyses.set(item.testName, item);
          }
        } catch {
          providerName = undefined;
        }
      }
      const failed = parsed.filter((test) => test.status === 'failed').length;
      const status = failed > 0 ? TestStatus.failed : TestStatus.passed;
      await this.prisma.testResult.createMany({
        data: parsed.map((test) => {
          const analysis = analyses.get(test.name);
          return {
            testRunId: run.id,
            name: test.name,
            file: test.file,
            status: test.status,
            durationMs: test.durationMs ? Math.round(test.durationMs) : null,
            error: test.error,
            stack: test.stack,
            aiAnalysis: analysis?.likelyCause,
            aiRecommendation: analysis?.recommendation,
            aiAffectedFile: analysis?.affectedFile,
          };
        }),
      });
      await this.prisma.testRun.update({
        where: { id: run.id },
        data: {
          status,
          durationMs: Date.now() - started,
          finishedAt: new Date(),
          providerName,
          usedFallback,
        },
      });
      return this.getRun(input.userId, input.projectId, run.id);
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }

  private finishError(id: string, message: string, durationMs: number) {
    return this.prisma.testRun.update({
      where: { id },
      data: {
        status: TestStatus.error,
        errorMessage: message,
        durationMs,
        finishedAt: new Date(),
      },
    });
  }
}

async function writeProjectFile(
  root: string,
  relativePath: string,
  content: string,
) {
  const normalized = relativePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  if (parts.some((part) => part === '..' || part === '')) {
    throw new BadRequestException('Refusing to write an unsafe path');
  }
  const destination = path.resolve(root, ...parts);
  const relative = path.relative(path.resolve(root), destination);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new BadRequestException('Refusing to write outside the workspace');
  }
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content, 'utf8');
}
