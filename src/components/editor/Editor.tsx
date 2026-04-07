"use client";
import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { DB_READ_001, logAppError, normalizeError } from "@/lib/errors";
import { EditorTopBar } from "./EditorTopBar";
import { LeftSidebar } from "./LeftSidebar";
import { PreviewCanvas } from "./PreviewCanvas";
import { RightSidebar } from "./RightSidebar";
import { FullPreviewModal } from "./FullPreviewModal";
import { EditorErrorBoundary } from "./EditorErrorBoundary";
import type { Project, UserAccountProfile } from "@/types";

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

export function Editor({ initialAccount = null }: { initialAccount?: UserAccountProfile | null }) {
  const previewIframeRef   = useRef<HTMLIFrameElement | null>(null);
  const currentProjectId   = useAppStore((s) => s.currentProjectId);
  const projects           = useAppStore((s) => s.projects);
  const isSaved            = useAppStore((s) => s.isSaved);
  const saveState          = useAppStore((s) => s.saveState);
  const saveCurrentProject = useAppStore((s) => s.saveCurrentProject);
  const syncProjectFromServer = useAppStore((s) => s.syncProjectFromServer);
  const setGenStatus = useAppStore((s) => s.setGenStatus);
  const setApiError = useAppStore((s) => s.setApiError);
  const isFullPreview      = useAppStore((s) => s.editor.isFullPreview);
  const generationStatus   = useAppStore((s) => s.generationStatus);
  const leftOpen           = useAppStore((s) => s.editor.leftSidebarOpen);
  const rightOpen          = useAppStore((s) => s.editor.rightSidebarOpen);
  const toggleLeft         = useAppStore((s) => s.toggleLeftSidebar);
  const toggleRight        = useAppStore((s) => s.toggleRightSidebar);

  const raw = projects.find((p) => p.id === currentProjectId);
  const backgroundJobActive =
    raw?.generationJob?.status === "queued" || raw?.generationJob?.status === "running";
  const backgroundProgress = raw?.generationJob?.progressMessage?.trim() || "";
  const hasGeneratingPages = raw?.pages?.some((page) => page.status === "pending" || page.status === "generating");
  const isGenerating =
    generationStatus === "blueprint" ||
    generationStatus === "pages" ||
    generationStatus === "normalizing" ||
    backgroundJobActive ||
    raw?.status === "generating" ||
    hasGeneratingPages;
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

      // ⌘\ → left sidebar, ⌘⇧\ → right sidebar
      // Note: Shift+\ produces "|" on US keyboards
      if (e.key === "\\" && !e.shiftKey) {
        e.preventDefault();
        toggleLeft();
        return;
      }
      if ((e.key === "|" || (e.key === "\\" && e.shiftKey))) {
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
    if (isGenerating) return;
    const t = setTimeout(() => void saveCurrentProject(), 2500);
    return () => clearTimeout(t);
  }, [currentProjectId, isGenerating, isSaved, saveCurrentProject, saveState]);

  // Warn before closing with unsaved changes
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!isSaved) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isSaved]);

  useEffect(() => {
    if (!raw) return;
    const stillGenerating =
      raw.status === "generating" ||
      raw.pages.some((page) => page.status === "pending" || page.status === "generating");
    if (stillGenerating) return;
    if (generationStatus === "idle") return;
    setGenStatus(raw.status === "error" ? "error" : "idle", raw.status === "error" ? "Generation failed" : "");
  }, [generationStatus, raw, setGenStatus]);

  useEffect(() => {
    if (!backgroundJobActive) return;

    setGenStatus(
      raw?.blueprint ? "pages" : "blueprint",
      backgroundProgress || (raw?.blueprint ? "Generating page..." : "Analyzing your brief...")
    );
  }, [backgroundJobActive, backgroundProgress, raw?.blueprint, setGenStatus]);

  useEffect(() => {
    if (!currentProjectId || !backgroundJobActive) return;

    let cancelled = false;

    const sync = async () => {
      try {
        await syncProjectFromServer(currentProjectId, {
          preserveEditor: true,
          preserveHistory: true,
        });
      } catch (error) {
        if (cancelled) return;
        const appError = normalizeError(error, DB_READ_001, {
          action: "pollBackgroundGenerationProject",
          projectId: currentProjectId,
        });
        logAppError(appError);
        setApiError({
          message: appError.userMessage,
          requestId:
            typeof appError.metadata?.requestId === "string" && appError.metadata.requestId.trim()
              ? appError.metadata.requestId
              : null,
          code: appError.code,
        });
      }
    };

    void sync();
    const interval = window.setInterval(() => {
      void sync();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [backgroundJobActive, currentProjectId, setApiError, syncProjectFromServer]);

  return (
    <div
      className="sz-shell h-screen overflow-hidden text-[var(--text-primary)]"
      style={{
        background: "var(--surface-editor-shell)",
      }}
    >
      <div className="relative flex h-full flex-col">
        <EditorTopBar
          project={project}
          initialAccount={initialAccount}
          leftOpen={leftOpen}
          rightOpen={rightOpen}
          onToggleLeft={toggleLeft}
          onToggleRight={toggleRight}
          iframeRef={previewIframeRef}
        />

        <div
          className="grid min-h-0 flex-1 px-3 pb-3 pt-2"
          style={{
            gridTemplateColumns: `${leftOpen ? LEFT_SIDEBAR_WIDTH : 0}px 1fr ${rightOpen ? RIGHT_SIDEBAR_WIDTH : 0}px`,
            gap: 12,
            transition: "grid-template-columns 220ms cubic-bezier(0.4,0,0.2,1)",
          }}
        >
        <div className="overflow-hidden">
          <div style={{ width: LEFT_SIDEBAR_WIDTH, height: "100%" }}>
            <EditorErrorBoundary label="Structure">
              <LeftSidebar project={project} />
            </EditorErrorBoundary>
          </div>
        </div>

        <div className="min-w-0 overflow-hidden">
          <EditorErrorBoundary label="Canvas">
            <PreviewCanvas project={project} iframeRef={previewIframeRef} />
          </EditorErrorBoundary>
        </div>

        <div className="overflow-hidden">
          <div style={{ width: RIGHT_SIDEBAR_WIDTH, height: "100%" }}>
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
