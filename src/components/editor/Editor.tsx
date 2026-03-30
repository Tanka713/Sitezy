"use client";
import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { EditorTopBar } from "./EditorTopBar";
import { LeftSidebar } from "./LeftSidebar";
import { PreviewCanvas } from "./PreviewCanvas";
import { RightSidebar } from "./RightSidebar";
import { FullPreviewModal } from "./FullPreviewModal";
import { EditorErrorBoundary } from "./EditorErrorBoundary";
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
  const previewIframeRef   = useRef<HTMLIFrameElement | null>(null);
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

  // Keyboard: sidebar shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const active = document.activeElement as HTMLElement | null;
      const tag = (active?.tagName ?? "").toLowerCase();
      const isTyping =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        !!active?.isContentEditable;
      if (isTyping) return;

      if (!e.shiftKey && e.key === "\\") {
        e.preventDefault();
        toggleLeft();
        return;
      }

      if (e.shiftKey && e.key === "\\") {
        e.preventDefault();
        toggleRight();
      }
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
    <div
      className="sz-shell h-screen overflow-hidden text-[var(--text-primary)]"
      style={{
        background:
          "radial-gradient(circle at top, rgba(107,119,255,0.1), transparent 18%), radial-gradient(circle at bottom right, rgba(31,38,58,0.42), transparent 32%), linear-gradient(180deg,#07090f 0%,#05070b 100%)",
      }}
    >
      <div className="relative flex h-full flex-col">
        <EditorTopBar
          project={project}
          leftOpen={leftOpen}
          rightOpen={rightOpen}
          onToggleLeft={toggleLeft}
          onToggleRight={toggleRight}
          iframeRef={previewIframeRef}
        />

        <div className="flex min-h-0 flex-1 gap-3 px-3 pb-3 pt-2">
        <div
          className="flex-shrink-0 overflow-hidden transition-[width,padding] duration-200"
          style={{
            width: leftOpen ? 300 : 0,
            transition: "width 200ms cubic-bezier(.4,0,.2,1)",
          }}
        >
          <div style={{ width: 300, height: "100%" }}>
            <EditorErrorBoundary label="Structure">
              <LeftSidebar project={project} />
            </EditorErrorBoundary>
          </div>
        </div>

        <div className="min-w-0 flex-1 overflow-hidden">
          <EditorErrorBoundary label="Canvas">
            <PreviewCanvas project={project} iframeRef={previewIframeRef} />
          </EditorErrorBoundary>
        </div>

        <div
          className="flex-shrink-0 overflow-hidden transition-[width,padding] duration-200"
          style={{
            width: rightOpen ? 372 : 0,
            transition: "width 200ms cubic-bezier(.4,0,.2,1)",
          }}
        >
          <div style={{ width: 372, height: "100%" }}>
            <EditorErrorBoundary label="Inspector">
              <RightSidebar project={project} />
            </EditorErrorBoundary>
          </div>
        </div>
      </div>
      </div>

      {isFullPreview && <FullPreviewModal project={project} />}
    </div>
  );
}
