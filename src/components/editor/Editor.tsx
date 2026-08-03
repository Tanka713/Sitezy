"use client";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { projectHasActiveGeneration } from "@/lib/project-generation";
import { DB_READ_001, logAppError, normalizeError } from "@/lib/errors";
import { EditorTopBar } from "./EditorTopBar";
import { LeftSidebar } from "./LeftSidebar";
import { PreviewCanvas } from "./PreviewCanvas";
import { RightSidebar } from "./RightSidebar";
import { FullPreviewModal } from "./FullPreviewModal";
import { EditorErrorBoundary } from "./EditorErrorBoundary";
import { EditorCollaborationLayer } from "./EditorCollaborationLayer";
import type { Project, UserAccountProfile } from "@/types";

type SidebarSide = "left" | "right";

const LEFT_SIDEBAR_MIN_WIDTH = 220;
const LEFT_SIDEBAR_MAX_WIDTH = 420;
const RIGHT_SIDEBAR_MIN_WIDTH = 260;
const RIGHT_SIDEBAR_MAX_WIDTH = 520;
const SIDEBAR_CLOSE_DRAG_THRESHOLD = 40;
const SIDEBAR_REOPEN_DRAG_WIDTH = 8;

function clampSidebarWidth(width: number, min: number, max: number) {
  return Math.round(Math.min(max, Math.max(min, width)));
}

function clampLiveSidebarWidth(width: number, max: number) {
  return Math.round(Math.min(max, Math.max(0, width)));
}

function sidebarWidthVariable(side: SidebarSide, fallback: number) {
  return side === "left"
    ? `var(--left-sidebar-width, ${fallback}px)`
    : `var(--right-sidebar-width, ${fallback}px)`;
}

function safe(p: Project): Project {
  return {
    ...p,
    pages: Array.isArray(p.pages) ? p.pages : [],
    files: p.files && typeof p.files === "object" ? p.files : {},
    blueprint: p.blueprint ?? null,
  };
}

