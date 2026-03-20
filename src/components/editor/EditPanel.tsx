"use client";
/**
 * EditPanel — the right-side control panel for visual editing.
 * Receives selected element info via postMessage and renders controls.
 * Sends commands back to iframe. Zero chrome inside the preview.
 */
import { useState, useEffect, useRef } from "react";
import {
  Type, Image as ImageIcon, Square, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Trash2, Copy, ChevronUp, ChevronDown, Link, Upload,
  Palette, Move, Check, RotateCcw, X, Pencil,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SelectedElement {
  tag: string;
  text: string;
  src: string | null;
  href: string | null;
  isImg: boolean;
  isText: boolean;
  isSec: boolean;
  isBtn: boolean;
  fontSize: number;
  fontWeight: string;
  textAlign: string;
  color: string;
  backgroundColor: string;
  backgroundImage: string;
  padding: string;
  borderRadius: string;
  section: boolean | null;
}

interface Props {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  onClose: () => void;
}

const GOOGLE_FONTS = [
  "inherit","Inter","Plus Jakarta Sans","DM Sans","Outfit","Sora","Manrope",
  "Playfair Display","Cormorant Garamond","Lora","Libre Baskerville",
  "Space Grotesk","Epilogue","Albert Sans","Fraunces","Unbounded",
  "Bebas Neue","Anton","Big Shoulders Display",
];

const FONT_SIZES = [10,12,14,16,18,20,24,28,32,36,40,48,56,64,72,96];

const PADDINGS = [
  {l:"None",  v:"0px"},
  {l:"XS",    v:"16px 0"},
  {l:"S",     v:"32px 0"},
  {l:"M",     v:"64px 0"},
  {l:"L",     v:"96px 0"},
  {l:"XL",    v:"128px 0"},
];

const RADII = [
  {l:"□",v:"0px"},
  {l:"▢",v:"6px"},
  {l:"▣",v:"12px"},
  {l:"⬭",v:"24px"},
  {l:"○",v:"9999px"},
];

// ── Main component ────────────────────────────────────────────────────────────
export function EditPanel({ iframeRef, onClose }: Props) {
  const [el, setEl] = useState<SelectedElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tab, setTab] = useState<"element"|"section">("element");
  const [imgUrl, setImgUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Listen to iframe messages ───────────────────────────────────────────────
  useEffect(() => {
    function handler(e: MessageEvent) {
      if (!e.data || e.data.source !== "sitezy-editor") return;
      const { type, payload } = e.data;

      if (type === "select" || type === "editing") {
        setEl(payload as SelectedElement);
        setIsEditing(type === "editing");
        setImgUrl(payload.src || "");
        setLinkUrl(payload.href || "");
        setTab("element");
      }
      if (type === "deselect") {
        setEl(null);
        setIsEditing(false);
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // ── Send to iframe ──────────────────────────────────────────────────────────
  function send(type: string, payload: Record<string, unknown> = {}) {
    iframeRef.current?.contentWindow?.postMessage(
      { target: "sitezy-iframe", type, ...payload }, "*"
    );
  }

  function style(prop: string, val: string) { send("apply-style", { prop, val }); }
  function attr(a: string, val: string)     { send("apply-attr",  { attr: a, val }); }

  function rgbToHex(rgb: string): string {
    if (!rgb || rgb === "transparent") return "#ffffff";
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return "#ffffff";
    return "#" + [m[1], m[2], m[3]].map((x) => ("0" + parseInt(x).toString(16)).slice(-2)).join("");
  }

  // ── No selection state ──────────────────────────────────────────────────────
  if (!el) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <Pencil size={18} className="text-orange-400" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-white/60 mb-1">Nothing selected</p>
          <p className="text-[11px] text-white/30 leading-relaxed">
            Click any element in<br />the preview to edit it
          </p>
        </div>
        <div className="mt-2 space-y-1.5 w-full">
          {[["Click","Select element"],["Double-click","Edit text directly"],["Esc","Deselect"]].map(([k,v]) => (
            <div key={k} className="flex items-center justify-between px-3 py-1.5 bg-white/[0.03] rounded-lg">
              <kbd className="text-[10px] text-white/30 font-mono bg-white/[0.06] px-1.5 py-0.5 rounded">{k}</kbd>
              <span className="text-[11px] text-white/30">{v}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose}
          className="mt-2 text-[11px] text-white/25 hover:text-white/50 transition-colors">
          Exit edit mode
        </button>
      </div>
    );
  }

  const colorHex     = rgbToHex(el.color);
  const bgColorHex   = rgbToHex(el.backgroundColor);
  const isBold       = parseInt(el.fontWeight) >= 600;
  const isItalic     = false; // would need to be reported

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[10px] font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 uppercase">
            {el.tag}
          </span>
          {el.text && (
            <span className="text-[11px] text-white/40 truncate">{el.text.slice(0, 24)}</span>
          )}
          {isEditing && (
            <span className="text-[10px] text-orange-400 flex items-center gap-1 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              editing
            </span>
          )}
        </div>
        <button onClick={() => send("deselect")}
          className="w-6 h-6 flex items-center justify-center text-white/25 hover:text-white/60 rounded transition-colors">
          <X size={12} />
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-white/[0.05] flex-shrink-0">
        {[
          { key: "element" as const, label: el.isImg ? "Image" : el.isText ? "Text" : "Element" },
          { key: "section" as const, label: "Section" },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-[11px] font-medium transition-colors ${tab === t.key ? "text-white border-b border-orange-500" : "text-white/30 hover:text-white/60"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto min-h-0 p-4 space-y-5">

        {/* ── ELEMENT TAB ── */}
        {tab === "element" && (<>

          {/* Edit text button */}
          {(el.isText || el.isBtn) && !el.isImg && (
            <div>
              <button
                onClick={() => send(isEditing ? "deselect" : "start-edit")}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium transition-all border ${
                  isEditing
                    ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                    : "bg-white/[0.05] text-white/60 border-white/[0.08] hover:border-white/[0.18] hover:text-white"
                }`}>
                <Pencil size={13} />
                {isEditing ? "Done editing (Esc)" : "Edit text directly"}
              </button>
              <p className="text-[10px] text-white/25 text-center mt-1.5">Or double-click the text in preview</p>
            </div>
          )}

          {/* ── Text controls ── */}
          {(el.isText || el.isBtn) && !el.isImg && (
            <Section label="Typography">
              {/* Font size */}
              <Row label="Size">
                <div className="flex items-center gap-1">
                  <button onClick={() => style("fontSize", (el.fontSize - 1) + "px")}
                    className={IB}>−</button>
                  <span className="text-[12px] text-white/70 font-mono w-8 text-center">{el.fontSize}</span>
                  <button onClick={() => style("fontSize", (el.fontSize + 1) + "px")}
                    className={IB}>+</button>
                  <select value={el.fontSize}
                    onChange={(e) => style("fontSize", e.target.value + "px")}
                    className={`${SI} w-16 ml-1`}>
                    {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
                  </select>
                </div>
              </Row>

              {/* Bold / Italic / Align */}
              <Row label="Style">
                <div className="flex gap-1">
                  <ToggleBtn label="B" active={isBold} bold
                    onClick={() => style("fontWeight", isBold ? "400" : "700")} />
                  <ToggleBtn label="I" active={isItalic} italic
                    onClick={() => style("fontStyle", isItalic ? "normal" : "italic")} />
                </div>
              </Row>

              <Row label="Align">
                <div className="flex gap-1">
                  {[
                    { v: "left",    icon: <AlignLeft size={12} /> },
                    { v: "center",  icon: <AlignCenter size={12} /> },
                    { v: "right",   icon: <AlignRight size={12} /> },
                  ].map(({ v, icon }) => (
                    <ToggleBtn key={v} icon={icon} active={el.textAlign === v}
                      onClick={() => style("textAlign", v)} />
                  ))}
                </div>
              </Row>

              {/* Font */}
              <Row label="Font">
                <select onChange={(e) => style("fontFamily", e.target.value)} className={`${SI} flex-1`}>
                  {GOOGLE_FONTS.map((f) => <option key={f} value={f === "inherit" ? "" : `'${f}',sans-serif`}>{f}</option>)}
                </select>
              </Row>

              {/* Text color */}
              <Row label="Color">
                <ColorPicker value={colorHex} onChange={(v) => style("color", v)} />
              </Row>
            </Section>
          )}

          {/* ── Image controls ── */}
          {el.isImg && (
            <Section label="Image">
              {/* Current image */}
              {el.src && (
                <div className="w-full h-24 rounded-lg overflow-hidden bg-white/[0.05] mb-3">
                  <img src={el.src} alt="" className="w-full h-full object-contain" />
                </div>
              )}

              {/* URL replace */}
              <Row label="URL">
                <div className="flex gap-2 flex-1">
                  <input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send("replace-src", { url: imgUrl })}
                    placeholder="https://…"
                    className={`${TI} flex-1 text-[11px]`} />
                  <button onClick={() => send("replace-src", { url: imgUrl })}
                    disabled={!imgUrl.trim()}
                    className={`${PB} disabled:opacity-30`}>
                    <Check size={12} />
                  </button>
                </div>
              </Row>

              {/* Upload */}
              <Row label="Upload">
                <>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const url = ev.target?.result as string;
                        send("replace-src", { url });
                        setImgUrl(url);
                      };
                      reader.readAsDataURL(file);
                    }} />
                  <button onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-[11px] text-white/60 hover:text-white hover:border-white/[0.2] transition-colors">
                    <Upload size={11} /> Choose file
                  </button>
                </>
              </Row>

              {/* Object fit */}
              <Row label="Fit">
                <div className="flex gap-1">
                  {["cover","contain","fill"].map((f) => (
                    <ToggleBtn key={f} label={f} active={false}
                      onClick={() => style("objectFit", f)} />
                  ))}
                </div>
              </Row>

              {/* Border radius */}
              <Row label="Round">
                <div className="flex gap-1">
                  {RADII.map((r) => (
                    <ToggleBtn key={r.v} label={r.l} active={el.borderRadius === r.v}
                      onClick={() => style("borderRadius", r.v)} />
                  ))}
                </div>
              </Row>
            </Section>
          )}

          {/* ── Link ── */}
          {el.isBtn && (
            <Section label="Link">
              <Row label="URL">
                <div className="flex gap-2 flex-1">
                  <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && attr("href", linkUrl)}
                    placeholder="https://…"
                    className={`${TI} flex-1 text-[11px]`} />
                  <button onClick={() => attr("href", linkUrl)} disabled={!linkUrl.trim()}
                    className={`${PB} disabled:opacity-30`}>
                    <Check size={12} />
                  </button>
                </div>
              </Row>
              <Row label="Target">
                <select onChange={(e) => attr("target", e.target.value)} className={SI}>
                  <option value="">Same tab</option>
                  <option value="_blank">New tab</option>
                </select>
              </Row>
            </Section>
          )}

          {/* ── Background color ── */}
          {!el.isImg && (
            <Section label="Background">
              <Row label="Color">
                <ColorPicker value={bgColorHex} onChange={(v) => style("backgroundColor", v)} />
                <button onClick={() => style("backgroundColor", "transparent")}
                  className="ml-2 text-[10px] text-white/30 hover:text-white/60 transition-colors">
                  Clear
                </button>
              </Row>
            </Section>
          )}

          {/* ── Spacing ── */}
          <Section label="Spacing">
            <Row label="Padding">
              <select onChange={(e) => style("padding", e.target.value)} className={`${SI} flex-1`}>
                <option value="">Custom</option>
                {["0px","8px","12px","16px","24px","32px","48px","64px"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Row>
            <Row label="Margin">
              <select onChange={(e) => style("margin", e.target.value)} className={`${SI} flex-1`}>
                <option value="">Custom</option>
                {["0px","8px","16px","24px","32px","auto"].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Row>
          </Section>

          {/* ── Delete ── */}
          <button onClick={() => send("delete-selected")}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-red-500/15 transition-colors">
            <Trash2 size={12} /> Delete element
          </button>

        </>)}

        {/* ── SECTION TAB ── */}
        {tab === "section" && (<>

          <Section label="Background">
            <Row label="Color">
              <ColorPicker value={bgColorHex} onChange={(v) => send("set-bg-color", { color: v })} />
            </Row>
            <Row label="Padding">
              <div className="flex gap-1 flex-wrap">
                {PADDINGS.map((p) => (
                  <button key={p.v} onClick={() => send("set-padding", { pad: p.v })}
                    className={IB}>{p.l}</button>
                ))}
              </div>
            </Row>
          </Section>

          <Section label="Order">
            <div className="flex gap-2">
              <button onClick={() => send("move-up")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[12px] text-white/60 hover:text-white hover:border-white/[0.16] transition-colors">
                <ChevronUp size={13} /> Move up
              </button>
              <button onClick={() => send("move-down")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[12px] text-white/60 hover:text-white hover:border-white/[0.16] transition-colors">
                <ChevronDown size={13} /> Move down
              </button>
            </div>
          </Section>

          <Section label="Actions">
            <button onClick={() => send("duplicate-section")}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] text-white/60 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.16] transition-colors">
              <Copy size={12} /> Duplicate section
            </button>
            <button onClick={() => send("delete-selected")}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-red-500/15 transition-colors mt-2">
              <Trash2 size={12} /> Delete section
            </button>
          </Section>

        </>)}

      </div>
    </div>
  );
}

// ── Small reusable components ─────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-2.5">{label}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-white/35 w-14 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-2 flex-1 min-w-0">{children}</div>
    </div>
  );
}

function ToggleBtn({ label, icon, active, onClick, bold, italic }: {
  label?: string; icon?: React.ReactNode; active: boolean;
  onClick: () => void; bold?: boolean; italic?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={`px-2.5 py-1.5 rounded-lg text-[11px] border transition-all min-w-[28px] flex items-center justify-center ${
        active
          ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
          : "bg-white/[0.04] text-white/50 border-white/[0.08] hover:text-white/80 hover:border-white/[0.18]"
      }`}
      style={{ fontWeight: bold ? 700 : undefined, fontStyle: italic ? "italic" : undefined }}>
      {icon ?? label}
    </button>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative cursor-pointer flex-shrink-0">
      <div className="w-8 h-8 rounded-lg border border-white/[0.12] overflow-hidden"
        style={{ background: value }}>
        <input type="color" value={value}
          onChange={(e) => onChange(e.target.value)}
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
      </div>
    </label>
  );
}

// Shared style strings
const IB = "w-7 h-7 flex items-center justify-center bg-white/[0.04] border border-white/[0.08] rounded-lg text-white/60 hover:text-white hover:border-white/[0.18] text-[12px] transition-colors flex-shrink-0";
const SI = "bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-orange-500/40 appearance-none transition-colors";
const TI = "bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white placeholder-white/20 focus:outline-none focus:border-orange-500/40 transition-colors";
const PB = "w-7 h-7 flex items-center justify-center bg-orange-500/80 hover:bg-orange-500 text-white rounded-lg transition-colors flex-shrink-0";
