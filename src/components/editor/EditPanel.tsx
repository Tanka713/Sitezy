"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAppStore } from "@/lib/store";
import {
  Type, ImageIcon, Layout, Square, Sparkles, Layers,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Bold, Italic, Underline, Strikethrough,
  ChevronDown, MousePointer2, Link, Globe, Mail, Phone, Anchor, FileText, X,
  Video, FormInput, ToggleLeft,
} from "lucide-react";
import type { CanvasNodeInfo, Project } from "@/types";

interface Props {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onClose: () => void;
  project?: Project;
}

const FONTS = [
  "inherit","Inter","Plus Jakarta Sans","DM Sans","Outfit","Sora","Manrope","Nunito",
  "Playfair Display","Cormorant Garamond","Lora","Libre Baskerville",
  "Space Grotesk","Epilogue","Unbounded","Bebas Neue","Anton",
];
const WEIGHTS = [
  {v:"300",l:"Light"},{v:"400",l:"Regular"},{v:"500",l:"Medium"},
  {v:"600",l:"SemiBold"},{v:"700",l:"Bold"},{v:"800",l:"ExtraBold"},{v:"900",l:"Black"},
];
const SHADOW_PRESETS = [
  { label: "None",  value: "none" },
  { label: "SM",    value: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)" },
  { label: "MD",    value: "0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.08)" },
  { label: "LG",    value: "0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)" },
  { label: "XL",    value: "0 20px 25px rgba(0,0,0,0.15), 0 10px 10px rgba(0,0,0,0.06)" },
  { label: "Inner", value: "inset 0 2px 4px rgba(0,0,0,0.15)" },
];

function safeHex(v: string | null | undefined): string {
  if (!v || v === "transparent" || v === "rgba(0, 0, 0, 0)") return "#ffffff";
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
  const m = v.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (m) return "#" + [m[1],m[2],m[3]].map((x) => parseInt(x).toString(16).padStart(2,"0")).join("");
  return "#888888";
}
function isTransparent(color: string | null | undefined): boolean {
  return !color || color === "transparent" || color === "rgba(0, 0, 0, 0)";
}
function parseRadius(r: string): [string, string, string, string] {
  const parts = r ? r.split(" ").map((s) => s.trim()) : ["0px"];
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
  return [parts[0], parts[1], parts[2], parts[3]];
}

function parseUnitDraft(value: string): string {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? "0" : String(Math.max(0, parsed));
}

// ─── Color utils ──────────────────────────────────────────────────────────────
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  s /= 100; v /= 100;
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)];
}
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const v = max * 100;
  const s = max === 0 ? 0 : (d / max) * 100;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = h * 60; if (h < 0) h += 360;
  }
  return [h, s, v];
}
function hsvToHex(h: number, s: number, v: number): string {
  const [r, g, b] = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

// ─── ColorPicker ──────────────────────────────────────────────────────────────
function ColorPicker({ value, onChange, onClear, allowClear = false }: {
  value: string;
  onChange: (hex: string) => void;
  onClear?: () => void;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(safeHex(value)));
  const [hexInput, setHexInput] = useState(safeHex(value).replace("#", ""));
  const pickerRef = useRef<HTMLDivElement>(null);
  const gradRef    = useRef<HTMLDivElement>(null);
  const dragging   = useRef(false);

  const [h, s, v] = hsv;
  const currentHex = hsvToHex(h, s, v);
  const hueColor   = `hsl(${h}, 100%, 50%)`;

  // Sync when value changes externally
  useEffect(() => {
    const safe = safeHex(value);
    const newHsv = hexToHsv(safe);
    setHsv(newHsv);
    setHexInput(hsvToHex(...newHsv).replace("#", ""));
  }, [value]);

  // Close on outside click + release drag on mouseup anywhere
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onMove = (e: MouseEvent) => { if (dragging.current) pickFromGrad(e); };
    const onUp   = () => { dragging.current = false; };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    };
  }, [open, h]); // h in deps so pickFromGrad closure stays fresh

  function pickFromGrad(e: MouseEvent | React.MouseEvent) {
    if (!gradRef.current) return;
    const rect = gradRef.current.getBoundingClientRect();
    const ns = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const nv = Math.max(0, Math.min(100, (1 - (e.clientY - rect.top) / rect.height) * 100));
    setHsv((prev) => {
      const newHsv: [number, number, number] = [prev[0], ns, nv];
      const hex = hsvToHex(...newHsv);
      setHexInput(hex.replace("#", ""));
      onChange(hex);
      return newHsv;
    });
  }

  function commitHex(raw: string) {
    const hex = raw.startsWith("#") ? raw : `#${raw}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      const newHsv = hexToHsv(hex);
      setHsv(newHsv);
      onChange(hex);
    } else {
      setHexInput(currentHex.replace("#", ""));
    }
  }

  return (
    <div className="relative" ref={pickerRef}>
      {/* Trigger row */}
      <div
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.14] rounded-lg p-1.5 cursor-pointer transition-all"
      >
        <span
          className="block w-7 h-7 rounded-md ring-1 ring-inset ring-white/10 flex-shrink-0"
          style={{ backgroundColor: currentHex }}
        />
        <span className="flex-1 text-[11px] text-white/55 font-mono">{currentHex}</span>
        {allowClear && onClear && (
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="w-5 h-5 flex items-center justify-center text-white/20 hover:text-white/55 text-[10px] rounded transition-colors"
          >✕</button>
        )}
      </div>

      {/* Popover */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-[999] w-[220px] bg-[#18181d] border border-white/[0.09] rounded-xl shadow-2xl overflow-hidden">
          {/* Gradient square */}
          <div
            ref={gradRef}
            className="w-full relative select-none"
            style={{ height: 140, background: `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, ${hueColor})`, cursor: "crosshair" }}
            onMouseDown={(e) => { dragging.current = true; pickFromGrad(e); }}
          >
            <div
              className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-lg pointer-events-none"
              style={{ left: `${s}%`, top: `${100 - v}%`, transform: "translate(-50%,-50%)", boxShadow: "0 0 0 1px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.5)" }}
            />
          </div>

          <div className="p-3 space-y-2.5">
            {/* Hue slider */}
            <div>
              <style>{`.sz-hue::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.5);cursor:pointer}.sz-hue::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.5);cursor:pointer}`}</style>
              <input
                type="range" min={0} max={360} value={Math.round(h)}
                onChange={(e) => {
                  const nh = Number(e.target.value);
                  const newHsv: [number, number, number] = [nh, s, v];
                  setHsv(newHsv);
                  const hex = hsvToHex(...newHsv);
                  setHexInput(hex.replace("#", ""));
                  onChange(hex);
                }}
                className="sz-hue w-full h-3 rounded-full appearance-none cursor-pointer"
                style={{ background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}
              />
            </div>

            {/* Hex input */}
            <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2.5 py-1.5">
              <span className="text-[11px] text-white/25 font-mono select-none">#</span>
              <input
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                onBlur={(e) => commitHex(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitHex(hexInput); }}
                maxLength={6}
                spellCheck={false}
                className="flex-1 bg-transparent text-[11px] text-white/75 font-mono focus:outline-none uppercase min-w-0"
              />
              <span className="w-4 h-4 rounded flex-shrink-0 ring-1 ring-white/10" style={{ backgroundColor: currentHex }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Accordion ────────────────────────────────────────────────────────────────
function Accordion({ title, icon, open, toggle, children }: {
  title: string; icon: React.ReactNode; open: boolean; toggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-white/[0.05]">
      <button onClick={toggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/[0.02] transition-colors group">
        <span className="text-white/25 group-hover:text-white/45 transition-colors">{icon}</span>
        <span className="flex-1 text-[10.5px] font-semibold text-white/45 uppercase tracking-wider group-hover:text-white/65 transition-colors">
          {title}
        </span>
        <ChevronDown size={10} className={`text-white/18 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-3 pb-3 space-y-2.5">{children}</div>}
    </div>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[9.5px] font-semibold text-white/28 uppercase tracking-wider mb-1">{children}</p>
);

