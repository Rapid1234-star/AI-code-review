"use client";

import { FormEvent, useState } from "react";
import { Alert, Button, Field, Panel, Status, inputClass } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

type Provider = {
  id: string;
  name: string;
  providerType: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  isDefault: boolean;
  isFallback: boolean;
  lastFour: string;
};

const PRESETS: Record<string, { baseUrl: string; model: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini" },
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash" },
  lmstudio: { baseUrl: "http://localhost:1234/v1", model: "local-model" },
  ollama: { baseUrl: "http://localhost:11434/v1", model: "llama3.1" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4.1-mini" },
  compatible: { baseUrl: "http://localhost:1234/v1", model: "local-model" },
  mock: { baseUrl: "http://mock.local/v1", model: "mock" },
};

export default function ProvidersPage() {
  const providers = useResource(() => api<Provider[]>("/api/providers"), "providers");
  const [type, setType] = useState("openai");
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const [health, setHealth] = useState<string>("");
  const preset = PRESETS[type];

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending("Saving provider...");
    setError("");
    try {
      await api("/api/providers", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          providerType: type,
          baseUrl: form.get("baseUrl"),
          model: form.get("model"),
          apiKey: form.get("apiKey"),
        }),
      });
      formElement.reset();
      await providers.reload();
      setPending("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the provider");
      setPending("");
    }
  }

  async function test(id: string) {
    setPending("Testing connection...");
    setHealth("");
    try {
      const result = await api<{ ok: boolean; latencyMs: number; message?: string }>(`/api/providers/${id}/health`, { method: "POST" });
      setHealth(result.ok ? `Connected. Model available. Response time ${result.latencyMs}ms.` : result.message ?? "Connection failed");
      setPending("");
    } catch (err) {
      setHealth(err instanceof ApiError ? err.message : "Connection failed");
      setPending("");
    }
  }

  return (
    <main className="space-y-5 p-4 md:p-6">
      <h1 className="font-mono text-2xl">AI providers</h1>
      <p className="max-w-2xl text-muted-foreground">Keys are encrypted and only the last four characters are shown after saving.</p>
      <form onSubmit={save} className="grid max-w-xl gap-3">
        {error ? <Alert>{error}</Alert> : null}
        <Field id="name" label="Name"><input id="name" name="name" required className={inputClass} /></Field>
        <label className="text-sm text-muted-foreground" htmlFor="type">Provider type
          <select id="type" value={type} onChange={(event) => setType(event.target.value)} className={`${inputClass} mt-1`}>
            {Object.keys(PRESETS).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <Field id="baseUrl" label="Base URL"><input id="baseUrl" name="baseUrl" key={`url-${type}`} defaultValue={preset.baseUrl} required className={inputClass} /></Field>
        <Field id="model" label="Model"><input id="model" name="model" key={`model-${type}`} defaultValue={preset.model} required className={inputClass} /></Field>
        <Field id="apiKey" label="API key"><input id="apiKey" name="apiKey" type="password" required autoComplete="off" className={inputClass} /></Field>
        <Button type="submit" disabled={Boolean(pending)}>{pending || "Save provider"}</Button>
      </form>
      {providers.loading ? <Status>Loading providers...</Status> : null}
      {providers.error ? <Alert>{providers.error}</Alert> : null}
      {health ? <Status>{health}</Status> : null}
      <ul className="space-y-3">
        {providers.data?.map((provider) => (
          <li key={provider.id}>
            <Panel>
              <h2 className="font-mono">{provider.name}</h2>
              <p className="text-sm text-muted-foreground">{provider.providerType} · {provider.model}</p>
              <p className="font-mono text-sm">Key ••••{provider.lastFour}</p>
              <p className="text-sm">{provider.isDefault ? "Primary" : "Not primary"}{provider.isFallback ? " · Fallback" : ""}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="ghost" onClick={() => void api(`/api/providers/${provider.id}/default`, { method: "POST" }).then(() => providers.reload())}>Make primary</Button>
                <Button type="button" variant="ghost" onClick={() => void api("/api/providers/fallback", { method: "PATCH", body: JSON.stringify({ providerId: provider.id }) }).then(() => providers.reload())}>Use as fallback</Button>
                <Button type="button" variant="ghost" onClick={() => void test(provider.id)}>Test connection</Button>
                <Button type="button" variant="danger" onClick={() => void api(`/api/providers/${provider.id}`, { method: "DELETE" }).then(() => providers.reload())}>Delete</Button>
              </div>
            </Panel>
          </li>
        ))}
      </ul>
    </main>
  );
}
