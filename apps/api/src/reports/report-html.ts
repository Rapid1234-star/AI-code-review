export type ReportModel = {
  projectName: string;
  runNumber: number;
  status: string;
  commitSha: string | null;
  branch: string | null;
  createdAt: string;
  durationMs: number | null;
  passed: number;
  failed: number;
  skipped: number;
  repository: string | null;
  changedFiles: {
    added: string[];
    modified: string[];
    deleted: string[];
  } | null;
  reviewSummary: string | null;
  results: {
    name: string;
    file: string;
    status: string;
    durationMs: number | null;
    error: string | null;
    stack: string | null;
    aiAnalysis: string | null;
    aiRecommendation: string | null;
    aiAffectedFile: string | null;
  }[];
  errorMessage: string | null;
};

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderReport(model: ReportModel) {
  const total = model.passed + model.failed + model.skipped;
  const percent = total === 0 ? 0 : Math.round((model.passed / total) * 100);
  const rows = model.results
    .map(
      (result) => `<tr>
        <td>${escapeHtml(result.status)}</td>
        <td>${escapeHtml(result.name)}</td>
        <td><code>${escapeHtml(result.file)}</code></td>
        <td>${result.durationMs ?? '—'}</td>
      </tr>`,
    )
    .join('');
  const failures = model.results
    .filter((result) => result.status === 'failed')
    .map(
      (result) => `<article class="failure">
        <h3>${escapeHtml(result.name)}</h3>
        <p><strong>Error.</strong> ${escapeHtml(result.error ?? 'No error message')}</p>
        <pre>${escapeHtml(result.stack ?? '')}</pre>
        <p class="label">AI-generated analysis</p>
        <p>${escapeHtml(result.aiAnalysis ?? 'No analysis was produced for this failure.')}</p>
        <p><strong>Affected file.</strong> ${escapeHtml(result.aiAffectedFile ?? 'Unknown')}</p>
        <p><strong>Suggested fix.</strong> ${escapeHtml(result.aiRecommendation ?? 'None')}</p>
      </article>`,
    )
    .join('');
  const changed = model.changedFiles
    ? [
        ...model.changedFiles.added.map((file) => `+ ${file}`),
        ...model.changedFiles.modified.map((file) => `~ ${file}`),
        ...model.changedFiles.deleted.map((file) => `- ${file}`),
      ]
    : [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Strix report #${model.runNumber}</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; line-height: 1.5; }
    main { max-width: 960px; margin: 0 auto; padding: 32px 20px 64px; }
    header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-end; border-bottom: 1px solid #475569; padding-bottom: 16px; }
    h1 { font-family: Consolas, "Courier New", monospace; font-size: 28px; margin: 0; }
    h2 { font-size: 18px; margin: 32px 0 12px; }
    .brand { letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8; font-size: 12px; margin: 0 0 8px; }
    .status { font-family: Consolas, monospace; padding: 6px 10px; border: 1px solid #475569; }
    .passed { color: #0f172a; background: #22c55e; }
    .failed, .error { color: #fff; background: #ef4444; }
    .cards { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-top: 20px; }
    .card { background: #1b2336; border: 1px solid #475569; padding: 12px; }
    .card span { display: block; color: #94a3b8; font-size: 12px; }
    .card strong { font-family: Consolas, monospace; font-size: 22px; }
    .bar { height: 10px; background: #272f42; margin-top: 16px; }
    .bar i { display: block; height: 10px; background: #22c55e; width: ${percent}%; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; border-bottom: 1px solid #475569; padding: 8px; vertical-align: top; }
    code, pre { font-family: Consolas, monospace; }
    pre { white-space: pre-wrap; background: #1b2336; padding: 12px; border: 1px solid #475569; }
    .failure { border: 1px solid #475569; padding: 12px; margin-bottom: 12px; background: #1b2336; }
    .label { color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
    ul { padding-left: 18px; }
    @media (max-width: 720px) { .cards { grid-template-columns: 1fr 1fr; } header { flex-direction: column; align-items: flex-start; } }
    @media print {
      body { background: #fff; color: #111; }
      .card, pre, .failure { background: #fff; }
      a { color: #111; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <p class="brand">Strix test report</p>
        <h1>${escapeHtml(model.projectName)} #${model.runNumber}</h1>
        <p>${escapeHtml(model.createdAt)}</p>
      </div>
      <p class="status ${escapeHtml(model.status)}">${escapeHtml(model.status.toUpperCase())}</p>
    </header>
    <section class="cards">
      <div class="card"><span>Total</span><strong>${total}</strong></div>
      <div class="card"><span>Passed</span><strong>${model.passed}</strong></div>
      <div class="card"><span>Failed</span><strong>${model.failed}</strong></div>
      <div class="card"><span>Skipped</span><strong>${model.skipped}</strong></div>
      <div class="card"><span>Duration</span><strong>${model.durationMs ?? 0}ms</strong></div>
    </section>
    <div class="bar" aria-hidden="true"><i></i></div>
    <p>${percent}% passed</p>
    <h2>Run</h2>
    <p>Commit ${escapeHtml(model.commitSha ?? 'not recorded')} on ${escapeHtml(model.branch ?? 'local')}</p>
    ${model.errorMessage ? `<p>${escapeHtml(model.errorMessage)}</p>` : ''}
    <h2>Results</h2>
    <table>
      <thead><tr><th>Status</th><th>Test</th><th>File</th><th>Duration</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4">No test results</td></tr>'}</tbody>
    </table>
    <h2>Failures</h2>
    ${failures || '<p>No failed tests.</p>'}
    <h2>GitHub</h2>
    <p>Repository ${escapeHtml(model.repository ?? 'not connected')}</p>
    <p>Branch ${escapeHtml(model.branch ?? 'n/a')} · commit ${escapeHtml(model.commitSha ?? 'n/a')}</p>
    ${changed.length ? `<ul>${changed.map((file) => `<li><code>${escapeHtml(file)}</code></li>`).join('')}</ul>` : '<p>No changed files recorded.</p>'}
    <h2>Review summary</h2>
    <p>${escapeHtml(model.reviewSummary ?? 'No review is stored for this project yet.')}</p>
  </main>
</body>
</html>`;
}
