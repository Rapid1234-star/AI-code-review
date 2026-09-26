"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Alert, Button, EmptyState, Panel, Status, inputClass } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

type Issue = {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  file: string;
  line: number | null;
  description: string;
  recommendation: string;
  confidence: number;
};
type Review = {
  id: string;
  mode: string;
  summary: string;
  recommendations: string[];
  providerName: string | null;
  usedFallback: boolean;
  createdAt: string;
  issues: Issue[];
};

const ORDER = ["critical", "high", "medium", "low"] as const;

export default function ReviewsPage() {
  return (
    <Suspense fallback={<p role="status" className="p-6">Loading reviews...</p>}>
      <Reviews />
    </Suspense>
  );
}

function Reviews() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const [mode, setMode] = useState("security");
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const reviews = useResource(
    () => api<Review[]>(`/api/projects/${params.id}/reviews?mode=${filter}&q=${encodeURIComponent(query)}`),
    `${params.id}:${filter}:${query}`,
  );
  const selectedId = search.get("review") ?? reviews.data?.[0]?.id;
  const selected = reviews.data?.find((review) => review.id === selectedId) ?? reviews.data?.[0];

  async function run() {
    setPending("Generating review...");
    setError("");
    try {
      await api(`/api/projects/${params.id}/reviews`, {
        method: "POST",
        body: JSON.stringify({ mode }),
      });
      setPending("");
      await reviews.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Review failed");
      setPending("");
    }
  }

  const counts = Object.fromEntries(ORDER.map((severity) => [severity, selected?.issues.filter((issue) => issue.severity === severity).length ?? 0]));

  return (
    <main className="space-y-4 p-4 md:p-6">
      <h1 className="font-mono text-2xl">Reviews</h1>
      <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); void run(); }}>
        <label className="text-sm text-muted-foreground" htmlFor="mode">Review mode
          <select id="mode" value={mode} onChange={(event) => setMode(event.target.value)} className={`${inputClass} mt-1`}>
            <option value="security">Security</option>
            <option value="performance">Performance</option>
            <option value="quality">Code quality</option>
          </select>
        </label>
        <Button type="submit" disabled={Boolean(pending)}>{pending || "Run review"}</Button>
      </form>
      {error ? <Alert>{error}</Alert> : null}
      {pending ? <Status>{pending}</Status> : null}
      <div className="flex flex-wrap gap-3">
        <label className="text-sm" htmlFor="review-filter">Filter
          <select id="review-filter" value={filter} onChange={(event) => setFilter(event.target.value)} className={`${inputClass} mt-1`}>
            <option value="">All modes</option>
            <option value="security">Security</option>
            <option value="performance">Performance</option>
            <option value="quality">Code quality</option>
          </select>
        </label>
        <label className="text-sm" htmlFor="review-search">Search
          <input id="review-search" value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} mt-1`} />
        </label>
      </div>
      {reviews.loading ? <Status>Loading reviews...</Status> : null}
      {reviews.error ? (
        <div>
          <Alert>{reviews.error}</Alert>
          <button type="button" className="mt-3 min-h-11 border border-border px-4" onClick={() => void reviews.reload()}>Retry</button>
        </div>
      ) : null}
      {reviews.data?.length === 0 ? <EmptyState title="No reviews yet" body="Run a security, performance, or quality review on this project." /> : null}
      {selected ? (
        <section className="space-y-4">
          <Panel>
            <p className="font-mono text-xs uppercase text-muted-foreground">{selected.mode}</p>
            <h2 className="mt-1 text-lg">{selected.summary}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {selected.providerName ?? "Provider"}{selected.usedFallback ? " (fallback)" : ""}
            </p>
          </Panel>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {ORDER.map((severity) => (
              <Panel key={severity}>
                <p className="text-sm capitalize text-muted-foreground">{severity}</p>
                <p className="font-mono text-2xl">{counts[severity]}</p>
              </Panel>
            ))}
          </div>
          <ul className="space-y-3">
            {ORDER.flatMap((severity) => selected.issues.filter((issue) => issue.severity === severity)).map((issue) => (
              <li key={issue.id} className="border border-border bg-card p-4">
                <p className="font-mono text-xs uppercase">{issue.severity} · confidence {Math.round(issue.confidence * 100)}%</p>
                <h3 className="mt-1 font-medium">{issue.title}</h3>
                <p className="mt-2">{issue.description}</p>
                <p className="mt-2 text-muted-foreground">{issue.recommendation}</p>
                <Link className="mt-3 inline-flex min-h-11 items-center font-mono text-sm underline" href={`/projects/${params.id}/files?path=${encodeURIComponent(issue.file)}&line=${issue.line ?? 1}`}>
                  {issue.file}:{issue.line ?? "?"}
                </Link>
              </li>
            ))}
          </ul>
          {selected.recommendations.length ? (
            <Panel>
              <h2 className="font-mono">Recommendations</h2>
              <ul className="mt-2 list-disc pl-5">
                {selected.recommendations.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </Panel>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
