"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { derivePageStateFromHtml } from "@/lib/editor/structure";
import { useAppStore } from "@/lib/store";
import { buildFullPageHtml } from "@/lib/utils";
import { buildVisualEditorScript } from "@/lib/utils/visualEditor";
import {
  Loader2, MousePointer2, Eye, Code2, Columns,
  Undo2, Redo2, ZoomIn, ZoomOut, Monitor, Tablet, Smartphone,
  ChevronRight,
} from "lucide-react";
import type { Project } from "@/types";

interface Props {
  project: Project;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

const DEVICE_WIDTHS: Record<string, string> = {
  desktop: "100%",
  tablet:  "768px",
  mobile:  "390px",
};

export function PreviewCanvas({ project, iframeRef }: Props) {
  const internalIframeRef = useRef<HTMLIFrameElement>(null);
  const previewMode       = useAppStore((s) => s.editor.previewMode);
  const devicePreview     = useAppStore((s) => s.editor.devicePreview);
  const selectedPageId    = useAppStore((s) => s.editor.selectedPageId);
  const selectedFileId    = useAppStore((s) => s.editor.selectedFileId);
  const leftPanelTab      = useAppStore((s) => s.editor.leftPanelTab);
  const visualEditMode    = useAppStore((s) => s.editor.visualEditMode);
  const setVisualEditMode = useAppStore((s) => s.setVisualEditMode);
  const setPreviewMode    = useAppStore((s) => s.setPreviewMode);
  const setDevicePreview  = useAppStore((s) => s.setDevicePreview);
  const updateFileContent = useAppStore((s) => s.updateFileContent);
  const generationLog     = useAppStore((s) => s.generationLog);
  const selectSection     = useAppStore((s) => s.selectSection);
  const setCanvasSelection = useAppStore((s) => s.setCanvasSelection);
  const clearCanvasSelection = useAppStore((s) => s.clearCanvasSelection);
  const undo              = useAppStore((s) => s.undo);
  const redo              = useAppStore((s) => s.redo);
  const undoStack         = useAppStore((s) => s.undoStack);
  const redoStack         = useAppStore((s) => s.redoStack);

  const [zoom, setZoom]               = useState(100);
  const [showErrorLog, setShowErrorLog] = useState(false);
  const [iframeCanUndo, setIframeCanUndo] = useState(false);
  const [iframeCanRedo, setIframeCanRedo] = useState(false);
  const [breadcrumb, setBreadcrumb]   = useState<string[]>([]);
  const [localCode, setLocalCode]     = useState("");

  // Tracks the last HTML the iframe sent us via html-update.
  // Used to break the circular update loop:
  //   iframe edits → html-update → updateFileContent → page.html changes
  //   → useEffect would rewrite iframe → losing selection + undo stack
  // When page.html === lastIframeHtmlRef.current we know the change
  // originated from the iframe itself, so we skip the rewrite.
  const lastIframeHtmlRef = useRef<string>("");
  const pendingHtmlRef = useRef<string | null>(null);
  const htmlSyncTimerRef = useRef<number | null>(null);

  const pages = project?.pages ?? [];
  const files = project?.files ?? {};

  const activePageId = leftPanelTab === "files" && selectedFileId ? selectedFileId : selectedPageId;
  const page = pages.find((p) => p.id === activePageId) ?? null;
  const file = files[selectedFileId ?? ""] ?? null;

  const codeContent = (leftPanelTab === "files" && file && file.type !== "html")
    ? file.content : page?.html ?? "";

  useEffect(() => { setLocalCode(codeContent); }, [codeContent, activePageId, selectedFileId]);
  useEffect(() => {
    if (visualEditMode && previewMode !== "preview") setPreviewMode("preview");
  }, [visualEditMode]);

  useEffect(() => {
    if (!iframeRef) return;
    (iframeRef as React.MutableRefObject<HTMLIFrameElement | null>).current = internalIframeRef.current;
  });

  const writeToIframe = useCallback((html: string, withEditor: boolean) => {
    const iframe = internalIframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    const script = withEditor ? buildVisualEditorScript() : "";
    const safeHtml = derivePageStateFromHtml(html).html;
    const full   = buildFullPageHtml(safeHtml, project?.blueprint ?? null, page?.name ?? "", script);
    doc.open(); doc.write(full); doc.close();
  }, [project?.blueprint, page?.name]);

  useEffect(() => {
    const iframe = internalIframeRef.current;
    if (!iframe) return;
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
  }, [page?.html, page?.id, page?.status, visualEditMode, writeToIframe]);

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
          pendingHtmlRef.current = html;
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
      if (type === "select" || type === "editing") {
        const sid = (payload?.sectionId as string | null) ?? null;
        selectSection(sid);
        setCanvasSelection(payload, type === "editing");
        setBreadcrumb(
          Array.isArray(payload?.path) && payload.path.length > 0
            ? payload.path
            : [payload?.sectionName, payload?.label].filter(Boolean)
        );
      }
      if (type === "deselect") {
        selectSection(null);
        clearCanvasSelection();
        setBreadcrumb([]);
      }
    }
    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
      if (htmlSyncTimerRef.current) {
        window.clearTimeout(htmlSyncTimerRef.current);
        htmlSyncTimerRef.current = null;
      }
      if (pendingHtmlRef.current && activePageId) {
        updateFileContent(activePageId, pendingHtmlRef.current);
        pendingHtmlRef.current = null;
      }
    };
  }, [activePageId, clearCanvasSelection, selectSection, setCanvasSelection, updateFileContent]);

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
  }, [activePageId, clearCanvasSelection, selectSection]);

  function sendToIframe(type: string, payload?: Record<string, unknown>) {
    internalIframeRef.current?.contentWindow?.postMessage(
      { target: "sitezy-iframe", type, ...(payload ?? {}) }, "*"
    );
  }

  function handleUndo() { if (visualEditMode) sendToIframe("undo"); else undo(); }
  function handleRedo() { if (visualEditMode) sendToIframe("redo"); else redo(); }

  const canUndo = visualEditMode ? iframeCanUndo : undoStack.length > 0;
  const canRedo = visualEditMode ? iframeCanRedo : redoStack.length > 0;
  const isConstrained = devicePreview !== "desktop";
  const deviceWidth   = DEVICE_WIDTHS[devicePreview] ?? "100%";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0b] min-w-0">

      {/* Toolbar */}
      <div className="h-10 border-b border-white/[0.06] flex items-center gap-1.5 px-3 flex-shrink-0 bg-[#080809]">

        {/* View mode */}
        <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5 gap-0.5">
          {([
            { mode: "preview" as const, icon: <Eye size={11} />,     label: "Preview" },
            { mode: "split"   as const, icon: <Columns size={11} />, label: "Split"   },
            { mode: "code"    as const, icon: <Code2 size={11} />,   label: "Code"    },
          ] as const).map(({ mode, icon, label }) => (
            <button key={mode}
              onClick={() => { setPreviewMode(mode); if (mode !== "preview") setVisualEditMode(false); }}
              title={label}
              className={`h-6 px-2 flex items-center gap-1 rounded-md transition-colors text-[11px] ${previewMode === mode ? "bg-white/[0.1] text-white" : "text-white/30 hover:text-white/60"}`}>
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Device picker */}
        {previewMode !== "code" && (
          <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5 gap-0.5">
            {([
              { d: "desktop" as const, icon: <Monitor size={11} />,    label: "Desktop" },
              { d: "tablet"  as const, icon: <Tablet size={11} />,     label: "Tablet"  },
              { d: "mobile"  as const, icon: <Smartphone size={11} />, label: "Mobile"  },
            ] as const).map(({ d, icon, label }) => (
              <button key={d} onClick={() => setDevicePreview(d)} title={label}
                className={`w-7 h-6 flex items-center justify-center rounded-md transition-colors ${devicePreview === d ? "bg-white/[0.1] text-white" : "text-white/30 hover:text-white/60"}`}>
                {icon}
              </button>
            ))}
          </div>
        )}

        <div className="w-px h-4 bg-white/[0.06]" />

        {/* Live Edit toggle */}
        {previewMode !== "code" && (
          <button
            onClick={() => setVisualEditMode(!visualEditMode)}
            title={visualEditMode ? "Exit live edit (Esc)" : "Edit content directly"}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-medium border transition-all ${
              visualEditMode
                ? "bg-orange-500/15 text-orange-400 border-orange-500/25 shadow-sm shadow-orange-500/10"
                : "text-white/40 border-white/[0.07] hover:text-white/70 hover:border-white/[0.15]"
            }`}>
            <MousePointer2 size={11} />
            {visualEditMode ? "Editing" : "Edit"}
          </button>
        )}

        {/* Breadcrumb — shown when an element is selected */}
        {visualEditMode && breadcrumb.length > 0 && (
          <div className="flex items-center gap-1 ml-1 overflow-hidden">
            {breadcrumb.map((seg, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={9} className="text-white/20 flex-shrink-0" />}
                <span className="text-[10px] font-mono text-white/35 truncate max-w-[60px]">{seg}</span>
              </span>
            ))}
          </div>
        )}

        <div className="flex-1" />

        {/* Undo / Redo */}
        <button onClick={handleUndo} disabled={!canUndo} title="Undo (⌘Z)"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.05] disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
          <Undo2 size={12} />
        </button>
        <button onClick={handleRedo} disabled={!canRedo} title="Redo (⌘⇧Z)"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.05] disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
          <Redo2 size={12} />
        </button>

        {/* Zoom */}
        {previewMode !== "code" && (<>
          <div className="w-px h-4 bg-white/[0.06]" />
          <button onClick={() => setZoom((z) => Math.max(z - 10, 40))} disabled={zoom <= 40} title="Zoom out"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.05] disabled:opacity-20 transition-colors">
            <ZoomOut size={12} />
          </button>
          <span className="text-[10px] text-white/30 font-mono w-8 text-center tabular-nums">{zoom}%</span>
          <button onClick={() => setZoom((z) => Math.min(z + 10, 150))} disabled={zoom >= 150} title="Zoom in"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.05] disabled:opacity-20 transition-colors">
            <ZoomIn size={12} />
          </button>
        </>)}

        {page && (
          <>
            <div className="w-px h-4 bg-white/[0.06] mx-0.5" />
            <span className="text-[11px] text-white/20 truncate max-w-[100px]">
              {page.name}
              {page.status === "generating" && <Loader2 size={9} className="inline ml-1 spin text-brand-400" />}
            </span>
          </>
        )}
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-hidden flex min-h-0">

        {/* Preview pane */}
        {(previewMode === "preview" || previewMode === "split") && (
          <div className={`overflow-auto flex-1 ${previewMode === "split" ? "border-r border-white/[0.06]" : ""}`}
            style={{ background: "radial-gradient(ellipse at 50% 0%, #0f0f14 0%, #080809 100%)" }}>
            <div className="flex items-start justify-center p-6 min-h-full">
              <div
                className={`bg-white relative transition-[width] duration-300 ${
                  isConstrained
                    ? "rounded-2xl overflow-hidden shadow-2xl shadow-black/70 ring-1 ring-white/5"
                    : "rounded-xl overflow-hidden shadow-xl shadow-black/50 ring-1 ring-white/5"
                }`}
                style={{
                  width: deviceWidth,
                  minHeight: "calc(100vh - 8rem)",
                  flexShrink: 0,
                  transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                  transformOrigin: "top center",
                }}>
                <iframe
                  ref={internalIframeRef}
                  className="w-full border-none block"
                  style={{ minHeight: "calc(100vh - 8rem)" }}
                  title={`Preview: ${page?.name ?? "empty"}`}
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                />
                {/* Visual edit mode border indicator */}
                {visualEditMode && (
                  <div className="absolute inset-0 pointer-events-none rounded-xl"
                    style={{ boxShadow: "inset 0 0 0 2px rgba(249,115,22,0.2)" }} />
                )}
                {/* Clickable error overlay */}
                {page?.status === "error" && !page?.html && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#080809]">
                    <div className="text-center">
                      <button
                        onClick={() => setShowErrorLog((v) => !v)}
                        className="group flex flex-col items-center gap-3 px-6 py-5 rounded-2xl border border-red-500/15 bg-red-500/[0.04] hover:bg-red-500/[0.08] hover:border-red-500/25 transition-all"
                      >
                        <span className="text-3xl">⚠️</span>
                        <div>
                          <p className="text-[13px] text-red-400 font-medium">Generation failed</p>
                          <p className="text-[11px] text-white/30 mt-1 group-hover:text-white/50 transition-colors">Click to view error details</p>
                        </div>
                      </button>
                      {showErrorLog && (
                        <div className="mt-3 w-80 text-left bg-[#0f0f14] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl">
                          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Error Log</span>
                            <button onClick={() => setShowErrorLog(false)} className="text-white/25 hover:text-white/60 text-[11px] transition-colors">✕</button>
                          </div>
                          <div className="p-3 space-y-1.5 max-h-64 overflow-auto">
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

        {/* Code pane */}
        {(previewMode === "code" || previewMode === "split") && (
          <div className={`flex flex-col overflow-hidden ${previewMode === "split" ? "w-[42%] flex-shrink-0" : "flex-1"}`}>
            <div className="h-8 px-3 flex items-center gap-2 border-b border-white/[0.05] flex-shrink-0 bg-[#060608]">
              <span className="text-[10px] text-white/25 font-mono uppercase tracking-widest">{file?.language ?? "html"}</span>
              <div className="flex-1" />
              <span className="text-[10px] text-white/15 font-mono">{localCode.length.toLocaleString()} chars</span>
            </div>
            <textarea
              value={localCode}
              onChange={(e) => {
                setLocalCode(e.target.value);
                if (selectedFileId && leftPanelTab === "files") updateFileContent(selectedFileId, e.target.value);
                else if (activePageId) updateFileContent(activePageId, e.target.value);
              }}
              spellCheck={false}
              className="flex-1 bg-[#050508] text-[12px] font-mono text-emerald-300/80 p-4 resize-none focus:outline-none leading-relaxed"
              style={{ tabSize: 2 }}
            />
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
