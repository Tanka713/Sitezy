"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { Editor } from "@/components/editor/Editor";

export function AppShell() {
  const [mounted, setMounted] = useState(false);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const hydrateProjects = useAppStore((s) => s.hydrateProjects);
  const hasHydratedProjects = useAppStore((s) => s.hasHydratedProjects);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedProjects) {
      void hydrateProjects();
    }
  }, [hasHydratedProjects, hydrateProjects]);

  return mounted && currentProjectId ? <Editor /> : <Dashboard />;
}
