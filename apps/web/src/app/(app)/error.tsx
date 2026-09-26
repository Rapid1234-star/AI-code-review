"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="p-6">
      <h1 className="font-mono text-xl">This page failed to load</h1>
      <button type="button" onClick={reset} className="mt-4 min-h-11 border border-border px-4">
        Retry
      </button>
    </div>
  );
}
