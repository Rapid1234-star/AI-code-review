"use client";

import { useParams } from "next/navigation";
import { Alert, EmptyState, Status } from "@/components/ui";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

type Report = {
  id: string;
  createdAt: string;
  testRun: { number: number; status: string; commitSha: string | null };
};

export default function ReportsPage() {
  const params = useParams<{ id: string }>();
  const reports = useResource(() => api<Report[]>(`/api/projects/${params.id}/reports`), params.id);

  return (
    <main className="space-y-4 p-4 md:p-6">
      <h1 className="font-mono text-2xl">Reports</h1>
      {reports.loading ? <Status>Loading reports...</Status> : null}
      {reports.error ? (
        <div>
          <Alert>{reports.error}</Alert>
          <button type="button" className="mt-3 min-h-11 border border-border px-4" onClick={() => void reports.reload()}>Retry</button>
        </div>
      ) : null}
      {reports.data?.length === 0 ? <EmptyState title="No reports yet" body="A report is created after each test run." /> : null}
      <ul className="space-y-2">
        {reports.data?.map((report) => (
          <li key={report.id} className="flex flex-wrap items-center justify-between gap-3 border border-border px-4 py-3">
            <span className="font-mono">Run #{report.testRun.number} · {report.testRun.status}</span>
            <a className="inline-flex min-h-11 items-center bg-accent px-4 text-accent-foreground" href={`/api/projects/${params.id}/reports/${report.id}/download`}>
              Download HTML report
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
