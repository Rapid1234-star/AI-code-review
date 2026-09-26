"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { CodeView } from "@/components/code-view";
import { Alert, Button, EmptyState, Status, inputClass } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

type FileRow = { id: string; path: string; language: string; lineCount: number };
type FileContent = { path: string; language: string; content: string };

export default function FilesPage() {
  return (
    <Suspense fallback={<p role="status" className="p-6">Loading files...</p>}>
      <Explorer />
    </Suspense>
  );
}

function Explorer() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const selected = search.get("path") ?? "";
  const line = Number(search.get("line") ?? "") || undefined;
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const files = useResource(() => api<FileRow[]>(`/api/projects/${params.id}/files`), `${params.id}:files`);
  const content = useResource(async () => {
    if (!selected) return null;
    return api<FileContent>(`/api/projects/${params.id}/files/content?path=${encodeURIComponent(selected)}`);
  }, `${params.id}:${selected}`);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (files.data ?? []).filter((file) => file.path.toLowerCase().includes(needle));
  }, [files.data, query]);

  function openFile(path: string) {
    const next = new URLSearchParams(search.toString());
    next.set("path", path);
    next.delete("line");
    router.push(`/projects/${params.id}/files?${next.toString()}`);
  }

  async function upload(file: File) {
    setPending("Uploading code...");
    setError("");
    const body = new FormData();
    body.set("file", file);
    try {
      await api(`/api/projects/${params.id}/files/upload`, { method: "POST", body });
      setNotice("Upload finished.");
      await files.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setPending("");
    }
  }

  async function reviewFile() {
    if (!selected) return;
    setPending("Generating review...");
    setError("");
    try {
      const review = await api<{ id: string }>(`/api/projects/${params.id}/reviews`, {
        method: "POST",
        body: JSON.stringify({ mode: "security", filePaths: [selected] }),
      });
      router.push(`/projects/${params.id}/reviews?review=${review.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Review failed");
      setPending("");
    }
  }

  async function generateTests() {
    if (!selected) return;
    setPending("Generating tests...");
    setError("");
    try {
      await api(`/api/projects/${params.id}/tests/generate`, {
        method: "POST",
        body: JSON.stringify({ filePaths: [selected] }),
      });
      router.push(`/projects/${params.id}/tests`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Test generation failed");
      setPending("");
    }
  }

  return (
    <main className="grid min-h-[calc(100vh-8rem)] lg:grid-cols-[260px_1fr_240px]">
      <section className="border-b border-border p-3 lg:border-b-0 lg:border-r">
        <label className="block text-sm text-muted-foreground" htmlFor="file-search">Search files</label>
        <input id="file-search" value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} mt-1`} />
        <label className="mt-3 block text-sm text-muted-foreground" htmlFor="archive">Project archive</label>
        <input
          id="archive"
          type="file"
          accept=".zip,application/zip"
          className="mt-1 block w-full text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        {files.loading ? <Status>Loading files...</Status> : null}
        {files.error ? <Alert>{files.error}</Alert> : null}
        {files.data?.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Upload a ZIP to browse source.</p> : null}
        <ul className="mt-3 max-h-[60vh] space-y-1 overflow-auto">
          {visible.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                onClick={() => openFile(file.path)}
                aria-current={selected === file.path ? "true" : undefined}
                className={`block w-full min-h-11 truncate px-2 text-left font-mono text-xs ${selected === file.path ? "bg-muted" : "hover:bg-muted"}`}
              >
                {file.path}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="min-w-0 p-3">
        {pending ? <Status>{pending}</Status> : null}
        {notice ? <Status>{notice}</Status> : null}
        {error ? <Alert>{error}</Alert> : null}
        {!selected ? <EmptyState title="No file open" body="Choose a file from the tree to preview it." /> : null}
        {content.loading && selected ? <Status>Loading file...</Status> : null}
        {content.error ? <Alert>{content.error}</Alert> : null}
        {content.data ? (
          <>
            <h1 className="mb-3 font-mono text-sm">{content.data.path}</h1>
            <CodeView code={content.data.content} language={content.data.language} line={line} />
          </>
        ) : null}
      </section>
      <aside className="space-y-3 border-t border-border p-3 lg:border-t-0 lg:border-l">
        <h2 className="font-mono text-sm">Actions</h2>
        <Button type="button" className="w-full" disabled={!selected || Boolean(pending)} onClick={() => void reviewFile()}>
          Review this file
        </Button>
        <Button type="button" variant="ghost" className="w-full" disabled={!selected || Boolean(pending)} onClick={() => void generateTests()}>
          Generate tests
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={!selected}
          onClick={() => router.push(`/projects/${params.id}/chat?file=${encodeURIComponent(selected)}`)}
        >
          Ask about this file
        </Button>
      </aside>
    </main>
  );
}
