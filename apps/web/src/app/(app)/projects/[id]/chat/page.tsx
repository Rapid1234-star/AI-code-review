"use client";

import { FormEvent, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Alert, Button, Status, inputClass } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

type Session = { id: string; title: string };
type Message = { id: string; role: string; content: string };

export default function ChatPage() {
  return (
    <Suspense fallback={<p role="status" className="p-6">Loading chat...</p>}>
      <Chat />
    </Suspense>
  );
}

function Chat() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const file = search.get("file");
  const sessions = useResource(() => api<Session[]>(`/api/projects/${params.id}/chat/sessions`), params.id);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const [sources, setSources] = useState<string[]>([]);

  async function open(id: string) {
    const session = await api<{ messages: Message[] }>(`/api/projects/${params.id}/chat/sessions/${id}`);
    setSessionId(id);
    setMessages(session.messages);
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const content = String(form.get("content") ?? "");
    setPending("Asking...");
    setError("");
    try {
      let id = sessionId;
      if (!id) {
        const created = await api<Session>(`/api/projects/${params.id}/chat/sessions`, { method: "POST" });
        id = created.id;
        setSessionId(id);
        await sessions.reload();
      }
      const question = file ? `${content}\n\nLook at ${file}.` : content;
      const result = await api<{ message: Message; sources: string[]; usedFallback: boolean }>(
        `/api/projects/${params.id}/chat/sessions/${id}/messages`,
        { method: "POST", body: JSON.stringify({ content: question }) },
      );
      const session = await api<{ messages: Message[] }>(`/api/projects/${params.id}/chat/sessions/${id}`);
      setMessages(session.messages);
      setSources(result.sources);
      formElement.reset();
      setPending("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The assistant could not answer");
      setPending("");
    }
  }

  return (
    <main className="grid gap-4 p-4 md:grid-cols-[220px_1fr] md:p-6">
      <aside>
        <h1 className="font-mono text-xl">Chat</h1>
        {sessions.loading ? <Status>Loading chats...</Status> : null}
        <ul className="mt-3 space-y-1">
          {sessions.data?.map((session) => (
            <li key={session.id}>
              <button type="button" className="min-h-11 w-full truncate px-2 text-left text-sm hover:bg-card" onClick={() => void open(session.id)}>
                {session.title}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section>
        {file ? <p className="mb-3 text-sm text-muted-foreground">Context hint: {file}</p> : null}
        {error ? <Alert>{error}</Alert> : null}
        <ol className="space-y-3">
          {messages.map((message) => (
            <li key={message.id} className="border border-border bg-card p-3">
              <p className="font-mono text-xs uppercase text-muted-foreground">{message.role}</p>
              <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
            </li>
          ))}
        </ol>
        {sources.length ? <p className="mt-3 text-sm text-muted-foreground">Sources: {sources.join(", ")}</p> : null}
        {pending ? <Status>{pending}</Status> : null}
        <form className="mt-4 flex gap-2" onSubmit={send}>
          <label className="sr-only" htmlFor="question">Question</label>
          <input id="question" name="content" required className={inputClass} placeholder="How does authentication work?" />
          <Button type="submit" disabled={Boolean(pending)}>Send</Button>
        </form>
      </section>
    </main>
  );
}
