"use client";
import { useAppStore } from "@/lib/store";
import { EditorTopBar } from "./EditorTopBar";
import { LeftSidebar } from "./LeftSidebar";
import { PreviewCanvas } from "./PreviewCanvas";
import { RightSidebar } from "./RightSidebar";
import { FullPreviewModal } from "./FullPreviewModal";
import type { Project } from "@/types";

/** Guarantee pages/files are always arrays/objects before passing to children */
function safeProject(p: Project): Project {
  return {
    ...p,
    pages: Array.isArray(p.pages) ? p.pages : [],
    files: p.files && typeof p.files === "object" ? p.files : {},
    blueprint: p.blueprint ?? null,
  };
}

export function Editor() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const projects = useAppStore((s) => s.projects);
  const isFullPreview = useAppStore((s) => s.editor.isFullPreview);

  const raw = projects.find((p) => p.id === currentProjectId);
  if (!raw) return null;

  const project = safeProject(raw);

  return (
    <div className="h-screen flex flex-col bg-[#080809] text-white overflow-hidden">
      <EditorTopBar project={project} />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar project={project} />
        <PreviewCanvas project={project} />
        <RightSidebar project={project} />
      </div>
      {isFullPreview && <FullPreviewModal project={project} />}
    </div>
  );
}
