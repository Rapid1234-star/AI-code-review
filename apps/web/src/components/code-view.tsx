"use client";

import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import "highlight.js/styles/github-dark.css";
import { useEffect, useMemo, useRef, useState } from "react";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("json", json);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("go", go);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("java", java);

const MAP: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  json: "json",
  xml: "xml",
  css: "css",
  bash: "bash",
  markdown: "markdown",
  go: "go",
  rust: "rust",
  java: "java",
};

export function CodeView({
  code,
  language,
  line,
}: {
  code: string;
  language: string;
  line?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => {
    const lang = MAP[language];
    if (!lang) return escapeHtml(code);
    return hljs.highlight(code, { language: lang }).value;
  }, [code, language]);
  const lines = html.split("\n");

  useEffect(() => {
    if (!line) return;
    document.getElementById(`line-${line}`)?.scrollIntoView({ block: "center" });
  }, [line, code]);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
  }

  return (
    <div ref={ref} className="min-w-0">
      <div className="mb-2 flex justify-end">
        <button type="button" className="min-h-11 border border-border px-3 text-sm" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <div className="overflow-auto border border-border bg-background font-mono text-sm leading-6">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((content, index) => {
              const number = index + 1;
              const active = line === number;
              return (
                <tr key={number} id={`line-${number}`} className={active ? "bg-muted" : undefined}>
                  <td className="w-12 select-none px-2 text-right text-muted-foreground">{number}</td>
                  <td className="px-3">
                    <code dangerouslySetInnerHTML={{ __html: content || " " }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
