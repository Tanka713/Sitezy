"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { Copy, Trash2, ChevronUp, ChevronDown, CornerUpLeft, Pencil } from "lucide-react";

interface Rect { top: number; left: number; width: number; height: number; }

export function CanvasToolbar({
  iframeRef,
}: {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}) {
  const node     = useAppStore((s) => s.editor.selectedNode);
  const isEdit   = useAppStore((s) => s.editor.isCanvasEditing);
  const clearSel = useAppStore((s) => s.clearCanvasSelection);
  const selSec   = useAppStore((s) => s.selectSection);

  const [rect,    setRect]   = useState<Rect | null>(null);
  const [armed,   setArmed]  = useState(false);
  const armRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const send = useCallback((type: string, extra: Record<string, unknown> = {}) => {
    iframeRef.current?.contentWindow?.postMessage(
      { target: "sitezy-iframe", type, ...extra }, "*"
    );
  }, [iframeRef]);

  // Measure selected element inside iframe
  useEffect(() => {
    if (!node?.nodeId) { setRect(null); return; }

    function measure() {
      const iframe = iframeRef.current;
      if (!iframe) { setRect(null); return; }
      const ir  = iframe.getBoundingClientRect();
      const doc = iframe.contentDocument;
      if (!doc) { setRect(null); return; }
      const el = doc.querySelector(`[data-sz-id="${node!.nodeId}"]`) as HTMLElement | null;
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: ir.top + r.top, left: ir.left + r.left, width: r.width, height: r.height });
    }

    measure();
    const win = iframeRef.current?.contentWindow;
    win?.addEventListener("scroll", measure, true);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    const raf = { id: 0 };
    function loop() { measure(); raf.id = requestAnimationFrame(loop); }
    raf.id = requestAnimationFrame(loop);
    return () => {
      win?.removeEventListener("scroll", measure, true);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(raf.id);
    };
  }, [node?.nodeId, iframeRef]);

  // Reset arm on element change
  useEffect(() => {
    setArmed(false);
    if (armRef.current) clearTimeout(armRef.current);
  }, [node?.nodeId]);

  function handleDelete() {
    if (!armed) {
      setArmed(true);
      armRef.current = setTimeout(() => setArmed(false), 2400);
      return;
    }
    setArmed(false);
    send("delete");
    clearSel();
    selSec(null);
  }

  if (!node || !rect) return null;

  const isSec   = node.isSec;
  const accent  = isSec ? "#5eead4" : "#fbbf24";
  const glow    = isSec ? "rgba(94,234,212,.16)" : "rgba(251,191,36,.14)";
  const canEdit = (node.isText || node.isBtn) && !node.isImg;

  // Position toolbar: above element, clamp to viewport
  const GAP = 6, TB_H = 30;
  let tbTop  = rect.top - TB_H - GAP;
  if (tbTop < 8) tbTop = rect.top + rect.height + GAP;
  const tbLeft = Math.max(8, Math.min(rect.left, window.innerWidth - 280));

  return (
    <>
      {/* Selection ring */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top:  rect.top  - 2,
          left: rect.left - 2,
          width:  rect.width  + 4,
          height: rect.height + 4,
          border: `2px solid ${accent}`,
          borderRadius: 12,
          boxShadow: `0 0 0 5px ${glow}`,
          pointerEvents: "none",
          zIndex: 99990,
        }}
      />

      {/* Toolbar */}
      <div
        style={{
          position:   "fixed",
          top:        tbTop,
          left:       tbLeft,
          zIndex:     99992,
          display:    "flex",
          alignItems: "center",
        gap:        4,
        padding:    "4px 5px",
        background: "var(--surface-overlay)",
        border:     "1px solid var(--border-softer)",
        borderRadius: 14,
        boxShadow:  "var(--shadow-xl), inset 0 1px 0 rgba(255,255,255,.06)",
        fontFamily: "system-ui,-apple-system,sans-serif",
      }}
    >
        {node.parentNodeId && (
          <Tb onClick={() => send("select-parent")} title="Select parent  Tab">
            <CornerUpLeft size={11} />
          </Tb>
        )}
        {node.parentNodeId && <Div />}

        {canEdit && (
          <Tb
            onClick={() => send(isEdit ? "stop-edit" : "start-edit")}
            title={isEdit ? "Stop editing  Esc" : "Edit text  Enter"}
            lit={isEdit}
            litColor="#22d3ee"
          >
            <Pencil size={10} />
            <span style={{ fontSize: 10, fontWeight: 600, marginLeft: 3 }}>
              {isEdit ? "Done" : "Edit"}
            </span>
          </Tb>
        )}
        {canEdit && <Div />}

        {isSec && (
          <>
            <Tb onClick={() => send("move-up")}   title="Move section up"><ChevronUp   size={11} /></Tb>
            <Tb onClick={() => send("move-down")} title="Move section down"><ChevronDown size={11} /></Tb>
            <Div />
          </>
        )}

        <Tb onClick={() => send("duplicate")} title="Duplicate  ⌘D">
          <Copy size={11} />
        </Tb>
        <Div />
        <Tb onClick={handleDelete} title="Delete  ⌫" danger armed={armed}>
          <Trash2 size={11} />
          {armed && <span style={{ fontSize: 10, fontWeight: 600, marginLeft: 3 }}>Sure?</span>}
        </Tb>
      </div>
    </>
  );
}

function Tb({
  onClick, title, children, danger, armed, lit, litColor,
}: {
  onClick: () => void; title?: string; children: React.ReactNode;
  danger?: boolean; armed?: boolean; lit?: boolean; litColor?: string;
}) {
  const [h, setH] = useState(false);
  const bg  = armed ? "rgba(240,106,116,.12)" : lit ? `${litColor}20` : h ? (danger ? "rgba(240,106,116,.08)" : "var(--surface-4)") : "transparent";
  const col = armed ? "var(--danger-fg)" : lit ? litColor : h ? (danger ? "var(--danger-fg)" : "var(--text-primary)") : danger ? "var(--danger-fg)" : "var(--text-secondary)";
  const bdr = armed || h || lit ? (danger ? "rgba(240,106,116,.22)" : "var(--border-soft)") : "transparent";

  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex", alignItems: "center",
        height: 30, padding: "0 9px", gap: 0,
        borderRadius: 9, border: `1px solid ${bdr}`,
        background: bg, color: col as string,
        cursor: "pointer", whiteSpace: "nowrap",
        fontSize: 11, fontWeight: 600,
        transition: "background .1s,color .1s,border-color .1s",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

function Div() {
  return <div style={{ width: 1, height: 16, background: "var(--border-soft)", margin: "0 1px", flexShrink: 0 }} />;
}
