"use client";
import { useAppStore } from "@/lib/store";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { Editor } from "@/components/editor/Editor";

export function AppShell() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  return currentProjectId ? <Editor /> : <Dashboard />;
}
