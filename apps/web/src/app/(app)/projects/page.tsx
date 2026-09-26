"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Alert, Button, EmptyState, Field, Status, inputClass } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

type Project = { id: string; name: string; description: string; _count: { files: number } };

export default function ProjectsPage() {
  const router = useRouter();
  const projects = useResource(() => api<Project[]>("/api/projects"), "projects");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
    setError("");
    try {
      const created = await api<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: form.get("name"), description: form.get("description") }),
      });
      formElement.reset();
      await projects.reload();
      router.push(`/projects/${created.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the project");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="space-y-6 p-4 md:p-6">
      <h1 className="font-mono text-2xl">Projects</h1>
      <form onSubmit={onSubmit} className="grid gap-4 border border-border bg-card p-4 md:grid-cols-2">
        {error ? <div className="md:col-span-2"><Alert>{error}</Alert></div> : null}
        <Field id="name" label="Name">
          <input id="name" name="name" required maxLength={80} className={inputClass} />
        </Field>
        <Field id="description" label="Description">
          <input id="description" name="description" maxLength={500} className={inputClass} />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating project..." : "Create project"}
        </Button>
      </form>
      {projects.loading ? <Status>Loading projects...</Status> : null}
      {projects.error ? (
        <div>
          <Alert>{projects.error}</Alert>
          <button type="button" className="mt-3 min-h-11 border border-border px-4" onClick={() => void projects.reload()}>Retry</button>
        </div>
      ) : null}
      {projects.data?.length === 0 ? (
        <EmptyState title="Nothing here yet" body="The form above creates the first project." />
      ) : null}
      <ul className="space-y-2">
        {projects.data?.map((project) => (
          <li key={project.id}>
            <Link href={`/projects/${project.id}`} className="flex min-h-11 items-center justify-between border border-border px-4 py-3 hover:bg-card">
              <span className="font-mono">{project.name}</span>
              <span className="text-sm text-muted-foreground">{project._count.files} files</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
