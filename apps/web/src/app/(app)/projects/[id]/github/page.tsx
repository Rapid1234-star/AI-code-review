"use client";

import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { Alert, Button, Field, Panel, Status, inputClass } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

type Repo = {
  url: string;
  branch: string;
  lastSeenSha: string | null;
  continuousTesting: boolean;
} | null;

type Check = {
  changed: boolean;
  sha: string;
  branch: string;
  tested?: boolean;
  testsAffected?: number;
  changes?: { added: string[]; modified: string[]; deleted: string[] };
};

export default function GithubPage() {
  const params = useParams<{ id: string }>();
  const repo = useResource(() => api<Repo>(`/api/projects/${params.id}/github`), params.id);
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const [result, setResult] = useState<Check | null>(null);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending("Connecting repository...");
    setError("");
    try {
      await api(`/api/projects/${params.id}/github`, {
        method: "POST",
        body: JSON.stringify({ url: form.get("url"), branch: form.get("branch") || undefined }),
      });
      await repo.reload();
      setPending("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not connect the repository");
      setPending("");
    }
  }

  async function check() {
    setPending("Checking for updates...");
    setError("");
    try {
      setResult(await api<Check>(`/api/projects/${params.id}/github/check`, { method: "POST" }));
      await repo.reload();
      setPending("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update check failed");
      setPending("");
    }
  }

  async function toggle(continuousTesting: boolean) {
    await api(`/api/projects/${params.id}/github`, {
      method: "PATCH",
      body: JSON.stringify({ continuousTesting }),
    });
    await repo.reload();
  }

  return (
    <main className="space-y-4 p-4 md:p-6">
      <h1 className="font-mono text-2xl">GitHub</h1>
      {repo.loading ? <Status>Loading connection...</Status> : null}
      {repo.error ? <Alert>{repo.error}</Alert> : null}
      {error ? <Alert>{error}</Alert> : null}
      {pending ? <Status>{pending}</Status> : null}
      {repo.data ? (
        <Panel>
          <p className="font-mono text-sm">GitHub connected</p>
          <p className="mt-2">{repo.data.url}</p>
          <p>Branch {repo.data.branch}</p>
          <p>Continuous testing {repo.data.continuousTesting ? "on" : "off"}</p>
          <p className="font-mono text-sm text-muted-foreground">SHA {repo.data.lastSeenSha ?? "unknown"}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={() => void check()} disabled={Boolean(pending)}>Check for updates</Button>
            <Button type="button" variant="ghost" onClick={() => void toggle(!repo.data?.continuousTesting)}>
              {repo.data.continuousTesting ? "Turn continuous testing off" : "Turn continuous testing on"}
            </Button>
          </div>
        </Panel>
      ) : (
        <form className="max-w-xl space-y-3" onSubmit={connect}>
          <Field id="url" label="Repository URL">
            <input id="url" name="url" required placeholder="https://github.com/owner/repo" className={inputClass} />
          </Field>
          <Field id="branch" label="Branch">
            <input id="branch" name="branch" className={inputClass} />
          </Field>
          <Button type="submit" disabled={Boolean(pending)}>Connect repository</Button>
        </form>
      )}
      {result ? (
        <Panel>
          <h2 className="font-mono">Commit {result.sha.slice(0, 7)}</h2>
          <p>{result.changed ? "Changes detected" : "No new commits"}</p>
          {result.changes ? (
            <ul className="mt-2 font-mono text-sm">
              {result.changes.added.map((file) => <li key={`a-${file}`}>+ {file}</li>)}
              {result.changes.modified.map((file) => <li key={`m-${file}`}>~ {file}</li>)}
              {result.changes.deleted.map((file) => <li key={`d-${file}`}>- {file}</li>)}
            </ul>
          ) : null}
          {typeof result.testsAffected === "number" ? <p className="mt-2">Tests affected {result.testsAffected}</p> : null}
        </Panel>
      ) : null}
    </main>
  );
}
