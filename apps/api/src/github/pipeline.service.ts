import { Injectable } from '@nestjs/common';
import { FileChanges } from './changes';
import { ReportsService } from '../reports/reports.service';
import { TestExecutionService } from '../testing/test-execution.service';
import { TestGenerationService } from '../testing/test-generation.service';

@Injectable()
export class ChangePipelineService {
  constructor(
    private readonly generation: TestGenerationService,
    private readonly execution: TestExecutionService,
    private readonly reports: ReportsService,
  ) {}

  async run(input: {
    userId: string;
    projectId: string;
    commitSha: string;
    branch: string;
    changes: FileChanges;
  }) {
    const affected = [...input.changes.added, ...input.changes.modified];
    if (affected.length === 0) {
      const run = await this.execution.recordEmpty({
        userId: input.userId,
        projectId: input.projectId,
        commitSha: input.commitSha,
        branch: input.branch,
        changes: input.changes,
      });
      const report = await this.reports.generate(
        input.userId,
        input.projectId,
        run.id,
      );
      return { run, reportId: report.id, testsAffected: 0 };
    }
    const generated = await this.generation.generate(
      input.userId,
      input.projectId,
      affected,
    );
    const run = await this.execution.run({
      userId: input.userId,
      projectId: input.projectId,
      testIds: generated.tests.map((test) => test.id),
      trigger: 'github',
      commitSha: input.commitSha,
      branch: input.branch,
      changes: {
        commit: input.commitSha,
        added: input.changes.added,
        modified: input.changes.modified,
        deleted: input.changes.deleted,
        testsAffected: generated.tests.length,
      },
    });
    const report = await this.reports.generate(
      input.userId,
      input.projectId,
      run.id,
    );
    return { run, reportId: report.id, testsAffected: generated.tests.length };
  }
}
