"use client";

import {
  FileCode,
  FileText,
  FlaskConical,
  FolderGit2,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { api } from "@/lib/api";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/settings/providers", label: "Providers", icon: Settings },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
        <Link href="/dashboard" className="font-mono text-sm tracking-wide">
          STRIX
        </Link>
        <button
          type="button"
          className="min-h-11 min-w-11 border border-border px-3"
          aria-expanded={open}
          aria-controls="app-nav"
          onClick={() => setOpen((value) => !value)}
        >
          Menu
        </button>
      </header>
      <aside
        id="app-nav"
        className={`${open ? "block" : "hidden"} border-b border-border bg-card md:block md:border-b-0 md:border-r`}
      >
        <div className="hidden px-4 py-5 font-mono text-sm tracking-wide md:block">STRIX</div>
        <nav className="flex flex-col gap-1 p-3" aria-label="Application">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 px-3 text-sm transition-colors duration-200 ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                onClick={() => setOpen(false)}
              >
                <Icon aria-hidden="true" size={16} />
                {link.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => void logout()}
            className="flex min-h-11 items-center gap-2 px-3 text-left text-sm text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
          >
            <LogOut aria-hidden="true" size={16} />
            Log out
          </button>
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const items = [
    { href: `/projects/${projectId}`, label: "Overview", icon: LayoutDashboard },
    { href: `/projects/${projectId}/files`, label: "Files", icon: FileCode },
    { href: `/projects/${projectId}/reviews`, label: "Reviews", icon: Shield },
    { href: `/projects/${projectId}/tests`, label: "Tests", icon: FlaskConical },
    { href: `/projects/${projectId}/github`, label: "GitHub", icon: FolderGit2 },
    { href: `/projects/${projectId}/reports`, label: "Reports", icon: FileText },
    { href: `/projects/${projectId}/chat`, label: "Chat", icon: MessageSquare },
  ];
  return (
    <nav aria-label="Project" className="flex gap-1 overflow-x-auto border-b border-border px-4">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm transition-colors duration-200 ${active ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Icon aria-hidden="true" size={15} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
