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
  const accent  = isSec ? "#2dd4bf" : "#4f7eff";
  const glow    = isSec ? "rgba(45,212,191,.12)" : "rgba(79,126,255,.12)";
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
          borderRadius: 3,
          boxShadow: `0 0 0 4px ${glow}`,
          pointerEvents: "none",
          zIndex: 99990,
        }}
      />

      {/* Tag chip — top-left of selection */}
      <div
        aria-hidden
        style={{
          position:   "fixed",
          top:        Math.max(rect.top - 20, 4),
          left:       Math.max(rect.left, 4),
          background: accent,
          color:      "#fff",
          fontFamily: "system-ui,-apple-system,sans-serif",
          fontSize:   10,
          fontWeight: 700,
          lineHeight: "1",
          padding:    "3px 7px",
          borderRadius: "5px 5px 5px 1px",
          pointerEvents: "none",
          zIndex: 99991,
          letterSpacing: ".02em",
          whiteSpace: "nowrap",
          maxWidth: 180,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {node.tag}{node.label && node.label !== node.tag ? ` · ${node.label.slice(0, 18)}` : ""}
      </div>

      {/* Toolbar */}
      <div
        style={{
          position:   "fixed",
          top:        tbTop,
          left:       tbLeft,
          zIndex:     99992,
          display:    "flex",
          alignItems: "center",
          gap:        2,
          padding:    "3px 4px",
          background: "#0c0c10",
          border:     "1px solid rgba(255,255,255,.09)",
          borderRadius: 8,
          boxShadow:  "0 4px 16px rgba(0,0,0,.55),0 1px 3px rgba(0,0,0,.3)",
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
  const bg  = armed ? "rgba(239,68,68,.18)" : lit ? `${litColor}1a` : h ? (danger ? "rgba(239,68,68,.10)" : "rgba(255,255,255,.08)") : "transparent";
  const col = armed ? "#fca5a5" : lit ? litColor : h ? (danger ? "#fca5a5" : "#fff") : danger ? "rgba(252,165,165,.65)" : "rgba(255,255,255,.5)";
  const bdr = (armed || h) ? (danger ? "rgba(239,68,68,.2)" : "rgba(255,255,255,.1)") : "transparent";

  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex", alignItems: "center",
        height: 26, padding: "0 7px", gap: 0,
        borderRadius: 5, border: `1px solid ${bdr}`,
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
  return <div style={{ width: 1, height: 13, background: "rgba(255,255,255,.07)", margin: "0 1px", flexShrink: 0 }} />;
}