function ToggleGroup({ options, value, onChange }: {
  options: { val: string; icon: React.ReactNode; title: string }[];
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5 gap-0.5">
      {options.map((o) => (
        <button key={o.val} title={o.title} onClick={() => onChange(o.val)}
          className={`flex-1 h-6 flex items-center justify-center rounded-md transition-colors text-[11px] ${
            value === o.val ? "bg-white/[0.12] text-white" : "text-white/28 hover:text-white/55"
          }`}>
          {o.icon}
        </button>
      ))}
    </div>
  );
}

function PresetSelect({
  value,
  onChange,
  options,
  placeholder = "Preset",
}: {
  value?: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        if (!e.target.value) return;
        onChange(e.target.value);
      }}
      className="bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[10px] text-white/60 focus:outline-none appearance-none"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// Box model: 3×3 grid showing T/R/B/L inputs
function BoxModel({ label, t, r, b, l, onT, onR, onB, onL, accent, fieldKey, setActiveField }: {
  label: string; t: number; r: number; b: number; l: number;
  onT:(v:number)=>void; onR:(v:number)=>void; onB:(v:number)=>void; onL:(v:number)=>void;
  accent: string;
  fieldKey?: string;
  activeField?: string | null;
  setActiveField?: (field: string | null) => void;
}) {
  const [drafts, setDrafts] = useState({
    top: String(t),
    right: String(r),
    bottom: String(b),
    left: String(l),
  });

  useEffect(() => {
    setDrafts((current) => ({
      top: current.top === "" ? current.top : String(t),
      right: current.right === "" ? current.right : String(r),
      bottom: current.bottom === "" ? current.bottom : String(b),
      left: current.left === "" ? current.left : String(l),
    }));
  }, [t, r, b, l]);

  const inp = (side: "top" | "right" | "bottom" | "left", fn: (n:number)=>void) => (
    <input
      type="text"
      inputMode="numeric"
      value={drafts[side]}
      placeholder="0"
      onChange={(e) => {
        const next = e.target.value.replace(/[^\d.-]/g, "");
        setDrafts((current) => ({ ...current, [side]: next }));
        if (next === "") return;
        const parsed = Number(next);
        if (!Number.isNaN(parsed)) fn(Math.max(0, parsed));
      }}
      onFocus={() => setActiveField?.(`${fieldKey ?? label}-${side}`)}
      onBlur={() => {
        const raw = drafts[side].trim();
        const parsed = raw === "" ? 0 : Number(raw);
        const safe = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
        fn(safe);
        setDrafts((current) => ({ ...current, [side]: String(safe) }));
        setActiveField?.(null);
      }}
      className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2 text-left text-[10px] text-white/70 py-1 focus:outline-none focus:border-indigo-500/40 transition-colors"
    />
  );
  return (
    <div>
      <Label>{label}</Label>
      <div className="grid grid-cols-3 gap-1 items-center">
        <div />
        {inp("top", onT)}
        <div />
        {inp("left", onL)}
        <div className={`h-8 rounded border ${accent} flex items-center justify-center text-[8px] text-white/18 font-mono`}>
          {label.slice(0,1)}
        </div>
        {inp("right", onR)}
        <div />
        {inp("bottom", onB)}
        <div />
      </div>
      <div className="grid grid-cols-4 gap-0.5 mt-0.5">
        {["T","R","B","L"].map((s) => (
          <p key={s} className="text-center text-[8px] text-white/18">{s}</p>
        ))}
      </div>
    </div>
  );
}

