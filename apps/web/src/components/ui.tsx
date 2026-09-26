import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({
  children,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  const styles = {
    primary: "bg-accent text-accent-foreground hover:bg-accent/90",
    ghost: "border border-border bg-transparent hover:bg-muted",
    danger: "bg-destructive text-white hover:bg-destructive/90",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center px-4 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  error,
  children,
  id,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <label className="block text-sm" htmlFor={id}>
      <span className="mb-1 block text-muted-foreground">{label}</span>
      {children}
      {error ? (
        <span id={`${id}-error`} className="mt-1 block text-destructive">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export const inputClass =
  "min-h-11 w-full border border-border bg-background px-3 text-foreground";

export function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="border border-destructive bg-destructive/10 px-3 py-2 text-sm">
      {children}
    </p>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-border bg-card px-6 py-10">
      <h2 className="font-mono text-lg">{title}</h2>
      <p className="mt-2 max-w-lg text-muted-foreground">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Status({ children }: { children: ReactNode }) {
  return (
    <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`border border-border bg-card p-4 ${className}`}>{children}</section>;
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-accent underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}
