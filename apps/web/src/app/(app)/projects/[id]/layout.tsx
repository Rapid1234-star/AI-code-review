import type { ReactNode } from "react";
import { ProjectNav } from "@/components/shell";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <ProjectNav projectId={id} />
      {children}
    </div>
  );
}
