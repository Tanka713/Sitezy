"use client";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { EditorTopBar } from "./EditorTopBar";
import { LeftSidebar } from "./LeftSidebar";
import { PreviewCanvas } from "./PreviewCanvas";
import { RightSidebar } from "./RightSidebar";
import { FullPreviewModal } from "./FullPreviewModal";
import type { Project } from "@/types";

function safe(p: Project): Project {
  return {
    ...p,
    pages: Array.isArray(p.pages) ? p.pages : [],
    files: p.files && typeof p.files === "object" ? p.files : {},
    blueprint: p.blueprint ?? null,
  };
}

export function Editor() {
  const currentProjectId   = useAppStore((s) => s.currentProjectId);
  const projects           = useAppStore((s) => s.projects);
  const isSaved            = useAppStore((s) => s.isSaved);
  const saveState          = useAppStore((s) => s.saveState);
  const saveCurrentProject = useAppStore((s) => s.saveCurrentProject);
  const isFullPreview      = useAppStore((s) => s.editor.isFullPreview);
  const selectedNode       = useAppStore((s) => s.editor.selectedNode);
  const isCanvasEditing    = useAppStore((s) => s.editor.isCanvasEditing);
  const leftOpen           = useAppStore((s) => s.editor.leftSidebarOpen);
  const rightOpen          = useAppStore((s) => s.editor.rightSidebarOpen);
  const toggleLeft         = useAppStore((s) => s.toggleLeftSidebar);
  const toggleRight        = useAppStore((s) => s.toggleRightSidebar);

  const raw = projects.find((p) => p.id === currentProjectId);
  if (!raw) return null;
  const project = safe(raw);

  // Keyboard: ⌘\ toggle sidebars
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.shiftKey && e.key === "\\") { e.preventDefault(); toggleLeft(); }
      if (mod && e.shiftKey  && e.key === "\\") { e.preventDefault(); toggleRight(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleLeft, toggleRight]);

  // Auto-save
  useEffect(() => {
    if (!currentProjectId || isSaved || saveState === "saving") return;
    if (selectedNode || isCanvasEditing) return;
    const t = setTimeout(() => void saveCurrentProject(), 2500);
    return () => clearTimeout(t);
  }, [currentProjectId, isCanvasEditing, isSaved, saveCurrentProject, saveState, selectedNode]);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#080809", color: "#fff" }}>
      <EditorTopBar project={project} />

      <div className="flex flex-1 overflow-hidden relative">

        {/* Left sidebar */}
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{
            width: leftOpen ? 240 : 0,
            transition: "width 200ms cubic-bezier(.4,0,.2,1)",
          }}
        >
          <div style={{ width: 240, height: "100%" }}>
            <LeftSidebar project={project} />
          </div>
        </div>

        {/* Left toggle */}
        <button
          onClick={toggleLeft}
          title={leftOpen ? "Hide left panel (⌘\\)" : "Show left panel (⌘\\)"}
          style={{
            position: "absolute",
            left: leftOpen ? 240 : 0,
            transition: "left 200ms cubic-bezier(.4,0,.2,1)",
            top: "50%", transform: "translateY(-50%)",
            zIndex: 30,
          }}
          className="flex items-center justify-center w-4 h-9 bg-[#0e0e14] border border-l-0 border-white/[0.07] rounded-r-lg text-white/25 hover:text-white/65 hover:bg-white/[0.05] transition-colors"
        >
          <svg width="5" height="9" viewBox="0 0 5 9" fill="none">
            {leftOpen
              ? <path d="M4 1L1 4.5 4 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              : <path d="M1 1L4 4.5 1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>}
          </svg>
        </button>

        {/* Canvas */}
        <PreviewCanvas project={project} />

        {/* Right sidebar */}
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{
            width: rightOpen ? 280 : 0,
            transition: "width 200ms cubic-bezier(.4,0,.2,1)",
          }}
        >
          <div style={{ width: 280, height: "100%" }}>
            <RightSidebar project={project} />
          </div>
        </div>

        {/* Right toggle */}
        <button
          onClick={toggleRight}
          title={rightOpen ? "Hide right panel" : "Show right panel"}
          style={{
            position: "absolute",
            right: rightOpen ? 280 : 0,
            transition: "right 200ms cubic-bezier(.4,0,.2,1)",
            top: "50%", transform: "translateY(-50%)",
            zIndex: 30,
          }}
          className="flex items-center justify-center w-4 h-9 bg-[#0e0e14] border border-r-0 border-white/[0.07] rounded-l-lg text-white/25 hover:text-white/65 hover:bg-white/[0.05] transition-colors"
        >
          <svg width="5" height="9" viewBox="0 0 5 9" fill="none">
            {rightOpen
              ? <path d="M1 1L4 4.5 1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              : <path d="M4 1L1 4.5 4 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
          </svg>
        </button>
      </div>

      {isFullPreview && <FullPreviewModal project={project} />}
    </div>
  );
}
