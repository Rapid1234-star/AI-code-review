import { escapeHtml, renderReport } from './report-html';

describe('report html', () => {
  it('escapes markup from test output', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
    const html = renderReport({
      projectName: 'Demo',
      runNumber: 1,
      status: 'failed',
      commitSha: null,
      branch: null,
      createdAt: 'today',
      durationMs: 10,
      passed: 0,
      failed: 1,
      skipped: 0,
      repository: null,
      changedFiles: null,
      reviewSummary: null,
      errorMessage: null,
      results: [
        {
          name: '<script>',
          file: 'a.js',
          status: 'failed',
          durationMs: 1,
          error: '<img>',
          stack: null,
          aiAnalysis: null,
          aiRecommendation: null,
          aiAffectedFile: null,
        },
      ],
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('http');
  });
});
