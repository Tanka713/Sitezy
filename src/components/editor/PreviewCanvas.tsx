"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { buildFullPageHtml } from "@/lib/utils";
import { buildVisualEditorScript } from "@/lib/utils/visualEditor";
import { EditPanel } from "./EditPanel";
import {
  Loader2, MousePointer2, Eye, Code2, Columns,
  Undo2, Redo2, ZoomIn, ZoomOut,
  Monitor, Tablet, Smartphone,
} from "lucide-react";
import type { Project } from "@/types";

interface Props { project: Project; }

const DEVICE_WIDTHS: Record<string, string> = {
  desktop: "100%",
  tablet:  "768px",
  mobile:  "390px",
};

export function PreviewCanvas({ project }: Props) {
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
  const undo              = useAppStore((s) => s.undo);
  const redo              = useAppStore((s) => s.redo);
  const undoStack         = useAppStore((s) => s.undoStack);
  const redoStack         = useAppStore((s) => s.redoStack);

  const [zoom, setZoom]       = useState(100);
  // iframe undo/redo availability (reported from iframe)
  const [iframeCanUndo, setIframeCanUndo] = useState(false);
  const [iframeCanRedo, setIframeCanRedo] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const pages = project?.pages ?? [];
  const files = project?.files ?? {};

  const activePageId = leftPanelTab === "files" && selectedFileId
    ? selectedFileId : selectedPageId;

  const page = pages.find((p) => p.id === activePageId) ?? null;
  const file = files[selectedFileId ?? ""] ?? null;

  const codeContent = (leftPanelTab === "files" && file && file.type !== "html")
    ? file.content : page?.html ?? "";

  const [localCode, setLocalCode] = useState(codeContent);
  useEffect(() => { setLocalCode(codeContent); }, [codeContent, activePageId, selectedFileId]);

  useEffect(() => {
    if (visualEditMode && previewMode !== "preview") setPreviewMode("preview");
  }, [visualEditMode]);

  const writeToIframe = useCallback((html: string, withEditor: boolean) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    const script = withEditor ? buildVisualEditorScript() : "";
    const full   = buildFullPageHtml(html, project?.blueprint ?? null, page?.name ?? "", script);
    doc.open(); doc.write(full); doc.close();
  }, [project?.blueprint, page?.name]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    if (!page?.html) {
      const doc = iframe.contentDocument;
      if (doc) { doc.open(); doc.write(emptyState(page?.status === "generating", page?.status === "error")); doc.close(); }
      return;
    }
    writeToIframe(page.html, visualEditMode);
  }, [page?.html, page?.id, page?.status, visualEditMode, writeToIframe]);

  // postMessage from iframe
  useEffect(() => {
    function handler(e: MessageEvent) {
      if (!e.data || e.data.source !== "sitezy-editor") return;
      const { type, payload } = e.data;

      if (type === "html-update") {
        const html = payload?.html as string;
        if (html && activePageId) updateFileContent(activePageId, html);
      }
      if (type === "stack-change") {
        setIframeCanUndo(!!payload?.canUndo);
        setIframeCanRedo(!!payload?.canRedo);
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [activePageId, updateFileContent]);

  function sendToIframe(type: string, payload?: Record<string, unknown>) {
    iframeRef.current?.contentWindow?.postMessage(
      { target: "sitezy-iframe", type, ...(payload ?? {}) }, "*"
    );
  }

  function handleUndo() {
    if (visualEditMode) sendToIframe("undo");
    else undo();
  }
  function handleRedo() {
    if (visualEditMode) sendToIframe("redo");
    else redo();
  }

  const canUndo = visualEditMode ? iframeCanUndo : undoStack.length > 0;
  const canRedo = visualEditMode ? iframeCanRedo : redoStack.length > 0;

  const isConstrained = devicePreview !== "desktop";
  const deviceWidth   = DEVICE_WIDTHS[devicePreview] ?? "100%";

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0a0a0b]">

      {/* ── Left: preview + code ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="h-10 border-b border-white/[0.06] flex items-center gap-1.5 px-3 flex-shrink-0">

          {/* View mode */}
          <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5">
            {([
              { mode: "preview" as const, icon: <Eye size={11} />,     label: "Preview" },
              { mode: "split"   as const, icon: <Columns size={11} />, label: "Split"   },
              { mode: "code"    as const, icon: <Code2 size={11} />,   label: "Code"    },
            ] as const).map(({ mode, icon, label }) => (
              <button key={mode}
                onClick={() => { setPreviewMode(mode); if (mode !== "preview") setVisualEditMode(false); }}
                title={label}
                className={`w-7 h-6 flex items-center justify-center rounded-md transition-colors ${previewMode === mode ? "bg-white/[0.1] text-white" : "text-white/30 hover:text-white/60"}`}>
                {icon}
              </button>
            ))}
          </div>

          {/* Device */}
          {previewMode !== "code" && (
            <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5">
              {([
                { d: "desktop" as const, icon: <Monitor size={11} />    },
                { d: "tablet"  as const, icon: <Tablet size={11} />     },
                { d: "mobile"  as const, icon: <Smartphone size={11} /> },
              ] as const).map(({ d, icon }) => (
                <button key={d} onClick={() => setDevicePreview(d)} title={d}
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
                  ? "bg-orange-500/15 text-orange-400 border-orange-500/25"
                  : "text-white/40 border-white/[0.07] hover:text-white/70 hover:border-white/[0.15]"
              }`}>
              <MousePointer2 size={11} />
              {visualEditMode ? "Editing" : "Edit"}
            </button>
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

          {page && <div className="w-px h-4 bg-white/[0.06] ml-1" />}
          {page && (
            <span className="text-[11px] text-white/20 truncate max-w-[120px] ml-1">
              {page.name}
              {page.status === "generating" && <Loader2 size={9} className="inline ml-1 spin text-brand-400" />}
            </span>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden flex">

          {/* Preview pane */}
          {(previewMode === "preview" || previewMode === "split") && (
            <div className={`overflow-auto bg-[#0d0d0f] flex-1 ${previewMode === "split" ? "border-r border-white/[0.06]" : ""}`}>
              <div className="flex items-start justify-center p-4 min-h-full">
                <div
                  className={`bg-white relative transition-all duration-200 ${isConstrained ? "rounded-xl overflow-hidden shadow-2xl shadow-black/60" : "rounded-lg overflow-hidden shadow-xl shadow-black/40"}`}
                  style={{
                    width: deviceWidth,
                    minHeight: "calc(100vh - 6rem)",
                    flexShrink: 0,
                    transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                    transformOrigin: "top center",
                  }}>
                  <iframe
                    ref={iframeRef}
                    className="w-full border-none block"
                    style={{ minHeight: "calc(100vh - 6rem)" }}
                    title={`Preview: ${page?.name ?? "empty"}`}
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                  {visualEditMode && (
                    <div className="absolute inset-0 pointer-events-none rounded-lg"
                      style={{ border: "2px solid rgba(249,115,22,0.3)" }} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Code pane */}
          {(previewMode === "code" || previewMode === "split") && (
            <div className={`flex flex-col overflow-hidden ${previewMode === "split" ? "w-[40%]" : "flex-1"}`}>
              <div className="h-8 px-3 flex items-center border-b border-white/[0.05] flex-shrink-0">
                <span className="text-[10px] text-white/25 font-mono uppercase tracking-widest">{file?.language ?? "html"}</span>
                <span className="ml-auto text-[10px] text-white/15">{localCode.length.toLocaleString()} chars</span>
              </div>
              <textarea value={localCode} onChange={(e) => {
                  setLocalCode(e.target.value);
                  if (selectedFileId && leftPanelTab === "files") updateFileContent(selectedFileId, e.target.value);
                  else if (activePageId) updateFileContent(activePageId, e.target.value);
                }}
                spellCheck={false}
                className="flex-1 bg-[#060608] text-[12px] font-mono text-emerald-300/80 p-4 resize-none focus:outline-none leading-relaxed"
                style={{ tabSize: 2 }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Right: edit panel (only in visual edit mode) ───────────────────── */}
      {visualEditMode && (
        <div className="w-[260px] border-l border-white/[0.06] bg-[#0a0a0c] flex-shrink-0 flex flex-col overflow-hidden">
          <EditPanel iframeRef={iframeRef} onClose={() => setVisualEditMode(false)} />
        </div>
      )}
    </div>
  );
}

function emptyState(isGenerating: boolean, isError: boolean): string {
  const body = isGenerating
    ? `<div class="sp"></div><p style="font-size:13px;color:#666;margin-top:12px">Generating page…</p>`
    : isError
    ? `<span style="font-size:24px">⚠️</span><p style="font-size:13px;color:#ef4444;margin-top:8px">Generation failed</p>`
    : `<p style="font-size:13px;color:#333">Select a page to preview</p>`;
  return `<!DOCTYPE html><html><head><style>
    body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;
    background:#0a0a0c;font-family:system-ui,sans-serif;flex-direction:column;gap:4px}
    .sp{width:32px;height:32px;border:2px solid #2a2a3a;border-top-color:#7c3aed;
    border-radius:50%;animation:spin 1s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style></head><body>${body}</body></html>`;
}