export function EditPanel({ iframeRef, onClose, project }: Props) {
  const node           = useAppStore((s) => s.editor.selectedNode) as CanvasNodeInfo | null;
  const editing        = useAppStore((s) => s.editor.isCanvasEditing);
  const selectedPageId = useAppStore((s) => s.editor.selectedPageId);
  const currentPage    = (project?.pages ?? []).find((p) => p.id === selectedPageId) ?? null;
  const [lastSyncedNodeId, setLastSyncedNodeId] = useState<string | null>(null);

  // Accordion open/close state
  const [open, setOpen] = useState<Record<string, boolean>>({
    typography: true, image: false, video: false, embed: false, input: false, link: false, layout: false,
    spacing: true, background: false, border: false, effects: false, section: false,
  });
  const toggle = (k: string) => setOpen((s) => ({ ...s, [k]: !s[k] }));

  // Local spacing mirrors (numbers)
  const [pT, setPT] = useState(0); const [pR, setPR] = useState(0);
  const [pB, setPB] = useState(0); const [pL, setPL] = useState(0);
  const [mT, setMT] = useState(0); const [mR, setMR] = useState(0);
  const [mB, setMB] = useState(0); const [mL, setML] = useState(0);
  // Section padding
  const [spT, setSpT] = useState(64); const [spR, setSpR] = useState(32);
  const [spB, setSpB] = useState(64); const [spL, setSpL] = useState(32);
  // Border radius corners
  const [brTL, setBrTL] = useState("0"); const [brTR, setBrTR] = useState("0");
  const [brBL, setBrBL] = useState("0"); const [brBR, setBrBR] = useState("0");
  // Image / video / embed / input / link
  const [imgUrl,    setImgUrl]    = useState("");
  const [embedUrl,  setEmbedUrl]  = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkType, setLinkType] = useState<"page"|"url"|"email"|"phone"|"anchor"|"none">("url");
  const [inputPlaceholder, setInputPlaceholder] = useState("");
  const [inputName, setInputName] = useState("");
  const [inputType, setInputType] = useState("text");
  // Size inputs
  const [wVal,  setWVal]  = useState("");
  const [hVal,  setHVal]  = useState("");
  const [mwVal, setMwVal] = useState("");
  const [mxVal, setMxVal] = useState("");
  // Typography local state (buffered — only applies on blur/Enter)
  const [localFontSize,      setLocalFontSize]      = useState("16");
  const [localLineHeight,    setLocalLineHeight]    = useState("1.5");
  const [localLetterSpacing, setLocalLetterSpacing] = useState("0");
  const [localOpacity,       setLocalOpacity]       = useState(1);
  const [localBorder,        setLocalBorder]        = useState("none");
  const [localBgImage,       setLocalBgImage]       = useState("");
  const [activeField,        setActiveField]        = useState<string | null>(null);

  // Sync from store node
  useEffect(() => {
    if (!node) return;
    const nodeChanged = lastSyncedNodeId !== node.nodeId;
    if (activeField && !nodeChanged) return;
    if (activeField !== "imgUrl") setImgUrl(node.src ?? "");
    if (activeField !== "embedUrl") setEmbedUrl((node as any).isIframe ? (node.src ?? "") : "");
    if (activeField !== "linkUrl") setLinkUrl(node.href ?? "");
    if (activeField !== "inputPlaceholder") setInputPlaceholder((node as any).placeholder ?? "");
    if (activeField !== "inputName") setInputName((node as any).inputName ?? "");
    if (activeField !== "inputType") setInputType((node as any).inputType ?? "text");
    if (activeField !== "padding-top") setPT(node.paddingTop);
    if (activeField !== "padding-right") setPR(node.paddingRight);
    if (activeField !== "padding-bottom") setPB(node.paddingBottom);
    if (activeField !== "padding-left") setPL(node.paddingLeft);
    if (activeField !== "margin-top") setMT(node.marginTop);
    if (activeField !== "margin-right") setMR(node.marginRight);
    if (activeField !== "margin-bottom") setMB(node.marginBottom);
    if (activeField !== "margin-left") setML(node.marginLeft);
    if (node.secPadding && !activeField?.startsWith("section-padding")) {
      const p = node.secPadding.split(" ").map(parseFloat);
      setSpT(p[0] ?? 64); setSpR(p[1] ?? 32); setSpB(p[2] ?? 64); setSpL(p[3] ?? 32);
    }
    if (activeField !== "width") setWVal(node.width || "auto");
    if (activeField !== "height") setHVal(node.height || "auto");
    if (activeField !== "minWidth") setMwVal(node.minWidth || "none");
    if (activeField !== "maxWidth") setMxVal(node.maxWidth || "none");
    if (activeField !== "fontSize") setLocalFontSize(String(Math.round(node.fontSize ?? 16)));
    if (activeField !== "lineHeight") setLocalLineHeight(String(parseFloat(node.lineHeight) || 1.5));
    if (activeField !== "letterSpacing") setLocalLetterSpacing(String(parseFloat(node.letterSpacing) || 0));
    if (activeField !== "opacity") setLocalOpacity(parseFloat(node.opacity ?? "1"));
    if (activeField !== "border") setLocalBorder(node.border || "none");
    if (activeField !== "backgroundImage") {
      setLocalBgImage(node.backgroundImage && !node.backgroundImage.includes("none") ? node.backgroundImage : "");
    }
    if (!activeField?.startsWith("radius-")) {
      const [tl, tr, br, bl] = parseRadius(node.borderRadius ?? "0px");
      setBrTL(parseUnitDraft(tl)); setBrTR(parseUnitDraft(tr)); setBrBR(parseUnitDraft(br)); setBrBL(parseUnitDraft(bl));
    }
    // Auto-open relevant sections
    setOpen((o) => ({
      ...o,
      typography: !!(node.isText || node.isBtn),
      image: !!node.isImg,
      video: !!(node as any).isVideo,
      embed: !!(node as any).isIframe,
      input: !!(node as any).isInput,
      link: !!(node.isBtn || node.tag === "a" || node.href !== null),
      section: !!node.isSec,
    }));
    setLastSyncedNodeId(node.nodeId);
  }, [
    lastSyncedNodeId,
    node?.nodeId,
    node?.src,
    node?.href,
    node?.paddingTop,
    node?.paddingRight,
    node?.paddingBottom,
    node?.paddingLeft,
    node?.marginTop,
    node?.marginRight,
    node?.marginBottom,
    node?.marginLeft,
    node?.secPadding,
    node?.width,
    node?.height,
    node?.minWidth,
    node?.maxWidth,
    node?.fontSize,
    node?.lineHeight,
    node?.letterSpacing,
    node?.opacity,
    node?.border,
    node?.backgroundImage,
    node?.borderRadius,
    node?.isText,
    node?.isBtn,
    node?.isImg,
    node?.isSec,
    activeField,
  ]); // eslint-disable-line

  useEffect(() => {
    if (!node) return;
    const href = node.href ?? "";
    if (!href || href === "#" || href === "") setLinkType("none");
    else if (href.startsWith("mailto:")) setLinkType("email");
    else if (href.startsWith("tel:")) setLinkType("phone");
    else if (href.startsWith("#")) setLinkType("anchor");
    else if (href.startsWith("http") || href.startsWith("//")) setLinkType("url");
    else setLinkType("page");
  }, [node?.nodeId, node?.href]); // eslint-disable-line

  const send = useCallback((type: string, extra: Record<string, unknown> = {}) => {
    iframeRef.current?.contentWindow?.postMessage(
      { target: "sitezy-iframe", type, ...extra }, "*"
    );
  }, [iframeRef]);

  const applyStyle = useCallback((prop: string, value: string) => {
    send("apply-style", { prop, value });
  }, [send]);

  // Helpers for spacing apply on change
  function applyPad(t:number, r:number, b:number, l:number) {
    send("apply-style", { prop: "padding", value: `${t}px ${r}px ${b}px ${l}px` });
  }
  function applyMar(t:number, r:number, b:number, l:number) {
    send("apply-style", { prop: "margin", value: `${t}px ${r}px ${b}px ${l}px` });
  }
  function applySecPad(t:number, r:number, b:number, l:number) {
    send("apply-section-style", { prop: "padding", value: `${t}px ${r}px ${b}px ${l}px` });
  }
  function applyRadius(tl:string, tr:string, br:string, bl:string) {
    const v = `${parseUnitDraft(tl)}px ${parseUnitDraft(tr)}px ${parseUnitDraft(br)}px ${parseUnitDraft(bl)}px`;
    send("apply-style", { prop: "borderRadius", value: v });
  }

  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
          <MousePointer2 size={16} className="text-white/20" />
        </div>
        <p className="text-[11px] text-white/25 leading-relaxed">
          Click any element on the canvas to inspect and edit its styles
        </p>
      </div>
    );
  }

  const txtColor   = safeHex(node.color);
  const bgColor    = isTransparent(node.backgroundColor) ? null : safeHex(node.backgroundColor);
  const secBgColor = isTransparent(node.secBg) ? null : safeHex(node.secBg);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Element header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.06] flex-shrink-0 bg-white/[0.015]">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-[10px] font-mono text-indigo-400/80 bg-indigo-500/10 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">
            {node.tag}
          </span>
          {node.label && (
            <span className="text-[11px] text-white/45 truncate">{node.label}</span>
          )}
        </div>
        {node.isSec && (
          <span className="text-[9px] text-teal-400/70 bg-teal-500/10 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">
            section
          </span>
        )}
      </div>

      {/* Breadcrumb path */}
      {node.sectionName && (
        <div className="px-3 py-1.5 border-b border-white/[0.04] flex-shrink-0">
          <p className="text-[9.5px] text-white/22 truncate font-mono">
            {node.sectionName} › {node.role}
          </p>
        </div>
      )}

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Link ── */}
        {(node.isBtn || node.tag === "a" || node.href !== null) && (
          <Accordion title="Link" icon={<Link size={12}/>} open={open.link} toggle={() => toggle("link")}>
            {/* Type selector */}
            <div className="grid grid-cols-3 gap-1">
              {([
                { val: "none"   as const, label: "None",    icon: <X size={11}/> },
                { val: "page"   as const, label: "Page",    icon: <FileText size={11}/> },
                { val: "anchor" as const, label: "Section", icon: <Anchor size={11}/> },
                { val: "url"    as const, label: "URL",     icon: <Globe size={11}/> },
                { val: "email"  as const, label: "Email",   icon: <Mail size={11}/> },
                { val: "phone"  as const, label: "Phone",   icon: <Phone size={11}/> },
              ] as const).map(({ val, label, icon }) => (
                <button key={val} onClick={() => {
                  setLinkType(val);
                  if (val === "none")   { setLinkUrl("#"); send("apply-attr", { attr: "href", value: "#" }); }
                  if (val === "email")  { setLinkUrl("mailto:"); send("apply-attr", { attr: "href", value: "mailto:" }); }
                  if (val === "phone")  { setLinkUrl("tel:"); send("apply-attr", { attr: "href", value: "tel:" }); }
                  if (val === "anchor") { setLinkUrl("#"); send("apply-attr", { attr: "href", value: "#" }); }
                }}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                    linkType === val
                      ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/25"
                      : "text-white/35 border-white/[0.06] hover:border-white/[0.12] hover:text-white/60"
                  }`}>
                  {icon} {label}
                </button>
              ))}
            </div>

            {/* Page picker */}
            {linkType === "page" && project?.pages && project.pages.length > 0 && (
              <div className="relative">
                <FileText size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                <select value={linkUrl}
                  onChange={(e) => { setLinkUrl(e.target.value); send("apply-attr", { attr: "href", value: e.target.value }); }}
                  className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg pl-7 pr-2 py-1.5 text-[11px] text-white/70 focus:outline-none appearance-none">
                  <option value="">Select a page…</option>
                  {project.pages.map((p) => (
                    <option key={p.id} value={`/${p.slug || p.name.toLowerCase().replace(/\s+/g, "-")}`}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Section picker */}
            {linkType === "anchor" && (
              currentPage && currentPage.sections.length > 0 ? (
                <div className="space-y-0.5 max-h-36 overflow-auto rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
                  {currentPage.sections.map((sec) => {
                    const anchorVal = `#${sec.id}`;
                    const isSelected = linkUrl === anchorVal;
                    return (
                      <button key={sec.id}
                        onClick={() => { setLinkUrl(anchorVal); send("apply-attr", { attr: "href", value: anchorVal }); }}
                        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] transition-all text-left ${
                          isSelected ? "bg-teal-500/15 text-teal-300" : "text-white/45 hover:bg-white/[0.04] hover:text-white/75"
                        }`}>
                        <Anchor size={9} className="flex-shrink-0 opacity-50" />
                        <span className="truncate">{sec.name || sec.type}</span>
                        {isSelected && <span className="ml-auto text-[9px] text-teal-400/60">selected</span>}
                      </button>
                    );
                  })}
                </div>
              ) : <p className="text-[10px] text-white/25 px-1">No sections on this page.</p>
            )}

            {/* URL input */}
            {linkType === "url" && (
              <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5">
                <Globe size={10} className="text-white/25 flex-shrink-0" />
                <input value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onBlur={() => send("apply-attr", { attr: "href", value: linkUrl })}
                  onKeyDown={(e) => e.key === "Enter" && send("apply-attr", { attr: "href", value: linkUrl })}
                  placeholder="https://example.com"
                  className="flex-1 bg-transparent text-[11px] text-white/60 placeholder-white/18 focus:outline-none min-w-0"
                />
              </div>
            )}

            {/* Email input */}
            {linkType === "email" && (
              <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5">
                <Mail size={10} className="text-white/25 flex-shrink-0" />
                <input value={linkUrl.replace("mailto:", "")}
                  onChange={(e) => setLinkUrl("mailto:" + e.target.value)}
                  onBlur={() => send("apply-attr", { attr: "href", value: linkUrl })}
                  onKeyDown={(e) => e.key === "Enter" && send("apply-attr", { attr: "href", value: linkUrl })}
                  placeholder="hello@example.com"
                  className="flex-1 bg-transparent text-[11px] text-white/60 placeholder-white/18 focus:outline-none min-w-0"
                />
              </div>
            )}

            {/* Phone input */}
            {linkType === "phone" && (
              <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5">
                <Phone size={10} className="text-white/25 flex-shrink-0" />
                <input value={linkUrl.replace("tel:", "")}
                  onChange={(e) => setLinkUrl("tel:" + e.target.value)}
                  onBlur={() => send("apply-attr", { attr: "href", value: linkUrl })}
                  onKeyDown={(e) => e.key === "Enter" && send("apply-attr", { attr: "href", value: linkUrl })}
                  placeholder="+1 555 000 0000"
                  className="flex-1 bg-transparent text-[11px] text-white/60 placeholder-white/18 focus:outline-none min-w-0"
                />
              </div>
            )}

            {/* Open in new tab */}
            {(linkType === "url" || linkType === "page") && (
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[10px] text-white/35">Open in new tab</span>
                <button
                  onClick={() => send("apply-attr", { attr: "target", value: node.target === "_blank" ? "_self" : "_blank" })}
                  className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${node.target === "_blank" ? "bg-indigo-500" : "bg-white/[0.1]"}`}>
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${node.target === "_blank" ? "translate-x-[18px]" : "translate-x-0.5"}`}/>
                </button>
              </label>
            )}
          </Accordion>
        )}

        {/* ── Typography ── */}
        {(node.isText || node.isBtn || !node.isImg) && (
          <Accordion title="Typography" icon={<Type size={12}/>} open={open.typography} toggle={() => toggle("typography")}>
            {/* Font family */}
            <div>
              <Label>Font</Label>
              <select value={node.fontFamily} onChange={(e) => applyStyle("fontFamily", e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[11px] text-white/70 focus:outline-none appearance-none">
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* Size + Weight row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Size</Label>
                <div className="flex items-center gap-1 bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5">
                  <input type="number" value={localFontSize} min={8} max={300}
                    onFocus={() => setActiveField("fontSize")}
                    onChange={(e) => {
                      const next = e.target.value;
                      setLocalFontSize(next);
                      if (next !== "") applyStyle("fontSize", next + "px");
                    }}
                    onBlur={() => { applyStyle("fontSize", localFontSize + "px"); setActiveField(null); }}
                    onKeyDown={(e) => e.key === "Enter" && applyStyle("fontSize", localFontSize + "px")}
                    className="flex-1 bg-transparent text-[11px] text-white/70 focus:outline-none w-0 min-w-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <PresetSelect
                    placeholder="Size"
                    options={["12","14","16","18","20","24","32","40","48","56","64","72"].map((v) => ({ value: v, label: `${v}px` }))}
                    onChange={(value) => {
                      setLocalFontSize(value);
                      applyStyle("fontSize", value + "px");
                    }}
                  />
                  <span className="text-[9px] text-white/25">px</span>
                </div>
              </div>
              <div>
                <Label>Weight</Label>
                <select value={node.fontWeight} onChange={(e) => applyStyle("fontWeight", e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[11px] text-white/70 focus:outline-none appearance-none">
                  {WEIGHTS.map((w) => <option key={w.v} value={w.v}>{w.l}</option>)}
                </select>
              </div>
            </div>

            {/* Line height + Letter spacing */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Line Height</Label>
                <input type="number" step={0.1} value={localLineHeight} min={0.5} max={5}
                  onFocus={() => setActiveField("lineHeight")}
                  onChange={(e) => {
                    const next = e.target.value;
                    setLocalLineHeight(next);
                    if (next !== "") applyStyle("lineHeight", next);
                  }}
                  onBlur={() => { applyStyle("lineHeight", localLineHeight); setActiveField(null); }}
                  onKeyDown={(e) => e.key === "Enter" && applyStyle("lineHeight", localLineHeight)}
                  className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[11px] text-white/70 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <Label>Tracking</Label>
                <input type="number" step={0.01} value={localLetterSpacing} min={-5} max={20}
                  onFocus={() => setActiveField("letterSpacing")}
                  onChange={(e) => {
                    const next = e.target.value;
                    setLocalLetterSpacing(next);
                    if (next !== "") applyStyle("letterSpacing", next + "px");
                  }}
                  onBlur={() => { applyStyle("letterSpacing", localLetterSpacing + "px"); setActiveField(null); }}
                  onKeyDown={(e) => e.key === "Enter" && applyStyle("letterSpacing", localLetterSpacing + "px")}
                  className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[11px] text-white/70 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Text align */}
            <div>
              <Label>Align</Label>
              <ToggleGroup
                value={node.textAlign}
                onChange={(v) => applyStyle("textAlign", v)}
                options={[
                  { val: "left",    icon: <AlignLeft size={11}/>,    title: "Left"    },
                  { val: "center",  icon: <AlignCenter size={11}/>,  title: "Center"  },
                  { val: "right",   icon: <AlignRight size={11}/>,   title: "Right"   },
                  { val: "justify", icon: <AlignJustify size={11}/>, title: "Justify" },
                ]}
              />
            </div>

            {/* Style toggles */}
            <div>
              <Label>Style</Label>
              <ToggleGroup
                value={node.fontStyle === "italic" ? "italic" : node.textDecoration === "underline" ? "underline" : node.textDecoration === "line-through" ? "line-through" : "normal"}
                onChange={(v) => {
                  if (v === "italic") { applyStyle("fontStyle", "italic"); applyStyle("textDecoration", "none"); }
                  else if (v === "underline") { applyStyle("fontStyle", "normal"); applyStyle("textDecoration", "underline"); }
                  else if (v === "line-through") { applyStyle("fontStyle", "normal"); applyStyle("textDecoration", "line-through"); }
                  else { applyStyle("fontStyle", "normal"); applyStyle("textDecoration", "none"); }
                }}
                options={[
                  { val: "normal",      icon: <span className="text-[10px] font-semibold">Aa</span>, title: "Normal" },
                  { val: "italic",      icon: <Italic size={11}/>,      title: "Italic" },
                  { val: "underline",   icon: <Underline size={11}/>,   title: "Underline" },
                  { val: "line-through",icon: <Strikethrough size={11}/>,title: "Strikethrough" },
                ]}
              />
            </div>

            {/* Text transform */}
            <div>
              <Label>Transform</Label>
              <ToggleGroup
                value={node.textTransform ?? "none"}
                onChange={(v) => applyStyle("textTransform", v)}
                options={[
                  { val: "none",       icon: <span className="text-[10px]">Aa</span>,   title: "None" },
                  { val: "uppercase",  icon: <span className="text-[9px] font-bold">AA</span>, title: "Uppercase" },
                  { val: "lowercase",  icon: <span className="text-[9px]">aa</span>,   title: "Lowercase" },
                  { val: "capitalize", icon: <span className="text-[9px]">Aa</span>,   title: "Capitalize" },
                ]}
              />
            </div>

            {/* Text color */}
            <div>
              <Label>Color</Label>
              <ColorPicker value={txtColor} onChange={(hex) => applyStyle("color", hex)} />
            </div>
          </Accordion>
        )}

        {/* ── Image ── */}
        {node.isImg && (
          <Accordion title="Image" icon={<ImageIcon size={12}/>} open={open.image} toggle={() => toggle("image")}>
            <div>
              <Label>Source URL</Label>
              <input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)}
                onBlur={() => imgUrl && send("apply-attr", { attr: "src", value: imgUrl })}
                onKeyDown={(e) => e.key === "Enter" && imgUrl && send("apply-attr", { attr: "src", value: imgUrl })}
                placeholder="https://..."
                className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[11px] text-white/60 placeholder-white/18 focus:outline-none focus:border-indigo-500/35 transition-colors"
              />
            </div>
            <div>
              <Label>Object Fit</Label>
              <ToggleGroup
                value="cover"
                onChange={(v) => applyStyle("objectFit", v)}
                options={[
                  { val: "cover",   icon: <span className="text-[9px] font-semibold">Cover</span>,   title: "Cover" },
                  { val: "contain", icon: <span className="text-[9px] font-semibold">Contain</span>, title: "Contain" },
                  { val: "fill",    icon: <span className="text-[9px] font-semibold">Fill</span>,    title: "Fill" },
                ]}
              />
            </div>
          </Accordion>
        )}

        {/* ── Video ── */}
        {(node as any).isVideo && (
          <Accordion title="Video" icon={<Video size={12}/>} open={open.video} toggle={() => toggle("video")}>
            <div>
              <Label>Source URL</Label>
              <input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)}
                onBlur={() => imgUrl && send("apply-attr", { attr: "src", value: imgUrl })}
                onKeyDown={(e) => e.key === "Enter" && imgUrl && send("apply-attr", { attr: "src", value: imgUrl })}
                placeholder="https://example.com/video.mp4"
                className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[11px] text-white/60 placeholder-white/18 focus:outline-none focus:border-indigo-500/35 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: "autoplay", label: "Autoplay", active: (node as any).videoAutoplay },
                { key: "loop",     label: "Loop",     active: (node as any).videoLoop },
                { key: "muted",    label: "Muted",    active: (node as any).videoMuted },
                { key: "controls", label: "Controls", active: (node as any).videoControls },
              ] as const).map(({ key, label, active }) => (
                <button key={key}
                  onClick={() => send("apply-attr", { attr: key, value: active ? null : "" })}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] border transition-all ${
                    active
                      ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/25"
                      : "text-white/35 border-white/[0.06] hover:border-white/[0.12] hover:text-white/60"
                  }`}>
                  <span>{label}</span>
                  <ToggleLeft size={12} className={active ? "text-indigo-400" : "text-white/20"} />
                </button>
              ))}
            </div>
          </Accordion>
        )}

        {/* ── Embed ── */}
        {(node as any).isIframe && (
          <Accordion title="Embed" icon={<Video size={12}/>} open={open.embed} toggle={() => toggle("embed")}>
            <div>
              <Label>Embed URL</Label>
              <input value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)}
                onFocus={() => setActiveField("embedUrl")}
                onBlur={() => { if (embedUrl) send("apply-attr", { attr: "src", value: embedUrl }); setActiveField(null); }}
                onKeyDown={(e) => e.key === "Enter" && embedUrl && send("apply-attr", { attr: "src", value: embedUrl })}
                placeholder="https://www.youtube.com/embed/..."
                className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[11px] text-white/60 placeholder-white/18 focus:outline-none focus:border-indigo-500/35 transition-colors"
              />
              <p className="text-[9px] text-white/20 mt-1">YouTube, Vimeo, Google Maps, or any iframe URL</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { attr: "allowfullscreen", label: "Fullscreen" },
                { attr: "allow", label: "Autoplay", value: "autoplay" },
              ]).map(({ attr, label, value }) => {
                const active = value
                  ? (node.src ?? "").includes(value) || node.tag === "iframe"
                  : node.tag === "iframe" && (node as any).embedAllowFullscreen;
                return (
                  <button key={attr}
                    onClick={() => send("apply-attr", { attr, value: value ?? "" })}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] border text-white/35 border-white/[0.06] hover:border-white/[0.12] hover:text-white/60 transition-all">
                    <span>{label}</span>
                    <ToggleLeft size={12} className="text-white/20" />
                  </button>
                );
              })}
            </div>
          </Accordion>
        )}

        {/* ── Input / Form ── */}
        {(node as any).isInput && (
          <Accordion title="Input" icon={<FormInput size={12}/>} open={open.input} toggle={() => toggle("input")}>
            {node.tag === "input" && (
              <div>
                <Label>Type</Label>
                <div className="grid grid-cols-3 gap-1">
                  {(["text","email","tel","password","number","url"] as const).map((t) => (
                    <button key={t}
                      onClick={() => { setInputType(t); send("apply-attr", { attr: "type", value: t }); }}
                      className={`py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                        inputType === t
                          ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/25"
                          : "text-white/35 border-white/[0.06] hover:border-white/[0.12] hover:text-white/60"
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label>Placeholder</Label>
              <input value={inputPlaceholder}
                onChange={(e) => setInputPlaceholder(e.target.value)}
                onFocus={() => setActiveField("inputPlaceholder")}
                onBlur={() => { send("apply-attr", { attr: "placeholder", value: inputPlaceholder }); setActiveField(null); }}
                onKeyDown={(e) => e.key === "Enter" && send("apply-attr", { attr: "placeholder", value: inputPlaceholder })}
                placeholder="Enter placeholder text…"
                className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[11px] text-white/60 placeholder-white/18 focus:outline-none focus:border-indigo-500/35 transition-colors"
              />
            </div>
            <div>
              <Label>Name</Label>
              <input value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                onFocus={() => setActiveField("inputName")}
                onBlur={() => { send("apply-attr", { attr: "name", value: inputName }); setActiveField(null); }}
                onKeyDown={(e) => e.key === "Enter" && send("apply-attr", { attr: "name", value: inputName })}
                placeholder="e.g. email"
                className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[11px] text-white/60 placeholder-white/18 focus:outline-none focus:border-indigo-500/35 transition-colors"
              />
            </div>
          </Accordion>
        )}

        {/* ── Layout ── */}
        <Accordion title="Layout" icon={<Layout size={12}/>} open={open.layout} toggle={() => toggle("layout")}>
          {/* W / H */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Width</Label>
              <input value={wVal}
                onFocus={() => setActiveField("width")}
                onChange={(e) => {
                  const next = e.target.value;
                  setWVal(next);
                  applyStyle("width", next);
                }}
                onBlur={() => { applyStyle("width", wVal); setActiveField(null); }}
                onKeyDown={(e) => e.key === "Enter" && applyStyle("width", wVal)}
                className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[11px] text-white/70 focus:outline-none focus:border-indigo-500/35 transition-colors"
              />
            </div>
            <div>
              <Label>Height</Label>
              <input value={hVal}
                onFocus={() => setActiveField("height")}
                onChange={(e) => {
                  const next = e.target.value;
                  setHVal(next);
                  applyStyle("height", next);
                }}
                onBlur={() => { applyStyle("height", hVal); setActiveField(null); }}
                onKeyDown={(e) => e.key === "Enter" && applyStyle("height", hVal)}
                className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[11px] text-white/70 focus:outline-none focus:border-indigo-500/35 transition-colors"
              />
            </div>
          </div>
          {/* Min-W / Max-W */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Min Width</Label>
              <input value={mwVal}
                onFocus={() => setActiveField("minWidth")}
                onChange={(e) => {
                  const next = e.target.value;
                  setMwVal(next);
                  applyStyle("minWidth", next);
                }}
                onBlur={() => { applyStyle("minWidth", mwVal); setActiveField(null); }}
                onKeyDown={(e) => e.key === "Enter" && applyStyle("minWidth", mwVal)}
                className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[11px] text-white/70 focus:outline-none focus:border-indigo-500/35 transition-colors"
              />
            </div>
            <div>
              <Label>Max Width</Label>
              <input value={mxVal}
                onFocus={() => setActiveField("maxWidth")}
                onChange={(e) => {
                  const next = e.target.value;
                  setMxVal(next);
                  applyStyle("maxWidth", next);
                }}
                onBlur={() => { applyStyle("maxWidth", mxVal); setActiveField(null); }}
                onKeyDown={(e) => e.key === "Enter" && applyStyle("maxWidth", mxVal)}
                className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[11px] text-white/70 focus:outline-none focus:border-indigo-500/35 transition-colors"
              />
            </div>
          </div>
          {/* Display */}
          <div>
            <Label>Display</Label>
            <ToggleGroup
              value={node.display}
              onChange={(v) => applyStyle("display", v)}
              options={[
                { val: "block",        icon: <span className="text-[9px] font-semibold">Block</span>,  title: "Block" },
                { val: "flex",         icon: <span className="text-[9px] font-semibold">Flex</span>,   title: "Flex" },
                { val: "grid",         icon: <span className="text-[9px] font-semibold">Grid</span>,   title: "Grid" },
                { val: "inline-block", icon: <span className="text-[9px] font-semibold">Inline</span>, title: "Inline Block" },
              ]}
            />
          </div>
          {/* Flex controls */}
          {node.display === "flex" && (
            <>
              <div>
                <Label>Direction</Label>
                <ToggleGroup
                  value={node.flexDir || "row"}
                  onChange={(v) => applyStyle("flexDirection", v)}
                  options={[
                    { val: "row",    icon: <span className="text-[9px]">→</span>, title: "Row" },
                    { val: "column", icon: <span className="text-[9px]">↓</span>, title: "Column" },
                    { val: "row-reverse",    icon: <span className="text-[9px]">←</span>, title: "Row Reverse" },
                    { val: "column-reverse", icon: <span className="text-[9px]">↑</span>, title: "Column Reverse" },
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Justify</Label>
                  <select value={node.justifyContent} onChange={(e) => applyStyle("justifyContent", e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[10.5px] text-white/60 focus:outline-none appearance-none">
                    {["flex-start","center","flex-end","space-between","space-around","space-evenly"].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Align</Label>
                  <select value={node.alignItems} onChange={(e) => applyStyle("alignItems", e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[10.5px] text-white/60 focus:outline-none appearance-none">
                    {["flex-start","center","flex-end","stretch","baseline"].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label>Gap</Label>
                <input type="number" value={parseFloat(node.gap) || 0} min={0}
                  onChange={(e) => applyStyle("gap", e.target.value + "px")}
                  className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[11px] text-white/70 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </>
          )}
        </Accordion>

        {/* ── Spacing ── */}
        <Accordion title="Spacing" icon={<Square size={12}/>} open={open.spacing} toggle={() => toggle("spacing")}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Padding Preset</Label>
              <PresetSelect
                placeholder="Apply all"
                options={[
                  { value: "0", label: "None" },
                  { value: "8", label: "XS · 8px" },
                  { value: "16", label: "SM · 16px" },
                  { value: "24", label: "MD · 24px" },
                  { value: "32", label: "LG · 32px" },
                  { value: "48", label: "XL · 48px" },
                  { value: "64", label: "2XL · 64px" },
                ]}
                onChange={(value) => {
                  const next = Number(value);
                  setPT(next); setPR(next); setPB(next); setPL(next);
                  applyPad(next, next, next, next);
                }}
              />
            </div>
            <div>
              <Label>Margin Preset</Label>
              <PresetSelect
                placeholder="Apply all"
                options={[
                  { value: "0", label: "None" },
                  { value: "8", label: "XS · 8px" },
                  { value: "16", label: "SM · 16px" },
                  { value: "24", label: "MD · 24px" },
                  { value: "32", label: "LG · 32px" },
                  { value: "48", label: "XL · 48px" },
                  { value: "64", label: "2XL · 64px" },
                ]}
                onChange={(value) => {
                  const next = Number(value);
                  setMT(next); setMR(next); setMB(next); setML(next);
                  applyMar(next, next, next, next);
                }}
              />
            </div>
          </div>
          <BoxModel
            label="Padding"
            t={pT} r={pR} b={pB} l={pL}
            onT={(v) => { setPT(v); applyPad(v, pR, pB, pL); }}
            onR={(v) => { setPR(v); applyPad(pT, v, pB, pL); }}
            onB={(v) => { setPB(v); applyPad(pT, pR, v, pL); }}
            onL={(v) => { setPL(v); applyPad(pT, pR, pB, v); }}
            accent="border-indigo-500/15"
            fieldKey="padding"
            activeField={activeField}
            setActiveField={setActiveField}
          />
          <BoxModel
            label="Margin"
            t={mT} r={mR} b={mB} l={mL}
            onT={(v) => { setMT(v); applyMar(v, mR, mB, mL); }}
            onR={(v) => { setMR(v); applyMar(mT, v, mB, mL); }}
            onB={(v) => { setMB(v); applyMar(mT, mR, v, mL); }}
            onL={(v) => { setML(v); applyMar(mT, mR, mB, v); }}
            accent="border-orange-500/15"
            fieldKey="margin"
            activeField={activeField}
            setActiveField={setActiveField}
          />
        </Accordion>

        {/* ── Background ── */}
        <Accordion title="Background" icon={<Layers size={12}/>} open={open.background} toggle={() => toggle("background")}>
          <div>
            <Label>Color</Label>
            <ColorPicker
              value={bgColor ?? "#ffffff"}
              onChange={(hex) => applyStyle("backgroundColor", hex)}
              allowClear={!!bgColor}
              onClear={() => applyStyle("backgroundColor", "transparent")}
            />
          </div>
          {localBgImage && (
            <div>
              <Label>Image</Label>
              <input value={localBgImage}
                onChange={(e) => setLocalBgImage(e.target.value)}
                onBlur={() => applyStyle("backgroundImage", localBgImage)}
                onKeyDown={(e) => e.key === "Enter" && applyStyle("backgroundImage", localBgImage)}
                className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[10px] text-white/50 font-mono focus:outline-none truncate"
              />
            </div>
          )}
        </Accordion>

        {/* ── Border ── */}
        <Accordion title="Border & Radius" icon={<Square size={12}/>} open={open.border} toggle={() => toggle("border")}>
          {/* Border */}
          <div>
            <Label>Border</Label>
            <input value={localBorder}
              onChange={(e) => setLocalBorder(e.target.value)}
              onBlur={() => applyStyle("border", localBorder)}
              onKeyDown={(e) => e.key === "Enter" && applyStyle("border", localBorder)}
              placeholder="1px solid #ccc"
              className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[11px] text-white/60 placeholder-white/18 focus:outline-none focus:border-indigo-500/35 font-mono transition-colors"
            />
          </div>
          {/* 4-corner radius */}
          <div>
            <Label>Radius (TL / TR / BR / BL)</Label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { v: brTL, set: setBrTL, corner: "↖" },
                { v: brTR, set: setBrTR, corner: "↗" },
                { v: brBR, set: setBrBR, corner: "↘" },
                { v: brBL, set: setBrBL, corner: "↙" },
              ].map(({ v, set, corner }) => (
                <div key={corner} className="relative">
                  <input
                    value={v}
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    onFocus={() => setActiveField(`radius-${corner}`)}
                    onChange={(e) => {
                      const nv = e.target.value.replace(/[^\d.-]/g, "");
                      set(nv);
                      if (nv === "") return;
                      const vals = [brTL, brTR, brBR, brBL];
                      const idx = ["↖","↗","↘","↙"].indexOf(corner);
                      vals[idx] = nv;
                      applyRadius(vals[0], vals[1], vals[2], vals[3]);
                    }}
                    onBlur={() => {
                      const safe = parseUnitDraft(v.trim() === "" ? "0" : v);
                      set(safe);
                      const vals = [brTL, brTR, brBR, brBL];
                      const idx = ["↖","↗","↘","↙"].indexOf(corner);
                      vals[idx] = safe;
                      applyRadius(vals[0], vals[1], vals[2], vals[3]);
                      setActiveField(null);
                    }}
                    className="w-full bg-white/[0.05] border border-white/[0.07] rounded px-2 text-left text-[10px] text-white/70 py-1 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute -top-1 -right-1 text-[8px] text-white/20">{corner}</span>
                </div>
              ))}
            </div>
          </div>
        </Accordion>

        {/* ── Effects ── */}
        <Accordion title="Effects" icon={<Sparkles size={12}/>} open={open.effects} toggle={() => toggle("effects")}>
          {/* Opacity */}
          <div>
            <Label>Opacity — {Math.round(localOpacity * 100)}%</Label>
            <input type="range" min={0} max={1} step={0.01}
              value={localOpacity}
              onFocus={() => setActiveField("opacity")}
              onChange={(e) => {
                const next = parseFloat(e.target.value);
                setLocalOpacity(next);
                applyStyle("opacity", String(next));
              }}
              onBlur={() => setActiveField(null)}
              className="w-full accent-indigo-500 h-1.5 rounded-full cursor-pointer"
            />
            <div className="mt-1.5">
              <PresetSelect
                placeholder="Preset"
                options={[
                  { value: "1", label: "100%" },
                  { value: "0.9", label: "90%" },
                  { value: "0.75", label: "75%" },
                  { value: "0.5", label: "50%" },
                  { value: "0.25", label: "25%" },
                  { value: "0", label: "0%" },
                ]}
                onChange={(value) => {
                  const next = parseFloat(value);
                  setLocalOpacity(next);
                  applyStyle("opacity", value);
                }}
              />
            </div>
          </div>
          {/* Shadow presets */}
          <div>
            <Label>Box Shadow</Label>
            <div className="grid grid-cols-3 gap-1">
              {SHADOW_PRESETS.map((s) => (
                <button key={s.label}
                  onClick={() => applyStyle("boxShadow", s.value)}
                  className={`py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                    node.boxShadow === s.value || (s.value === "none" && (!node.boxShadow || node.boxShadow === "none"))
                      ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/25"
                      : "text-white/35 border-white/[0.06] hover:border-white/[0.12] hover:text-white/60"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {/* Custom shadow */}
          <div>
            <Label>Custom</Label>
            <input value={node.boxShadow || "none"}
              onChange={(e) => applyStyle("boxShadow", e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[10px] text-white/50 font-mono focus:outline-none transition-colors"
            />
          </div>
        </Accordion>

        {/* ── Section ── */}
        {node.isSec && (
          <Accordion title="Section" icon={<Layers size={12}/>} open={open.section} toggle={() => toggle("section")}>
            <div>
              <Label>Background</Label>
              <ColorPicker
                value={secBgColor ?? "#ffffff"}
                onChange={(hex) => send("apply-section-style", { prop: "background", value: hex })}
              />
            </div>
            <BoxModel
              label="Section Padding"
              t={spT} r={spR} b={spB} l={spL}
              onT={(v) => { setSpT(v); applySecPad(v, spR, spB, spL); }}
              onR={(v) => { setSpR(v); applySecPad(spT, v, spB, spL); }}
              onB={(v) => { setSpB(v); applySecPad(spT, spR, v, spL); }}
              onL={(v) => { setSpL(v); applySecPad(spT, spR, spB, v); }}
              accent="border-teal-500/15"
              fieldKey="section-padding"
              activeField={activeField}
              setActiveField={setActiveField}
            />
            <div className="flex gap-2">
              <button onClick={() => send("move-up")}
                className="flex-1 py-1.5 text-[10.5px] text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/[0.12] rounded-lg transition-all">
                ↑ Move Up
              </button>
              <button onClick={() => send("move-down")}
                className="flex-1 py-1.5 text-[10.5px] text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/[0.12] rounded-lg transition-all">
                ↓ Move Down
              </button>
            </div>
          </Accordion>
        )}

      </div>
    </div>
  );
}
