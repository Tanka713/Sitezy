"use client";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { EditorTopBar } from "./EditorTopBar";
import { LeftSidebar } from "./LeftSidebar";
import { PreviewCanvas } from "./PreviewCanvas";
import { RightSidebar } from "./RightSidebar";
import { FullPreviewModal } from "./FullPreviewModal";
import type { Project } from "@/types";

const LEFT_SIDEBAR_WIDTH = 248;
const RIGHT_SIDEBAR_WIDTH = 292;

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
    <div className="editor-shell relative flex h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.26),transparent_62%)] blur-3xl" />
        <div className="absolute right-[-6rem] top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.2),transparent_58%)] blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/[0.12]" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-2.5 pb-2.5 pt-2.5">
        <EditorTopBar project={project} />

        <div className="editor-frame relative mt-2 flex min-h-0 flex-1 overflow-hidden rounded-[30px]">

        {/* Left sidebar */}
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{
            width: leftOpen ? LEFT_SIDEBAR_WIDTH : 0,
            transition: "width 200ms cubic-bezier(.4,0,.2,1)",
          }}
        >
          <div style={{ width: LEFT_SIDEBAR_WIDTH, height: "100%" }}>
            <LeftSidebar project={project} />
          </div>
        </div>

        {/* Left toggle */}
        <button
          onClick={toggleLeft}
          title={leftOpen ? "Hide left panel (⌘\\)" : "Show left panel (⌘\\)"}
          style={{
            position: "absolute",
            left: leftOpen ? LEFT_SIDEBAR_WIDTH : 0,
            transition: "left 200ms cubic-bezier(.4,0,.2,1)",
            top: "50%", transform: "translateY(-50%)",
            zIndex: 30,
          }}
          className="editor-panel flex h-14 w-6 items-center justify-center rounded-r-[18px] border-l-0 text-white/28 transition-colors hover:text-white/78"
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
            width: rightOpen ? RIGHT_SIDEBAR_WIDTH : 0,
            transition: "width 200ms cubic-bezier(.4,0,.2,1)",
          }}
        >
          <div style={{ width: RIGHT_SIDEBAR_WIDTH, height: "100%" }}>
            <RightSidebar project={project} />
          </div>
        </div>

        {/* Right toggle */}
        <button
          onClick={toggleRight}
          title={rightOpen ? "Hide right panel" : "Show right panel"}
          style={{
            position: "absolute",
            right: rightOpen ? RIGHT_SIDEBAR_WIDTH : 0,
            transition: "right 200ms cubic-bezier(.4,0,.2,1)",
            top: "50%", transform: "translateY(-50%)",
            zIndex: 30,
          }}
          className="editor-panel flex h-14 w-6 items-center justify-center rounded-l-[18px] border-r-0 text-white/28 transition-colors hover:text-white/78"
        >
          <svg width="5" height="9" viewBox="0 0 5 9" fill="none">
            {rightOpen
              ? <path d="M1 1L4 4.5 1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              : <path d="M4 1L1 4.5 4 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
          </svg>
        </button>
        </div>
      </div>

      {isFullPreview && <FullPreviewModal project={project} />}
    </div>
  );
}
