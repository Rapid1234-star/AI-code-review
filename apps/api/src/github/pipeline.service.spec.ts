jest.mock('../testing/test-generation.service', () => ({
  TestGenerationService: class TestGenerationService {},
}));
jest.mock('../testing/test-execution.service', () => ({
  TestExecutionService: class TestExecutionService {},
}));
jest.mock('../reports/reports.service', () => ({
  ReportsService: class ReportsService {},
}));

import { ChangePipelineService } from './pipeline.service';

describe('change pipeline', () => {
  it('generates tests only for affected files, then executes and reports', async () => {
    const generation = {
      generate: jest.fn().mockResolvedValue({ tests: [{ id: 't1' }] }),
    };
    const execution = {
      run: jest.fn().mockResolvedValue({ id: 'run-1' }),
      recordEmpty: jest.fn(),
    };
    const reports = {
      generate: jest.fn().mockResolvedValue({ id: 'report-1' }),
    };
    const pipeline = new ChangePipelineService(
      generation as never,
      execution as never,
      reports as never,
    );
    const result = await pipeline.run({
      userId: 'user',
      projectId: 'project',
      commitSha: 'abc123',
      branch: 'main',
      changes: { added: [], modified: ['src/auth/login.ts'], deleted: [] },
    });
    expect(generation.generate).toHaveBeenCalledWith('user', 'project', [
      'src/auth/login.ts',
    ]);
    expect(execution.run).toHaveBeenCalled();
    expect(reports.generate).toHaveBeenCalledWith('user', 'project', 'run-1');
    expect(result.testsAffected).toBe(1);
  });
});
