"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Alert, Button, Field, inputClass } from "@/components/ui";
import { ApiError, api } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the account");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <p className="font-mono text-sm tracking-wide text-muted-foreground">STRIX</p>
      <h1 className="mt-2 font-mono text-3xl">Create account</h1>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        {error ? <Alert>{error}</Alert> : null}
        <Field id="name" label="Name">
          <input id="name" name="name" required autoComplete="name" className={inputClass} />
        </Field>
        <Field id="email" label="Email">
          <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
        </Field>
        <Field id="password" label="Password">
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" aria-describedby="password-hint" className={inputClass} />
        </Field>
        <p id="password-hint" className="text-sm text-muted-foreground">Use at least 8 characters.</p>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        Already registered? <Link href="/login" className="text-foreground underline">Sign in</Link>
      </p>
    </main>
  );
}
