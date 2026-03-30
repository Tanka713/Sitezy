"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { isSignificantNode, type LiveIntelligenceSuggestion } from "@/lib/editor/intelligence";
import { derivePageStateFromHtml } from "@/lib/editor/structure";
import { useAppStore } from "@/lib/store";
import { API_UNKNOWN_001, createAppError, logAppError, normalizeError, type ErrorCode } from "@/lib/errors";
import { buildFullPageHtml } from "@/lib/utils";
import { buildVisualEditorScript } from "@/lib/utils/visualEditor";
import {
  Loader2, MousePointer2, Eye, Code2, Columns,
  Undo2, Redo2, ZoomIn, ZoomOut, Monitor, Tablet, Smartphone,
  ChevronUp, ChevronDown, Scissors, Sparkles, Trash2, Copy, ClipboardPaste,
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

function ToolbarTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-1/2 top-full z-[120] mt-2 -translate-x-1/2 whitespace-nowrap rounded-[10px] border border-white/[0.08] bg-[#11141d] px-2.5 py-1 text-[10px] font-medium text-white/90 opacity-0 shadow-[0_12px_28px_rgba(0,0,0,0.34)] transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
      {label}
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
  const undoStack         = useAppStore((s) => s.undoStack);
  const redoStack         = useAppStore((s) => s.redoStack);

  const [zoom, setZoom]               = useState(100);
  const [showErrorLog, setShowErrorLog] = useState(false);
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
      if (doc) { doc.open(); doc.write(emptyState(page?.status === "generating", page?.status === "error")); doc.close(); }
      return;
    }
    // Skip rewrite if the HTML change originated from the iframe itself
    // (via html-update postMessage). The iframe already has this content —
    // rewriting would destroy selection state and the iframe's own undo stack.
    if (visualEditMode && page.html === lastIframeHtmlRef.current) return;
    lastIframeHtmlRef.current = "";
    writeToIframe(page.html, visualEditMode);
  }, [iframeReady, page?.html, page?.id, page?.status, visualEditMode, writeToIframe, previewMode]);

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
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0a0a0b]">
      <div className="flex h-11 flex-shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#080809] px-3">
        <div className="flex shrink-0 items-center gap-1.5 rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-1">
          {([
            { mode: "preview" as const, icon: <Eye size={11} />, label: "Preview" },
            { mode: "split" as const, icon: <Columns size={11} />, label: "Split" },
            { mode: "code" as const, icon: <Code2 size={11} />, label: "Code" },
          ] as const).map(({ mode, icon, label }) => (
            <button
              key={mode}
              onClick={() => { setPreviewMode(mode); if (mode !== "preview") setVisualEditMode(false); }}
              title={label}
              className={`group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] transition-colors hover:z-30 ${
                previewMode === mode ? "bg-white/[0.08] text-white" : "text-white/34 hover:bg-white/[0.05] hover:text-white/68"
              }`}
            >
              {icon}
              <ToolbarTooltip label={label} />
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-1">
            {([
              { d: "desktop" as const, icon: <Monitor size={11} />, label: "Desktop" },
              { d: "tablet" as const, icon: <Tablet size={11} />, label: "Tablet" },
              { d: "mobile" as const, icon: <Smartphone size={11} />, label: "Mobile" },
            ] as const).map(({ d, icon, label }) => (
              <button
                key={d}
                onClick={() => setDevicePreview(d)}
                title={label}
                className={`group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] transition-colors hover:z-30 ${
                  devicePreview === d ? "bg-white/[0.08] text-white" : "text-white/34 hover:bg-white/[0.05] hover:text-white/68"
                }`}
              >
                {icon}
                <ToolbarTooltip label={label} />
                {selectedNode && d === "tablet" && selectedNode.responsiveHasTabletOverrides && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_0_2px_rgba(8,8,9,0.9)]" />
                )}
                {selectedNode && d === "mobile" && selectedNode.responsiveHasMobileOverrides && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_0_2px_rgba(8,8,9,0.9)]" />
                )}
              </button>
            ))}
          </div>

        <div className="flex-1" />

        <button
            onClick={() => {
              const nextEnabled = !visualEditMode;
              setVisualEditMode(nextEnabled);
              if (nextEnabled) {
                if (!rightSidebarOpen) toggleRightSidebar();
                setRightPanel("style");
              }
            }}
            title={visualEditMode ? "Exit live edit (E)" : "Edit content directly (E)"}
            className={`group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border transition-all hover:z-30 ${
              visualEditMode
                ? "border-orange-500/25 bg-orange-500/15 text-orange-400 shadow-sm shadow-orange-500/10"
                : "border-white/[0.07] text-white/40 hover:border-white/[0.15] hover:text-white/70"
            }`}
          >
            <MousePointer2 size={11} />
            <ToolbarTooltip label={visualEditMode ? "Editing" : "Edit"} />
          </button>

        {visualEditMode && previewMode === "preview" && (
          <button
            onClick={triggerAnalysis}
            title="Live Intelligence — AI reads page and suggests improvements (I)"
            className={`group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border transition-all hover:z-30 ${
              liveIsAI
                ? "border-accent-400/25 bg-accent-500/15 text-accent-300"
                : "border-white/[0.07] text-white/40 hover:border-white/[0.15] hover:text-white/60"
            }`}
          >
            {liveLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            <ToolbarTooltip label="Analyze" />
          </button>
        )}

        {visualEditMode && (
          <div className="flex shrink-0 items-center gap-1 rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-1">
            <button
              onClick={handleSelectParent}
              disabled={!selectedNode?.parentNodeId}
              title="Select parent element"
              className="group relative flex h-7 w-7 items-center justify-center rounded-[10px] text-white/40 transition-colors hover:z-30 hover:bg-white/[0.05] hover:text-white/76 disabled:cursor-not-allowed disabled:opacity-20"
            >
              <ChevronUp size={12} />
              <ToolbarTooltip label="Parent" />
            </button>
            <button
              onClick={handleCut}
              disabled={!canEditSelection}
              title="Cut selected element (⌘X)"
              className="group relative flex h-7 w-7 items-center justify-center rounded-[10px] text-white/40 transition-colors hover:z-30 hover:bg-white/[0.05] hover:text-white/76 disabled:cursor-not-allowed disabled:opacity-20"
            >
              <Scissors size={11} />
              <ToolbarTooltip label="Cut" />
            </button>
            <button
              onClick={handleCopy}
              disabled={!canEditSelection}
              title="Copy selected element (⌘C)"
              className="group relative flex h-7 w-7 items-center justify-center rounded-[10px] text-white/42 transition-colors hover:z-30 hover:bg-white/[0.05] hover:text-white/76 disabled:cursor-not-allowed disabled:opacity-20"
            >
              <Copy size={11} />
              <ToolbarTooltip label="Copy" />
            </button>
            <button
              onClick={handlePaste}
              disabled={!iframeHasClipboard}
              title="Paste copied element (⌘V)"
              className="group relative flex h-7 w-7 items-center justify-center rounded-[10px] text-white/42 transition-colors hover:z-30 hover:bg-white/[0.05] hover:text-white/76 disabled:cursor-not-allowed disabled:opacity-20"
            >
              <ClipboardPaste size={11} />
              <ToolbarTooltip label="Paste" />
            </button>
            <button
              onClick={handleDuplicate}
              disabled={!canEditSelection}
              title="Duplicate selected element (⌘D)"
              className="group relative flex h-7 w-7 items-center justify-center rounded-[10px] text-white/42 transition-colors hover:z-30 hover:bg-white/[0.05] hover:text-white/76 disabled:cursor-not-allowed disabled:opacity-20"
            >
              <Copy size={11} />
              <ToolbarTooltip label="Duplicate" />
            </button>
            <button
              onClick={handleDelete}
              disabled={!canEditSelection}
              title="Delete selected element"
              className="group relative flex h-7 w-7 items-center justify-center rounded-[10px] text-white/40 transition-colors hover:z-30 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-20"
            >
              <Trash2 size={11} />
              <ToolbarTooltip label="Delete" />
            </button>
          </div>
        )}

        <div className="hidden shrink-0 items-center gap-1 rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-1 xl:flex">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            className="group relative flex h-8 w-8 items-center justify-center rounded-[12px] text-white/30 transition-colors hover:z-30 hover:bg-white/[0.05] hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-20"
          >
            <Undo2 size={12} />
            <ToolbarTooltip label="Undo" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (⌘⇧Z)"
            className="group relative flex h-8 w-8 items-center justify-center rounded-[12px] text-white/30 transition-colors hover:z-30 hover:bg-white/[0.05] hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-20"
          >
            <Redo2 size={12} />
            <ToolbarTooltip label="Redo" />
          </button>
        </div>

        <div className="hidden shrink-0 items-center gap-1 rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-1 2xl:flex">
            <button
              onClick={() => setZoom((z) => Math.max(z - 10, 40))}
              disabled={zoom <= 40}
              title="Zoom out"
              className="group relative flex h-7 w-7 items-center justify-center rounded-[10px] text-white/30 transition-colors hover:z-30 hover:bg-white/[0.05] hover:text-white/70 disabled:opacity-20"
            >
              <ZoomOut size={12} />
              <ToolbarTooltip label="Zoom out" />
            </button>
            <span className="w-10 text-center font-mono text-[10px] tabular-nums text-white/34">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(z + 10, 150))}
              disabled={zoom >= 150}
              title="Zoom in"
              className="group relative flex h-7 w-7 items-center justify-center rounded-[10px] text-white/30 transition-colors hover:z-30 hover:bg-white/[0.05] hover:text-white/70 disabled:opacity-20"
            >
              <ZoomIn size={12} />
              <ToolbarTooltip label="Zoom in" />
            </button>
          </div>

        {page?.status === "generating" && (
          <Loader2 size={10} className="spin ml-1 shrink-0 text-accent-400" />
        )}
      </div>
      </div>

      <div
        ref={liveCardRef}
        className="flex-shrink-0 overflow-hidden border-b transition-all duration-200"
        style={{
          maxHeight: liveCardVisible || liveLoading ? "48px" : "0px",
          borderColor: liveIsAI ? "rgba(45,212,191,0.18)" : "rgba(255,255,255,0.05)",
          background: liveIsAI
            ? "linear-gradient(90deg, rgba(8,20,24,0.98) 0%, rgba(12,26,28,0.98) 100%)"
            : "rgba(7,12,18,0.98)",
          opacity: liveCardVisible || liveLoading ? 1 : 0,
          transition: "max-height 0.2s ease, opacity 0.15s ease, border-color 0.4s ease, background 0.4s ease",
        }}
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

      {!isCodeOnly && (
      <div
        ref={liveCardRef}
        className="flex-shrink-0 overflow-hidden px-4"
        style={{
          maxHeight: liveCardVisible || liveLoading ? "46px" : "0px",
          opacity: liveCardVisible || liveLoading ? 1 : 0,
          transition: "max-height 0.2s ease, opacity 0.15s ease",
        }}
      >
        <div
          className="mt-2 flex h-[36px] items-center gap-2 rounded-[14px] border px-3"
          style={{
            borderColor: liveIsAI ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.05)",
            background: liveIsAI
              ? "linear-gradient(90deg, rgba(14,14,26,0.98) 0%, rgba(18,12,32,0.98) 100%)"
              : "rgba(255,255,255,0.02)",
          }}
        >
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <span className={`flex-shrink-0 transition-colors ${liveIsAI ? "text-accent-400" : "text-white/30"}`}>
              {liveLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            </span>
            <span className="whitespace-nowrap text-[10px] font-semibold text-white/50">
              {liveLoading ? "Analyzing…" : (hoveredNode?.sectionName || hoveredNode?.label || "Live Intelligence")}
            </span>
            {liveIsAI && !liveLoading && (
              <span className="rounded-full border border-accent-400/20 bg-accent-500/15 px-1.5 py-px text-[7px] font-bold uppercase tracking-[0.14em] text-accent-400/80">
                AI
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {liveLoading ? (
              [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-7 w-28 flex-shrink-0 animate-pulse rounded-[12px] bg-white/[0.04]"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))
            ) : (
              liveSuggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openSuggestionPrompt(s.prompt)}
                  className="group flex h-7 flex-shrink-0 items-center gap-1.5 rounded-[12px] border border-white/[0.07] bg-white/[0.03] px-3 transition-all hover:border-accent-400/30 hover:bg-accent-500/[0.12] active:scale-95"
                >
                  <span className="whitespace-nowrap text-[11px] font-medium text-white/60 transition-colors group-hover:text-white/90">{s.label}</span>
                </button>
              ))
            )}
          </div>

          <button
            onClick={clearLiveLayer}
            title="Dismiss"
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-white/20 transition-all hover:bg-white/[0.06] hover:text-white/60"
          >
            <span className="text-[11px]">✕</span>
          </button>
        </div>
      </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {(previewMode === "preview" || previewMode === "split") && (
          <div
            className={`overflow-auto flex-1 ${previewMode === "split" ? "border-r border-white/[0.06]" : ""}`}
            style={{ background: "radial-gradient(ellipse at 50% 0%, #0f0f14 0%, #080809 100%)" }}
          >
            <div className="flex min-h-full items-start justify-center p-6">
              <div
                className={`relative bg-white transition-[width] duration-300 ${
                  isConstrained
                    ? "overflow-hidden rounded-2xl shadow-2xl shadow-black/70 ring-1 ring-white/5"
                    : "overflow-hidden rounded-xl shadow-xl shadow-black/50 ring-1 ring-white/5"
                }`}
                style={{
                  width: deviceWidth,
                  minHeight: "calc(100vh - 7.75rem)",
                  flexShrink: 0,
                  transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                  transformOrigin: "top center",
                }}
              >
                <iframe
                  ref={internalIframeRef}
                  data-sitezy-preview-frame="1"
                  className="block w-full border-none"
                  style={{ minHeight: "calc(100vh - 8rem)" }}
                  src="/api/preview-frame"
                  onLoad={() => setIframeReady(true)}
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
                {visualEditMode && (
                  <div
                    className="absolute inset-0 pointer-events-none rounded-xl"
                    style={{ boxShadow: "inset 0 0 0 2px rgba(249,115,22,0.2)" }}
                  />
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
          </div>
        )}

        {(previewMode === "code" || previewMode === "split") && (
          <div
            className={`flex min-h-0 flex-col overflow-hidden bg-[#05070b] ${
              previewMode === "split"
                ? "w-[42%] flex-shrink-0"
                : "flex-1"
            }`}
          >
            <div className="flex h-11 flex-shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#080b11] px-4">
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
                className="flex-1 bg-[#050508] text-[12px] font-mono text-emerald-300/80 p-4 resize-none focus:outline-none leading-relaxed h-full w-full"
                style={{ tabSize: 2 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function emptyState(isGenerating: boolean, isError: boolean): string {
  const body = isGenerating
    ? `<div class="sp"></div><p style="font-size:13px;color:#666;margin-top:14px;font-family:system-ui,sans-serif">Generating page…</p>`
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
