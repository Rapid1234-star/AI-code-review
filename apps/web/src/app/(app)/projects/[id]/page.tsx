"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Panel, Status } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

type Project = {
  id: string;
  name: string;
  description: string;
  stats: {
    fileCount: number;
    lineCount: number;
    reviewCount: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    testRunCount: number;
    latestTestStatus: string | null;
    githubConnected: boolean;
    github: { branch: string; continuousTesting: boolean } | null;
  };
};

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const project = useResource(() => api<Project>(`/api/projects/${params.id}`), params.id);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!confirm("Delete this project and its files, reviews, and reports?")) return;
    setPending(true);
    setError("");
    try {
      await api(`/api/projects/${params.id}`, { method: "DELETE" });
      router.push("/projects");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the project");
      setPending(false);
    }
  }

  if (project.loading) return <main className="p-6"><Status>Loading project...</Status></main>;
  if (project.error || !project.data) {
    return (
      <main className="space-y-3 p-6">
        <Alert>{project.error ?? "Project not found"}</Alert>
        <button type="button" className="min-h-11 border border-border px-4" onClick={() => void project.reload()}>Retry</button>
      </main>
    );
  }
  const stats = project.data.stats;
  const cards = [
    ["Files", String(stats.fileCount)],
    ["Lines", String(stats.lineCount)],
    ["Reviews", String(stats.reviewCount)],
    ["Critical", String(stats.critical)],
    ["High", String(stats.high)],
    ["Test runs", String(stats.testRunCount)],
    ["Latest test", stats.latestTestStatus ?? "none"],
    ["GitHub", stats.githubConnected ? `Connected · ${stats.github?.branch}` : "Not connected"],
  ];

  return (
    <main className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl">{project.data.name}</h1>
          <p className="text-muted-foreground">{project.data.description || "No description"}</p>
        </div>
        <Button variant="danger" onClick={() => void remove()} disabled={pending}>
          {pending ? "Deleting project..." : "Delete project"}
        </Button>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <Panel key={label}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-mono text-xl">{value}</p>
          </Panel>
        ))}
      </section>
      <div className="flex flex-wrap gap-3">
        <Link className="inline-flex min-h-11 items-center bg-accent px-4 text-accent-foreground" href={`/projects/${params.id}/files`}>Open files</Link>
        <Link className="inline-flex min-h-11 items-center border border-border px-4" href={`/projects/${params.id}/reviews`}>Run a review</Link>
      </div>
    </main>
  );
}
