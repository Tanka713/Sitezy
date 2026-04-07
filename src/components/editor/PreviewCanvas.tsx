"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { isSignificantNode, type LiveIntelligenceSuggestion } from "@/lib/editor/intelligence";
import { derivePageStateFromHtml } from "@/lib/editor/structure";
import { useAppStore } from "@/lib/store";
import { API_UNKNOWN_001, createAppError, logAppError, normalizeError, type ErrorCode } from "@/lib/errors";
import { buildFullPageHtml } from "@/lib/utils";
import { buildVisualEditorScript } from "@/lib/utils/visualEditor";
import {
  Loader2, MousePointer2, Eye, Code2, Columns,
  Undo2, Redo2, Monitor, Tablet, Smartphone,
  ChevronUp, Scissors, Sparkles, Trash2, Copy, ClipboardPaste,
  ChevronRight, Minus, Plus, Edit2,
} from "lucide-react";
import type { CanvasNodeInfo, Project } from "@/types";

interface Props {
  project: Project;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

const DEVICE_WIDTHS: Record<string, string> = {
  desktop: "100%",
  tablet:  "768px",
  mobile:  "390px",
};

// Injected in non-visual-edit preview mode: intercepts page-link clicks
// (sends navigate-page to parent) and handles anchor scrolling.
const NAV_GUARD_SCRIPT = `<script>
(function(){
  function szNav(href){
    if(!href||href.startsWith('mailto:')||href.startsWith('tel:')||href.startsWith('http')||href.startsWith('//'))return false;
    try{window.parent.postMessage({source:'sitezy-editor',type:'navigate-page',payload:{href:href}},'*');}catch(ex){}
    return true;
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a');
    if(a){
      var href=a.getAttribute('href')||'';
      if(!href)return;
      if(href.startsWith('#')){
        var id=href.slice(1);
        if(id){
          var tgt=document.getElementById(id)||document.querySelector('[data-sz-section-id="'+id+'"]');
          if(tgt){e.preventDefault();tgt.scrollIntoView({behavior:'smooth',block:'start'});return;}
          e.preventDefault();szNav('/'+id);return;
        }
        e.preventDefault();return;
      }
      e.preventDefault();szNav(href);return;
    }
    // Also handle <button> elements inside navbar sections
    var btn=e.target.closest&&e.target.closest('nav button,[data-sz-section-type="navbar"] button,header button');
    if(btn){
      var bHref=btn.getAttribute('data-href')||btn.getAttribute('href')||'';
      if(!bHref){
        var onc=btn.getAttribute('onclick')||'';
        var m=onc.match(/location\.href\s*=\s*['"]([^'"]+)['"]/);
        if(m)bHref=m[1];
      }
      if(bHref&&szNav(bHref)){e.preventDefault();}
    }
  },true);
  // E key bridge — forward to parent even when visual-editor script isn't loaded
  document.addEventListener('keydown',function(e){
    if((e.key==='e'||e.key==='E')&&!e.metaKey&&!e.ctrlKey&&!e.altKey){
      var tag=(document.activeElement&&document.activeElement.tagName)||'';
      var ce=(document.activeElement&&document.activeElement.getAttribute&&document.activeElement.getAttribute('contenteditable'));
      if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||ce==='true')return;
      e.preventDefault();
      try{window.parent.postMessage({source:'sitezy-editor',type:'toggle-edit-mode',payload:{}},'*');}catch(ex){}
    }
  },true);
})();
<\/script>`;

function ToolbarTooltip({ label, shortcut }: { label: string; shortcut?: string }) {
  return (
    <span className="sz-tooltip pointer-events-none absolute left-1/2 top-full z-[120] mt-2 -translate-x-1/2 whitespace-nowrap rounded-[10px] px-2.5 py-1 text-[10px] font-medium opacity-0 shadow-[0_12px_28px_rgba(0,0,0,0.34)] transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
      {label}
      {shortcut ? <span className="ml-1 text-[9px] font-normal text-[var(--fg-muted)]">({shortcut})</span> : null}
    </span>
  );
}

export function PreviewCanvas({ project, iframeRef }: Props) {
  const internalIframeRef = useRef<HTMLIFrameElement>(null);
  const liveCardRef = useRef<HTMLDivElement | null>(null);
  const previewMode       = useAppStore((s) => s.editor.previewMode);
  const devicePreview     = useAppStore((s) => s.editor.devicePreview);
  const selectedPageId    = useAppStore((s) => s.editor.selectedPageId);
  const selectedFileId    = useAppStore((s) => s.editor.selectedFileId);
  const selectedNode      = useAppStore((s) => s.editor.selectedNode);
  const leftPanelTab      = useAppStore((s) => s.editor.leftPanelTab);
  const visualEditMode    = useAppStore((s) => s.editor.visualEditMode);
  const setVisualEditMode = useAppStore((s) => s.setVisualEditMode);
  const setPreviewMode    = useAppStore((s) => s.setPreviewMode);
  const setDevicePreview  = useAppStore((s) => s.setDevicePreview);
  const updateFileContent = useAppStore((s) => s.updateFileContent);
  const generationLog     = useAppStore((s) => s.generationLog);
  const selectSection     = useAppStore((s) => s.selectSection);
  const selectPage        = useAppStore((s) => s.selectPage);
  const setCanvasSelection = useAppStore((s) => s.setCanvasSelection);
  const clearCanvasSelection = useAppStore((s) => s.clearCanvasSelection);
  const setAiDraftPrompt      = useAppStore((s) => s.setAiDraftPrompt);
  const setRightPanel         = useAppStore((s) => s.setRightPanel);
  const leftSidebarOpen       = useAppStore((s) => s.editor.leftSidebarOpen);
  const rightSidebarOpen      = useAppStore((s) => s.editor.rightSidebarOpen);
  const toggleLeftSidebar     = useAppStore((s) => s.toggleLeftSidebar);
  const toggleRightSidebar    = useAppStore((s) => s.toggleRightSidebar);
  const undo              = useAppStore((s) => s.undo);
  const redo              = useAppStore((s) => s.redo);
  const undoStack          = useAppStore((s) => s.undoStack);
  const redoStack          = useAppStore((s) => s.redoStack);
  const generationStatus   = useAppStore((s) => s.generationStatus);
  const generationProgress = useAppStore((s) => s.generationProgress);

  const [zoom, setZoom] = useState(100);
  const zoomRef = useRef(100);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  const [showErrorLog, setShowErrorLog] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: CanvasNodeInfo } | null>(null);
  const [iframeCanUndo, setIframeCanUndo] = useState(false);
  const [iframeCanRedo, setIframeCanRedo] = useState(false);
  const [iframeHasClipboard, setIframeHasClipboard] = useState(false);
  const [breadcrumb, setBreadcrumb]   = useState<string[]>([]);
  const [localCode, setLocalCode]     = useState("");
  const [iframeReady, setIframeReady] = useState(false);
  const [isIframeEditing, setIsIframeEditing] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<CanvasNodeInfo | null>(null);
  const [liveSuggestions, setLiveSuggestions] = useState<LiveIntelligenceSuggestion[]>([]);
  const [liveCardVisible, setLiveCardVisible] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveIsAI, setLiveIsAI] = useState(false);
  const aiCacheRef = useRef<Map<string, LiveIntelligenceSuggestion[]>>(new Map());
  // Ref so postMessage handlers always read the latest visualEditMode value
  const visualEditModeRef = useRef(visualEditMode);
  useEffect(() => { visualEditModeRef.current = visualEditMode; }, [visualEditMode]);

  // Tracks the last HTML the iframe sent us via html-update.
  // Used to break the circular update loop:
  //   iframe edits → html-update → updateFileContent → page.html changes
  //   → useEffect would rewrite iframe → losing selection + undo stack
  // When page.html === lastIframeHtmlRef.current we know the change
  // originated from the iframe itself, so we skip the rewrite.
  const lastIframeHtmlRef = useRef<string>("");
  const pendingHtmlRef = useRef<string | null>(null);
  const htmlSyncTimerRef = useRef<number | null>(null);
  const hoverHideTimerRef = useRef<number | null>(null);

  const pages = project?.pages ?? [];
  const files = project?.files ?? {};

  const activePageId = leftPanelTab === "files" && selectedFileId ? selectedFileId : selectedPageId;
  const page = pages.find((p) => p.id === activePageId) ?? null;
  const file = files[selectedFileId ?? ""] ?? null;
  const codeContextKeyRef = useRef<string>("");
  const hasGeneratingPages = pages.some((entry) => entry.status === "pending" || entry.status === "generating");
  const backgroundProgress =
    project.generationJob?.status === "queued" || project.generationJob?.status === "running"
      ? project.generationJob.progressMessage?.trim() || ""
      : "";
  const backgroundJobActive =
    project.generationJob?.status === "queued" || project.generationJob?.status === "running";
  const isGlobalGenerating =
    generationStatus === "blueprint" ||
    generationStatus === "pages" ||
    generationStatus === "normalizing" ||
    backgroundJobActive ||
    project.status === "generating" ||
    hasGeneratingPages;
  const progressLower = (backgroundProgress || generationProgress.trim()).toLowerCase();
  const progressTargetsCurrentPage = !!page?.name && progressLower.includes(page.name.trim().toLowerCase());
  const showGeneratingState =
    page?.status === "pending" ||
    page?.status === "generating" ||
    (isGlobalGenerating && (!activePageId || !page?.html || progressTargetsCurrentPage));
  const generatingLabel =
    backgroundProgress ||
    generationProgress.trim() ||
    (page?.status === "generating"
      ? page.name
        ? `Regenerating ${page.name}`
        : "Regenerating page"
      : page?.status === "pending"
        ? page.name
          ? `Generating ${page.name}`
          : "Generating page"
      : page?.name
        ? `Generating ${page.name}`
        : pages.length === 0
          ? "Analyzing your brief"
          : "Generating page");

  const codeContent = (leftPanelTab === "files" && file && file.type !== "html")
    ? file.content : page?.html ?? "";
  const codeFileName = leftPanelTab === "files" && file
    ? file.name
    : `${(page?.slug || page?.name?.toLowerCase().replace(/\s+/g, "-") || "page").replace(/[^a-z0-9-]/gi, "") || "page"}.html`;
  const codeLanguage = leftPanelTab === "files" && file
    ? file.language || file.type || "html"
    : "html";
  useEffect(() => { setLocalCode(codeContent); }, [codeContent, activePageId, selectedFileId]);
  useEffect(() => {
    if (visualEditMode && previewMode !== "preview") setPreviewMode("preview");
  }, [visualEditMode]);

  useEffect(() => {
    if (!iframeRef) return;
    (iframeRef as React.MutableRefObject<HTMLIFrameElement | null>).current = internalIframeRef.current;
  });

  const clearLiveLayer = useCallback(() => {
    if (hoverHideTimerRef.current) { window.clearTimeout(hoverHideTimerRef.current); hoverHideTimerRef.current = null; }
    setLiveCardVisible(false);
    setLiveLoading(false);
    setLiveIsAI(false);
    setHoveredNode(null);
    setLiveSuggestions([]);
  }, []);


  /** Fetch AI suggestions for a section, using a per-section cache */
  const fetchAISuggestions = useCallback(async (payload: {
    sectionId: string | null;
    sectionName: string | null;
    sectionType: string | null;
    sectionHtml: string;
    nodeTag: string | null;
    nodeRole?: string | null;
  }) => {
    const cacheKey = payload.sectionId ?? payload.sectionName ?? "default";
    const cached = aiCacheRef.current.get(cacheKey);
    if (cached) {
      setLiveSuggestions(cached);
      setLiveIsAI(true);
      setLiveLoading(false);
      setLiveCardVisible(true);
      return;
    }
    setLiveLoading(true);
    setLiveCardVisible(true);
    try {
      const res = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionHtml:  payload.sectionHtml,
          sectionName:  payload.sectionName ?? "Section",
          sectionType:  payload.sectionType ?? "section",
          nodeTag:      payload.nodeTag,
          nodeRole:     payload.nodeRole ?? null,
          pageName:     page?.name ?? "Page",
          blueprint:    project?.blueprint ?? null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; code?: string; requestId?: string | null };
        throw createAppError({
          code: (data.code as ErrorCode | undefined) ?? API_UNKNOWN_001,
          devMessage: `Live intelligence request failed (${res.status}): ${data.error ?? "unknown error"}`,
          userMessage: data.error,
          severity: res.status >= 500 ? "error" : "warn",
          metadata: {
            pageId: page?.id ?? null,
            pageName: page?.name ?? null,
            sectionId: payload.sectionId ?? null,
            sectionName: payload.sectionName ?? null,
            requestId: data.requestId ?? null,
            status: res.status,
          },
        });
      }
      const data = await res.json() as { suggestions: LiveIntelligenceSuggestion[] };
      if (data.suggestions?.length) {
        aiCacheRef.current.set(cacheKey, data.suggestions);
        setLiveSuggestions(data.suggestions);
        setLiveIsAI(true);
      }
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, {
        action: "liveIntelligence",
        pageId: page?.id ?? null,
        pageName: page?.name ?? null,
        nodeTag: payload.nodeTag,
        sectionId: payload.sectionId ?? null,
      });
      logAppError(appErr);
      // On failure keep the static suggestions already shown
    } finally {
      setLiveLoading(false);
    }
  }, [page?.name, project?.blueprint]);

  const writeToIframe = useCallback((html: string, withEditor: boolean) => {
    const iframe = internalIframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    const script = withEditor ? buildVisualEditorScript() : NAV_GUARD_SCRIPT;
    const safeHtml = derivePageStateFromHtml(html).html;
    const full   = buildFullPageHtml(safeHtml, project?.blueprint ?? null, page?.name ?? "", script);
    doc.open(); doc.write(full); doc.close();
  }, [project?.blueprint, page?.name]);

  const prevPreviewMode = useRef(previewMode);
  useEffect(() => {
    if (prevPreviewMode.current === "code" && previewMode !== "code") {
      lastIframeHtmlRef.current = "";
    }
    prevPreviewMode.current = previewMode;
  }, [previewMode]);

  useEffect(() => {
    const iframe = internalIframeRef.current;
    if (!iframe || !iframeReady) return;
    if (!page?.html) {
      const doc = iframe.contentDocument;
      if (doc) { doc.open(); doc.write(emptyState(showGeneratingState, page?.status === "error", generatingLabel)); doc.close(); }
      return;
    }
    // Skip rewrite if the HTML change originated from the iframe itself
    // (via html-update postMessage). The iframe already has this content —
    // rewriting would destroy selection state and the iframe's own undo stack.
    if (visualEditMode && page.html === lastIframeHtmlRef.current) return;
    lastIframeHtmlRef.current = "";
    writeToIframe(page.html, visualEditMode);
  }, [generatingLabel, iframeReady, page?.html, page?.id, page?.status, previewMode, showGeneratingState, visualEditMode, writeToIframe]);

  // postMessage from iframe
  useEffect(() => {
    function handler(e: MessageEvent) {
      if (!e.data || e.data.source !== "sitezy-editor") return;
      const { type, payload } = e.data;
      if (type === "html-update") {
        const html = payload?.html as string;
        if (html && activePageId) {
          const normalized = derivePageStateFromHtml(html).html;
          lastIframeHtmlRef.current = normalized;
          pendingHtmlRef.current = normalized;
          if (htmlSyncTimerRef.current) {
            window.clearTimeout(htmlSyncTimerRef.current);
          }
          htmlSyncTimerRef.current = window.setTimeout(() => {
            if (pendingHtmlRef.current && activePageId) {
              updateFileContent(activePageId, pendingHtmlRef.current);
              pendingHtmlRef.current = null;
            }
            htmlSyncTimerRef.current = null;
          }, 700);
        }
      }
      if (type === "stack-change") {
        setIframeCanUndo(!!payload?.canUndo);
        setIframeCanRedo(!!payload?.canRedo);
      }
      if (type === "stack") {
        setIframeCanUndo(!!payload?.u);
        setIframeCanRedo(!!payload?.r);
      }
      if (type === "clipboard-state") {
        setIframeHasClipboard(!!payload?.has);
      }
      if (type === "navigate-page") {
        const href = payload?.href as string;
        if (!href) return;
        const pages = project?.pages ?? [];
        const slug = href.replace(/^\//, "").replace(/\/$/, "") || "home";
        const target = pages.find((p) =>
          (p.slug || p.name.toLowerCase().replace(/\s+/g, "-")) === slug ||
          p.name.toLowerCase().replace(/\s+/g, "-") === slug ||
          (slug === "home" && (p.slug === "home" || p.name.toLowerCase() === "home")) ||
          (slug === "" && (p.slug === "home" || p.name.toLowerCase() === "home"))
        );
        if (target) selectPage(target.id);
      }
      if (type === "select" || type === "editing") {
        const sid = (payload?.sectionId as string | null) ?? null;
        setIsIframeEditing(type === "editing");
        clearLiveLayer();
        selectSection(sid);
        setCanvasSelection(payload, type === "editing");
        setBreadcrumb(
          Array.isArray(payload?.path) && payload.path.length > 0
            ? payload.path
            : [payload?.sectionName, payload?.label].filter(Boolean)
        );
        // Auto-switch panel: section root → Properties (content editing),
        // inner elements → Style (CSS controls).
        if (!rightSidebarOpen) toggleRightSidebar();
        const clickedRole = (payload as { role?: string } | null)?.role;
        if (clickedRole === "section") {
          setRightPanel("properties");
        } else {
          setRightPanel("style");
        }
      }
      if (type === "deselect") {
        setIsIframeEditing(false);
        selectSection(null);
        clearCanvasSelection();
        setBreadcrumb([]);
        clearLiveLayer();
      }
      if (type === "toggle-edit-mode") {
        const nextEnabled = !visualEditModeRef.current;
        setVisualEditMode(nextEnabled);
        if (nextEnabled) {
          if (!rightSidebarOpen) toggleRightSidebar();
          setRightPanel("style");
        }
      }
      if (type === "hover") {
        // Hover is tracked for context (hoveredNode) but does NOT auto-trigger analysis
        const node = payload as CanvasNodeInfo;
        if (isSignificantNode(node)) setHoveredNode(node);
      }
      if (type === "analyze-section") {
        // Triggered by I key or toolbar button — fetch real AI suggestions
        const p = payload as {
          sectionId: string | null;
          sectionName: string | null;
          sectionType: string | null;
          sectionHtml: string;
          nodeId: string | null;
          nodeTag: string | null;
        };
        // Build a minimal hoveredNode so the card header shows correct info
        setHoveredNode((prev) => prev ?? ({
          nodeId: p.nodeId ?? p.sectionId ?? "section",
          sectionId: p.sectionId,
          sectionName: p.sectionName,
          sectionType: p.sectionType,
          label: p.sectionName ?? "Section",
          tag: p.nodeTag ?? "section",
          role: "section",
          isSec: true,
        } as unknown as CanvasNodeInfo));
        fetchAISuggestions(p);
      }
      if (type === "hover-out") {
        setHoveredNode(null);
      }
      if (type === "contextmenu") {
        const iframeEl = internalIframeRef.current;
        if (!iframeEl) return;
        const rect = iframeEl.getBoundingClientRect();
        const scale = zoomRef.current / 100;
        const menuX = rect.left + (payload.x as number) * scale;
        const menuY = rect.top + (payload.y as number) * scale;
        setContextMenu({ x: menuX, y: menuY, node: payload.nodeInfo as CanvasNodeInfo });
      }
    }
    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
      if (htmlSyncTimerRef.current) {
        window.clearTimeout(htmlSyncTimerRef.current);
        htmlSyncTimerRef.current = null;
      }
      if (hoverHideTimerRef.current) {
        window.clearTimeout(hoverHideTimerRef.current);
        hoverHideTimerRef.current = null;
      }
      if (pendingHtmlRef.current && activePageId) {
        updateFileContent(activePageId, pendingHtmlRef.current);
        pendingHtmlRef.current = null;
      }
    };
  }, [activePageId, clearCanvasSelection, clearLiveLayer, fetchAISuggestions, selectSection, setCanvasSelection, updateFileContent]);

  useEffect(() => {
    if (htmlSyncTimerRef.current) {
      window.clearTimeout(htmlSyncTimerRef.current);
      htmlSyncTimerRef.current = null;
    }
    if (pendingHtmlRef.current && activePageId) {
      updateFileContent(activePageId, pendingHtmlRef.current);
      pendingHtmlRef.current = null;
    }
    clearCanvasSelection();
    selectSection(null);
    setBreadcrumb([]);
    clearLiveLayer();
  }, [activePageId, clearCanvasSelection, clearLiveLayer, selectSection]);


  function sendToIframe(type: string, payload?: Record<string, unknown>) {
    internalIframeRef.current?.contentWindow?.postMessage(
      { target: "sitezy-iframe", type, ...(payload ?? {}) }, "*"
    );
  }

  useEffect(() => {
    if (!iframeReady || !visualEditMode || previewMode === "code") return;
    const timer = window.setTimeout(() => {
      sendToIframe("set-viewport-mode", { device: devicePreview });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [devicePreview, iframeReady, page?.html, page?.id, previewMode, visualEditMode]);

  function triggerAnalysis() {
    // Ask the iframe to send back the active section's HTML for AI analysis
    sendToIframe("trigger-analysis");
  }

  // ── Simple zoom helpers ──────────────────────────────────────────────
  const ZOOM_STEPS = [50, 75, 100, 125, 150, 200];
  function zoomIn() {
    setZoom((z) => {
      const next = ZOOM_STEPS.find((s) => s > z);
      return next ?? Math.min(200, z + 25);
    });
  }
  function zoomOut() {
    setZoom((z) => {
      const next = [...ZOOM_STEPS].reverse().find((s) => s < z);
      return next ?? Math.max(50, z - 25);
    });
  }
  function resetZoom() { setZoom(100); }

  // Parent-window keyboard shortcuts (fire when parent has focus, not iframe)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Guard: don't fire when typing in a parent-window input
      const active = document.activeElement as HTMLElement | null;
      const tag = (active?.tagName ?? "").toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || active?.isContentEditable;
      if (isTyping) return;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && visualEditMode && previewMode !== "code") {
        if (isIframeEditing) return;
        if ((e.key === "c" || e.key === "C") && selectedNode?.nodeId) {
          e.preventDefault();
          sendToIframe("copy");
          return;
        }
        if ((e.key === "x" || e.key === "X") && selectedNode?.nodeId) {
          e.preventDefault();
          sendToIframe("cut");
          return;
        }
        if (e.key === "v" || e.key === "V") {
          e.preventDefault();
          sendToIframe("paste");
          return;
        }
        if (e.key === "d" || e.key === "D") {
          e.preventDefault();
          sendToIframe("duplicate");
          return;
        }
      }

      // Zoom shortcuts
      if (mod && previewMode !== "code") {
        if (e.key === "=" || e.key === "+") { e.preventDefault(); zoomIn(); return; }
        if (e.key === "-") { e.preventDefault(); zoomOut(); return; }
        if (e.key === "0") { e.preventDefault(); resetZoom(); return; }
      }

      if (mod || e.altKey) return;

      // E — toggle visual edit mode (smart: won't fire while typing inside iframe)
      if ((e.key === "e" || e.key === "E") && previewMode !== "code") {
        if (isIframeEditing) return; // user is mid-edit inside iframe, leave them alone
        e.preventDefault();
        const nextEnabled = !visualEditMode;
        setVisualEditMode(nextEnabled);
        if (nextEnabled) {
          if (!rightSidebarOpen) toggleRightSidebar();
          setRightPanel("style");
        }
        return;
      }

      // I — trigger Live Intelligence analysis (only when already in edit mode)
      if ((e.key === "i" || e.key === "I") && visualEditMode && previewMode === "preview") {
        if (isIframeEditing) return;
        e.preventDefault();
        triggerAnalysis();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualEditMode, previewMode, isIframeEditing, rightSidebarOpen, selectedNode?.nodeId]);

  // Close context menu on any click/keydown outside
  useEffect(() => {
    if (!contextMenu) return;
    function dismiss() { setContextMenu(null); }
    window.addEventListener("mousedown", dismiss, true);
    window.addEventListener("keydown", dismiss, true);
    return () => {
      window.removeEventListener("mousedown", dismiss, true);
      window.removeEventListener("keydown", dismiss, true);
    };
  }, [contextMenu]);

  function handleUndo() { if (visualEditMode) sendToIframe("undo"); else undo(); }
  function handleRedo() { if (visualEditMode) sendToIframe("redo"); else redo(); }
  function handleCopy() { if (visualEditMode && selectedNode?.nodeId) sendToIframe("copy"); }
  function handleCut() { if (visualEditMode && selectedNode?.nodeId) sendToIframe("cut"); }
  function handlePaste() { if (visualEditMode) sendToIframe("paste"); }
  function handleDuplicate() { if (visualEditMode && selectedNode?.nodeId) sendToIframe("duplicate"); }
  function handleDelete() { if (visualEditMode && selectedNode?.nodeId) sendToIframe("delete"); }
  function handleSelectParent() { if (visualEditMode && selectedNode?.parentNodeId) sendToIframe("select-parent"); }

  const canUndo = visualEditMode ? iframeCanUndo : undoStack.length > 0;
  const canRedo = visualEditMode ? iframeCanRedo : redoStack.length > 0;
  const canEditSelection = visualEditMode && !!selectedNode?.nodeId;
  const isConstrained = devicePreview !== "desktop";
  const deviceWidth   = DEVICE_WIDTHS[devicePreview] ?? "100%";
  const isCodeOnly = previewMode === "code";

  function openSuggestionPrompt(prompt: string) {
    if (hoveredNode?.sectionId) {
      selectSection(hoveredNode.sectionId);
    }
    if (!rightSidebarOpen) toggleRightSidebar();
    setRightPanel("ai");
    setAiDraftPrompt(prompt);
    clearLiveLayer();
  }

  return (
    <>
    <div className="editor-preview-shell editor-preview-surface flex h-full min-w-0 flex-1 flex-col overflow-hidden">
      {/* ── Premium Toolbar ── */}
      <div className="editor-preview-toolbar flex h-11 flex-shrink-0 items-center border-b border-white/[0.06] px-2">
        {/* Left: View modes */}
        <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.03] p-0.5">
          {([
            { mode: "preview" as const, icon: <Eye size={13} />, label: "Preview" },
            { mode: "split" as const, icon: <Columns size={13} />, label: "Split" },
            { mode: "code" as const, icon: <Code2 size={13} />, label: "Code" },
          ] as const).map(({ mode, icon, label }) => (
            <button
              key={mode}
              onClick={() => { setPreviewMode(mode); if (mode !== "preview") setVisualEditMode(false); }}
              className={`group relative flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-all ${
                previewMode === mode
                  ? "bg-white/[0.08] text-white/90 shadow-sm shadow-black/20"
                  : "text-white/30 hover:text-white/55"
              }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
              <ToolbarTooltip label={label} />
            </button>
          ))}
        </div>

        <div className="mx-2 h-4 w-px bg-white/[0.06]" />

        {/* Device switcher */}
        <div className="flex items-center gap-0.5">
          {([
            { d: "desktop" as const, icon: <Monitor size={13} />, label: "Desktop" },
            { d: "tablet" as const, icon: <Tablet size={13} />, label: "Tablet" },
            { d: "mobile" as const, icon: <Smartphone size={13} />, label: "Mobile" },
          ] as const).map(({ d, icon, label }) => (
            <button
              key={d}
              onClick={() => setDevicePreview(d)}
              className={`group relative flex h-7 w-7 items-center justify-center rounded-md transition-all ${
                devicePreview === d
                  ? "text-white/80"
                  : "text-white/25 hover:text-white/50"
              }`}
            >
              {icon}
              <ToolbarTooltip label={label} />
              {selectedNode && d === "tablet" && selectedNode.responsiveHasTabletOverrides && (
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#5B8CFF]" />
              )}
              {selectedNode && d === "mobile" && selectedNode.responsiveHasMobileOverrides && (
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#5B8CFF]" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Center: Edit mode + actions */}
        {visualEditMode && (
          <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.03] p-0.5">
            <button onClick={handleSelectParent} disabled={!selectedNode?.parentNodeId}
              className="group relative flex h-7 w-7 items-center justify-center rounded-md text-white/35 transition-all hover:bg-white/[0.06] hover:text-white/65 disabled:opacity-15 disabled:pointer-events-none">
              <ChevronUp size={13} /><ToolbarTooltip label="Parent" />
            </button>
            <div className="mx-0.5 h-3.5 w-px bg-white/[0.06]" />
            <button onClick={handleCut} disabled={!canEditSelection}
              className="group relative flex h-7 w-7 items-center justify-center rounded-md text-white/35 transition-all hover:bg-white/[0.06] hover:text-white/65 disabled:opacity-15 disabled:pointer-events-none">
              <Scissors size={12} /><ToolbarTooltip label="Cut" shortcut="⌘X" />
            </button>
            <button onClick={handleCopy} disabled={!canEditSelection}
              className="group relative flex h-7 w-7 items-center justify-center rounded-md text-white/35 transition-all hover:bg-white/[0.06] hover:text-white/65 disabled:opacity-15 disabled:pointer-events-none">
              <Copy size={12} /><ToolbarTooltip label="Copy" shortcut="⌘C" />
            </button>
            <button onClick={handlePaste} disabled={!iframeHasClipboard}
              className="group relative flex h-7 w-7 items-center justify-center rounded-md text-white/35 transition-all hover:bg-white/[0.06] hover:text-white/65 disabled:opacity-15 disabled:pointer-events-none">
              <ClipboardPaste size={12} /><ToolbarTooltip label="Paste" shortcut="⌘V" />
            </button>
            <button onClick={handleDuplicate} disabled={!canEditSelection}
              className="group relative flex h-7 w-7 items-center justify-center rounded-md text-white/35 transition-all hover:bg-white/[0.06] hover:text-white/65 disabled:opacity-15 disabled:pointer-events-none">
              <Copy size={12} /><ToolbarTooltip label="Duplicate" shortcut="⌘D" />
            </button>
            <div className="mx-0.5 h-3.5 w-px bg-white/[0.06]" />
            <button onClick={handleDelete} disabled={!canEditSelection}
              className="group relative flex h-7 w-7 items-center justify-center rounded-md text-white/35 transition-all hover:bg-white/[0.06] hover:text-red-400/80 disabled:opacity-15 disabled:pointer-events-none">
              <Trash2 size={12} /><ToolbarTooltip label="Delete" />
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* Right: Edit toggle, Undo/Redo, Zoom, Intelligence */}
        <div className="flex items-center gap-1.5">
          {/* Undo / Redo */}
          <div className="hidden items-center gap-0.5 xl:flex">
            <button onClick={handleUndo} disabled={!canUndo}
              className="group relative flex h-7 w-7 items-center justify-center rounded-md text-white/25 transition-all hover:bg-white/[0.05] hover:text-white/60 disabled:opacity-15 disabled:pointer-events-none">
              <Undo2 size={13} /><ToolbarTooltip label="Undo" shortcut="⌘Z" />
            </button>
            <button onClick={handleRedo} disabled={!canRedo}
              className="group relative flex h-7 w-7 items-center justify-center rounded-md text-white/25 transition-all hover:bg-white/[0.05] hover:text-white/60 disabled:opacity-15 disabled:pointer-events-none">
              <Redo2 size={13} /><ToolbarTooltip label="Redo" shortcut="⌘⇧Z" />
            </button>
          </div>

          <div className="mx-0.5 hidden h-4 w-px bg-white/[0.06] xl:block" />

          {/* Zoom controls */}
          <div className="hidden items-center gap-0 rounded-lg bg-white/[0.03] p-0.5 xl:flex">
            <button onClick={zoomOut} disabled={zoom <= 50}
              className="group relative flex h-6 w-6 items-center justify-center rounded-[5px] text-white/30 transition-all hover:bg-white/[0.06] hover:text-white/60 disabled:opacity-15">
              <Minus size={11} /><ToolbarTooltip label="Zoom out" shortcut="⌘−" />
            </button>
            <button onClick={resetZoom}
              className="group relative flex h-6 min-w-[38px] items-center justify-center rounded-[5px] text-white/40 transition-all hover:bg-white/[0.06] hover:text-white/65">
              <span className="font-mono text-[10px] font-medium tabular-nums">{zoom}%</span>
              <ToolbarTooltip label="Reset zoom" shortcut="⌘0" />
            </button>
            <button onClick={zoomIn} disabled={zoom >= 200}
              className="group relative flex h-6 w-6 items-center justify-center rounded-[5px] text-white/30 transition-all hover:bg-white/[0.06] hover:text-white/60 disabled:opacity-15">
              <Plus size={11} /><ToolbarTooltip label="Zoom in" shortcut="⌘+" />
            </button>
          </div>

          <div className="mx-0.5 hidden h-4 w-px bg-white/[0.06] xl:block" />

          {/* Intelligence */}
          {visualEditMode && previewMode === "preview" && (
            <button
              onClick={triggerAnalysis}
              className={`group relative flex h-7 w-7 items-center justify-center rounded-md transition-all ${
                liveIsAI
                  ? "text-teal-300 bg-teal-400/10"
                  : "text-white/30 hover:bg-white/[0.05] hover:text-white/55"
              }`}
            >
              {liveLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <ToolbarTooltip label="Analyze" shortcut="I" />
            </button>
          )}

          {/* Edit mode toggle */}
          <button
            onClick={() => {
              const nextEnabled = !visualEditMode;
              setVisualEditMode(nextEnabled);
              if (nextEnabled) {
                if (!rightSidebarOpen) toggleRightSidebar();
                setRightPanel("style");
              }
            }}
            className={`group relative flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium transition-all ${
              visualEditMode
                ? "bg-[#5B8CFF]/12 text-[#5B8CFF] ring-1 ring-[#5B8CFF]/20"
                : "text-white/35 hover:bg-white/[0.05] hover:text-white/60"
            }`}
          >
            <MousePointer2 size={12} />
            <span className="hidden sm:inline">{visualEditMode ? "Editing" : "Edit"}</span>
            <ToolbarTooltip label={visualEditMode ? "Editing" : "Edit"} shortcut="E" />
          </button>
        </div>

        {showGeneratingState && (
          <Loader2 size={10} className="ml-2 shrink-0 animate-spin text-[#5B8CFF]/60" />
        )}
      </div>

        <div
          ref={liveCardRef}
        className="editor-preview-livebar flex-shrink-0 overflow-hidden border-b transition-all duration-200"
        style={{
          maxHeight: liveCardVisible || liveLoading ? "48px" : "0px",
          borderColor: liveIsAI ? "rgba(45,212,191,0.18)" : "rgba(255,255,255,0.05)",
          opacity: liveCardVisible || liveLoading ? 1 : 0,
          transition: "max-height 0.2s ease, opacity 0.15s ease, border-color 0.4s ease",
        }}
        data-ai={liveIsAI ? "true" : "false"}
      >
        <div className="flex h-[48px] items-center gap-2 px-3">
          <div className="flex flex-shrink-0 items-center gap-1.5 border-r border-white/[0.06] pr-3">
            <span className={`flex-shrink-0 transition-colors ${liveIsAI ? "text-teal-100" : "text-white/30"}`}>
              {liveLoading
                ? <Loader2 size={11} className="animate-spin" />
                : <Sparkles size={11} />}
            </span>
            <span className="text-[10px] font-semibold text-white/50 whitespace-nowrap">
              {liveLoading ? "Analyzing…" : (hoveredNode?.sectionName || hoveredNode?.label || "Live Intelligence")}
            </span>
            {liveIsAI && !liveLoading && (
              <span className="rounded-full border border-teal-300/18 bg-teal-400/10 px-1.5 py-px text-[7px] font-bold uppercase tracking-[0.14em] text-teal-100/80">
                AI
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {liveLoading ? (
              [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-7 w-32 rounded-xl bg-white/[0.05] animate-pulse flex-shrink-0"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))
            ) : (
              liveSuggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openSuggestionPrompt(s.prompt)}
                  className="group flex h-7 flex-shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 transition-all active:scale-95 hover:border-teal-300/24 hover:bg-teal-400/[0.08]"
                >
                  <span className="text-[11px] font-medium text-white/60 group-hover:text-white/90 transition-colors whitespace-nowrap">{s.label}</span>
                </button>
              ))
            )}
          </div>

          <div className="flex flex-shrink-0 items-center gap-1 border-l border-white/[0.06] pl-3">
            <button
              onClick={clearLiveLayer}
              title="Dismiss"
              className="editor-action-btn flex h-7 w-7 items-center justify-center rounded-xl text-white/34"
            >
              <span className="text-[11px]">✕</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {(previewMode === "preview" || previewMode === "split") && (
          <div
            className={`editor-preview-stage relative flex-1 ${previewMode === "split" ? "border-r border-white/[0.06]" : ""}`}
            style={{
              height: "100%",
              overflow: zoom !== 100 ? "auto" : "hidden",
            }}
          >
            <div
              className={`${isConstrained ? "flex justify-center p-6" : ""}`}
              style={{
                height: "100%",
                transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                transformOrigin: "top center",
                width: zoom !== 100 ? `${10000 / zoom}%` : undefined,
              }}
            >
              {/* Canvas content container */}
              <div
                className={`relative bg-white ${
                  isConstrained
                    ? "overflow-hidden rounded-2xl shadow-2xl shadow-black/70 ring-1 ring-white/5"
                    : ""
                }`}
                style={{
                  width: isConstrained ? deviceWidth : "100%",
                  height: "100%",
                  flexShrink: 0,
                }}
              >
                <iframe
                  ref={internalIframeRef}
                  data-sitezy-preview-frame="1"
                  className="block h-full w-full border-none"
                  src="/api/preview-frame"
                  onLoad={() => setIframeReady(true)}
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
                {visualEditMode && (
                  <div
                    className="absolute inset-0 pointer-events-none rounded-xl"
                    style={{ boxShadow: "inset 0 0 0 2px rgba(91,140,255,0.15)" }}
                  />
                )}
                {showGeneratingState && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-5"
                    style={{ background: "linear-gradient(180deg, rgba(7,9,13,0.92) 0%, rgba(5,7,11,0.96) 100%)", backdropFilter: "blur(2px)" }}
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="h-14 w-14 rounded-full border-2 border-white/[0.06]" />
                      <div className="absolute h-14 w-14 rounded-full border-2 border-transparent border-t-[#5B8CFF] animate-spin" style={{ animationDuration: "1s" }} />
                      <div className="absolute h-8 w-8 rounded-full border border-[#5B8CFF]/30 animate-ping" style={{ animationDuration: "1.8s" }} />
                      <Loader2 size={16} className="absolute text-[#5B8CFF]/60 animate-spin" style={{ animationDuration: "2s", animationDirection: "reverse" }} />
                    </div>
                    <div className="text-center">
                      <p className="text-[13px] font-semibold text-white/80">
                        {generatingLabel}
                      </p>
                      {generationProgress && generationProgress.trim() !== generatingLabel && (
                        <p className="mt-1 text-[11px] text-white/36 tabular-nums">
                          {generationProgress}
                        </p>
                      )}
                    </div>
                    <div className="flex w-64 flex-col gap-2 opacity-40">
                      {[80, 60, 72, 48].map((w, i) => (
                        <div
                          key={i}
                          className="h-2 rounded-full bg-white/[0.08] animate-pulse"
                          style={{ width: `${w}%`, animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {page?.status === "error" && !page?.html && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#080809]">
                    <div className="text-center">
                      <button
                        onClick={() => setShowErrorLog((v) => !v)}
                        className="group flex flex-col items-center gap-3 rounded-2xl border border-red-500/15 bg-red-500/[0.04] px-6 py-5 transition-all hover:border-red-500/25 hover:bg-red-500/[0.08]"
                      >
                        <span className="text-3xl">⚠️</span>
                        <div>
                          <p className="text-[13px] font-medium text-red-400">Generation failed</p>
                          <p className="mt-1 text-[11px] text-white/30 transition-colors group-hover:text-white/50">Click to view error details</p>
                        </div>
                      </button>
                      {showErrorLog && (
                        <div className="mt-3 w-80 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0f0f14] text-left shadow-2xl">
                          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Error Log</span>
                            <button onClick={() => setShowErrorLog(false)} className="text-[11px] text-white/25 transition-colors hover:text-white/60">✕</button>
                          </div>
                          <div className="max-h-64 space-y-1.5 overflow-auto p-3">
                            {generationLog.length === 0
                              ? <p className="text-[11px] text-white/25">No log entries.</p>
                              : generationLog.slice().reverse().map((entry, i) => (
                                <div key={i} className={`text-[11px] font-mono leading-relaxed ${
                                  entry.type === "error" ? "text-red-400" :
                                  entry.type === "success" ? "text-emerald-400" :
                                  "text-white/40"
                                }`}>
                                  {entry.msg}
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Breadcrumb bar */}
            {visualEditMode && breadcrumb.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 z-50 flex items-center gap-0.5 border-t border-white/[0.04] bg-[#0e1117]/80 px-3 py-1 backdrop-blur-md">
                {breadcrumb.map((seg, i) => (
                  <span key={i} className="flex items-center gap-0.5">
                    {i > 0 && <ChevronRight size={8} className="flex-shrink-0 text-white/12" />}
                    <button
                      onClick={() => {
                        const stepsUp = breadcrumb.length - 1 - i;
                        for (let s = 0; s < stepsUp; s++) sendToIframe("select-parent");
                      }}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors ${
                        i === breadcrumb.length - 1
                          ? "bg-[#5B8CFF]/8 text-[#5B8CFF]"
                          : "text-white/30 hover:bg-white/[0.04] hover:text-white/55"
                      }`}
                    >
                      {seg}
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {(previewMode === "code" || previewMode === "split") && (
          <div
            className={`editor-code-shell editor-preview-surface flex min-h-0 flex-col overflow-hidden ${
              previewMode === "split"
                ? "w-[42%] flex-shrink-0"
                : "flex-1"
            }`}
          >
            <div className="editor-code-header flex h-11 flex-shrink-0 items-center gap-3 border-b border-white/[0.06] px-4">
              <span className="truncate font-mono text-[10px] uppercase tracking-widest text-white/25">{codeLanguage}</span>
              <span className="truncate font-mono text-[11px] text-white/58">{codeFileName}</span>
              <div className="flex-1" />
              <span className="font-mono text-[10px] text-white/15">{localCode.length.toLocaleString()} chars</span>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <textarea
                value={localCode}
                onChange={(e) => {
                  setLocalCode(e.target.value);
                  if (selectedFileId && leftPanelTab === "files") updateFileContent(selectedFileId, e.target.value);
                  else if (activePageId) updateFileContent(activePageId, e.target.value);
                }}
                spellCheck={false}
                className="editor-code-area h-full w-full flex-1 resize-none p-4 font-mono text-[12px] leading-relaxed text-emerald-300/80 focus:outline-none"
                style={{ tabSize: 2 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>

    {/* ── Right-click context menu ── */}
    {contextMenu && visualEditMode && (
      <>
        {/* Invisible full-screen backdrop — clicking anywhere outside closes the menu */}
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99998 }}
          onMouseDown={() => setContextMenu(null)}
        />
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          hasClipboard={iframeHasClipboard}
          onAction={(action) => {
            setContextMenu(null);
            sendToIframe(action);
          }}
          onClose={() => setContextMenu(null)}
        />
      </>
    )}
  </>
  );
}

interface ContextMenuProps {
  x: number;
  y: number;
  node: CanvasNodeInfo;
  hasClipboard: boolean;
  onAction: (action: string) => void;
  onClose: () => void;
}

function ContextMenu({ x, y, node, hasClipboard, onAction }: ContextMenuProps) {
  const isSection = node.role === "section" || node.isSec;
  const canEditText = node.hasEditableText;
  const canSelectParent = !!node.parentNodeId;

  // Clamp to viewport
  const MENU_W = 200;
  const MENU_H = isSection ? 280 : 240;
  const clampedX = Math.min(x, window.innerWidth - MENU_W - 8);
  const clampedY = Math.min(y, window.innerHeight - MENU_H - 8);

  function item(
    icon: React.ReactNode,
    label: string,
    action: string,
    disabled = false,
    destructive = false,
    shortcut?: string,
  ) {
    return (
      <button
        key={action}
        disabled={disabled}
        onMouseDown={(e) => { e.stopPropagation(); if (!disabled) onAction(action); }}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[11.5px] font-medium transition-colors ${
          disabled
            ? "pointer-events-none text-white/20"
            : destructive
              ? "text-red-400/80 hover:bg-red-500/10 hover:text-red-300"
              : "text-white/65 hover:bg-white/[0.06] hover:text-white/90"
        }`}
      >
        <span className="flex-shrink-0 text-current opacity-70">{icon}</span>
        <span className="flex-1">{label}</span>
        {shortcut && <span className="text-[10px] text-white/22">{shortcut}</span>}
      </button>
    );
  }

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()} // prevent backdrop from catching clicks inside menu
      style={{ position: "fixed", left: clampedX, top: clampedY, zIndex: 99999 }}
      className="w-[200px] rounded-xl border border-white/[0.09] bg-[#12141a] p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
    >
      {/* Header: element label */}
      <div className="mb-1 border-b border-white/[0.06] px-2.5 pb-1.5 pt-0.5">
        <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-white/25">
          {node.label || node.tag}
        </p>
      </div>

      {/* Edit text */}
      {canEditText && item(<Edit2 size={11} />, "Edit Text", "start-edit")}

      {/* Select parent */}
      {canSelectParent && item(<ChevronUp size={11} />, "Select Parent", "select-parent")}

      {(canEditText || canSelectParent) && (
        <div className="my-1 h-px bg-white/[0.06]" />
      )}

      {/* Clipboard */}
      {item(<Scissors size={11} />, "Cut", "cut", false, false, "⌘X")}
      {item(<Copy size={11} />, "Copy", "copy", false, false, "⌘C")}
      {item(<ClipboardPaste size={11} />, "Paste", "paste", !hasClipboard, false, "⌘V")}
      {item(<Copy size={11} />, "Duplicate", "duplicate", false, false, "⌘D")}

      {/* Section-specific: move up/down */}
      {isSection && (
        <>
          <div className="my-1 h-px bg-white/[0.06]" />
          {item(<ChevronUp size={11} />, "Move Section Up", "move-up")}
          {item(<ChevronRight size={11} className="rotate-90" />, "Move Section Down", "move-down")}
        </>
      )}

      <div className="my-1 h-px bg-white/[0.06]" />
      {item(<Trash2 size={11} />, "Delete", "delete", false, true)}
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function emptyState(isGenerating: boolean, isError: boolean, label?: string): string {
  const body = isGenerating
    ? `<div class="sp"></div><p style="font-size:13px;color:#666;margin-top:14px;font-family:system-ui,sans-serif">${escapeHtml(label || "Generating page…")}</p>`
    : isError
    ? `<span style="font-size:28px">⚠️</span><p style="font-size:13px;color:#ef4444;margin-top:10px;font-family:system-ui,sans-serif">Generation failed</p>`
    : `<p style="font-size:13px;color:#333;font-family:system-ui,sans-serif">Select a page to preview</p>`;
  return `<!DOCTYPE html><html><head><style>
    body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;
    background:#08080a;flex-direction:column;gap:4px}
    .sp{width:28px;height:28px;border:2px solid #1e1e2a;border-top-color:#7c3aed;
    border-radius:50%;animation:spin 0.9s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style></head><body>${body}</body></html>`;
}