function SidebarResizeHandle({
  side,
  active,
  onPointerDown,
}: {
  side: "left" | "right";
  active: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  const positionClass = side === "left" ? "right-0" : "left-0";
  const linePositionClass = side === "left" ? "right-0" : "left-0";
  const resizeLabel = side === "left" ? "Resize left sidebar" : "Resize right sidebar";

  return (
    <div className={`absolute ${positionClass} inset-y-0 z-20 w-6`}>
      <button
        type="button"
        aria-label={resizeLabel}
        title={resizeLabel}
        onPointerDown={onPointerDown}
        className={`group absolute ${positionClass} inset-y-0 w-4 touch-none cursor-col-resize bg-transparent`}
      >
        <span
          className={`absolute ${linePositionClass} top-1/2 h-20 w-px -translate-y-1/2 rounded-full transition-all ${
            active
              ? "bg-[var(--border-focus)] opacity-100"
              : "bg-[var(--border-soft)] opacity-15 group-hover:opacity-75 group-hover:bg-[var(--border-strong)]"
          }`}
        />
      </button>
    </div>
  );
}

function SidebarReopenHandle({
  side,
  active,
  onPointerDown,
}: {
  side: "left" | "right";
  active: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  const positionClass = side === "left" ? "left-0" : "right-0";
  const linePositionClass = side === "left" ? "left-0" : "right-0";
  const label = side === "left" ? "Open left sidebar by dragging" : "Open right sidebar by dragging";

  return (
    <div className={`absolute ${positionClass} inset-y-0 z-20`} style={{ width: SIDEBAR_REOPEN_DRAG_WIDTH }}>
      <button
        type="button"
        aria-label={label}
        title={label}
        onPointerDown={onPointerDown}
        className={`group absolute ${positionClass} inset-y-0 touch-none cursor-col-resize bg-transparent`}
        style={{ width: SIDEBAR_REOPEN_DRAG_WIDTH }}
      >
        <span
          className={`absolute ${linePositionClass} top-1/2 h-16 w-px -translate-y-1/2 rounded-full transition-all ${
            active
              ? "bg-[var(--border-focus)] opacity-100"
              : "bg-[var(--border-soft)] opacity-0 group-hover:opacity-60 group-hover:bg-[var(--border-strong)]"
          }`}
        />
      </button>
    </div>
  );
}

export function Editor({ initialAccount = null }: { initialAccount?: UserAccountProfile | null }) {
  const previewIframeRef   = useRef<HTMLIFrameElement | null>(null);
  const editorLayoutRef    = useRef<HTMLDivElement | null>(null);
  const animationFrameRef  = useRef<number | null>(null);
  const liveSidebarWidthRef = useRef<Record<SidebarSide, number>>({
    left: LEFT_SIDEBAR_MIN_WIDTH,
    right: RIGHT_SIDEBAR_MIN_WIDTH,
  });
  const pendingSidebarWidthRef = useRef<Partial<Record<SidebarSide, number>>>({});
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
  const leftPanelWidth     = useAppStore((s) => s.editor.leftPanelWidth);
  const rightPanelWidth    = useAppStore((s) => s.editor.rightPanelWidth);
  const toggleLeft         = useAppStore((s) => s.toggleLeftSidebar);
  const toggleRight        = useAppStore((s) => s.toggleRightSidebar);
  const setLeftPanelWidth  = useAppStore((s) => s.setLeftPanelWidth);
  const setRightPanelWidth = useAppStore((s) => s.setRightPanelWidth);
  const clearCanvasSelection = useAppStore((s) => s.clearCanvasSelection);
  const setVisualEditMode = useAppStore((s) => s.setVisualEditMode);
  const [resizingSidebar, setResizingSidebar] = useState<"left" | "right" | null>(null);
  const [collapseOnRelease, setCollapseOnRelease] = useState<"left" | "right" | null>(null);

  const raw = projects.find((p) => p.id === currentProjectId);
  const backgroundJobActive =
    raw?.generationJob?.status === "queued" || raw?.generationJob?.status === "running";
  const backgroundProgress = raw?.generationJob?.progressMessage?.trim() || "";
  const isGenerating = projectHasActiveGeneration(raw ?? null, generationStatus);
  if (!raw) return null;
  const project = safe(raw);
  const resolvedLeftPanelWidth = clampSidebarWidth(leftPanelWidth, LEFT_SIDEBAR_MIN_WIDTH, LEFT_SIDEBAR_MAX_WIDTH);
  const resolvedRightPanelWidth = clampSidebarWidth(rightPanelWidth, RIGHT_SIDEBAR_MIN_WIDTH, RIGHT_SIDEBAR_MAX_WIDTH);

  function setLiveSidebarWidth(side: SidebarSide, width: number) {
    liveSidebarWidthRef.current[side] = width;

    const layout = editorLayoutRef.current;
    if (!layout) return;

    layout.style.setProperty(
      side === "left" ? "--left-sidebar-width" : "--right-sidebar-width",
      `${width}px`
    );
  }

  function flushQueuedSidebarWidths() {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const pending = pendingSidebarWidthRef.current;
    pendingSidebarWidthRef.current = {};

    if (typeof pending.left === "number") {
      setLiveSidebarWidth("left", pending.left);
    }
    if (typeof pending.right === "number") {
      setLiveSidebarWidth("right", pending.right);
    }
  }

  function queueSidebarWidth(side: SidebarSide, width: number) {
    pendingSidebarWidthRef.current[side] = width;

    if (animationFrameRef.current !== null) return;

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      flushQueuedSidebarWidths();
    });
  }

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

  useEffect(() => {
    if (!isGenerating) return;
    clearCanvasSelection();
    setVisualEditMode(false);
  }, [clearCanvasSelection, isGenerating, setVisualEditMode]);

  useEffect(() => {
    if (resizingSidebar !== "left") {
      setLiveSidebarWidth("left", resolvedLeftPanelWidth);
    }
  }, [resizingSidebar, resolvedLeftPanelWidth]);

  useEffect(() => {
    if (resizingSidebar !== "right") {
      setLiveSidebarWidth("right", resolvedRightPanelWidth);
    }
  }, [resizingSidebar, resolvedRightPanelWidth]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!resizingSidebar) return;
    const activeSidebar = resizingSidebar;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function finishResize(commitCollapse: boolean) {
      flushQueuedSidebarWidths();

      if (commitCollapse && collapseOnRelease === activeSidebar) {
        collapseSidebar(activeSidebar);
        return;
      }

      const finalWidth = liveSidebarWidthRef.current[activeSidebar];
      if (activeSidebar === "left") {
        setLeftPanelWidth(clampSidebarWidth(finalWidth, LEFT_SIDEBAR_MIN_WIDTH, LEFT_SIDEBAR_MAX_WIDTH));
      } else {
        setRightPanelWidth(clampSidebarWidth(finalWidth, RIGHT_SIDEBAR_MIN_WIDTH, RIGHT_SIDEBAR_MAX_WIDTH));
      }

      setResizingSidebar(null);
      setCollapseOnRelease(null);
    }

    function handlePointerMove(event: PointerEvent) {
      updateSidebarWidth(activeSidebar, event.clientX);
    }

    function handlePointerUp() {
      finishResize(true);
    }

    function cancelResize() {
      finishResize(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", cancelResize);
    window.addEventListener("blur", cancelResize);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", cancelResize);
      window.removeEventListener("blur", cancelResize);
    };
  }, [collapseOnRelease, resizingSidebar, setLeftPanelWidth, setRightPanelWidth]);

  function collapseSidebar(side: SidebarSide) {
    setResizingSidebar(null);
    setCollapseOnRelease(null);

    if (side === "left") {
      setLiveSidebarWidth("left", LEFT_SIDEBAR_MIN_WIDTH);
      setLeftPanelWidth(LEFT_SIDEBAR_MIN_WIDTH);
      if (leftOpen) toggleLeft();
      return;
    }

    setLiveSidebarWidth("right", RIGHT_SIDEBAR_MIN_WIDTH);
    setRightPanelWidth(RIGHT_SIDEBAR_MIN_WIDTH);
    if (rightOpen) toggleRight();
  }

  function updateSidebarWidth(side: SidebarSide, clientX: number) {
    const rect = editorLayoutRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (side === "left") {
      const nextWidth = clientX - rect.left;
      if (nextWidth <= LEFT_SIDEBAR_MIN_WIDTH - SIDEBAR_CLOSE_DRAG_THRESHOLD) {
        setCollapseOnRelease("left");
        queueSidebarWidth("left", clampLiveSidebarWidth(nextWidth, LEFT_SIDEBAR_MAX_WIDTH));
        return;
      }
      setCollapseOnRelease(null);
      queueSidebarWidth("left", clampLiveSidebarWidth(nextWidth, LEFT_SIDEBAR_MAX_WIDTH));
      return;
    }

    const nextWidth = rect.right - clientX;
    if (nextWidth <= RIGHT_SIDEBAR_MIN_WIDTH - SIDEBAR_CLOSE_DRAG_THRESHOLD) {
      setCollapseOnRelease("right");
      queueSidebarWidth("right", clampLiveSidebarWidth(nextWidth, RIGHT_SIDEBAR_MAX_WIDTH));
      return;
    }

    setCollapseOnRelease(null);
    queueSidebarWidth("right", clampLiveSidebarWidth(nextWidth, RIGHT_SIDEBAR_MAX_WIDTH));
  }

  function startSidebarResize(side: SidebarSide, clientX: number, options?: { reveal?: boolean }) {
    const reveal = options?.reveal ?? false;

    if (reveal) {
      if (side === "left" && !leftOpen) {
        setLiveSidebarWidth("left", LEFT_SIDEBAR_MIN_WIDTH);
        toggleLeft();
      }

      if (side === "right" && !rightOpen) {
        setLiveSidebarWidth("right", RIGHT_SIDEBAR_MIN_WIDTH);
        toggleRight();
      }
    }

    setResizingSidebar(side);
    setCollapseOnRelease(null);

    if (reveal) {
      window.requestAnimationFrame(() => updateSidebarWidth(side, clientX));
      return;
    }

    updateSidebarWidth(side, clientX);
  }

  function beginSidebarResize(side: SidebarSide, event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
    startSidebarResize(side, event.clientX);
  }

  function beginSidebarReveal(side: SidebarSide, event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    startSidebarResize(side, event.clientX, { reveal: true });
  }

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
        <EditorCollaborationLayer project={project} initialAccount={initialAccount} />

        <div
          ref={editorLayoutRef}
          className="relative grid min-h-0 flex-1 pb-2 pt-2"
          style={{
            gridTemplateColumns: `${leftOpen ? sidebarWidthVariable("left", resolvedLeftPanelWidth) : "0px"} 1fr ${rightOpen ? sidebarWidthVariable("right", resolvedRightPanelWidth) : "0px"}`,
            gap: 0,
            transition: resizingSidebar ? "none" : "grid-template-columns 220ms cubic-bezier(0.4,0,0.2,1)",
          }}
        >
        <div className="relative overflow-hidden">
          <div style={{ width: sidebarWidthVariable("left", resolvedLeftPanelWidth), height: "100%" }}>
            <EditorErrorBoundary label="Structure">
              <LeftSidebar project={project} edge="left" />
            </EditorErrorBoundary>
          </div>
          {leftOpen ? (
            <SidebarResizeHandle
              side="left"
              active={resizingSidebar === "left"}
              onPointerDown={(event) => beginSidebarResize("left", event)}
            />
          ) : null}
        </div>

        <div className="min-w-0 overflow-hidden px-2">
          <EditorErrorBoundary label="Canvas">
            <PreviewCanvas project={project} iframeRef={previewIframeRef} />
          </EditorErrorBoundary>
        </div>

        <div className="relative overflow-hidden">
          {rightOpen ? (
            <SidebarResizeHandle
              side="right"
              active={resizingSidebar === "right"}
              onPointerDown={(event) => beginSidebarResize("right", event)}
            />
          ) : null}
          <div style={{ width: sidebarWidthVariable("right", resolvedRightPanelWidth), height: "100%" }}>
            <EditorErrorBoundary label="Inspector">
              <RightSidebar project={project} edge="right" />
            </EditorErrorBoundary>
          </div>
        </div>

        {!leftOpen ? (
          <SidebarReopenHandle
            side="left"
            active={resizingSidebar === "left"}
            onPointerDown={(event) => beginSidebarReveal("left", event)}
          />
        ) : null}
        {!rightOpen ? (
          <SidebarReopenHandle
            side="right"
            active={resizingSidebar === "right"}
            onPointerDown={(event) => beginSidebarReveal("right", event)}
          />
        ) : null}

        {resizingSidebar ? (
          <div className="absolute inset-0 z-30 cursor-col-resize" />
        ) : null}
      </div>
      </div>

      {isFullPreview && <FullPreviewModal project={project} />}
    </div>
  );
}
