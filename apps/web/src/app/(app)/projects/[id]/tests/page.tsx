"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { CodeView } from "@/components/code-view";
import { Alert, Button, EmptyState, Panel, Status, inputClass } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

type Generated = { id: string; sourcePath: string; testPath: string; content: string };
type Result = {
  id: string;
  name: string;
  file: string;
  status: string;
  error: string | null;
  stack: string | null;
  aiAnalysis: string | null;
  aiRecommendation: string | null;
  aiAffectedFile: string | null;
};
type Run = {
  id: string;
  number: number;
  status: string;
  durationMs: number | null;
  commitSha: string | null;
  changedFiles: { testsAffected?: number; added?: string[]; modified?: string[] } | null;
  errorMessage: string | null;
  results: Result[];
  reportId?: string;
};

export default function TestsPage() {
  const params = useParams<{ id: string }>();
  const tests = useResource(() => api<Generated[]>(`/api/projects/${params.id}/tests`), `${params.id}:tests`);
  const runs = useResource(
    () => api<Omit<Run, "results">[]>(`/api/projects/${params.id}/test-runs`),
    `${params.id}:runs`,
  );
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Run | null>(null);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [activeTest, setActiveTest] = useState<Generated | null>(null);

  async function generate() {
    setPending("Generating tests...");
    setError("");
    try {
      await api(`/api/projects/${params.id}/tests/generate`, { method: "POST", body: "{}" });
      await tests.reload();
      setPending("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate tests");
      setPending("");
    }
  }

  async function run() {
    setPending("Running tests...");
    setError("");
    try {
      const result = await api<{ run: Run; reportId: string }>(`/api/projects/${params.id}/test-runs`, {
        method: "POST",
        body: "{}",
      });
      setSelected({ ...result.run, reportId: result.reportId });
      await runs.reload();
      setPending("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Test run failed");
      setPending("");
    }
  }

  async function openRun(id: string) {
    const run = await api<Run>(`/api/projects/${params.id}/test-runs/${id}`);
    setSelected(run);
  }

  const visibleRuns = (runs.data ?? []).filter((run) => !status || run.status === status);
  const passed = selected?.results.filter((result) => result.status === "passed").length ?? 0;
  const failed = selected?.results.filter((result) => result.status === "failed").length ?? 0;
  const skipped = selected?.results.filter((result) => result.status === "skipped").length ?? 0;

  return (
    <main className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap gap-3">
        <h1 className="font-mono text-2xl">Tests</h1>
        <Button type="button" onClick={() => void generate()} disabled={Boolean(pending)}>Generate tests</Button>
        <Button type="button" variant="ghost" onClick={() => void run()} disabled={Boolean(pending) || !tests.data?.length}>Run tests</Button>
      </div>
      {pending ? <Status>{pending}</Status> : null}
      {error ? <Alert>{error}</Alert> : null}
      {tests.loading ? <Status>Loading tests...</Status> : null}
      {tests.data?.length === 0 ? <EmptyState title="No generated tests" body="Generate tests from the project source, review them, then run them in the sandbox." /> : null}
      <ul className="space-y-2">
        {tests.data?.map((test) => (
          <li key={test.id}>
            <button type="button" className="min-h-11 font-mono text-sm underline" onClick={() => setActiveTest(test)}>
              {test.testPath}
            </button>
            <span className="ml-2 text-sm text-muted-foreground">for {test.sourcePath}</span>
          </li>
        ))}
      </ul>
      {activeTest ? <CodeView code={activeTest.content} language="javascript" /> : null}
      <label className="block max-w-xs text-sm" htmlFor="run-status">Status
        <select id="run-status" value={status} onChange={(event) => setStatus(event.target.value)} className={`${inputClass} mt-1`}>
          <option value="">All</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="error">Error</option>
        </select>
      </label>
      {runs.loading ? <Status>Loading test runs...</Status> : null}
      <ul className="space-y-2">
        {visibleRuns.map((run) => (
          <li key={run.id}>
            <button type="button" className="min-h-11 font-mono text-sm" onClick={() => void openRun(run.id)}>
              Test run #{run.number} · {run.status} · {run.commitSha?.slice(0, 7) ?? "local"}
            </button>
          </li>
        ))}
      </ul>
      {selected ? (
        <Panel>
          <h2 className="font-mono text-xl">Test run #{selected.number}</h2>
          <p className="mt-1 font-mono text-sm">{selected.status} · {((selected.durationMs ?? 0) / 1000).toFixed(1)}s</p>
          <p className="mt-2">Tests {selected.results.length} · Passed {passed} · Failed {failed} · Skipped {skipped}</p>
          {selected.commitSha ? <p className="font-mono text-sm">Commit {selected.commitSha}</p> : null}
          {selected.errorMessage ? <Alert>{selected.errorMessage}</Alert> : null}
          <h3 className="mt-4 font-mono">Failed tests</h3>
          <ul className="mt-2 space-y-3">
            {selected.results.filter((result) => result.status === "failed").map((result) => (
              <li key={result.id} className="border border-border p-3">
                <p className="font-medium">{result.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{result.file}</p>
                <p className="mt-2">{result.error}</p>
                {result.stack ? <pre className="mt-2 overflow-auto text-xs">{result.stack}</pre> : null}
                <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">AI-generated analysis</p>
                <p>{result.aiAnalysis ?? "No analysis yet."}</p>
                <p className="mt-1 text-sm text-muted-foreground">{result.aiAffectedFile} · {result.aiRecommendation}</p>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </main>
  );
}
