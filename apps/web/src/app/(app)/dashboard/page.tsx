"use client";

import Link from "next/link";
import { Alert, EmptyState, Panel, Status } from "@/components/ui";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

type Summary = {
  projectCount: number;
  passRate: number | null;
  critical: number;
  high: number;
  recentRuns: { id: string; projectId: string; projectName: string; number: number; status: string }[];
  recentReviews: { id: string; projectId: string; projectName: string; mode: string; issueCount: number }[];
};

type Project = {
  id: string;
  name: string;
  description: string;
  _count: { files: number; reviews: number; testRuns: number };
  testRuns: { status: string; number: number }[];
  github: { url: string; branch: string } | null;
};

export default function DashboardPage() {
  const summary = useResource(() => api<Summary>("/api/dashboard"), "dashboard");
  const projects = useResource(() => api<Project[]>("/api/projects"), "dashboard-projects");

  return (
    <main className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-mono text-2xl">Dashboard</h1>
        <p className="text-muted-foreground">Projects, latest reviews, and test runs.</p>
      </div>
      {summary.loading ? <Status>Loading dashboard...</Status> : null}
      {summary.error ? (
        <div>
          <Alert>{summary.error}</Alert>
          <button type="button" className="mt-3 min-h-11 border border-border px-4" onClick={() => void summary.reload()}>
            Retry
          </button>
        </div>
      ) : null}
      {summary.data ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Projects" value={String(summary.data.projectCount)} />
          <Metric label="Pass rate" value={summary.data.passRate === null ? "—" : `${summary.data.passRate}%`} />
          <Metric label="Critical in latest review" value={String(summary.data.critical)} />
          <Metric label="High in latest review" value={String(summary.data.high)} />
        </section>
      ) : null}
      <section className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="font-mono text-lg">Recent test runs</h2>
          {summary.data?.recentRuns.length ? (
            <ul className="mt-3 space-y-2">
              {summary.data.recentRuns.map((run) => (
                <li key={run.id}>
                  <Link className="underline-offset-2 hover:underline" href={`/projects/${run.projectId}/tests`}>
                    {run.projectName} #{run.number}
                  </Link>
                  <span className="ml-2 font-mono text-sm text-muted-foreground">{run.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-muted-foreground">No test runs yet.</p>
          )}
        </Panel>
        <Panel>
          <h2 className="font-mono text-lg">Recent reviews</h2>
          {summary.data?.recentReviews.length ? (
            <ul className="mt-3 space-y-2">
              {summary.data.recentReviews.map((review) => (
                <li key={review.id}>
                  <Link className="underline-offset-2 hover:underline" href={`/projects/${review.projectId}/reviews`}>
                    {review.projectName}
                  </Link>
                  <span className="ml-2 font-mono text-sm text-muted-foreground">
                    {review.mode} · {review.issueCount} issues
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-muted-foreground">No reviews yet.</p>
          )}
        </Panel>
      </section>
      {projects.loading ? <Status>Loading projects...</Status> : null}
      {projects.error ? <Alert>{projects.error}</Alert> : null}
      {projects.data && projects.data.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body="Create a project, then upload a ZIP or connect a public GitHub repository."
          action={<Link className="inline-flex min-h-11 items-center bg-accent px-4 text-accent-foreground" href="/projects">Create project</Link>}
        />
      ) : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {projects.data?.map((project) => (
          <li key={project.id}>
            <Link href={`/projects/${project.id}`} className="block border border-border bg-card p-4 transition-colors duration-200 hover:border-foreground">
              <h2 className="font-mono text-lg">{project.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{project.description || "No description"}</p>
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                {project._count.files} files · {project._count.reviews} reviews · latest test {project.testRuns[0]?.status ?? "none"}
                {project.github ? ` · ${project.github.branch}` : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-mono text-2xl">{value}</p>
    </div>
  );
}
