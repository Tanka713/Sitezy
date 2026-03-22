"use client";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { Editor } from "@/components/editor/Editor";

export function AppShell() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const hydrateProjects = useAppStore((s) => s.hydrateProjects);
  const hasHydratedProjects = useAppStore((s) => s.hasHydratedProjects);

  useEffect(() => {
    if (!hasHydratedProjects) {
      void hydrateProjects();
    }
  }, [hasHydratedProjects, hydrateProjects]);

  return currentProjectId ? <Editor /> : <Dashboard />;
}
