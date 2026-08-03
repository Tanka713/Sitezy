"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { resolveInspectorProfile } from "@/lib/blocks/registry";
import { MediaLibraryModal } from "./MediaLibraryModal";
import {
  Type, ImageIcon, Layout, Square, Sparkles, Layers,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Bold, Italic, Underline, Strikethrough,
  ChevronDown, MousePointer2, Link, Globe, Mail, Phone, Anchor, FileText, X,
  Video, FormInput, ToggleLeft, Monitor, Tablet, Smartphone, Plus, Copy, Trash2, Code2,
  Wand2,
} from "lucide-react";
import { EditorSwitch } from "./EditorSwitch";
import type {
  CanvasCollectionField,
  CanvasCollectionItem,
  CanvasNodeInfo,
  CanvasWidgetField,
  Project,
  ProjectMediaAsset,
} from "@/types";
import { ICONS } from "@/lib/utils/iconLibrary";
import type { IconDef } from "@/lib/utils/iconLibrary";

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

const TEXT_SHADOW_PRESETS = [
  { label: "None",  value: "none" },
  { label: "Soft",  value: "0 2px 8px rgba(0,0,0,0.18)" },
  { label: "Hard",  value: "2px 2px 0px rgba(0,0,0,0.45)" },
  { label: "Long",  value: "3px 3px 0 rgba(0,0,0,0.2),6px 6px 0 rgba(0,0,0,0.12),9px 9px 0 rgba(0,0,0,0.06)" },
  { label: "Glow",  value: "0 0 14px rgba(255,255,255,0.85),0 0 30px rgba(255,255,255,0.4)" },
  { label: "Neon",  value: "0 0 8px currentColor,0 0 20px currentColor,0 0 40px currentColor" },
];

const GRADIENT_DIRS = [
  { label: "→",  value: "90deg"  },
  { label: "↗",  value: "45deg"  },
  { label: "↓",  value: "180deg" },
  { label: "↘",  value: "135deg" },
  { label: "◎",  value: "circle at center" }, // radial
];
const BG_POSITIONS = [
  { value: "center", label: "Center" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "top center", label: "Top Center" },
  { value: "bottom center", label: "Bottom Center" },
];
const BG_SIZES = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "auto", label: "Auto" },
  { value: "100% auto", label: "Width 100%" },
];
const BG_REPEAT_OPTIONS = [
  { value: "no-repeat", label: "No Repeat" },
  { value: "repeat", label: "Repeat" },
  { value: "repeat-x", label: "Repeat X" },
  { value: "repeat-y", label: "Repeat Y" },
];
const BG_ATTACHMENT_OPTIONS = [
  { value: "scroll", label: "Scroll" },
  { value: "fixed", label: "Fixed" },
  { value: "local", label: "Local" },
];
const BG_BLEND_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "soft-light", label: "Soft Light" },
  { value: "luminosity", label: "Luminosity" },
];
const BORDER_STYLE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
  { value: "double", label: "Double" },
];
const POSITION_OPTIONS = [
  { value: "static", label: "Static" },
  { value: "relative", label: "Relative" },
  { value: "absolute", label: "Absolute" },
  { value: "sticky", label: "Sticky" },
  { value: "fixed", label: "Fixed" },
];
const OVERFLOW_OPTIONS = [
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
  { value: "auto", label: "Auto" },
  { value: "scroll", label: "Scroll" },
  { value: "clip", label: "Clip" },
];
const FLEX_WRAP_OPTIONS = [
  { value: "nowrap", label: "No Wrap" },
  { value: "wrap", label: "Wrap" },
  { value: "wrap-reverse", label: "Wrap Reverse" },
];
const ALIGN_SELF_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "flex-start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "flex-end", label: "End" },
  { value: "stretch", label: "Stretch" },
  { value: "baseline", label: "Baseline" },
];
const ALIGN_CONTENT_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "flex-start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "flex-end", label: "End" },
  { value: "space-between", label: "Space Between" },
  { value: "space-around", label: "Space Around" },
  { value: "space-evenly", label: "Space Evenly" },
  { value: "stretch", label: "Stretch" },
];
const JUSTIFY_ITEMS_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "end", label: "End" },
  { value: "stretch", label: "Stretch" },
];
const GRID_AUTO_FLOW_OPTIONS = [
  { value: "row", label: "Row" },
  { value: "column", label: "Column" },
  { value: "row dense", label: "Row Dense" },
  { value: "column dense", label: "Column Dense" },
];
const MIX_BLEND_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "darken", label: "Darken" },
  { value: "lighten", label: "Lighten" },
  { value: "soft-light", label: "Soft Light" },
  { value: "difference", label: "Difference" },
];
const OBJECT_POSITION_OPTIONS = [
  { value: "0% 0%", label: "↖", title: "Top Left" },
  { value: "50% 0%", label: "↑", title: "Top Center" },
  { value: "100% 0%", label: "↗", title: "Top Right" },
  { value: "0% 50%", label: "←", title: "Center Left" },
  { value: "50% 50%", label: "•", title: "Center" },
  { value: "100% 50%", label: "→", title: "Center Right" },
  { value: "0% 100%", label: "↙", title: "Bottom Left" },
  { value: "50% 100%", label: "↓", title: "Bottom Center" },
  { value: "100% 100%", label: "↘", title: "Bottom Right" },
];
const WHITE_SPACE_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "nowrap", label: "No Wrap" },
  { value: "pre-line", label: "Pre Line" },
  { value: "pre-wrap", label: "Pre Wrap" },
];
const OVERFLOW_WRAP_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "break-word", label: "Break Word" },
  { value: "anywhere", label: "Anywhere" },
];
const WORD_BREAK_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "break-all", label: "Break All" },
  { value: "keep-all", label: "Keep All" },
];
const FONT_VARIANT_CAPS_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "small-caps", label: "Small Caps" },
  { value: "all-small-caps", label: "All Small Caps" },
  { value: "titling-caps", label: "Titling Caps" },
];
const LIST_STYLE_TYPE_OPTIONS = [
  { value: "disc", label: "Disc" },
  { value: "circle", label: "Circle" },
  { value: "square", label: "Square" },
  { value: "decimal", label: "Decimal" },
  { value: "lower-alpha", label: "Lower Alpha" },
  { value: "upper-alpha", label: "Upper Alpha" },
  { value: "lower-roman", label: "Lower Roman" },
  { value: "upper-roman", label: "Upper Roman" },
  { value: "none", label: "None" },
];
const LIST_STYLE_POSITION_OPTIONS = [
  { value: "outside", label: "Outside" },
  { value: "inside", label: "Inside" },
];
const LINK_DECORATION_STYLE_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "dotted", label: "Dotted" },
  { value: "dashed", label: "Dashed" },
  { value: "double", label: "Double" },
  { value: "wavy", label: "Wavy" },
];
const PARAGRAPH_SPACING_PRESETS = [
  { value: "0", label: "None" },
  { value: "8", label: "Tight" },
  { value: "16", label: "Normal" },
  { value: "24", label: "Relaxed" },
  { value: "32", label: "Airy" },
];
const ENTRANCE_ANIMATIONS = [
  { value: "none", label: "None" },
  { value: "custom", label: "Custom CSS" },
  { value: "fade-up", label: "Fade Up" },
  { value: "fade-down", label: "Fade Down" },
  { value: "fade-left", label: "Fade Left" },
  { value: "fade-right", label: "Fade Right" },
  { value: "zoom-in", label: "Zoom In" },
  { value: "zoom-out", label: "Zoom Out" },
];
const HOVER_ANIMATIONS = [
  { value: "none", label: "None" },
  { value: "custom", label: "Custom CSS" },
  { value: "lift", label: "Lift" },
  { value: "grow", label: "Grow" },
  { value: "tilt", label: "Tilt" },
  { value: "glow", label: "Glow" },
  { value: "soften", label: "Soften" },
];
const ANIMATION_EASINGS = [
  { value: "ease", label: "Ease" },
  { value: "ease-out", label: "Ease Out" },
  { value: "ease-in-out", label: "Ease In Out" },
  { value: "linear", label: "Linear" },
  { value: "cubic-bezier(0.22,1,0.36,1)", label: "Smooth" },
];
const RESPONSIVE_DEVICE_OPTIONS = [
  { value: "desktop" as const, label: "Desktop", icon: <Monitor size={12} />, short: "Base" },
  { value: "tablet" as const, label: "Tablet", icon: <Tablet size={12} />, short: "Tablet" },
  { value: "mobile" as const, label: "Mobile", icon: <Smartphone size={12} />, short: "Mobile" },
];

const PANEL_CARD = "rounded-xl border border-[var(--border-soft)] bg-[var(--surface-3)]";
const PANEL_SUBCARD = "rounded-lg border border-[var(--border-soft)] bg-[var(--surface-3)] px-3 py-3";
const PANEL_INPUT =
  "w-full min-w-0 min-h-[36px] rounded-lg bg-[var(--surface-5)] px-3 py-2 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] transition-colors";
const PANEL_TEXTAREA = `${PANEL_INPUT} min-h-[84px] resize-y leading-6`;
const PANEL_SELECT = `${PANEL_INPUT} appearance-none`;
const PANEL_BUTTON_PRIMARY =
  "px-2.5 py-1.5 rounded-md bg-[var(--text-accent)]/15 text-[11px] font-medium text-[var(--text-accent)] hover:bg-[var(--text-accent)]/25 transition-colors";
const PANEL_BUTTON_SECONDARY =
  "px-2.5 py-1.5 rounded-md bg-[var(--surface-5)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors";
const PANEL_BUTTON_ICON =
  "inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--surface-5)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors";
const INSPECTOR_GROUP = "";
const INSPECTOR_VALUE_FIELD =
  "flex min-h-[36px] items-center gap-2 rounded-lg bg-[var(--surface-5)] px-3 transition-colors focus-within:ring-1 focus-within:ring-[var(--border-focus)]";
const INSPECTOR_SEGMENTED =
  "grid gap-0.5 rounded-lg bg-[var(--surface-5)] p-0.5";
const INSPECTOR_PRESET_BTN =
  "min-h-[32px] rounded-md text-[11px] font-semibold tracking-tight transition-colors";
const INSPECTOR_PRESET_BTN_ON = "bg-[var(--surface-3)] text-[var(--text-accent)]";
const INSPECTOR_PRESET_BTN_OFF =
  "text-[var(--text-tertiary)] hover:bg-[var(--surface-5)] hover:text-[var(--text-secondary)]";
const INSPECTOR_SLIDER_SHELL =
  "px-1 py-1.5";
const SECTION_CONTROL_PANEL =
  "space-y-3.5";
const SECTION_CONTROL_ITEM =
  "space-y-3";
const SECTION_CONTROL_TITLE =
  "text-[14px] font-semibold leading-5 tracking-[-0.02em] text-[var(--text-primary)]";
const SECTION_CONTROL_META =
  "text-[12px] leading-5 text-[var(--text-secondary)]";
const SECTION_CONTROL_ACTIONS =
  "flex flex-wrap items-center gap-1.5 shrink-0";
const SECTION_CONTROL_ACTION_BAR =
  "inline-flex items-center gap-1 rounded-lg bg-[var(--surface-5)] p-1";
const SECTION_CONTROL_ACTION_ICON =
  "inline-flex h-8 w-8 items-center justify-center rounded-[9px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-5)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40";
const SECTION_CONTROL_ACTION_ICON_DANGER =
  `${SECTION_CONTROL_ACTION_ICON} text-rose-400 hover:bg-rose-500/10 hover:text-rose-300`;
const SECTION_CONTROL_FIELD_SHELL =
  "space-y-2";
const SECTION_CONTROL_PREVIEW =
  "overflow-hidden rounded-xl bg-[var(--surface-5)]";
const SECTION_CONTROL_EMPTY_STATE =
  "flex min-h-[116px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-soft)] px-4 text-center";
const COLLECTION_ITEM_PANEL =
  "space-y-4 border-t border-[var(--border-soft)] pt-4 first:border-t-0 first:pt-0";
const COLLECTION_ITEM_EYEBROW =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-disabled)]";
const COLLECTION_ITEM_HEADING =
  "truncate text-[13px] font-semibold leading-5 tracking-[-0.02em] text-[var(--text-primary)]";
const COLLECTION_ADD_BUTTON =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border-soft)] px-3 py-2.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-5)] hover:text-[var(--text-primary)]";

type SectionControlTone = "widget" | "collection" | "media" | "neutral";

function sectionControlBadgeClass(tone: SectionControlTone = "neutral"): string {
  const base =
    "inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] whitespace-nowrap";

  if (tone === "widget") {
    return `${base} bg-[#5B8CFF]/10 text-[#8EA8FF]`;
  }

  if (tone === "collection") {
    return `${base} bg-emerald-400/10 text-emerald-200/85`;
  }

  if (tone === "media") {
    return `${base} bg-amber-400/10 text-amber-200/85`;
  }

  return `${base} bg-[var(--surface-5)] text-[var(--text-tertiary)]`;
}

function sectionControlIconWrapClass(tone: SectionControlTone = "neutral"): string {
  const base =
    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg";

  if (tone === "widget") {
    return `${base} bg-[#5B8CFF]/10 text-[#9DB1FF]`;
  }

  if (tone === "collection") {
    return `${base} bg-emerald-400/10 text-emerald-200/90`;
  }

  if (tone === "media") {
    return `${base} bg-amber-400/10 text-amber-200/90`;
  }

  return `${base} bg-[var(--surface-5)] text-[var(--text-secondary)]`;
}

const createClosedAccordionState = (): Record<string, boolean> => ({
  sectionControls: false,
  responsive: false,
  widget: false,
  items: false,
  content: false,
  typography: false,
  image: false,
  video: false,
  embed: false,
  input: false,
  link: false,
  layout: false,
  spacing: false,
  background: false,
  border: false,
  effects: false,
  animation: false,
  section: false,
  icon: false,
  css: false,
});

/** Decide which accordion(s) to open automatically when a new element is selected. */
function getDefaultOpenAccordions(node: CanvasNodeInfo): Partial<Record<string, boolean>> {
  const n = node as unknown as Record<string, unknown>;
  if (node.role === "section")         return { sectionControls: true, background: true };
  // Widget / collection content
  if (n.widgetNodeId || n.widgetKind)  return { widget: true };
  if (n.collectionNodeId)              return { content: true };
  // Media
  if (node.isImg)                      return { image: true };
  if (node.isVideo)                    return { video: true };
  if (n.isIframe)                      return { embed: true };
  // Icon
  if (n.isIconEl)                      return { icon: true };
  // Form input
  if (n.inputType || n.inputName)      return { input: true };
  // Button / link — show link + typography
  if (node.isBtn || node.href)         return { link: true, typography: true };
  // Pure text
  if (node.isText || node.role === "text") return { typography: true };
  // Container / layout element
  if (node.role === "container")       return { layout: true };
  // Default: typography covers the most common case
  return { typography: true };
}

function safeHex(v: string | null | undefined): string {
  if (!v || v === "transparent" || v === "rgba(0, 0, 0, 0)") return "#ffffff";
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    return "#" + v.slice(1).split("").map((ch) => ch + ch).join("");
  }
  if (/^#[0-9a-fA-F]{4}$/.test(v)) {
    return "#" + v.slice(1, 4).split("").map((ch) => ch + ch).join("");
  }
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{8}$/.test(v)) return `#${v.slice(1, 7)}`;
  const m = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return "#" + [m[1],m[2],m[3]].map((x) => parseInt(x).toString(16).padStart(2,"0")).join("");
  return "#888888";
}
function safeAlpha(v: string | null | undefined): number {
  if (!v || v === "transparent" || v === "rgba(0, 0, 0, 0)") return 0;
  if (/^#[0-9a-fA-F]{4}$/.test(v)) {
    return Math.max(0, Math.min(1, parseInt(v.slice(4, 5) + v.slice(4, 5), 16) / 255));
  }
  if (/^#[0-9a-fA-F]{8}$/.test(v)) {
    return Math.max(0, Math.min(1, parseInt(v.slice(7, 9), 16) / 255));
  }
  const rgba = v.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/i);
  if (rgba) {
    const parsed = parseFloat(rgba[4]);
    return Number.isNaN(parsed) ? 1 : Math.max(0, Math.min(1, parsed));
  }
  return 1;
}
function withAlpha(hex: string, alpha: number): string {
  const safe = safeHex(hex);
  const a = Math.max(0, Math.min(1, alpha));
  const r = parseInt(safe.slice(1, 3), 16);
  const g = parseInt(safe.slice(3, 5), 16);
  const b = parseInt(safe.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
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
function parseTimeToMs(value: string | null | undefined, fallback: number): string {
  const raw = (value || "").trim();
  if (!raw) return String(fallback);
  if (raw.endsWith("ms")) return String(Math.max(0, Math.round(parseFloat(raw) || fallback)));
  if (raw.endsWith("s")) return String(Math.max(0, Math.round((parseFloat(raw) || fallback / 1000) * 1000)));
  const parsed = parseFloat(raw);
  return Number.isNaN(parsed) ? String(fallback) : String(Math.max(0, Math.round(parsed)));
}
function parseSizeToken(value: string | null | undefined, fallback = 0): string {
  const parsed = parseFloat((value || "").trim());
  return Number.isNaN(parsed) ? String(fallback) : String(Math.max(0, parsed));
}
function buildGradientCss(direction: string, from: string, to: string): string {
  return direction === "circle at center"
    ? `radial-gradient(${direction}, ${from}, ${to})`
    : `linear-gradient(${direction}, ${from}, ${to})`;
}
function parseFilterFn(value: string | null | undefined, name: string, fallback: number): string {
  const raw = (value || "").trim();
  if (!raw || raw === "none") return String(fallback);
  const pattern = new RegExp(`${name}\\(([^)]+)\\)`, "i");
  const match = raw.match(pattern);
  if (!match?.[1]) return String(fallback);
  const parsed = parseFloat(match[1]);
  return Number.isNaN(parsed) ? String(fallback) : String(Math.max(0, parsed));
}
function buildFilterValue({
  blur,
  brightness,
  contrast,
  grayscale,
  saturate,
}: {
  blur: string;
  brightness: string;
  contrast: string;
  grayscale: string;
  saturate: string;
}): string {
  const parts: string[] = [];
  const blurPx = parseFloat(blur);
  const brightnessPct = parseFloat(brightness);
  const contrastPct = parseFloat(contrast);
  const grayscalePct = parseFloat(grayscale);
  const saturatePct = parseFloat(saturate);
  if (!Number.isNaN(blurPx) && blurPx > 0) parts.push(`blur(${blurPx}px)`);
  if (!Number.isNaN(brightnessPct) && brightnessPct !== 100) parts.push(`brightness(${brightnessPct}%)`);
  if (!Number.isNaN(contrastPct) && contrastPct !== 100) parts.push(`contrast(${contrastPct}%)`);
  if (!Number.isNaN(grayscalePct) && grayscalePct > 0) parts.push(`grayscale(${grayscalePct}%)`);
  if (!Number.isNaN(saturatePct) && saturatePct !== 100) parts.push(`saturate(${saturatePct}%)`);
  return parts.length ? parts.join(" ") : "none";
}
function buildBackdropFilterValue(blur: string): string {
  const blurPx = parseFloat(blur);
  if (Number.isNaN(blurPx) || blurPx <= 0) return "none";
  return `blur(${blurPx}px)`;
}
function responsivePropLabel(prop: string): string {
  return prop
    .replace(/^webkit/i, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}
function parseGradientBackground(value: string | null | undefined): { dir: string; from: string; to: string } | null {
  const raw = (value || "").trim();
  if (!raw || !raw.includes("gradient(")) return null;
  const colors = raw.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)/g) ?? [];
  const from = colors[0] ? safeHex(colors[0]) : "#7C3AED";
  const to = colors[1] ? safeHex(colors[1]) : "#EC4899";
  const radial = raw.startsWith("radial-gradient(");
  let dir = radial ? "circle at center" : "90deg";
  const start = raw.indexOf("(");
  const end = raw.lastIndexOf(")");
  if (start >= 0 && end > start) {
    const inner = raw.slice(start + 1, end);
    const firstColor = colors[0];
    if (firstColor) {
      const colorIndex = inner.indexOf(firstColor);
      if (colorIndex > 0) {
        dir = inner.slice(0, colorIndex).replace(/,\s*$/, "").trim() || dir;
      }
    }
  }
  return { dir, from, to };
}

function buildSelectionSyncKey(node: CanvasNodeInfo | null): string | null {
  if (!node) return null;
  return [
    node.nodeId,
    node.textTargetNodeId,
    node.mediaTargetNodeId,
    node.widgetNodeId,
    node.collectionNodeId,
    node.logoCollectionNodeId,
    node.animationTargetNodeId,
    node.animationEntranceTargetNodeId,
    node.animationHoverTargetNodeId,
    node.linkTargetNodeId,
    node.listTargetNodeId,
  ]
    .map((value) => value ?? "")
    .join("::");
}

function normalizeWidgetDraft(
  fields: CanvasWidgetField[],
  state: Record<string, string> | null | undefined,
): Record<string, string> {
  return Object.fromEntries(
    fields.map((field) => [field.key, String(state?.[field.key] ?? "")]),
  );
}

function normalizeCollectionDraft(
  fields: CanvasCollectionField[],
  items: CanvasCollectionItem[] | null | undefined,
): CanvasCollectionItem[] {
  const source = Array.isArray(items) ? items : [];
  return source.map((item, index) => {
    const nextFields = Object.fromEntries(
      fields.map((field) => [field.key, String(item.fields?.[field.key] ?? "")]),
    );
    const titleSeed =
      nextFields.title ||
      nextFields.name ||
      nextFields.plan ||
      nextFields.question ||
      nextFields.label ||
      Object.values(nextFields).find((entry) => String(entry || "").trim()) ||
      item.title ||
      `Item ${index + 1}`;

    return {
      id: item.id || `item-${index + 1}`,
      title: String(titleSeed),
      fields: nextFields,
    };
  });
}

function createCollectionItem(
  fields: CanvasCollectionField[],
  index: number,
  source?: CanvasCollectionItem | null,
): CanvasCollectionItem {
  const nextFields = Object.fromEntries(
    fields.map((field) => [field.key, String(source?.fields?.[field.key] ?? "")]),
  );
  const titleSeed =
    nextFields.title ||
    nextFields.name ||
    nextFields.plan ||
    nextFields.question ||
    nextFields.label ||
    Object.values(nextFields).find((entry) => String(entry || "").trim()) ||
    source?.title ||
    `Item ${index + 1}`;

  return {
    id: `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title: String(titleSeed),
    fields: nextFields,
  };
}

interface SectionWidgetControl {
  id: string;
  type: "widget";
  nodeId: string;
  kind: string;
  label: string;
  fields: CanvasWidgetField[];
  state: Record<string, string>;
}

interface SectionCollectionControl {
  id: string;
  type: "collection";
  nodeId: string;
  kind: string;
  label: string;
  fields: CanvasCollectionField[];
  items: CanvasCollectionItem[];
  fixed: boolean;
}

interface SectionMediaControl {
  id: string;
  type: "media";
  nodeId: string;
  kind: "image";
  label: string;
  src: string;
  alt: string;
}

type SectionStructuredControl = SectionWidgetControl | SectionCollectionControl | SectionMediaControl;

function normalizeSectionStructuredControls(raw: unknown): SectionStructuredControl[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry): SectionStructuredControl[] => {
    if (!entry || typeof entry !== "object") return [];
    const data = entry as Record<string, unknown>;
    const type = data.type === "widget" || data.type === "collection" || data.type === "media" ? data.type : null;
    const nodeId = typeof data.nodeId === "string" ? data.nodeId.trim() : "";
    const kind = typeof data.kind === "string" && data.kind.trim() ? data.kind.trim() : type ?? "control";
    const label = typeof data.label === "string" && data.label.trim() ? data.label.trim() : kind;

    if (!type || !nodeId) return [];

    if (type === "widget") {
      const fields = Array.isArray(data.fields)
        ? (data.fields.filter((field): field is CanvasWidgetField => {
            if (!field || typeof field !== "object") return false;
            const candidate = field as Partial<CanvasWidgetField>;
            return typeof candidate.key === "string" && candidate.key.trim().length > 0;
          }) as CanvasWidgetField[])
        : [];
      if (!fields.length) return [];

      return [{
        id: `widget:${nodeId}`,
        type,
        nodeId,
        kind,
        label,
        fields,
        state: normalizeWidgetDraft(
          fields,
          data.state && typeof data.state === "object"
            ? (data.state as Record<string, string>)
            : {},
        ),
      }];
    }

    if (type === "media") {
      return [{
        id: `media:${nodeId}`,
        type,
        nodeId,
        kind: "image",
        label,
        src: typeof data.src === "string" ? data.src : "",
        alt: typeof data.alt === "string" ? data.alt : "",
      }];
    }

    const fields = Array.isArray(data.fields)
      ? (data.fields.filter((field): field is CanvasCollectionField => {
          if (!field || typeof field !== "object") return false;
          const candidate = field as Partial<CanvasCollectionField>;
          return typeof candidate.key === "string" && candidate.key.trim().length > 0;
        }) as CanvasCollectionField[])
      : [];
    if (!fields.length) return [];

    const normalizedItems = normalizeCollectionDraft(
      fields,
      Array.isArray(data.items) ? (data.items as CanvasCollectionItem[]) : [],
    );

    return [{
      id: `collection:${nodeId}`,
      type,
      nodeId,
      kind,
      label,
      fields,
      items: normalizedItems.length ? normalizedItems : [createCollectionItem(fields, 0)],
      fixed: data.fixed === true,
    }];
  });
}

function humanizeStructuredKind(kind: string): string {
  return kind
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function shouldHideSectionControlTitle(label?: string | null): boolean {
  if (!label) return false;
  return label.replace(/[\s_-]+/g, "").toLowerCase() === "actionbuttons";
}

type EmbedMode = "youtube" | "map" | "custom";
type MediaPickerTarget =
  | "image"
  | "video"
  | "background"
  | "section-own-background"
  | "section-background"
  | "logos"
  | "widget-image"
  | "section-widget-image"
  | "section-control-image"
  | "section-control-collection-image";
type LinkInputType = "page" | "url" | "email" | "phone" | "anchor" | "none";

function pageHrefFor(page: { slug?: string; name: string }): string {
  const raw = page.slug || page.name.toLowerCase().replace(/\s+/g, "-");
  // If slug already starts with "/" (e.g. "/home", "/menu"), don't double up
  if (raw.startsWith("/")) return raw || "/";
  return `/${raw}`;
}

function futureLocalDateTime(daysFromNow: number): string {
  const target = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const shifted = new Date(target.getTime() - target.getTimezoneOffset() * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

function normalizeInternalPageHref(href: string): string | null {
  let trimmed = href.trim();
  if (!trimmed) return null;
  // Normalize protocol-relative paths like "//menu" or "//" → "/menu" or "/"
  // These are common AI-generated placeholders that should be treated as internal paths
  if (trimmed.startsWith("//")) {
    trimmed = "/" + trimmed.slice(2);
  }
  if (trimmed.startsWith("/")) {
    return trimmed.replace(/\/+$/, "") || "/";
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const parsed = new URL(trimmed);
      if (!currentOrigin || parsed.origin !== currentOrigin) return null;
      return parsed.pathname.replace(/\/+$/, "") || "/";
    } catch {
      return null;
    }
  }
  return null;
}

function isProjectPageHref(href: string, project?: Project): boolean {
  const normalized = normalizeInternalPageHref(href);
  if (!normalized || !project?.pages?.length) return false;
  return project.pages.some((page) => pageHrefFor(page) === normalized);
}

function inferLinkTypeFromValue(rawValue: string): LinkInputType {
  const raw = (rawValue || "").trim();
  if (!raw || raw === "#") return "none";
  if (raw.startsWith("mailto:")) return "email";
  if (raw.startsWith("tel:")) return "phone";
  if (raw.startsWith("#")) return "anchor";
  if (normalizeInternalPageHref(raw) !== null) return "page";
  return "url";
}

function isWidgetLinkField(field: CanvasWidgetField): boolean {
  return /url$/i.test(field.key);
}

function isCollectionLinkField(field: CanvasCollectionField): boolean {
  return field.type === "text" && /(url|href|link)$/i.test(field.key);
}

function formatCollectionItemIndex(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function getCollectionItemHeading(
  fields: CanvasCollectionField[],
  item: CanvasCollectionItem,
): string {
  const prioritizedKeys = ["label", "title", "name", "heading", "text"];

  for (const key of prioritizedKeys) {
    const prioritizedField = fields.find((field) => field.key.toLowerCase() === key);
    const candidate = prioritizedField ? item.fields?.[prioritizedField.key] : "";
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }

  const firstFilledTextField = fields.find((field) => {
    if (field.type !== "text") return false;
    if (isCollectionLinkField(field)) return false;
    const value = item.fields?.[field.key];
    return typeof value === "string" && value.trim().length > 0;
  });

  if (firstFilledTextField) {
    return String(item.fields?.[firstFilledTextField.key] ?? "").trim();
  }

  return "Untitled item";
}

function collectionFieldSpansFullRow(field: CanvasCollectionField, compactGrid: boolean): boolean {
  if (!compactGrid) return false;
  if (field.type === "textarea" || field.type === "list" || field.type === "image") return true;
  if (isCollectionLinkField(field)) return true;
  return /^(label|title|name|heading)$/i.test(field.key);
}

function collectionLinkTypeStateKey(itemId: string, fieldKey: string): string {
  return `${itemId}:${fieldKey}`;
}

function sectionCollectionLinkTypeStateKey(controlId: string, itemId: string, fieldKey: string): string {
  return `${controlId}:${itemId}:${fieldKey}`;
}

function inferCollectionLinkTypeMap(
  fields: CanvasCollectionField[],
  items: CanvasCollectionItem[],
): Record<string, LinkInputType> {
  const linkFields = fields.filter(isCollectionLinkField);
  if (!linkFields.length || !items.length) return {};

  return Object.fromEntries(
    items.flatMap((item, index) => {
      const itemId = item.id || `item-${index + 1}`;
      return linkFields.map((field) => [
        collectionLinkTypeStateKey(itemId, field.key),
        inferLinkTypeFromValue(item.fields?.[field.key] ?? ""),
      ]);
    }),
  );
}

function inferSectionCollectionLinkTypeMap(
  controls: SectionStructuredControl[],
): Record<string, LinkInputType> {
  return Object.fromEntries(
    controls.flatMap((control) => {
      if (control.type !== "collection") return [];
      const linkFields = control.fields.filter(isCollectionLinkField);
      if (!linkFields.length || !control.items.length) return [];

      return control.items.flatMap((item, index) => {
        const itemId = item.id || `item-${index + 1}`;
        return linkFields.map((field) => [
          sectionCollectionLinkTypeStateKey(control.id, itemId, field.key),
          inferLinkTypeFromValue(item.fields?.[field.key] ?? ""),
        ]);
      });
    }),
  );
}

function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{6,})/i,
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})/i,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/i,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function looksLikeMapUrl(value: string): boolean {
  return /google\.[^/]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(value);
}

function isShortGoogleMapUrl(value: string): boolean {
  return /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(value);
}

function extractMapQuery(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const query = url.searchParams.get("q")
      || url.searchParams.get("query")
      || url.searchParams.get("destination")
      || url.searchParams.get("near");
    if (query) return query;

    const placeMatch = decodeURIComponent(url.pathname).match(/\/place\/([^/]+)/i);
    if (placeMatch?.[1]) {
      return placeMatch[1].replace(/\+/g, " ").trim();
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeMapEmbedUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://www.google.com/maps?q=${encodeURIComponent(trimmed)}&output=embed`;
  }

  try {
    const url = new URL(trimmed);
    if (/google\.[^/]+$/i.test(url.hostname) && /\/maps\/embed/i.test(url.pathname)) {
      return trimmed;
    }
    if (/google\.[^/]+$/i.test(url.hostname) && url.searchParams.get("output") === "embed") {
      return trimmed;
    }
  } catch {
    return trimmed;
  }

  const query = extractMapQuery(trimmed);
  if (query) {
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  }

  return trimmed;
}

function inferEmbedMode(url: string): EmbedMode {
  if (/youtu\.be|youtube\.com/i.test(url)) return "youtube";
  if (looksLikeMapUrl(url)) return "map";
  return "custom";
}

function normalizeEmbedUrl(url: string, mode: EmbedMode): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (mode === "youtube") {
    const videoId = extractYouTubeId(trimmed);
    return videoId
      ? `https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1`
      : trimmed;
  }
  if (mode === "map") {
    return normalizeMapEmbedUrl(trimmed);
  }
  return trimmed;
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
        className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2 py-1.5 cursor-pointer transition-colors hover:border-white/[0.12]"
      >
        <span
          className="block w-5 h-5 rounded flex-shrink-0 ring-1 ring-inset ring-white/10"
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

      {/* Popover — opens inline below trigger to avoid overflow/z-index issues */}
      {open && (
        <div className="mt-1.5 w-full bg-[#12161f] border border-white/[0.08] rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.4)] overflow-hidden">
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
              <style>{`.sz-hue::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.5);cursor:pointer}.sz-hue::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.5);cursor:pointer}`}</style>
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
                className="sz-hue w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}
              />
            </div>

            {/* Hex input */}
            <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-1.5">
              <span className="text-[11px] text-white/25 font-mono select-none">#</span>
              <input
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                onBlur={(e) => commitHex(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitHex(hexInput); }}
                maxLength={6}
                spellCheck={false}
                className="editor-plain-input flex-1 bg-transparent text-[11px] text-white/75 font-mono focus:outline-none uppercase min-w-0"
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
    <div className="overflow-hidden">
      <button type="button" onClick={toggle}
        className="group flex w-full items-center gap-2.5 px-1 py-2 text-left transition-colors">
        <span className={`flex-shrink-0 transition-colors ${
          open ? "text-[var(--text-accent)]" : "text-[var(--text-disabled)] group-hover:text-[var(--text-secondary)]"
        }`}>
          {icon}
        </span>
        <div className={`min-w-0 flex-1 text-[12px] font-medium tracking-[-0.01em] transition-colors ${
          open ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
        }`}>
          {title}
        </div>
        <ChevronDown size={11} className={`flex-shrink-0 text-[var(--text-disabled)] transition-transform duration-150 ${open ? "rotate-180 text-[var(--text-tertiary)]" : ""}`} />
      </button>
      {open && <div className="pb-3 pt-0.5 space-y-3">{children}</div>}
    </div>
  );
}

function SectionControlCard({
  tone = "neutral",
  icon,
  title,
  meta,
  badge,
  aside,
  children,
}: {
  tone?: SectionControlTone;
  icon?: React.ReactNode;
  title?: string;
  meta?: string;
  badge?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const hasHeaderInfo = Boolean(icon || title || meta || badge);
  const hasHeader = hasHeaderInfo || aside;

  return (
    <div className={SECTION_CONTROL_PANEL}>
      <div className="space-y-3.5">
        {hasHeader ? (
          <div className={`flex gap-3 ${hasHeaderInfo ? "items-start justify-between" : "justify-end"}`}>
            {hasHeaderInfo ? (
              <div className={`flex min-w-0 flex-1 ${icon ? "items-start gap-3" : "items-center"}`}>
                {icon ? <span className={sectionControlIconWrapClass(tone)}>{icon}</span> : null}
                <div className="min-w-0 flex-1 space-y-1">
                  {(title || badge) ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {title ? <p className={SECTION_CONTROL_TITLE}>{title}</p> : null}
                      {badge}
                    </div>
                  ) : null}
                  {meta ? <p className={SECTION_CONTROL_META}>{meta}</p> : null}
                </div>
              </div>
            ) : null}
            {aside ? <div className={`${SECTION_CONTROL_ACTIONS} justify-end`}>{aside}</div> : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

const Label = ({
  children,
  overrideActive = false,
  onReset,
}: {
  children: React.ReactNode;
  overrideActive?: boolean;
  onReset?: () => void;
}) => (
  <div className="mb-1.5 flex items-center justify-between gap-2">
    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{children}</p>
    {(overrideActive || onReset) && (
      <div className="flex items-center gap-1.5">
        {overrideActive && (
          <span className="rounded-full border border-[#5B8CFF]/18 bg-[#5B8CFF]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#9DB1FF]">
            Override
          </span>
        )}
        {overrideActive && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Reset
          </button>
        )}
      </div>
    )}
  </div>
);


function ToggleGroup({ options, value, onChange }: {
  options: { val: string; icon: React.ReactNode; title: string }[];
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div className={INSPECTOR_SEGMENTED} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.val} title={o.title} type="button" onClick={() => onChange(o.val)}
          className={`flex min-h-[34px] items-center justify-center rounded-md px-1.5 text-[11px] font-semibold leading-tight transition-colors ${
            value === o.val
              ? "bg-[var(--surface-3)] text-[var(--text-primary)]"
              : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
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
      className={`${PANEL_SELECT} h-10 min-w-[100px] px-3 text-[11px] leading-none`}
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

function RangeSlider({
  value,
  min,
  max,
  step,
  onFocus,
  onBlur,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onFocus?: () => void;
  onBlur?: () => void;
  onChange: (value: string) => void;
}) {
  const safeValue = Math.min(max, Math.max(min, value));
  const percent = max <= min ? 0 : ((safeValue - min) / (max - min)) * 100;
  const trackStyle = {
    background: `linear-gradient(90deg, rgba(91,140,255,0.72) 0%, rgba(91,140,255,0.72) ${percent}%, rgba(255,255,255,0.11) ${percent}%, rgba(255,255,255,0.11) 100%)`,
  } as React.CSSProperties;

  return (
    <>
      <style>{`
        .sz-range {
          -webkit-appearance: none;
          appearance: none;
          height: 5px;
          border-radius: 9999px;
          outline: none;
          cursor: pointer;
          background-color: rgba(255,255,255,0.1);
        }
        .sz-range::-webkit-slider-runnable-track {
          height: 5px;
          border-radius: 9999px;
          background: transparent;
        }
        .sz-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: #f7f9ff;
          border: 2px solid rgba(91,140,255,0.58);
          box-shadow: 0 2px 10px rgba(0,0,0,0.28);
          margin-top: -5.5px;
          transition: border-color 0.15s, transform 0.15s;
        }
        .sz-range::-webkit-slider-thumb:hover {
          border-color: rgba(91,140,255,0.82);
          transform: scale(1.04);
        }
        .sz-range::-moz-range-track {
          height: 5px;
          border-radius: 9999px;
          background: rgba(255,255,255,0.1);
        }
        .sz-range::-moz-range-progress {
          height: 5px;
          border-radius: 9999px;
          background: rgba(91,140,255,0.72);
        }
        .sz-range::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: #f7f9ff;
          border: 2px solid rgba(91,140,255,0.58);
          box-shadow: 0 2px 10px rgba(0,0,0,0.28);
        }
      `}</style>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={safeValue}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        className="sz-range w-full min-w-0"
        style={trackStyle}
      />
    </>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  overrideActive,
  onReset,
  onFocus,
  onChange,
  onCommit,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  overrideActive?: boolean;
  onReset?: () => void;
  onFocus?: () => void;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
}) {
  const parsed = parseFloat(value);
  const rangeValue = Number.isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-1">
        <p className="truncate text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{label}</p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {overrideActive && (
            <span className="rounded-full bg-[var(--accent-subtle)] px-1.5 py-0.5 text-[8px] font-medium text-[var(--text-accent)]">
              Override
            </span>
          )}
          {overrideActive && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-[8px] font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Reset
            </button>
          )}
        </div>
      </div>
      <div className={INSPECTOR_VALUE_FIELD}>
        <input
          value={value}
          type="number"
          min={min}
          max={max}
          step={step}
          onFocus={onFocus}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onCommit(value)}
          className="editor-plain-input h-full w-full bg-transparent text-[11px] font-medium text-[var(--text-primary)] focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        {unit ? (
          <span className="shrink-0 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-disabled)]">
            {unit}
          </span>
        ) : null}
      </div>
      <div className={INSPECTOR_SLIDER_SHELL}>
        <RangeSlider
          value={rangeValue}
          min={min}
          max={max}
          step={step}
          onFocus={onFocus}
          onBlur={() => onCommit(String(rangeValue))}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function BgImageEditor({
  value,
  pos,
  size,
  overrideActive,
  onReset,
  onChange,
  onApply,
  onPosChange,
  onSizeChange,
  onClear,
  onOpenLibrary,
}: {
  value: string;
  pos: string;
  size: string;
  overrideActive?: boolean;
  onReset?: () => void;
  onChange: (value: string) => void;
  onApply: (value: string, pos: string, size: string) => void;
  onPosChange: (position: string) => void;
  onSizeChange: (size: string) => void;
  onClear: () => void;
  onOpenLibrary?: () => void;
}) {
  return (
    <div className={`${PANEL_SUBCARD} space-y-3`}>
      <div>
        <Label overrideActive={overrideActive} onReset={onReset}>Background Image</Label>
        {/* Thumbnail preview */}
        {value && (
          <div className="mb-1.5 rounded-lg overflow-hidden border border-white/[0.08] bg-white/[0.03]" style={{ height: 54 }}>
            <img src={value} alt="" className="w-full h-full object-cover opacity-80"
              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }} />
          </div>
        )}
        <div className="flex gap-1.5">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => onApply(value, pos, size)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onApply(value, pos, size);
            }}
            placeholder="https://... or /image.jpg"
            className={`${PANEL_INPUT} flex-1`}
          />
          {onOpenLibrary ? (
            <button
              onClick={onOpenLibrary}
              className={`${PANEL_BUTTON_SECONDARY} flex-shrink-0`}
            >
              Gallery
            </button>
          ) : null}
          <button
            onClick={() => onApply(value, pos, size)}
            className={`${PANEL_BUTTON_PRIMARY} flex-shrink-0`}
          >
            Apply
          </button>
          {value && (
            <button
              onClick={onClear}
              title="Remove image"
              className={`${PANEL_BUTTON_SECONDARY} px-2.5 flex-shrink-0 hover:text-red-300 hover:border-red-500/24`}
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Position</Label>
          <select
            value={pos}
            onChange={(e) => onPosChange(e.target.value)}
            className={PANEL_SELECT}
          >
            {BG_POSITIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Size</Label>
          <select
            value={size}
            onChange={(e) => onSizeChange(e.target.value)}
            className={PANEL_SELECT}
          >
            {BG_SIZES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function UrlApplyField({
  value,
  onChange,
  onApply,
  onClear,
  placeholder,
  applyLabel = "Apply",
  disabled = false,
  onOpenLibrary,
  galleryLabel = "Gallery",
}: {
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
  onClear?: () => void;
  placeholder: string;
  applyLabel?: string;
  disabled?: boolean;
  onOpenLibrary?: () => void;
  galleryLabel?: string;
}) {
  return (
    <div className="flex gap-1.5">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (!disabled) onApply();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !disabled) onApply();
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={`${PANEL_INPUT} flex-1 disabled:opacity-60 disabled:cursor-wait`}
      />
      {onOpenLibrary ? (
        <button
          onClick={onOpenLibrary}
          disabled={disabled}
          className={`${PANEL_BUTTON_SECONDARY} flex-shrink-0 disabled:opacity-60 disabled:cursor-wait`}
        >
          {galleryLabel}
        </button>
      ) : null}
      <button
        onClick={onApply}
        disabled={disabled}
        className={`${PANEL_BUTTON_PRIMARY} flex-shrink-0 disabled:opacity-60 disabled:cursor-wait`}
      >
        {applyLabel}
      </button>
      {value && onClear && (
        <button
          onClick={onClear}
          title="Clear"
          disabled={disabled}
          className={`${PANEL_BUTTON_SECONDARY} px-2.5 flex-shrink-0 hover:text-red-300 hover:border-red-500/24`}
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ── Shadow builder helpers ──────────────────────────────────────────────────
type ShadowLayer = { x: number; y: number; blur: number; spread: number; color: string; inset: boolean; };

function parseShadowValue(css: string): ShadowLayer[] {
  const def: ShadowLayer = { x: 0, y: 4, blur: 8, spread: 0, color: "rgba(0,0,0,0.15)", inset: false };
  if (!css || css === "none") return [{ ...def }];
  const parts: string[] = [];
  let depth = 0, curr = "";
  for (const ch of css) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(curr); curr = ""; } else curr += ch;
  }
  if (curr.trim()) parts.push(curr);
  return parts.map((part): ShadowLayer => {
    let s = part.trim();
    const inset = /^inset\b/.test(s);
    if (inset) s = s.replace(/^inset\s+/, "");
    let color = "rgba(0,0,0,0.15)";
    const rgbaM = s.match(/rgba?\([^)]+\)/);
    if (rgbaM) { color = rgbaM[0]; s = s.replace(rgbaM[0], "").trim(); }
    else { const hexM = s.match(/#[0-9a-fA-F]{3,8}/); if (hexM) { color = hexM[0]; s = s.replace(hexM[0], "").trim(); } }
    const pts = s.trim().split(/\s+/).filter(Boolean);
    return { inset, color, x: parseFloat(pts[0]||"0")||0, y: parseFloat(pts[1]||"0")||0, blur: parseFloat(pts[2]||"0")||0, spread: parseFloat(pts[3]||"0")||0 };
  });
}

function buildShadowCss(layers: ShadowLayer[]): string {
  if (!layers.length) return "none";
  return layers.map(l => `${l.inset?"inset ":""}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${l.color}`).join(", ");
}

function ShadowBuilder({ value, onChange }: { value: string; onChange: (css: string) => void }) {
  const [layers, setLayers] = useState<ShadowLayer[]>(() => parseShadowValue(value || "none"));
  const [activeIdx, setActiveIdx] = useState(0);
  const prevRef = useRef(value);
  useEffect(() => {
    if (prevRef.current !== value) { prevRef.current = value; setLayers(parseShadowValue(value || "none")); setActiveIdx(0); }
  }, [value]);
  const updateLayer = (idx: number, patch: Partial<ShadowLayer>) => {
    const next = layers.map((l, i) => i === idx ? { ...l, ...patch } : l);
    setLayers(next); onChange(buildShadowCss(next));
  };
  const addLayer = () => {
    const next = [...layers, { x: 0, y: 4, blur: 8, spread: 0, color: "rgba(0,0,0,0.15)", inset: false }];
    setLayers(next); setActiveIdx(next.length - 1); onChange(buildShadowCss(next));
  };
  const removeLayer = (idx: number) => {
    const next = layers.filter((_, i) => i !== idx);
    const nextLayers = next.length ? next : [];
    setLayers(nextLayers); setActiveIdx(Math.min(activeIdx, Math.max(0, nextLayers.length - 1)));
    onChange(nextLayers.length ? buildShadowCss(nextLayers) : "none");
  };
  const layer = layers[activeIdx] ?? null;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1 flex-wrap">
        {layers.map((_, i) => (
          <button key={i} onClick={() => setActiveIdx(i)}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-semibold border transition-all ${
              i === activeIdx ? "bg-[#5B8CFF]/12 text-[#5B8CFF] border-[#5B8CFF]/20" : "bg-white/[0.04] text-white/40 border-transparent hover:text-white/60"
            }`}>
            Layer {i + 1}
            {layers.length > 1 && <X size={8} className="ml-0.5 opacity-50 hover:opacity-100" onClick={(e) => { e.stopPropagation(); removeLayer(i); }} />}
          </button>
        ))}
        {layers.length < 4 && (
          <button onClick={addLayer} className="rounded-lg border border-white/[0.08] px-2 py-1 text-[9px] text-white/30 hover:text-white/60 hover:border-white/[0.18] transition-all">
            + Add
          </button>
        )}
        <button onClick={() => { setLayers([]); onChange("none"); }} className="ml-auto rounded-lg border border-white/[0.06] px-2 py-1 text-[9px] text-white/25 hover:text-rose-300/70 hover:border-rose-400/20 transition-all">
          None
        </button>
      </div>
      {layer && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <SliderField label="X Offset" value={String(layer.x)} min={-80} max={80} step={1} unit="px"
              onChange={(v) => updateLayer(activeIdx, { x: parseFloat(v)||0 })}
              onCommit={(v) => updateLayer(activeIdx, { x: parseFloat(v)||0 })} />
            <SliderField label="Y Offset" value={String(layer.y)} min={-80} max={80} step={1} unit="px"
              onChange={(v) => updateLayer(activeIdx, { y: parseFloat(v)||0 })}
              onCommit={(v) => updateLayer(activeIdx, { y: parseFloat(v)||0 })} />
            <SliderField label="Blur" value={String(layer.blur)} min={0} max={80} step={1} unit="px"
              onChange={(v) => updateLayer(activeIdx, { blur: parseFloat(v)||0 })}
              onCommit={(v) => updateLayer(activeIdx, { blur: parseFloat(v)||0 })} />
            <SliderField label="Spread" value={String(layer.spread)} min={-20} max={40} step={1} unit="px"
              onChange={(v) => updateLayer(activeIdx, { spread: parseFloat(v)||0 })}
              onCommit={(v) => updateLayer(activeIdx, { spread: parseFloat(v)||0 })} />
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1 min-w-0">
              <Label>Shadow Color</Label>
              <ColorPicker
                value={safeHex(layer.color) ?? "#000000"}
                onChange={(hex) => updateLayer(activeIdx, { color: hex })}
              />
            </div>
            <div className="flex-shrink-0">
              <Label>Inset</Label>
              <button
                onClick={() => updateLayer(activeIdx, { inset: !layer.inset })}
                className={`rounded-lg border px-3 py-1.5 text-[10px] font-semibold transition-all ${
                  layer.inset ? "bg-[#5B8CFF]/12 text-[#5B8CFF] border-[#5B8CFF]/20" : "border-white/[0.08] text-white/35 hover:border-white/[0.16] hover:text-white/60"
                }`}
              >{layer.inset ? "Inset ✓" : "Inset"}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SurfaceBackgroundEditor({
  repeat,
  attachment,
  blend,
  onRepeatChange,
  onAttachmentChange,
  onBlendChange,
  gradientEnabled,
  onToggleGradient,
  gradientDir,
  onGradientDirChange,
  gradientFrom,
  onGradientFromChange,
  gradientTo,
  onGradientToChange,
  onClearGradient,
}: {
  repeat: string;
  attachment: string;
  blend: string;
  onRepeatChange: (value: string) => void;
  onAttachmentChange: (value: string) => void;
  onBlendChange: (value: string) => void;
  gradientEnabled: boolean;
  onToggleGradient: () => void;
  gradientDir: string;
  onGradientDirChange: (value: string) => void;
  gradientFrom: string;
  onGradientFromChange: (value: string) => void;
  gradientTo: string;
  onGradientToChange: (value: string) => void;
  onClearGradient: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label>Repeat</Label>
          <select
            value={repeat}
            onChange={(e) => onRepeatChange(e.target.value)}
            className={PANEL_SELECT}
          >
            {BG_REPEAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Attach</Label>
          <select
            value={attachment}
            onChange={(e) => onAttachmentChange(e.target.value)}
            className={PANEL_SELECT}
          >
            {BG_ATTACHMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Blend</Label>
          <select
            value={blend}
            onChange={(e) => onBlendChange(e.target.value)}
            className={PANEL_SELECT}
          >
            {BG_BLEND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={`${PANEL_SUBCARD} space-y-3`}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <Label>Gradient Fill</Label>
            <p className="text-[10px] text-white/28 leading-relaxed">Use a gradient instead of an image.</p>
          </div>
          <EditorSwitch
            checked={gradientEnabled}
            onChange={onToggleGradient}
            title={gradientEnabled ? "Gradient fill on" : "Gradient fill off"}
          />
        </div>

        {gradientEnabled && (
          <>
            <div>
              <Label>Direction</Label>
              <div className="grid grid-cols-5 gap-1">
                {GRADIENT_DIRS.map((direction) => (
                  <button
                    key={direction.value}
                    onClick={() => onGradientDirChange(direction.value)}
                    className={`py-1 rounded-lg text-[11px] border transition-all ${
                      gradientDir === direction.value
                        ? "border-[#5B8CFF]/30 bg-[#5B8CFF]/10 text-[#5B8CFF]"
                        : "border-white/[0.06] text-white/50 hover:border-white/20"
                    }`}
                  >
                    {direction.label}
                  </button>
                ))}
              </div>
              {/* Custom angle input — only for linear gradients */}
              {gradientDir !== "circle at center" && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[9px] text-white/30 flex-shrink-0">Custom angle</span>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={0}
                      max={360}
                      value={parseInt(gradientDir) || 0}
                      onChange={(e) => {
                        const deg = Math.min(360, Math.max(0, parseInt(e.target.value) || 0));
                        onGradientDirChange(`${deg}deg`);
                      }}
                      className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1 pr-7 text-[11px] text-white/70 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-white/28">°</span>
                  </div>
                </div>
              )}
            </div>
            <div className={`${INSPECTOR_GROUP} grid grid-cols-2 gap-2.5`}>
              <div>
                <Label>From</Label>
                <ColorPicker value={gradientFrom} onChange={onGradientFromChange} />
              </div>
              <div>
                <Label>To</Label>
                <ColorPicker value={gradientTo} onChange={onGradientToChange} />
              </div>
            </div>
            <button
              onClick={onClearGradient}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 text-[10px] font-medium text-white/48 hover:text-white/74 hover:border-white/[0.16] transition-all"
            >
              Clear Gradient
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Box model: 3×3 grid showing T/R/B/L inputs
function BoxModel({ label, t, r, b, l, onT, onR, onB, onL, accent, fieldKey, setActiveField, overrideActive, onReset }: {
  label: string; t: number; r: number; b: number; l: number;
  onT:(v:number)=>void; onR:(v:number)=>void; onB:(v:number)=>void; onL:(v:number)=>void;
  accent: string;
  fieldKey?: string;
  activeField?: string | null;
  setActiveField?: (field: string | null) => void;
  overrideActive?: boolean;
  onReset?: () => void;
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
      className={`${PANEL_INPUT} rounded-lg px-2.5 py-1.5 text-left text-[10px]`}
    />
  );
  return (
    <div className={PANEL_SUBCARD}>
      <Label overrideActive={overrideActive} onReset={onReset}>{label}</Label>
      <div className="grid grid-cols-3 gap-1.5 items-center">
        <div />
        {inp("top", onT)}
        <div />
        {inp("left", onL)}
        <div className={`h-8 rounded-lg border ${accent} flex items-center justify-center text-[8px] text-white/18 font-mono bg-white/[0.02]`}>
          {label.slice(0,1)}
        </div>
        {inp("right", onR)}
        <div />
        {inp("bottom", onB)}
        <div />
      </div>
      <div className="grid grid-cols-4 gap-0.5 mt-1">
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
  const visualEditMode = useAppStore((s) => s.editor.visualEditMode);
  const setVisualEditMode = useAppStore((s) => s.setVisualEditMode);
  const devicePreview  = useAppStore((s) => s.editor.devicePreview);
  const setDevicePreview = useAppStore((s) => s.setDevicePreview);
  const selectedPageId = useAppStore((s) => s.editor.selectedPageId);
  const selectedSectionId = useAppStore((s) => s.editor.selectedSectionId);
  const mediaLibrary   = useAppStore((s) => s.mediaLibrary);
  const selectPage     = useAppStore((s) => s.selectPage);
  const toggleRightSidebar = useAppStore((s) => s.toggleRightSidebar);
  const rightSidebarOpen = useAppStore((s) => s.editor.rightSidebarOpen);
  const setRightPanel = useAppStore((s) => s.setRightPanel);
  const currentPage    = (project?.pages ?? []).find((p) => p.id === selectedPageId) ?? null;
  const activeSectionId = node?.sectionId ?? selectedSectionId ?? null;
  const activeSectionMeta = currentPage?.sections.find((section) => section.id === activeSectionId) ?? null;
  const lastSyncedSelectionKeyRef = useRef<string | null>(null);

  // Accordion open/close state
  const [open, setOpen] = useState<Record<string, boolean>>(createClosedAccordionState);
  const [iconSearch, setIconSearch] = useState("");
  const toggle = (k: string) => setOpen((s) => ({ ...s, [k]: !s[k] }));
  // CSS editor state
  const [cssDraft, setCssDraft] = useState("");

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
  const [embedMode, setEmbedMode] = useState<EmbedMode>("custom");
  const [isResolvingEmbed, setIsResolvingEmbed] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkType, setLinkType] = useState<LinkInputType>("url");
  // Text effects
  const [gradientOn, setGradientOn] = useState(false);
  const [gradFrom,   setGradFrom]   = useState("#7C3AED");
  const [gradTo,     setGradTo]     = useState("#EC4899");
  const [gradDir,    setGradDir]    = useState("90deg");
  const [textStroke, setTextStroke] = useState("0");
  const [textStrokeColor, setTextStrokeColor] = useState("#000000");
  const [inputPlaceholder, setInputPlaceholder] = useState("");
  const [inputName, setInputName] = useState("");
  const [inputType, setInputType] = useState("text");
  const [localEditableText, setLocalEditableText] = useState("");
  const [logoItemsDraft, setLogoItemsDraft] = useState("");
  const [widgetDraft, setWidgetDraft] = useState<Record<string, string>>({});
  const [widgetLinkTypes, setWidgetLinkTypes] = useState<Record<string, LinkInputType>>({});
  const [collectionDraft, setCollectionDraft] = useState<CanvasCollectionItem[]>([]);
  const [collectionLinkTypes, setCollectionLinkTypes] = useState<Record<string, LinkInputType>>({});
  const [sectionControls, setSectionControls] = useState<SectionStructuredControl[]>([]);
  const [sectionCollectionLinkTypes, setSectionCollectionLinkTypes] = useState<Record<string, LinkInputType>>({});
  const [sectionControlsLoading, setSectionControlsLoading] = useState(false);
  const [sectionControlsReady, setSectionControlsReady] = useState(false);
  const [widgetImagePicker, setWidgetImagePicker] = useState<{ fieldKey: string } | null>(null);
  const [sectionWidgetImagePicker, setSectionWidgetImagePicker] = useState<{
    controlId: string;
    fieldKey: string;
  } | null>(null);
  const [sectionMediaPicker, setSectionMediaPicker] = useState<{ controlId: string } | null>(null);
  const [sectionCollectionImagePicker, setSectionCollectionImagePicker] = useState<{
    controlId: string;
    itemIndex: number;
    fieldKey: string;
  } | null>(null);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<MediaPickerTarget | null>(null);
  // Size inputs
  const [wVal,  setWVal]  = useState("");
  const [hVal,  setHVal]  = useState("");
  const [mwVal, setMwVal] = useState("");
  const [mxVal, setMxVal] = useState("");
  const [topVal, setTopVal] = useState("auto");
  const [rightVal, setRightVal] = useState("auto");
  const [bottomVal, setBottomVal] = useState("auto");
  const [leftVal, setLeftVal] = useState("auto");
  const [zIndexVal, setZIndexVal] = useState("auto");
  const [flexGrowVal, setFlexGrowVal] = useState("0");
  const [flexShrinkVal, setFlexShrinkVal] = useState("1");
  const [flexBasisVal, setFlexBasisVal] = useState("auto");
  const [gapVal, setGapVal] = useState("0");
  const [rowGapVal, setRowGapVal] = useState("0");
  const [columnGapVal, setColumnGapVal] = useState("0");
  const [gridColsVal, setGridColsVal] = useState("");
  const [gridRowsVal, setGridRowsVal] = useState("");
  const [blurVal, setBlurVal] = useState("0");
  const [brightnessVal, setBrightnessVal] = useState("100");
  const [contrastVal, setContrastVal] = useState("100");
  const [grayscaleVal, setGrayscaleVal] = useState("0");
  const [saturateVal, setSaturateVal] = useState("100");
  const [backdropBlurVal, setBackdropBlurVal] = useState("0");
  const [mixBlendVal, setMixBlendVal] = useState("normal");
  const [animDurationVal, setAnimDurationVal] = useState("600");
  const [animDelayVal, setAnimDelayVal] = useState("0");
  // Typography local state (buffered — only applies on blur/Enter)
  const [localFontSize,      setLocalFontSize]      = useState("16");
  const [localLineHeight,    setLocalLineHeight]    = useState("1.5");
  const [localLetterSpacing, setLocalLetterSpacing] = useState("0");
  const [localTextOpacity,   setLocalTextOpacity]   = useState("100");
  const [localTextIndent,    setLocalTextIndent]    = useState("0");
  const [localColumnCount,   setLocalColumnCount]   = useState("1");
  const [localColumnGap,     setLocalColumnGap]     = useState("24");
  const [localParagraphGap,  setLocalParagraphGap]  = useState("0");
  const [localUnderlineOffset, setLocalUnderlineOffset] = useState("0");
  const [localOpacity,       setLocalOpacity]       = useState(1);
  const [localBorder,        setLocalBorder]        = useState("none");
  const [borderWidthVal,     setBorderWidthVal]     = useState("0");
  const [borderStyleVal,     setBorderStyleVal]     = useState("none");
  const [borderColorVal,     setBorderColorVal]     = useState("#ffffff");
  const [localBgImage,       setLocalBgImage]       = useState("");
  const [localBgPos,         setLocalBgPos]         = useState("center");
  const [localBgSize,        setLocalBgSize]        = useState("cover");
  const [localBgRepeat,      setLocalBgRepeat]      = useState("no-repeat");
  const [localBgAttachment,  setLocalBgAttachment]  = useState("scroll");
  const [localBgBlend,       setLocalBgBlend]       = useState("normal");
  const [bgGradientOn,       setBgGradientOn]       = useState(false);
  const [bgGradFrom,         setBgGradFrom]         = useState("#7C3AED");
  const [bgGradTo,           setBgGradTo]           = useState("#EC4899");
  const [bgGradDir,          setBgGradDir]          = useState("90deg");
  const [localSecBgImage,    setLocalSecBgImage]    = useState("");
  const [localSecBgPos,      setLocalSecBgPos]      = useState("center");
  const [localSecBgSize,     setLocalSecBgSize]     = useState("cover");
  const [activeField,        setActiveField]        = useState<string | null>(null);
  const activeFieldRef = useRef<string | null>(null);
  // Icon state
  const [iconSize,       setIconSize]       = useState(32);
  const selectionSyncKey = buildSelectionSyncKey(node);

  useEffect(() => {
    activeFieldRef.current = activeField;
  }, [activeField]);

  useEffect(() => {
    if (node) return;
    if (activeFieldRef.current === null && lastSyncedSelectionKeyRef.current === null) return;
    activeFieldRef.current = null;
    lastSyncedSelectionKeyRef.current = null;
    setActiveField(null);
    setWidgetLinkTypes({});
    setCollectionLinkTypes({});
    setSectionCollectionLinkTypes({});
    setOpen((current) => {
      if (!Object.values(current).some(Boolean)) return current;
      return createClosedAccordionState();
    });
  }, [node]);

  // Sync from store node
  useEffect(() => {
    if (!node || !selectionSyncKey) return;
    const currentActiveField = activeFieldRef.current;
    const selectionChanged = lastSyncedSelectionKeyRef.current !== selectionSyncKey;
    if (currentActiveField && !selectionChanged) return;
    if (currentActiveField !== "imgUrl") setImgUrl(node.src ?? "");
    if ((node as any).isIframe) {
      const nextEmbedUrl = node.src ?? "";
      if (currentActiveField !== "embedUrl") setEmbedUrl(nextEmbedUrl);
      setEmbedMode(inferEmbedMode(nextEmbedUrl));
    } else if (currentActiveField !== "embedUrl") {
      setEmbedUrl("");
      setEmbedMode("custom");
    }
    if (currentActiveField !== "linkUrl") {
      const href = node.href ?? "";
      // normalizeInternalPageHref converts "//menu" → "/menu", "//" → "/"
      const internalPath = normalizeInternalPageHref(href);
      setLinkUrl(internalPath ?? href);
    }
    if (currentActiveField !== "inputPlaceholder") setInputPlaceholder((node as any).placeholder ?? "");
    if (currentActiveField !== "inputName") setInputName((node as any).inputName ?? "");
    if (currentActiveField !== "inputType") setInputType((node as any).inputType ?? "text");
    if (currentActiveField !== "editableText") setLocalEditableText((node as any).editableText ?? "");
    if (currentActiveField !== "logoItems") setLogoItemsDraft(((node as any).logoItems ?? []).join("\n"));
    if (!currentActiveField?.startsWith("widget:")) {
      const nextWidgetDraft = normalizeWidgetDraft(
          ((node as any).widgetFields ?? []) as CanvasWidgetField[],
          (((node as any).widgetState ?? {}) as Record<string, string>),
        );
      setWidgetDraft(nextWidgetDraft);
      setWidgetLinkTypes(
        Object.fromEntries(
          ((((node as any).widgetFields ?? []) as CanvasWidgetField[])
            .filter((field) => isWidgetLinkField(field))
            .map((field) => [field.key, inferLinkTypeFromValue(nextWidgetDraft[field.key] ?? "")]))
        ),
      );
    }
    if (!currentActiveField?.startsWith("collection:")) {
      const nextCollectionDraft = normalizeCollectionDraft(
        ((node as any).collectionFields ?? []) as CanvasCollectionField[],
        (((node as any).collectionItems ?? []) as CanvasCollectionItem[]),
      );
      setCollectionDraft(nextCollectionDraft);
      setCollectionLinkTypes(
        inferCollectionLinkTypeMap(
          ((node as any).collectionFields ?? []) as CanvasCollectionField[],
          nextCollectionDraft,
        ),
      );
    }
    if (currentActiveField !== "padding-top") setPT(node.paddingTop);
    if (currentActiveField !== "padding-right") setPR(node.paddingRight);
    if (currentActiveField !== "padding-bottom") setPB(node.paddingBottom);
    if (currentActiveField !== "padding-left") setPL(node.paddingLeft);
    if (currentActiveField !== "margin-top") setMT(node.marginTop);
    if (currentActiveField !== "margin-right") setMR(node.marginRight);
    if (currentActiveField !== "margin-bottom") setMB(node.marginBottom);
    if (currentActiveField !== "margin-left") setML(node.marginLeft);
    if (node.secPadding && !currentActiveField?.startsWith("section-padding")) {
      const p = node.secPadding.split(" ").map(parseFloat);
      setSpT(p[0] ?? 64); setSpR(p[1] ?? 32); setSpB(p[2] ?? 64); setSpL(p[3] ?? 32);
    }
    if (currentActiveField !== "width") setWVal(node.width || "auto");
    if (currentActiveField !== "height") setHVal(node.height || "auto");
    if (currentActiveField !== "minWidth") setMwVal(node.minWidth || "none");
    if (currentActiveField !== "maxWidth") setMxVal(node.maxWidth || "none");
    if (currentActiveField !== "top") setTopVal(node.top || "auto");
    if (currentActiveField !== "right") setRightVal(node.right || "auto");
    if (currentActiveField !== "bottom") setBottomVal(node.bottom || "auto");
    if (currentActiveField !== "left") setLeftVal(node.left || "auto");
    if (currentActiveField !== "zIndex") setZIndexVal(node.zIndex || "auto");
    if (currentActiveField !== "flexGrow") setFlexGrowVal(parseSizeToken(node.flexGrow, 0));
    if (currentActiveField !== "flexShrink") setFlexShrinkVal(parseSizeToken(node.flexShrink, 1));
    if (currentActiveField !== "flexBasis") setFlexBasisVal(node.flexBasis || "auto");
    if (currentActiveField !== "gap") setGapVal(parseSizeToken(node.gap, 0));
    if (currentActiveField !== "rowGap") setRowGapVal(parseSizeToken(node.rowGap || node.gap, 0));
    if (currentActiveField !== "columnGap") setColumnGapVal(parseSizeToken(node.columnGap || node.gap, 0));
    if (currentActiveField !== "gridCols") setGridColsVal(node.gridCols || "");
    if (currentActiveField !== "gridRows") setGridRowsVal(node.gridRows || "");
    if (currentActiveField !== "blur") setBlurVal(parseFilterFn(node.filter, "blur", 0));
    if (currentActiveField !== "brightness") setBrightnessVal(parseFilterFn(node.filter, "brightness", 100));
    if (currentActiveField !== "contrast") setContrastVal(parseFilterFn(node.filter, "contrast", 100));
    if (currentActiveField !== "grayscale") setGrayscaleVal(parseFilterFn(node.filter, "grayscale", 0));
    if (currentActiveField !== "saturate") setSaturateVal(parseFilterFn(node.filter, "saturate", 100));
    if (currentActiveField !== "backdropBlur") setBackdropBlurVal(parseFilterFn(node.backdropFilter, "blur", 0));
    if (currentActiveField !== "mixBlend") setMixBlendVal(node.mixBlendMode || "normal");
    if (currentActiveField !== "animDuration") setAnimDurationVal(parseTimeToMs(node.animationDuration, 600));
    if (currentActiveField !== "animDelay") setAnimDelayVal(parseTimeToMs(node.animationDelay, 0));
    if (currentActiveField !== "fontSize") setLocalFontSize(String(Math.round(node.fontSize ?? 16)));
    if (currentActiveField !== "lineHeight") setLocalLineHeight(String(parseFloat(node.lineHeight) || 1.5));
    if (currentActiveField !== "letterSpacing") setLocalLetterSpacing(String(parseFloat(node.letterSpacing) || 0));
    if (currentActiveField !== "textOpacity") setLocalTextOpacity(String(Math.round((parseFloat(node.textOpacity || "1") || 0) * 100)));
    if (currentActiveField !== "textIndent") setLocalTextIndent(parseSizeToken(node.textIndent, 0));
    if (currentActiveField !== "columnCount") setLocalColumnCount(parseSizeToken(node.columnCount, 1));
    if (currentActiveField !== "columnGap") setLocalColumnGap(parseSizeToken(node.columnGap, 24));
    if (currentActiveField !== "paragraphGap") setLocalParagraphGap(String(Math.max(0, Math.round(node.marginBottom ?? 0))));
    if (currentActiveField !== "underlineOffset") setLocalUnderlineOffset(parseSizeToken(node.textUnderlineOffset, 0));
    if (currentActiveField !== "opacity") setLocalOpacity(parseFloat(node.opacity ?? "1"));
    if (currentActiveField !== "border") setLocalBorder(node.border || "none");
    if (currentActiveField !== "borderWidth") setBorderWidthVal(parseSizeToken(node.buttonSurfaceBorderWidth ?? node.borderWidth, 0));
    if (currentActiveField !== "borderStyle") setBorderStyleVal(node.buttonSurfaceBorderStyle ?? node.borderStyle ?? "none");
    if (currentActiveField !== "borderColor") setBorderColorVal(safeHex(node.buttonSurfaceBorderColor ?? node.borderColor ?? node.color));
    if (currentActiveField !== "backgroundImage") {
      const gradient = parseGradientBackground(node.backgroundImage);
      // Use clean URL from bgImageSrc (strips url("...") wrapper)
      setLocalBgImage(node.bgImageSrc ?? node.sectionVisualSrc ?? "");
      setLocalBgPos(node.backgroundPosition || "center");
      setLocalBgSize(node.backgroundSize || "cover");
      setLocalBgRepeat(node.backgroundRepeat || "no-repeat");
      setLocalBgAttachment(node.backgroundAttachment || "scroll");
      setLocalBgBlend(node.backgroundBlendMode || "normal");
      setBgGradientOn(!!gradient);
      if (gradient) {
        setBgGradDir(gradient.dir);
        setBgGradFrom(gradient.from);
        setBgGradTo(gradient.to);
      }
      // Section bg image (accessible from child elements)
      setLocalSecBgImage(node.secBgImageSrc ?? node.sectionVisualSrc ?? "");
      setLocalSecBgPos(node.secBgPosition || "center");
      setLocalSecBgSize(node.secBgSize || "cover");
    }
    if (!currentActiveField?.startsWith("radius-")) {
      const [tl, tr, br, bl] = parseRadius(node.borderRadius ?? "0px");
      setBrTL(parseUnitDraft(tl)); setBrTR(parseUnitDraft(tr)); setBrBR(parseUnitDraft(br)); setBrBL(parseUnitDraft(bl));
    }
    if (selectionChanged) {
      setOpen((prev) => ({ ...prev, ...createClosedAccordionState(), ...getDefaultOpenAccordions(node) }) as Record<string, boolean>);
      // Reset CSS draft on new selection
      setCssDraft((node as any).inlineStyle ?? (node as any).style ?? "");
    }
    if ((node as any).isIconEl) {
      setIconSize((node as any).iconSize ?? 32);
    }
    lastSyncedSelectionKeyRef.current = selectionSyncKey;
  }, [
    selectionSyncKey,
    node?.nodeId,
    node?.textTargetNodeId,
    node?.textTargetTag,
    node?.hasEditableText,
    (node as any)?.editableText,
    (node as any)?.logoCollectionNodeId,
    JSON.stringify((node as any)?.logoItems ?? []),
    (node as any)?.widgetNodeId,
    JSON.stringify((node as any)?.widgetFields ?? []),
    JSON.stringify((node as any)?.widgetState ?? {}),
    (node as any)?.collectionNodeId,
    JSON.stringify((node as any)?.collectionFields ?? []),
    JSON.stringify((node as any)?.collectionItems ?? []),
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
    node?.position,
    node?.zIndex,
    node?.top,
    node?.right,
    node?.bottom,
    node?.left,
    node?.flexGrow,
    node?.flexShrink,
    node?.flexBasis,
    node?.gap,
    node?.rowGap,
    node?.columnGap,
    node?.gridCols,
    node?.gridRows,
    node?.filter,
    node?.backdropFilter,
    node?.mixBlendMode,
    node?.animationIn,
    node?.animationHover,
    node?.animationEntranceTargetNodeId,
    node?.animationHoverTargetNodeId,
    node?.animationDuration,
    node?.animationDelay,
    node?.animationEase,
    node?.fontSize,
    node?.lineHeight,
    node?.letterSpacing,
    node?.textOpacity,
    node?.textIndent,
    node?.columnCount,
    node?.columnGap,
    node?.textUnderlineOffset,
    node?.opacity,
    node?.border,
    node?.borderWidth,
    node?.borderStyle,
    node?.borderColor,
    node?.buttonSurfaceNodeId,
    node?.buttonSurfaceBackgroundColor,
    node?.buttonSurfaceBorderWidth,
    node?.buttonSurfaceBorderStyle,
    node?.buttonSurfaceBorderColor,
    node?.backgroundImage,
    node?.bgImageSrc,
    node?.backgroundPosition,
    node?.backgroundSize,
    node?.backgroundRepeat,
    node?.backgroundAttachment,
    node?.backgroundBlendMode,
    node?.objectPosition,
    node?.secBgImageSrc,
    node?.secBgPosition,
    node?.secBgSize,
    node?.sectionVisualSrc,
    node?.borderRadius,
    node?.isText,
    node?.isBtn,
    node?.isImg,
    node?.isSec,
    node?.isSvg,
    (node as any)?.isIconEl,
    (node as any)?.iconSize,
  ]); // eslint-disable-line

  useEffect(() => {
    if (!node) return;
    setLinkType(inferLinkTypeFromValue(node.href ?? ""));
  }, [node?.nodeId, node?.href, project]); // eslint-disable-line

  const send = useCallback((type: string, extra: Record<string, unknown> = {}) => {
    iframeRef.current?.contentWindow?.postMessage(
      { target: "sitezy-iframe", type, ...extra }, "*"
    );
  }, [iframeRef]);

  useEffect(() => {
    function handleSectionControlsMessage(e: MessageEvent) {
      if (!e.data || e.data.source !== "sitezy-editor" || e.data.type !== "section-structured-controls") return;
      const payload = e.data.payload as { sectionId?: string | null; controls?: unknown } | null;
      if (!payload || payload.sectionId !== activeSectionId) return;
      const normalizedControls = normalizeSectionStructuredControls(payload.controls);
      setSectionControls(normalizedControls);
      setSectionCollectionLinkTypes(inferSectionCollectionLinkTypeMap(normalizedControls));
      setSectionControlsLoading(false);
      setSectionControlsReady(true);
    }

    window.addEventListener("message", handleSectionControlsMessage);
    return () => window.removeEventListener("message", handleSectionControlsMessage);
  }, [activeSectionId]);

  useEffect(() => {
    if (!node?.isSec || !activeSectionId) {
      setSectionControls([]);
      setSectionCollectionLinkTypes({});
      setSectionControlsLoading(false);
      setSectionControlsReady(false);
      return;
    }

    setSectionControls([]);
    setSectionCollectionLinkTypes({});
    setSectionControlsLoading(true);
    setSectionControlsReady(false);
    send("get-section-structured-controls", { sectionId: activeSectionId });
  }, [activeSectionId, node?.isSec, node?.nodeId, send]);

  const clearResponsiveOverrides = useCallback(() => {
    if (!node || devicePreview === "desktop") return;
    const nodeIds = Array.from(
      new Set(
        [
          node.nodeId,
          node.buttonSurfaceNodeId,
          node.textTargetNodeId,
          node.mediaTargetNodeId,
          node.animationTargetNodeId,
          node.animationEntranceTargetNodeId,
          node.animationHoverTargetNodeId,
          node.linkTargetNodeId,
          node.listTargetNodeId,
        ].filter(
          (value): value is string => Boolean(value)
        )
      )
    );
    send("clear-responsive-overrides", { nodeIds });
  }, [devicePreview, node, send]);

  const copyDesktopToBreakpoint = useCallback(() => {
    if (!node || devicePreview === "desktop") return;
    const nodeIds = Array.from(new Set([
      node.nodeId,
      node.buttonSurfaceNodeId,
      node.textTargetNodeId,
      node.mediaTargetNodeId,
      node.animationTargetNodeId,
      node.animationEntranceTargetNodeId,
      node.animationHoverTargetNodeId,
      node.linkTargetNodeId,
      node.listTargetNodeId,
    ].filter((v): v is string => Boolean(v))));
    send("copy-desktop-styles", { nodeIds });
  }, [devicePreview, node, send]);

  const setCurrentVisibility = useCallback((visible: boolean) => {
    if (!node) return;
    send("set-visibility-current", { nodeIds: [node.nodeId], visible });
  }, [node, send]);

  const setExclusiveVisibility = useCallback((device: "desktop" | "tablet" | "mobile") => {
    if (!node) return;
    send("set-visibility-exclusive", { nodeIds: [node.nodeId], device });
  }, [node, send]);

  const hasResponsiveProp = useCallback((...props: string[]) => {
    if (devicePreview === "desktop") return false;
    const current = new Set(node?.responsiveCurrentProps ?? []);
    return props.some((prop) => current.has(prop));
  }, [devicePreview, node?.responsiveCurrentProps]);

  const resetResponsiveProp = useCallback((props: string[], scope: "node" | "media" | "all" | "link" | "list" | "text" = "node") => {
    if (!node || devicePreview === "desktop") return;
    const textScopedProps = new Set([
      "fontSize","fontFamily","fontWeight","fontStyle","fontVariantCaps","textAlign","lineHeight","letterSpacing",
      "textDecoration","textDecorationStyle","textUnderlineOffset","textTransform","whiteSpace","overflowWrap",
      "wordBreak","textIndent","columnCount","columnGap","color","textShadow","webkitTextStroke",
      "webkitBackgroundClip","backgroundClip","webkitTextFillColor","marginBottom",
    ]);
    const shouldUseTextTarget = scope === "text" || (scope === "node" && props.some((prop) => textScopedProps.has(prop)));
    const targets =
      shouldUseTextTarget
        ? [node.textTargetNodeId ?? node.nodeId]
        : scope === "media"
        ? [node.mediaTargetNodeId ?? node.nodeId]
        : scope === "link"
          ? [node.linkTargetNodeId ?? node.nodeId]
          : scope === "list"
            ? [node.listTargetNodeId ?? node.nodeId]
        : scope === "all"
          ? [node.nodeId, node.buttonSurfaceNodeId, node.textTargetNodeId, node.mediaTargetNodeId, node.animationTargetNodeId, node.animationEntranceTargetNodeId, node.animationHoverTargetNodeId, node.linkTargetNodeId, node.listTargetNodeId]
          : [node.isBtn ? (node.buttonSurfaceNodeId ?? node.nodeId) : node.nodeId];
    const nodeIds = Array.from(new Set(targets.filter((value): value is string => Boolean(value))));
    if (!nodeIds.length) return;
    send("clear-responsive-property", { nodeIds, props });
  }, [devicePreview, node, send]);

  const commitEmbedUrl = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || isResolvingEmbed) return;

    let normalized = normalizeEmbedUrl(trimmed, embedMode);

    if (embedMode === "map" && /^https?:\/\//i.test(trimmed)) {
      try {
        setIsResolvingEmbed(true);
        const response = await fetch("/api/map-resolve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });
        const payload = await response.json().catch(() => null) as { embedUrl?: string; error?: string } | null;
        if (response.ok && payload?.embedUrl) {
          normalized = payload.embedUrl;
        } else if (isShortGoogleMapUrl(trimmed)) {
          normalized = "";
        }
      } catch {
        if (isShortGoogleMapUrl(trimmed)) {
          normalized = "";
        }
      } finally {
        setIsResolvingEmbed(false);
      }
    }

    if (!normalized) return;
    setEmbedUrl(normalized);
    send("apply-attr", { attr: "src", value: normalized, nodeId: node?.mediaTargetNodeId ?? node?.nodeId ?? null });
    if (embedMode === "youtube") {
      send("apply-attr", {
        attr: "referrerpolicy",
        value: "strict-origin-when-cross-origin",
        nodeId: node?.mediaTargetNodeId ?? node?.nodeId ?? null,
      });
    }
    if (embedMode === "map") {
      send("apply-attr", {
        attr: "referrerpolicy",
        value: "no-referrer-when-downgrade",
        nodeId: node?.mediaTargetNodeId ?? node?.nodeId ?? null,
      });
      send("apply-attr", {
        attr: "loading",
        value: "lazy",
        nodeId: node?.mediaTargetNodeId ?? node?.nodeId ?? null,
      });
    }
  }, [embedMode, isResolvingEmbed, node?.mediaTargetNodeId, node?.nodeId, send]);

  const applyStyle = useCallback((prop: string, value: string, options?: { batch?: boolean }) => {
    send("apply-style", { prop, value, ...(options?.batch ? { batch: true } : {}) });
  }, [send]);

  const applyStyleToNode = useCallback((nodeId: string | null | undefined, prop: string, value: string, options?: { batch?: boolean }) => {
    send("apply-style", {
      prop,
      value,
      nodeId: nodeId ?? null,
      ...(options?.batch ? { batch: true } : {}),
    });
  }, [send]);

  const applySectionStyle = useCallback((prop: string, value: string, options?: { batch?: boolean }) => {
    send("apply-section-style", { prop, value, ...(options?.batch ? { batch: true } : {}) });
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
  function applyBgImage(url: string, pos?: string, size?: string) {
    const val = url.trim() ? (url.trim().startsWith("url(") ? url.trim() : `url("${url.trim()}")`) : "none";
    // Use batch:true for ALL three to keep them as a single undo step
    applyStyle("backgroundImage", val, { batch: true });
    if (url.trim()) {
      applyStyle("backgroundPosition", pos ?? localBgPos, { batch: true });
      applyStyle("backgroundSize", size ?? localBgSize, { batch: true });
    }
  }
  function applyBgSurface(next: { repeat?: string; attachment?: string; blend?: string }) {
    if (next.repeat !== undefined) applyStyle("backgroundRepeat", next.repeat, { batch: true });
    if (next.attachment !== undefined) applyStyle("backgroundAttachment", next.attachment, { batch: true });
    if (next.blend !== undefined) applyStyle("backgroundBlendMode", next.blend, { batch: true });
  }
  function applyGradientFill(dir: string, from: string, to: string) {
    applyStyle("backgroundImage", buildGradientCss(dir, from, to), { batch: true });
    applyStyle("backgroundRepeat", "no-repeat", { batch: true });
    applyStyle("backgroundBlendMode", localBgBlend || "normal", { batch: true });
  }
  function applySecBgImage(url: string, pos?: string, size?: string) {
    const val = url.trim() ? (url.trim().startsWith("url(") ? url.trim() : `url("${url.trim()}")`) : "none";
    applySectionStyle("backgroundImage", val, { batch: true });
    if (url.trim()) {
      applySectionStyle("backgroundPosition", pos ?? localSecBgPos, { batch: true });
      applySectionStyle("backgroundSize", size ?? localSecBgSize, { batch: true });
    }
  }
  function applyBorderConfig(width: string, style: string, color: string) {
    const safeWidth = `${parseSizeToken(width, 0)}px`;
    const safeStyle = style || "solid";
    if (node?.isBtn) {
      applyStyleToNode(buttonSurfaceTargetId, "borderWidth", safeStyle === "none" ? "0px" : safeWidth, { batch: true });
      applyStyleToNode(buttonSurfaceTargetId, "borderStyle", safeStyle, { batch: true });
      applyStyleToNode(buttonSurfaceTargetId, "borderColor", color, { batch: true });
      return;
    }
    applyStyle("borderWidth", safeStyle === "none" ? "0px" : safeWidth, { batch: true });
    applyStyle("borderStyle", safeStyle, { batch: true });
    applyStyle("borderColor", color, { batch: true });
  }
  function applyFilterConfig(next?: Partial<{
    blur: string;
    brightness: string;
    contrast: string;
    grayscale: string;
    saturate: string;
  }>) {
    const filterValue = buildFilterValue({
      blur: next?.blur ?? blurVal,
      brightness: next?.brightness ?? brightnessVal,
      contrast: next?.contrast ?? contrastVal,
      grayscale: next?.grayscale ?? grayscaleVal,
      saturate: next?.saturate ?? saturateVal,
    });
    applyStyle("filter", filterValue);
  }
  function applyBackdropBlur(next: string) {
    const value = buildBackdropFilterValue(next);
    applyStyle("backdropFilter", value);
    applyStyle("webkitBackdropFilter", value, { batch: true });
  }
  function applyRadius(tl:string, tr:string, br:string, bl:string) {
    const v = `${parseUnitDraft(tl)}px ${parseUnitDraft(tr)}px ${parseUnitDraft(br)}px ${parseUnitDraft(bl)}px`;
    if (node?.isBtn) {
      applyStyleToNode(buttonSurfaceTargetId, "borderRadius", v);
      return;
    }
    send("apply-style", { prop: "borderRadius", value: v });
  }

  if (!visualEditMode) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-5">
        <div className="w-full max-w-[240px] text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#5B8CFF]/8 ring-1 ring-[#5B8CFF]/10">
            <MousePointer2 size={16} className="text-[#5B8CFF]/60" />
          </div>
          <p className="mt-4 text-[13px] font-semibold text-white/70">Start editing</p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/30">
            Enable edit mode to select and style elements on your page.
          </p>
          <button
            onClick={() => {
              setVisualEditMode(true);
              if (!rightSidebarOpen) toggleRightSidebar();
              setRightPanel("style");
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#5B8CFF]/12 px-4 py-2 text-[12px] font-semibold text-[#5B8CFF] ring-1 ring-[#5B8CFF]/20 transition-all hover:bg-[#5B8CFF]/18 hover:ring-[#5B8CFF]/30"
          >
            <MousePointer2 size={11} />
            Enable editing
          </button>
          <p className="mt-3 text-[9.5px] text-white/20">or press <kbd className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[9px] text-white/30">E</kbd></p>
        </div>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-5">
        <div className="w-full max-w-[240px] text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06]">
            <MousePointer2 size={16} className="text-white/30" />
          </div>
          <p className="mt-4 text-[13px] font-semibold text-white/60">Nothing selected</p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/25">
            Click any element on the canvas to inspect and edit its styles.
          </p>
          <div className="mt-4 space-y-1.5 text-left">
            {[
              "Click an element to select it.",
              "Double-click text to edit inline.",
              "Use Layers for nested elements.",
            ].map((tip) => (
              <div key={tip} className="rounded-md bg-white/[0.02] px-2.5 py-2 text-[11px] leading-relaxed text-white/22 ring-1 ring-white/[0.03]">
                {tip}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const txtColor   = safeHex(node.color);
  const textOpacityValue = Math.max(0, Math.min(1, parseFloat(node.textOpacity || "1") || safeAlpha(node.color)));
  const bgColor    = isTransparent(node.backgroundColor) ? null : safeHex(node.backgroundColor);
  const buttonSurfaceBgColor = isTransparent(node.buttonSurfaceBackgroundColor ?? node.backgroundColor) ? null : safeHex(node.buttonSurfaceBackgroundColor ?? node.backgroundColor);
  const secBgColor = isTransparent(node.secBg) ? null : safeHex(node.secBg);
  const isMediaNode = node.isImg || node.isVideo || node.isIframe;
  const hasEditableText = node.hasEditableText || node.isText || node.isBtn || node.isInput;
  const textTargetTag = node.textTargetTag ?? node.tag;
  const inspectorProfile = resolveInspectorProfile(node);
  const showLayoutPanel = inspectorProfile?.showLayoutPanel ?? false;
  const showBackgroundPanel = inspectorProfile?.showBackgroundPanel ?? false;
  const showBorderPanel = inspectorProfile?.showBorderPanel ?? false;
  const showLinkPanel = inspectorProfile?.showLinkPanel ?? false;
  const isFlexContainer = node.display === "flex" || node.display === "inline-flex";
  const isGridContainer = node.display === "grid" || node.display === "inline-grid";
  const isFlexChild = !!node.parentDisplay && node.parentDisplay.includes("flex");
  const isGridChild = !!node.parentDisplay && node.parentDisplay.includes("grid");
  const mediaTargetNodeId = node.mediaTargetNodeId ?? node.nodeId;
  const linkTargetNodeId = node.linkTargetNodeId ?? node.nodeId;
  const buttonSurfaceTargetId = node.buttonSurfaceNodeId ?? linkTargetNodeId ?? node.nodeId;
  const listTargetNodeId = node.listTargetNodeId ?? null;
  const sectionVisualNodeId = node.sectionVisualNodeId ?? null;
  const currentResponsiveProps = node.responsiveCurrentProps ?? [];
  const currentResponsiveCount = currentResponsiveProps.length;
  const sectionUsesVisualFallback = !!sectionVisualNodeId && (
    (node.isSec && !node.hasBgImage) || (!node.isSec && !node.secHasBgImage)
  );
  const showParagraphSpacing = ["p", "blockquote", "li", "figcaption", "summary", "dd", "dt"].includes(textTargetTag);
  const showColumnsControls = hasEditableText && !node.isBtn && !(node as any).isInput && !["a", "span", "small", "strong", "em", "label", "button", "summary"].includes(textTargetTag);
  const showListControls = !!listTargetNodeId;
  const showLinkDecorationControls = textTargetTag === "a" || node.tag === "a" || node.href !== null;
  const resolvedButtonTone = (buttonSurfaceBgColor ?? safeHex(node.buttonSurfaceBorderColor ?? borderColorVal) ?? txtColor ?? "#7c3aed").toLowerCase();
  const currentBorderWidth = parseFloat(parseSizeToken(node.buttonSurfaceBorderWidth ?? borderWidthVal ?? "0", 0)) || 0;
  const currentBorderStyle = node.buttonSurfaceBorderStyle ?? borderStyleVal ?? "none";
  const currentButtonSurface =
    !!buttonSurfaceBgColor
      ? "solid"
      : currentBorderWidth > 0 && currentBorderStyle !== "none"
      ? "outline"
      : "ghost";

  function applyButtonSurfacePreset(surface: "solid" | "outline" | "ghost") {
    const tone = resolvedButtonTone || "#7c3aed";
    if (surface === "solid") {
      applyStyleToNode(buttonSurfaceTargetId, "backgroundColor", tone, { batch: true });
      applyStyleToNode(buttonSurfaceTargetId, "color", "#ffffff", { batch: true });
      applyStyleToNode(buttonSurfaceTargetId, "borderWidth", "0px", { batch: true });
      applyStyleToNode(buttonSurfaceTargetId, "borderStyle", "solid", { batch: true });
      applyStyleToNode(buttonSurfaceTargetId, "borderColor", tone, { batch: true });
      setBorderWidthVal("0");
      setBorderStyleVal("solid");
      setBorderColorVal(tone);
      return;
    }

    applyStyleToNode(buttonSurfaceTargetId, "backgroundColor", "transparent", { batch: true });
    applyStyleToNode(buttonSurfaceTargetId, "color", tone, { batch: true });
    applyStyleToNode(buttonSurfaceTargetId, "boxShadow", "none", { batch: true });

    if (surface === "outline") {
      applyStyleToNode(buttonSurfaceTargetId, "borderWidth", "1.5px", { batch: true });
      applyStyleToNode(buttonSurfaceTargetId, "borderStyle", "solid", { batch: true });
      applyStyleToNode(buttonSurfaceTargetId, "borderColor", tone, { batch: true });
      setBorderWidthVal("1.5");
      setBorderStyleVal("solid");
      setBorderColorVal(tone);
      return;
    }

    applyStyleToNode(buttonSurfaceTargetId, "borderWidth", "0px", { batch: true });
    applyStyleToNode(buttonSurfaceTargetId, "borderStyle", "solid", { batch: true });
    applyStyleToNode(buttonSurfaceTargetId, "borderColor", tone, { batch: true });
    setBorderWidthVal("0");
    setBorderStyleVal("solid");
    setBorderColorVal(tone);
  }
  const showLogoPanel = inspectorProfile?.showLogoPanel ?? false;
  const showWidgetPanel = inspectorProfile?.showWidgetPanel ?? false;
  const showCollectionPanel = inspectorProfile?.showCollectionPanel ?? false;
  const showSectionControlsPanel = !!node.isSec && !!activeSectionId;
  const suppressStandaloneStructuredPanels =
    showSectionControlsPanel &&
    sectionControlsReady &&
    sectionControls.length > 0;
  const showStandaloneWidgetPanel = showWidgetPanel && !suppressStandaloneStructuredPanels;
  const showStandaloneCollectionPanel = showCollectionPanel && !suppressStandaloneStructuredPanels;
  const showContentPanel = inspectorProfile?.showContentPanel ?? false;
  const showTextContentPanel =
    showContentPanel &&
    (hasEditableText || !!localEditableText.trim()) &&
    !showLogoPanel &&
    !showStandaloneWidgetPanel &&
    !node.isContainer; // containers (nav bars, wrappers) must NOT show a merged text editor
  const widgetFields = (node?.widgetFields ?? []) as CanvasWidgetField[];
  const widgetLabel = node?.widgetLabel || "Widget";
  const collectionFields = node?.collectionFields ?? [];
  const collectionLabel = node?.collectionLabel || "Items";
  const useCompactCollectionGrid =
    collectionFields.length > 1 &&
    collectionFields.every((field) => field.type !== "textarea" && field.type !== "list");
  const mediaPickerTitle = mediaPickerTarget === "video"
    ? "Project Video Library"
    : mediaPickerTarget === "logos"
    ? "Company Logos"
    : mediaPickerTarget === "widget-image"
    ? "Widget Image Gallery"
    : mediaPickerTarget === "section-widget-image"
    ? "Section Image Gallery"
    : mediaPickerTarget === "section-control-image"
    ? "Section Image Gallery"
    : mediaPickerTarget === "section-control-collection-image"
    ? "Section Image Gallery"
    : mediaPickerTarget === "section-own-background"
    ? "Section Background Gallery"
    : mediaPickerTarget === "section-background"
    ? "Section Background Gallery"
    : mediaPickerTarget === "background"
    ? "Background Gallery"
    : "Project Image Library";
  const mediaPickerDescription = mediaPickerTarget === "logos"
    ? "Upload or reuse brand marks for logo walls and logo scrollers."
    : mediaPickerTarget === "video"
    ? "Upload or reuse videos, then replace the selected media block in one step."
    : mediaPickerTarget === "widget-image" || mediaPickerTarget === "section-widget-image"
    ? "Choose an image from your project library and apply it directly to this widget field."
    : mediaPickerTarget === "section-control-image" || mediaPickerTarget === "section-control-collection-image"
    ? "Choose an image from your project library and apply it directly to this section control."
    : "Upload once, then reuse images anywhere for cards, sections, and visual replacements.";
  const mediaPickerActionLabel = mediaPickerTarget === "logos" ? "Add selected" : "Use selected";

  function sendMediaAttr(attr: string, value: string | null) {
    send("apply-attr", { attr, value, nodeId: mediaTargetNodeId });
  }

  function applyMediaStyle(prop: string, value: string, options?: { batch?: boolean }) {
    send("apply-style", {
      prop,
      value,
      nodeId: mediaTargetNodeId,
      ...(options?.batch ? { batch: true } : {}),
    });
  }

  function applyLinkStyle(prop: string, value: string, options?: { batch?: boolean }) {
    applyStyleToNode(linkTargetNodeId, prop, value, options);
  }

  function applyListStyle(prop: string, value: string, options?: { batch?: boolean }) {
    if (!listTargetNodeId) return;
    applyStyleToNode(listTargetNodeId, prop, value, options);
  }

  function applyTextColor(hex: string, alpha = textOpacityValue, options?: { batch?: boolean }) {
    applyStyle("color", withAlpha(hex, alpha), options);
  }

  function applyTextContent(value: string) {
    if (!node) return;
    const textNodeId = node.textTargetNodeId ?? node.nodeId;
    send("apply-text-content", { nodeId: textNodeId, value });
  }

  function applyLogoItems(value: string) {
    if (!node?.logoCollectionNodeId) return;
    const items = value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    setLogoItemsDraft(items.join("\n"));
    send("apply-logo-items", { nodeId: node.logoCollectionNodeId, items });
  }

  function applyWidgetState(state: Record<string, string>) {
    if (!node?.widgetNodeId) return;
    const normalized = normalizeWidgetDraft(
      widgetFields,
      state,
    );
    setWidgetDraft(normalized);
    send("apply-widget-state", { nodeId: node.widgetNodeId, state: normalized });
  }

  function updateWidgetField(key: string, value: string) {
    applyWidgetState({
      ...widgetDraft,
      [key]: value,
    });
  }

  function setWidgetLinkType(fieldKey: string, nextType: LinkInputType) {
    setWidgetLinkTypes((current) => ({ ...current, [fieldKey]: nextType }));
    const currentValue = widgetDraft[fieldKey] ?? "";

    if (nextType === "none") {
      updateWidgetField(fieldKey, "");
      return;
    }

    if (nextType === "email") {
      updateWidgetField(fieldKey, currentValue.startsWith("mailto:") ? currentValue : "mailto:");
      return;
    }

    if (nextType === "phone") {
      updateWidgetField(fieldKey, currentValue.startsWith("tel:") ? currentValue : "tel:");
      return;
    }

    if (nextType === "page" || nextType === "anchor") {
      updateWidgetField(fieldKey, "");
      return;
    }

    if (
      currentValue.startsWith("mailto:") ||
      currentValue.startsWith("tel:") ||
      currentValue.startsWith("#") ||
      normalizeInternalPageHref(currentValue) !== null
    ) {
      updateWidgetField(fieldKey, "");
    }
  }

  function setCollectionLinkType(index: number, itemId: string, fieldKey: string, nextType: LinkInputType) {
    setCollectionLinkTypes((current) => ({
      ...current,
      [collectionLinkTypeStateKey(itemId, fieldKey)]: nextType,
    }));
    const currentValue = collectionDraft[index]?.fields?.[fieldKey] ?? "";

    if (nextType === "none") {
      updateCollectionField(index, fieldKey, "");
      return;
    }

    if (nextType === "email") {
      updateCollectionField(index, fieldKey, currentValue.startsWith("mailto:") ? currentValue : "mailto:");
      return;
    }

    if (nextType === "phone") {
      updateCollectionField(index, fieldKey, currentValue.startsWith("tel:") ? currentValue : "tel:");
      return;
    }

    if (nextType === "page" || nextType === "anchor") {
      updateCollectionField(index, fieldKey, "");
      return;
    }

    if (
      currentValue.startsWith("mailto:") ||
      currentValue.startsWith("tel:") ||
      currentValue.startsWith("#") ||
      normalizeInternalPageHref(currentValue) !== null
    ) {
      updateCollectionField(index, fieldKey, "");
    }
  }

  function applyCollectionItems(items: CanvasCollectionItem[]) {
    if (!node?.collectionNodeId) return;
    const normalized = normalizeCollectionDraft(collectionFields, items);
    setCollectionDraft(normalized);
    send("apply-collection-items", { nodeId: node.collectionNodeId, items: normalized });
  }

  function updateCollectionField(index: number, key: string, value: string) {
    const nextItems = collectionDraft.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const fields = { ...(item.fields ?? {}), [key]: value };
      const titleSeed =
        fields.title ||
        fields.name ||
        fields.plan ||
        fields.question ||
        fields.label ||
        Object.values(fields).find((entry) => String(entry || "").trim()) ||
        `Item ${index + 1}`;
      return {
        ...item,
        title: String(titleSeed),
        fields,
      };
    });
    applyCollectionItems(nextItems);
  }

  function addCollectionItem() {
    applyCollectionItems([
      ...collectionDraft,
      createCollectionItem(collectionFields, collectionDraft.length),
    ]);
  }

  function duplicateCollectionItem(index: number) {
    const source = collectionDraft[index];
    if (!source) return;
    const nextItems = [...collectionDraft];
    nextItems.splice(index + 1, 0, createCollectionItem(collectionFields, index + 1, source));
    applyCollectionItems(nextItems);
  }

  function removeCollectionItem(index: number) {
    if (collectionDraft.length <= 1) return;
    applyCollectionItems(collectionDraft.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateSectionWidgetField(controlId: string, key: string, value: string) {
    const control = sectionControls.find(
      (entry): entry is SectionWidgetControl => entry.id === controlId && entry.type === "widget",
    );
    if (!control) return;

    const nextState = normalizeWidgetDraft(control.fields, {
      ...control.state,
      [key]: value,
    });

    setSectionControls((current) => current.map((entry) =>
      entry.id === controlId && entry.type === "widget"
        ? { ...entry, state: nextState }
        : entry
    ));
    send("apply-widget-state", { nodeId: control.nodeId, state: nextState });
  }

  function applySectionCollectionItems(controlId: string, items: CanvasCollectionItem[]) {
    const control = sectionControls.find(
      (entry): entry is SectionCollectionControl => entry.id === controlId && entry.type === "collection",
    );
    if (!control) return;

    const normalized = normalizeCollectionDraft(control.fields, items);
    const nextItems = normalized.length ? normalized : [createCollectionItem(control.fields, 0)];

    setSectionControls((current) => current.map((entry) =>
      entry.id === controlId && entry.type === "collection"
        ? { ...entry, items: nextItems }
        : entry
    ));
    send("apply-collection-items", { nodeId: control.nodeId, items: nextItems });
  }

  function updateSectionCollectionField(controlId: string, index: number, key: string, value: string) {
    const control = sectionControls.find(
      (entry): entry is SectionCollectionControl => entry.id === controlId && entry.type === "collection",
    );
    if (!control) return;

    const nextItems = control.items.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const fields = { ...(item.fields ?? {}), [key]: value };
      const titleSeed =
        fields.title ||
        fields.name ||
        fields.plan ||
        fields.question ||
        fields.label ||
        Object.values(fields).find((entry) => String(entry || "").trim()) ||
        `Item ${index + 1}`;

      return {
        ...item,
        title: String(titleSeed),
        fields,
      };
    });

    applySectionCollectionItems(controlId, nextItems);
  }

  function setSectionCollectionLinkType(
    controlId: string,
    index: number,
    itemId: string,
    fieldKey: string,
    nextType: LinkInputType,
  ) {
    setSectionCollectionLinkTypes((current) => ({
      ...current,
      [sectionCollectionLinkTypeStateKey(controlId, itemId, fieldKey)]: nextType,
    }));
    const control = sectionControls.find(
      (entry): entry is SectionCollectionControl => entry.id === controlId && entry.type === "collection",
    );
    const currentValue = control?.items[index]?.fields?.[fieldKey] ?? "";

    if (nextType === "none") {
      updateSectionCollectionField(controlId, index, fieldKey, "");
      return;
    }

    if (nextType === "email") {
      updateSectionCollectionField(
        controlId,
        index,
        fieldKey,
        currentValue.startsWith("mailto:") ? currentValue : "mailto:",
      );
      return;
    }

    if (nextType === "phone") {
      updateSectionCollectionField(
        controlId,
        index,
        fieldKey,
        currentValue.startsWith("tel:") ? currentValue : "tel:",
      );
      return;
    }

    if (nextType === "page" || nextType === "anchor") {
      updateSectionCollectionField(controlId, index, fieldKey, "");
      return;
    }

    if (
      currentValue.startsWith("mailto:") ||
      currentValue.startsWith("tel:") ||
      currentValue.startsWith("#") ||
      normalizeInternalPageHref(currentValue) !== null
    ) {
      updateSectionCollectionField(controlId, index, fieldKey, "");
    }
  }

  function addSectionCollectionItem(controlId: string) {
    const control = sectionControls.find(
      (entry): entry is SectionCollectionControl => entry.id === controlId && entry.type === "collection",
    );
    if (!control) return;
    applySectionCollectionItems(controlId, [
      ...control.items,
      createCollectionItem(control.fields, control.items.length),
    ]);
  }

  function duplicateSectionCollectionItem(controlId: string, index: number) {
    const control = sectionControls.find(
      (entry): entry is SectionCollectionControl => entry.id === controlId && entry.type === "collection",
    );
    const source = control?.items[index];
    if (!control || !source) return;
    const nextItems = [...control.items];
    nextItems.splice(index + 1, 0, createCollectionItem(control.fields, index + 1, source));
    applySectionCollectionItems(controlId, nextItems);
  }

  function removeSectionCollectionItem(controlId: string, index: number) {
    const control = sectionControls.find(
      (entry): entry is SectionCollectionControl => entry.id === controlId && entry.type === "collection",
    );
    if (!control || control.items.length <= 1) return;
    applySectionCollectionItems(controlId, control.items.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateSectionMediaControl(controlId: string, patch: Partial<Pick<SectionMediaControl, "src" | "alt">>) {
    const control = sectionControls.find(
      (entry): entry is SectionMediaControl => entry.id === controlId && entry.type === "media",
    );
    if (!control) return;

    const nextControl = { ...control, ...patch };
    setSectionControls((current) => current.map((entry) =>
      entry.id === controlId && entry.type === "media"
        ? nextControl
        : entry
    ));

    if (Object.prototype.hasOwnProperty.call(patch, "src")) {
      send("apply-attr", { attr: "src", value: nextControl.src, nodeId: control.nodeId });
    }
    if (Object.prototype.hasOwnProperty.call(patch, "alt")) {
      send("apply-attr", { attr: "alt", value: nextControl.alt, nodeId: control.nodeId });
    }
  }

  function closeMediaPicker() {
    setMediaPickerTarget(null);
    setWidgetImagePicker(null);
    setSectionWidgetImagePicker(null);
    setSectionMediaPicker(null);
    setSectionCollectionImagePicker(null);
  }

  const mediaPickerKinds: ProjectMediaAsset["kind"][] = mediaPickerTarget === "video" ? ["video"] : ["image"];
  const mediaPickerSelectedUrls =
    mediaPickerTarget === "image"
      ? (imgUrl ? [imgUrl] : [])
      : mediaPickerTarget === "video"
      ? (imgUrl ? [imgUrl] : [])
      : mediaPickerTarget === "widget-image"
      ? (() => {
          const value = widgetImagePicker ? widgetDraft[widgetImagePicker.fieldKey] : "";
          return value ? [value] : [];
        })()
      : mediaPickerTarget === "section-widget-image"
      ? (() => {
          const control = sectionControls.find(
            (entry): entry is SectionWidgetControl => entry.type === "widget" && entry.id === sectionWidgetImagePicker?.controlId,
          );
          const value = control?.state?.[sectionWidgetImagePicker?.fieldKey ?? ""];
          return value ? [value] : [];
        })()
      : mediaPickerTarget === "section-control-image"
      ? (() => {
          const control = sectionControls.find(
            (entry): entry is SectionMediaControl => entry.type === "media" && entry.id === sectionMediaPicker?.controlId,
          );
          return control?.src ? [control.src] : [];
        })()
      : mediaPickerTarget === "section-control-collection-image"
      ? (() => {
          const control = sectionControls.find(
            (entry): entry is SectionCollectionControl => entry.type === "collection" && entry.id === sectionCollectionImagePicker?.controlId,
          );
          const value =
            control?.items[sectionCollectionImagePicker?.itemIndex ?? -1]?.fields?.[sectionCollectionImagePicker?.fieldKey ?? ""];
          return value ? [value] : [];
        })()
      : mediaPickerTarget === "section-own-background"
      ? (localBgImage ? [localBgImage] : [])
      : mediaPickerTarget === "background"
      ? (localBgImage ? [localBgImage] : [])
      : mediaPickerTarget === "section-background"
      ? (localSecBgImage ? [localSecBgImage] : [])
      : logoItemsDraft.split("\n").map((item) => item.trim()).filter((item) => /^data:image\/|^https?:\/\//i.test(item));

  function applyMediaFromLibrary(assets: ProjectMediaAsset[]) {
    if (!assets.length) return;
    if (mediaPickerTarget === "image") {
      const next = assets[0].url;
      setImgUrl(next);
      sendMediaAttr("src", next);
      return;
    }
    if (mediaPickerTarget === "video") {
      const next = assets[0].url;
      setImgUrl(next);
      sendMediaAttr("src", next);
      return;
    }
    if (mediaPickerTarget === "widget-image") {
      const next = assets[0].url;
      if (widgetImagePicker) {
        updateWidgetField(widgetImagePicker.fieldKey, next);
      }
      return;
    }
    if (mediaPickerTarget === "section-widget-image") {
      const next = assets[0].url;
      if (sectionWidgetImagePicker) {
        updateSectionWidgetField(sectionWidgetImagePicker.controlId, sectionWidgetImagePicker.fieldKey, next);
      }
      return;
    }
    if (mediaPickerTarget === "section-control-image") {
      const next = assets[0].url;
      if (sectionMediaPicker) {
        updateSectionMediaControl(sectionMediaPicker.controlId, { src: next });
      }
      return;
    }
    if (mediaPickerTarget === "section-control-collection-image") {
      const next = assets[0].url;
      if (sectionCollectionImagePicker) {
        updateSectionCollectionField(
          sectionCollectionImagePicker.controlId,
          sectionCollectionImagePicker.itemIndex,
          sectionCollectionImagePicker.fieldKey,
          next,
        );
      }
      return;
    }
    if (mediaPickerTarget === "background") {
      const next = assets[0].url;
      setLocalBgImage(next);
      applyBgImage(next, localBgPos, localBgSize);
      return;
    }
    if (mediaPickerTarget === "section-own-background") {
      const next = assets[0].url;
      setLocalBgImage(next);
      if (sectionUsesVisualFallback) applySectionVisual(next, localBgPos, localBgSize);
      else applyBgImage(next, localBgPos, localBgSize);
      return;
    }
    if (mediaPickerTarget === "section-background") {
      const next = assets[0].url;
      setLocalSecBgImage(next);
      if (sectionUsesVisualFallback) applySectionVisual(next, localSecBgPos, localSecBgSize);
      else applySecBgImage(next, localSecBgPos, localSecBgSize);
      return;
    }
    const libraryUrls = new Set(mediaLibrary.map((asset) => asset.url));
    const mergedItems = [
      ...logoItemsDraft
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => !libraryUrls.has(item)),
      ...assets.map((asset) => asset.url),
    ];
    const mergedDraft = mergedItems.join("\n");
    setLogoItemsDraft(mergedDraft);
    applyLogoItems(mergedDraft);
  }

  function applyTextOpacity(percent: string, options?: { batch?: boolean }) {
    const parsed = parseFloat(percent);
    const alpha = Number.isNaN(parsed) ? textOpacityValue : Math.max(0, Math.min(1, parsed / 100));
    applyStyle("color", withAlpha(txtColor, alpha), options);
  }

  function applySectionVisual(url: string, pos?: string, size?: string) {
    if (!sectionVisualNodeId) return;
    const trimmed = url.trim();
    send("apply-attr", {
      attr: "src",
      value: trimmed || "",
      nodeId: sectionVisualNodeId,
    });
    const fit = size === "contain" ? "contain" : size === "fill" ? "fill" : "cover";
    send("apply-style", {
      prop: "objectFit",
      value: fit,
      nodeId: sectionVisualNodeId,
      batch: true,
    });
    send("apply-style", {
      prop: "objectPosition",
      value: pos || "center",
      nodeId: sectionVisualNodeId,
      batch: true,
    });
  }

  function applyAnimationConfig(next: {
    entrance?: string;
    hover?: string;
    duration?: string;
    delay?: string;
    ease?: string;
  }) {
    if (!node) return;
    const payload: Record<string, unknown> = {
      nodeId: node.animationTargetNodeId ?? node.nodeId,
      entranceNodeId: node.animationEntranceTargetNodeId ?? node.animationTargetNodeId ?? node.nodeId,
      hoverNodeId: node.animationHoverTargetNodeId ?? node.animationTargetNodeId ?? node.nodeId,
    };
    if (next.entrance !== undefined) payload.entrance = next.entrance;
    if (next.hover !== undefined) payload.hover = next.hover;
    if (next.duration !== undefined) payload.duration = next.duration;
    if (next.delay !== undefined) payload.delay = next.delay;
    if (next.ease !== undefined) payload.ease = next.ease;
    send("apply-animation", payload);
  }

  function previewAnimation(mode: "entrance" | "hover") {
    if (!node) return;
    send("preview-animation", {
      mode,
      nodeId: node.animationTargetNodeId ?? node.nodeId,
      entranceNodeId: node.animationEntranceTargetNodeId ?? node.animationTargetNodeId ?? node.nodeId,
      hoverNodeId: node.animationHoverTargetNodeId ?? node.animationTargetNodeId ?? node.nodeId,
      entrance: node.animationIn,
      hover: node.animationHover,
      duration: `${Math.max(0, Number(animDurationVal || "600"))}ms`,
      ease: node.animationEase || "cubic-bezier(0.22,1,0.36,1)",
    });
  }

  const responsiveAccordion = (
    <Accordion
      title="Responsive"
      icon={<Layers size={12} />}
      open={open.responsive}
      toggle={() => toggle("responsive")}
    >
      <div className="rounded-2xl border border-sky-400/14 bg-[linear-gradient(180deg,rgba(56,189,248,0.08),rgba(56,189,248,0.03))] p-3.5 space-y-3.5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold text-white/82">
              {devicePreview === "desktop" ? "Desktop base layer" : `Editing ${devicePreview} overrides`}
            </p>
            {devicePreview !== "desktop" && (
              <span className="rounded-full border border-sky-400/24 bg-sky-400/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-sky-200/82">
                {currentResponsiveCount} override{currentResponsiveCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <p className="text-[10px] leading-relaxed text-white/42">
            {devicePreview === "desktop"
              ? "Desktop remains the base layout. Tablet and mobile can override it safely without changing this layer."
              : "Changes now affect only this breakpoint. Reset individual properties below or clear the whole breakpoint when needed."}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {RESPONSIVE_DEVICE_OPTIONS.map((option) => {
            const hasOverrides =
              option.value === "tablet"
                ? node.responsiveHasTabletOverrides
                : option.value === "mobile"
                  ? node.responsiveHasMobileOverrides
                  : false;
            const isActive = devicePreview === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setDevicePreview(option.value)}
                className={`rounded-xl border px-2 py-2.5 text-left transition-all ${
                  isActive
                    ? "border-sky-400/26 bg-sky-400/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    : "border-white/[0.08] bg-white/[0.03] text-white/56 hover:border-white/[0.16] hover:text-white/82"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white/72">{option.icon}</span>
                  {hasOverrides && (
                    <span className="h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_0_4px_rgba(56,189,248,0.12)] flex-shrink-0" />
                  )}
                </div>
                <div className="mt-2 text-[10px] font-semibold">{option.label}</div>
                <div className="mt-0.5 text-[9px] text-white/28">{option.short}</div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/46">
            Desktop base
          </span>
          <span
            className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${
              node.responsiveHasTabletOverrides
                ? "border-sky-400/30 bg-sky-400/12 text-sky-200/85"
                : "border-white/[0.08] bg-white/[0.03] text-white/28"
            }`}
          >
            Tablet
          </span>
          <span
            className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${
              node.responsiveHasMobileOverrides
                ? "border-sky-400/30 bg-sky-400/12 text-sky-200/85"
                : "border-white/[0.08] bg-white/[0.03] text-white/28"
            }`}
          >
            Mobile
          </span>
        </div>

        {devicePreview !== "desktop" && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold text-white/70">Current breakpoint properties</p>
              <span className="text-[9px] text-white/28">{currentResponsiveCount} active</span>
            </div>
            {currentResponsiveProps.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {currentResponsiveProps.map((prop) => {
                  const scope: "node" | "media" | "list" =
                    ["objectFit", "objectPosition"].includes(prop) ? "media" :
                    ["listStyleType", "listStylePosition"].includes(prop) ? "list" :
                    "node";
                  return (
                    <button
                      key={prop}
                      onClick={() => resetResponsiveProp([prop], scope)}
                      title={`Reset ${prop} override`}
                      className="group flex items-center gap-1 rounded-full border border-white/[0.08] bg-black/20 px-2 py-1 text-[9px] font-medium text-white/58 hover:border-rose-400/30 hover:bg-rose-400/8 hover:text-rose-300/80 transition-all"
                    >
                      <span>{responsivePropLabel(prop)}</span>
                      <X size={8} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] leading-relaxed text-white/28">
                No overrides yet for {devicePreview}. Adjust any responsive-aware control and it will appear here.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setCurrentVisibility(true)}
            className={`rounded-xl border py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-all ${
              node.display !== "none"
                ? "border-emerald-400/26 bg-emerald-400/12 text-emerald-200"
                : "border-white/[0.08] bg-white/[0.03] text-white/54 hover:border-white/[0.16] hover:text-white/80"
            }`}
          >
            Show on {devicePreview}
          </button>
          <button
            onClick={() => setCurrentVisibility(false)}
            className={`rounded-xl border py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-all ${
              node.display === "none"
                ? "border-rose-400/26 bg-rose-400/12 text-rose-200"
                : "border-white/[0.08] bg-white/[0.03] text-white/54 hover:border-white/[0.16] hover:text-white/80"
            }`}
          >
            Hide on {devicePreview}
          </button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-1.5">
            {(["desktop", "tablet", "mobile"] as const).map((device) => (
              <button
                key={device}
                onClick={() => setExclusiveVisibility(device)}
                className={`rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
                  devicePreview === device
                    ? "bg-[#5B8CFF]/12 text-[#5B8CFF]"
                    : "bg-white/[0.03] text-white/45 hover:bg-white/[0.06] hover:text-white/70"
                }`}
              >
                Only {device}
              </button>
            ))}
          </div>
        </div>

        {devicePreview !== "desktop" && (
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={copyDesktopToBreakpoint}
              className="rounded-lg bg-sky-400/[0.07] border border-sky-400/[0.14] py-2 text-[10px] font-medium text-sky-200/70 transition-colors hover:bg-sky-400/[0.12] hover:text-sky-200/90"
            >
              Copy desktop → {devicePreview}
            </button>
            <button
              onClick={clearResponsiveOverrides}
              disabled={!node.responsiveHasCurrentOverrides}
              className="rounded-lg bg-white/[0.04] py-2 text-[10px] font-medium text-white/50 transition-colors hover:bg-white/[0.07] hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Reset {devicePreview}
            </button>
          </div>
        )}
      </div>
    </Accordion>
  );

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-1">
        {/* ── Link ── */}
        {showLinkPanel && (
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
                  // "none": remove the href entirely (null = removeAttribute) so non-anchors aren't converted to <a>
                  if (val === "none")   { setLinkUrl(""); send("apply-attr", { attr: "href", value: null, nodeId: linkTargetNodeId }); }
                  if (val === "email")  { setLinkUrl("mailto:"); send("apply-attr", { attr: "href", value: "mailto:", nodeId: linkTargetNodeId }); }
                  if (val === "phone")  { setLinkUrl("tel:"); send("apply-attr", { attr: "href", value: "tel:", nodeId: linkTargetNodeId }); }
                  // "anchor"/"page": just update UI state — don't send any href yet; only apply when user picks
                  if (val === "anchor") { setLinkUrl(""); }
                  if (val === "page")   { setLinkUrl(""); }
                }}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                    linkType === val
                      ? "bg-[#5B8CFF]/12 text-[#5B8CFF] border-[#5B8CFF]/20"
                      : "text-white/35 border-white/[0.06] hover:border-white/[0.12] hover:text-white/60"
                  }`}>
                  {icon} {label}
                </button>
              ))}
            </div>

            {/* Page picker */}
            {linkType === "page" && project?.pages && project.pages.length > 0 && (
              <div className="space-y-0.5 max-h-40 overflow-auto rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
                {project.pages.map((p) => {
                  const href = pageHrefFor(p);
                  const isSel = (normalizeInternalPageHref(linkUrl) ?? linkUrl) === href;
                  return (
                    <button key={p.id} type="button"
                      onClick={() => { setLinkUrl(href); send("apply-attr", { attr: "href", value: href, nodeId: linkTargetNodeId }); }}
                      className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] transition-all text-left ${
                        isSel ? "bg-[#5B8CFF]/12 text-[#5B8CFF]" : "text-white/45 hover:bg-white/[0.04] hover:text-white/75"
                      }`}>
                      <FileText size={9} className="flex-shrink-0 opacity-50" />
                      <span className="truncate">{p.name}</span>
                      {isSel && <span className="ml-auto text-[9px] text-accent-400/60 flex-shrink-0">selected</span>}
                    </button>
                  );
                })}
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
                        onClick={() => { setLinkUrl(anchorVal); send("apply-attr", { attr: "href", value: anchorVal, nodeId: linkTargetNodeId }); }}
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
                  onBlur={() => send("apply-attr", { attr: "href", value: linkUrl, nodeId: linkTargetNodeId })}
                  onKeyDown={(e) => e.key === "Enter" && send("apply-attr", { attr: "href", value: linkUrl, nodeId: linkTargetNodeId })}
                  placeholder="https://example.com"
                  className="editor-plain-input flex-1 bg-transparent text-[11px] text-white/60 placeholder-white/18 focus:outline-none min-w-0"
                />
              </div>
            )}

            {/* Email input */}
            {linkType === "email" && (
              <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5">
                <Mail size={10} className="text-white/25 flex-shrink-0" />
                <input value={linkUrl.replace("mailto:", "")}
                  onChange={(e) => setLinkUrl("mailto:" + e.target.value)}
                  onBlur={() => send("apply-attr", { attr: "href", value: linkUrl, nodeId: linkTargetNodeId })}
                  onKeyDown={(e) => e.key === "Enter" && send("apply-attr", { attr: "href", value: linkUrl, nodeId: linkTargetNodeId })}
                  placeholder="hello@example.com"
                  className="editor-plain-input flex-1 bg-transparent text-[11px] text-white/60 placeholder-white/18 focus:outline-none min-w-0"
                />
              </div>
            )}

            {/* Phone input */}
            {linkType === "phone" && (
              <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5">
                <Phone size={10} className="text-white/25 flex-shrink-0" />
                <input value={linkUrl.replace("tel:", "")}
                  onChange={(e) => setLinkUrl("tel:" + e.target.value)}
                  onBlur={() => send("apply-attr", { attr: "href", value: linkUrl, nodeId: linkTargetNodeId })}
                  onKeyDown={(e) => e.key === "Enter" && send("apply-attr", { attr: "href", value: linkUrl, nodeId: linkTargetNodeId })}
                  placeholder="+1 555 000 0000"
                  className="editor-plain-input flex-1 bg-transparent text-[11px] text-white/60 placeholder-white/18 focus:outline-none min-w-0"
                />
              </div>
            )}

            {/* Visit page button */}
            {linkType === "page" && (() => {
              const normalized = linkUrl === "//" ? "/" : (normalizeInternalPageHref(linkUrl) ?? linkUrl);
              const targetPage = (project?.pages ?? []).find(p => pageHrefFor(p) === normalized);
              return targetPage ? (
                <button onClick={() => selectPage(targetPage.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-medium border border-[#5B8CFF]/20 text-[#5B8CFF] hover:bg-[#5B8CFF]/10 transition-all">
                  <FileText size={9} /> Go to {targetPage.name} page
                </button>
              ) : null;
            })()}

            {/* Open in new tab */}
            {(linkType === "url" || linkType === "page") && (
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[10px] text-white/35">Open in new tab</span>
                <EditorSwitch
                  checked={node.target === "_blank"}
                  onChange={() => send("apply-attr", { attr: "target", value: node.target === "_blank" ? "_self" : "_blank", nodeId: linkTargetNodeId })}
                  title={node.target === "_blank" ? "Open in new tab on" : "Open in new tab off"}
                />
              </label>
            )}
          </Accordion>
        )}

        {/* ── AI Quick Actions ── */}
        {activeSectionId && (
          <div className="rounded-[18px] border border-[rgba(91,140,255,0.12)] bg-[rgba(91,140,255,0.04)] px-3 py-3">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8faeff]/70">
              <Wand2 size={10} />
              AI Quick Actions
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Rewrite copy", prompt: `Rewrite the copy in section "${activeSectionMeta?.name ?? activeSectionId}" to be more compelling and specific.` },
                { label: "Change layout", prompt: `Change the layout variant of section "${activeSectionMeta?.name ?? activeSectionId}" to a different style.` },
                { label: "Make bolder", prompt: `Make section "${activeSectionMeta?.name ?? activeSectionId}" more visually bold — bigger headings, stronger colors, more contrast.` },
                { label: "Simplify", prompt: `Simplify section "${activeSectionMeta?.name ?? activeSectionId}" — reduce visual clutter, fewer elements, cleaner spacing.` },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    if (!rightSidebarOpen) toggleRightSidebar();
                    setRightPanel("ai");
                    useAppStore.getState().setAiDraftPrompt(action.prompt);
                  }}
                  className="rounded-full border border-[rgba(91,140,255,0.18)] bg-[rgba(91,140,255,0.08)] px-2.5 py-1 text-[10.5px] font-medium text-[#b4c8ff] transition-colors hover:bg-[rgba(91,140,255,0.16)] hover:text-white"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Section Controls ── */}
        {showSectionControlsPanel && (
          <Accordion
            title={`${node?.sectionName || activeSectionMeta?.name || node?.label || "Section"} Controls`}
            icon={<Layers size={12} />}
            open={open.sectionControls}
            toggle={() => toggle("sectionControls")}
          >
            <div className="space-y-3">
              {sectionControlsLoading && (
                <SectionControlCard
                  tone="neutral"
                  icon={<Layers size={15} />}
                  title="Loading structured controls"
                  meta="Preparing linked fields and editable section content."
                >
                  <div className={`${SECTION_CONTROL_ITEM} space-y-2.5 animate-pulse`}>
                    <div className="h-2.5 w-24 rounded-full bg-white/[0.08]" />
                    <div className="h-10 rounded-[14px] bg-white/[0.05]" />
                    <div className="h-10 rounded-[14px] bg-white/[0.05]" />
                  </div>
                </SectionControlCard>
              )}

              {!sectionControlsLoading && sectionControls.length === 0 && (
                <SectionControlCard
                  tone="neutral"
                  icon={<Layers size={15} />}
                  title="No structured settings detected"
                  meta="This section still supports style editing, but it does not expose shared fields or repeatable item groups yet."
                >
                  <div className={SECTION_CONTROL_EMPTY_STATE}>
                    <span className={sectionControlBadgeClass("neutral")}>Style-only section</span>
                    <p className="max-w-[220px] text-[10px] leading-5 text-[var(--text-tertiary)]">
                      When a section exposes structured data, it will show up here as editable fields, media, or repeatable items.
                    </p>
                  </div>
                </SectionControlCard>
              )}

              {!sectionControlsLoading && sectionControls.map((control) => {
                if (control.type === "media") {
                  const previewAlt = control.alt || control.label || "Section image";
                  return (
                    <SectionControlCard
                      key={control.id}
                      tone="media"
                      icon={<ImageIcon size={15} />}
                      title={control.label}
                      meta="Direct image control for this section."
                      badge={<span className={sectionControlBadgeClass("media")}>Image</span>}
                    >
                      <div className={SECTION_CONTROL_PREVIEW}>
                        {control.src ? (
                          <img
                            src={control.src}
                            alt={previewAlt}
                            className="h-28 w-full object-cover"
                            onError={(event) => {
                              (event.currentTarget as HTMLImageElement).style.opacity = "0.2";
                            }}
                          />
                        ) : (
                          <div className={`${SECTION_CONTROL_EMPTY_STATE} min-h-[128px] rounded-none border-0 bg-transparent px-5`}>
                            <ImageIcon size={14} />
                            No image selected yet
                          </div>
                        )}
                      </div>

                      <div className={`${SECTION_CONTROL_ITEM} space-y-2.5`}>
                        <div className="space-y-1.5">
                          <Label>{control.label} URL</Label>
                          <input
                            type="text"
                            value={control.src}
                            onFocus={() => setActiveField(`section-media:${control.id}:src`)}
                            onChange={(e) => updateSectionMediaControl(control.id, { src: e.target.value })}
                            onBlur={() => setActiveField((current) => (current === `section-media:${control.id}:src` ? null : current))}
                            placeholder="https://example.com/image.jpg"
                            className={PANEL_INPUT}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Alt text</Label>
                          <input
                            type="text"
                            value={control.alt}
                            onFocus={() => setActiveField(`section-media:${control.id}:alt`)}
                            onChange={(e) => updateSectionMediaControl(control.id, { alt: e.target.value })}
                            onBlur={() => setActiveField((current) => (current === `section-media:${control.id}:alt` ? null : current))}
                            placeholder="Describe this image..."
                            className={PANEL_INPUT}
                          />
                        </div>

                        <div className="flex items-center justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSectionCollectionImagePicker(null);
                              setSectionMediaPicker({ controlId: control.id });
                              setMediaPickerTarget("section-control-image");
                            }}
                            className={PANEL_BUTTON_SECONDARY}
                          >
                            Media gallery
                          </button>
                        </div>
                      </div>
                    </SectionControlCard>
                  );
                }

                if (control.type === "widget") {
                  return (
                    <div key={control.id} className={SECTION_CONTROL_PANEL}>
                      <div className="space-y-2.5">
                        {control.fields.map((field) => {
                          const value = control.state[field.key] ?? "";
                          const focusKey = `section-widget:${control.id}:${field.key}`;
                          const placeholder =
                            field.placeholder ||
                            (field.type === "image"
                              ? "https://example.com/logo.svg"
                              : field.type === "datetime-local"
                              ? "YYYY-MM-DDTHH:mm"
                              : `Edit ${field.label.toLowerCase()}...`);

                          if (field.type === "image") {
                            return (
                              <div key={field.key} className={SECTION_CONTROL_FIELD_SHELL}>
                                <Label>{field.label} URL</Label>
                                {value ? (
                                  <div className={SECTION_CONTROL_PREVIEW}>
                                    <img
                                      src={value}
                                      alt={control.state.brandAlt || control.state.brand || field.label}
                                      className="h-24 w-full object-contain bg-[var(--surface-3)] px-4 py-3"
                                      onError={(event) => {
                                        (event.currentTarget as HTMLImageElement).style.opacity = "0.2";
                                      }}
                                    />
                                  </div>
                                ) : null}
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={value}
                                    onFocus={() => setActiveField(focusKey)}
                                    onChange={(e) => updateSectionWidgetField(control.id, field.key, e.target.value)}
                                    onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                                    placeholder={placeholder}
                                    className={PANEL_INPUT}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setWidgetImagePicker(null);
                                      setSectionMediaPicker(null);
                                      setSectionCollectionImagePicker(null);
                                      setSectionWidgetImagePicker({ controlId: control.id, fieldKey: field.key });
                                      setMediaPickerTarget("section-widget-image");
                                    }}
                                    className={`${PANEL_BUTTON_SECONDARY} shrink-0 whitespace-nowrap`}
                                  >
                                    Media gallery
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          if (field.type === "textarea") {
                            return (
                              <div key={field.key} className={SECTION_CONTROL_FIELD_SHELL}>
                                <Label>{field.label}</Label>
                                <textarea
                                  value={value}
                                  rows={Math.min(6, Math.max(3, value.split("\n").length || 3))}
                                  onFocus={() => setActiveField(focusKey)}
                                  onChange={(e) => updateSectionWidgetField(control.id, field.key, e.target.value)}
                                  onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                                  placeholder={placeholder}
                                  className={PANEL_TEXTAREA}
                                />
                              </div>
                            );
                          }

                          return (
                            <div key={field.key} className="space-y-1.5">
                              <Label>{field.label}</Label>
                              <input
                                type={field.type === "number" || field.type === "datetime-local" ? field.type : "text"}
                                value={value}
                                min={field.type === "number" ? field.min : undefined}
                                max={field.type === "number" ? field.max : undefined}
                                step={field.type === "number" ? field.step ?? 1 : undefined}
                                onFocus={() => setActiveField(focusKey)}
                                onChange={(e) => updateSectionWidgetField(control.id, field.key, e.target.value)}
                                onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                                placeholder={placeholder}
                                className={PANEL_INPUT}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                const compactGrid =
                  control.fields.length > 2 &&
                  control.fields.every((field) => field.type !== "textarea" && field.type !== "list");

                return (
                  <SectionControlCard
                    key={control.id}
                    tone="collection"
                    title={shouldHideSectionControlTitle(control.label) ? undefined : control.label}
                  >

                    <div className="space-y-3">
                      {control.items.map((item, index) => (
                        <div key={item.id || `${control.nodeId}-${index}`} className={COLLECTION_ITEM_PANEL}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <p className={COLLECTION_ITEM_EYEBROW}>Item {formatCollectionItemIndex(index)}</p>
                              <p className={COLLECTION_ITEM_HEADING}>{getCollectionItemHeading(control.fields, item)}</p>
                            </div>

                            {!control.fixed ? (
                              <div className={`${SECTION_CONTROL_ACTIONS} justify-end`}>
                                <div className={SECTION_CONTROL_ACTION_BAR}>
                                  <button
                                    type="button"
                                    onClick={() => duplicateSectionCollectionItem(control.id, index)}
                                    className={SECTION_CONTROL_ACTION_ICON}
                                    title="Duplicate item"
                                    aria-label={`Duplicate item ${index + 1}`}
                                  >
                                    <Copy size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeSectionCollectionItem(control.id, index)}
                                    disabled={control.items.length <= 1}
                                    className={SECTION_CONTROL_ACTION_ICON_DANGER}
                                    title="Remove item"
                                    aria-label={`Remove item ${index + 1}`}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div className={compactGrid ? "grid grid-cols-2 gap-2.5" : "space-y-2.5"}>
                            {control.fields.map((field) => {
                              const itemId = item.id || `item-${index + 1}`;
                              const value = item.fields?.[field.key] ?? "";
                              const focusKey = `section-collection:${control.id}:${index}:${field.key}`;
                              const isLinkField = isCollectionLinkField(field);
                              const currentLinkType =
                                sectionCollectionLinkTypes[
                                  sectionCollectionLinkTypeStateKey(control.id, itemId, field.key)
                                ] ?? inferLinkTypeFromValue(value);
                              const labelText = field.type === "image" ? `${field.label} URL` : field.label;
                              const fieldClassName = collectionFieldSpansFullRow(field, compactGrid) ? "col-span-2" : "";
                              const placeholder =
                                field.placeholder ||
                                (field.type === "image"
                                  ? "https://example.com/image.jpg"
                                  : field.type === "list"
                                  ? "One item per line"
                                  : `Edit ${field.label.toLowerCase()}...`);

                              if (field.type === "textarea" || field.type === "list") {
                                return (
                                  <div key={field.key} className={`${SECTION_CONTROL_FIELD_SHELL} ${fieldClassName}`.trim()}>
                                    <Label>{labelText}</Label>
                                    <textarea
                                      value={value}
                                      rows={Math.min(7, Math.max(3, value.split("\n").length || 3))}
                                      onFocus={() => setActiveField(focusKey)}
                                      onChange={(e) => updateSectionCollectionField(control.id, index, field.key, e.target.value)}
                                      onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                                      placeholder={placeholder}
                                      className={PANEL_TEXTAREA}
                                    />
                                    {field.type === "list" && (
                                      <p className="text-[9px] text-[var(--text-disabled)]">Use one line per item.</p>
                                    )}
                                  </div>
                                );
                              }

                              if (isLinkField) {
                                return (
                                  <div key={field.key} className={`${SECTION_CONTROL_FIELD_SHELL} ${fieldClassName}`.trim()}>
                                    <Label>{field.label}</Label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                      {[
                                        { val: "page" as const, label: "Page", icon: <FileText size={11} /> },
                                        { val: "anchor" as const, label: "Section", icon: <Anchor size={11} /> },
                                        { val: "url" as const, label: "URL", icon: <Globe size={11} /> },
                                        { val: "email" as const, label: "Email", icon: <Mail size={11} /> },
                                        { val: "phone" as const, label: "Phone", icon: <Phone size={11} /> },
                                        { val: "none" as const, label: "None", icon: <X size={11} /> },
                                      ].map(({ val, label, icon }) => {
                                        const active = currentLinkType === val;
                                        return (
                                          <button
                                            key={val}
                                            type="button"
                                            onClick={() => setSectionCollectionLinkType(control.id, index, itemId, field.key, val)}
                                            className={`inline-flex items-center justify-center gap-1.5 rounded-[14px] border px-2.5 py-2 text-[10px] font-medium transition-all ${
                                              active
                                                ? "border-[#5B8CFF]/22 bg-[#5B8CFF]/10 text-[#8EA8FF]"
                                                : "border-[var(--border-soft)] bg-[var(--surface-4)] text-[var(--text-tertiary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                                            }`}
                                          >
                                            {icon}
                                            {label}
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {currentLinkType === "page" && (
                                      project?.pages && project.pages.length > 0 ? (
                                        <select
                                          value={normalizeInternalPageHref(value) ?? ""}
                                          onFocus={() => setActiveField(focusKey)}
                                          onChange={(e) => updateSectionCollectionField(control.id, index, field.key, e.target.value)}
                                          onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                                          className={PANEL_SELECT}
                                        >
                                          <option value="">Choose page</option>
                                          {project.pages.map((p) => (
                                            <option key={`${control.id}:${itemId}:${field.key}:${p.id}`} value={pageHrefFor(p)}>
                                              {p.name}
                                            </option>
                                          ))}
                                        </select>
                                      ) : <p className="px-1 text-[10px] text-[var(--text-disabled)]">No pages in this project.</p>
                                    )}

                                    {currentLinkType === "anchor" && (
                                      currentPage && currentPage.sections.length > 0 ? (
                                        <select
                                          value={value.startsWith("#") ? value : ""}
                                          onFocus={() => setActiveField(focusKey)}
                                          onChange={(e) => updateSectionCollectionField(control.id, index, field.key, e.target.value)}
                                          onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                                          className={PANEL_SELECT}
                                        >
                                          <option value="">Choose section</option>
                                          {currentPage.sections.map((sec) => (
                                            <option key={`${control.id}:${itemId}:${field.key}:${sec.id}`} value={`#${sec.id}`}>
                                              {sec.name || sec.type}
                                            </option>
                                          ))}
                                        </select>
                                      ) : <p className="px-1 text-[10px] text-[var(--text-disabled)]">No sections on this page.</p>
                                    )}

                                    {currentLinkType === "url" && (
                                      <input
                                        value={value}
                                        onFocus={() => setActiveField(focusKey)}
                                        onChange={(e) => updateSectionCollectionField(control.id, index, field.key, e.target.value)}
                                        onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                                        placeholder="https://example.com"
                                        className={PANEL_INPUT}
                                      />
                                    )}

                                    {currentLinkType === "email" && (
                                      <input
                                        value={value.replace("mailto:", "")}
                                        onFocus={() => setActiveField(focusKey)}
                                        onChange={(e) => updateSectionCollectionField(control.id, index, field.key, `mailto:${e.target.value}`)}
                                        onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                                        placeholder="hello@example.com"
                                        className={PANEL_INPUT}
                                      />
                                    )}

                                    {currentLinkType === "phone" && (
                                      <input
                                        value={value.replace("tel:", "")}
                                        onFocus={() => setActiveField(focusKey)}
                                        onChange={(e) => updateSectionCollectionField(control.id, index, field.key, `tel:${e.target.value}`)}
                                        onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                                        placeholder="+1 555 000 0000"
                                        className={PANEL_INPUT}
                                      />
                                    )}
                                  </div>
                                );
                              }

                              if (field.type === "image") {
                                return (
                                  <div key={field.key} className={`${SECTION_CONTROL_FIELD_SHELL} ${fieldClassName}`.trim()}>
                                    <Label>{labelText}</Label>
                                    {value ? (
                                      <div className={SECTION_CONTROL_PREVIEW}>
                                        <img
                                          src={value}
                                          alt={field.label}
                                          className="h-24 w-full object-cover"
                                          onError={(event) => {
                                            (event.currentTarget as HTMLImageElement).style.opacity = "0.2";
                                          }}
                                        />
                                      </div>
                                    ) : null}
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={value}
                                        onFocus={() => setActiveField(focusKey)}
                                        onChange={(e) => updateSectionCollectionField(control.id, index, field.key, e.target.value)}
                                        onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                                        placeholder={placeholder}
                                        className={PANEL_INPUT}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSectionMediaPicker(null);
                                          setSectionCollectionImagePicker({
                                            controlId: control.id,
                                            itemIndex: index,
                                            fieldKey: field.key,
                                          });
                                          setMediaPickerTarget("section-control-collection-image");
                                        }}
                                        className={`${PANEL_BUTTON_SECONDARY} shrink-0 whitespace-nowrap`}
                                      >
                                        Media gallery
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div key={field.key} className={fieldClassName ? `${fieldClassName} space-y-1.5` : "space-y-1.5"}>
                                  <Label>{labelText}</Label>
                                  <input
                                    type="text"
                                    value={value}
                                    onFocus={() => setActiveField(focusKey)}
                                    onChange={(e) => updateSectionCollectionField(control.id, index, field.key, e.target.value)}
                                    onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                                    placeholder={placeholder}
                                    className={PANEL_INPUT}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {!control.fixed ? (
                        <button
                          type="button"
                          onClick={() => addSectionCollectionItem(control.id)}
                          className={COLLECTION_ADD_BUTTON}
                          aria-label={`Add item to ${control.label}`}
                        >
                          <Plus size={12} />
                          Add item
                        </button>
                      ) : null}
                    </div>
                  </SectionControlCard>
                );
              })}
            </div>
          </Accordion>
        )}

        {/* ── Content ── */}
        {showStandaloneWidgetPanel && widgetFields.length > 0 && (
          <Accordion title={widgetLabel} icon={<Square size={12} />} open={open.widget} toggle={() => toggle("widget")}>
            <div className="space-y-3">
              <div className="space-y-2.5">
                {widgetFields.map((field) => {
                  const value = widgetDraft[field.key] ?? "";
                  const focusKey = `widget:${field.key}`;
                  const isCountdownTarget = node?.widgetKind === "countdown" && field.key === "targetDate";
                  const isLinkField = isWidgetLinkField(field);
                  const widgetLinkType = widgetLinkTypes[field.key] ?? inferLinkTypeFromValue(value);
                  const placeholder =
                    field.placeholder ||
                    (field.type === "image"
                      ? "https://example.com/logo.svg"
                      : isCountdownTarget
                      ? "Select a date"
                      : `Edit ${field.label.toLowerCase()}…`);

                  if (field.type === "image") {
                    return (
                      <div key={field.key} className="space-y-2">
                        <Label>{field.label} URL</Label>
                        {value ? (
                          <div className={`${PANEL_CARD} overflow-hidden p-0`}>
                            <img
                              src={value}
                              alt={widgetDraft.brandAlt || widgetDraft.brand || field.label}
                              className="h-24 w-full object-contain bg-[var(--surface-3)] px-4 py-3"
                              onError={(event) => {
                                (event.currentTarget as HTMLImageElement).style.opacity = "0.2";
                              }}
                            />
                          </div>
                        ) : null}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={value}
                            onFocus={() => setActiveField(focusKey)}
                            onChange={(e) => updateWidgetField(field.key, e.target.value)}
                            onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                            placeholder={placeholder}
                            className={PANEL_INPUT}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSectionWidgetImagePicker(null);
                              setSectionMediaPicker(null);
                              setSectionCollectionImagePicker(null);
                              setWidgetImagePicker({ fieldKey: field.key });
                              setMediaPickerTarget("widget-image");
                            }}
                            className={`${PANEL_BUTTON_SECONDARY} shrink-0 whitespace-nowrap`}
                          >
                            Media gallery
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (isLinkField) {
                    return (
                      <div key={field.key} className="space-y-2">
                        <Label>{field.label}</Label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { val: "page" as const, label: "Page", icon: <FileText size={11} /> },
                            { val: "anchor" as const, label: "Section", icon: <Anchor size={11} /> },
                            { val: "url" as const, label: "URL", icon: <Globe size={11} /> },
                            { val: "email" as const, label: "Email", icon: <Mail size={11} /> },
                            { val: "phone" as const, label: "Phone", icon: <Phone size={11} /> },
                            { val: "none" as const, label: "None", icon: <X size={11} /> },
                          ].map(({ val, label, icon }) => {
                            const active = widgetLinkType === val;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setWidgetLinkType(field.key, val)}
                                className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[10px] font-medium transition-all ${
                                  active
                                    ? "border-[#5B8CFF]/20 bg-[#5B8CFF]/12 text-[#5B8CFF]"
                                    : "border-white/[0.08] bg-white/[0.03] text-white/42 hover:border-white/[0.14] hover:text-white/72"
                                }`}
                              >
                                {icon}
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        {widgetLinkType === "page" && project?.pages && project.pages.length > 0 && (
                          <div className="space-y-0.5 max-h-36 overflow-auto rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
                            {project.pages.map((p) => {
                              const href = pageHrefFor(p);
                              const isSel = (normalizeInternalPageHref(value) ?? value) === href;
                              return (
                                <button
                                  key={`${field.key}:${p.id}`}
                                  type="button"
                                  onClick={() => updateWidgetField(field.key, href)}
                                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-all ${
                                    isSel ? "bg-[#5B8CFF]/12 text-[#5B8CFF]" : "text-white/45 hover:bg-white/[0.04] hover:text-white/75"
                                  }`}
                                >
                                  <FileText size={9} className="flex-shrink-0 opacity-50" />
                                  <span className="truncate">{p.name}</span>
                                  {isSel && <span className="ml-auto flex-shrink-0 text-[9px] text-accent-400/60">selected</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {widgetLinkType === "anchor" && (
                          currentPage && currentPage.sections.length > 0 ? (
                            <div className="space-y-0.5 max-h-36 overflow-auto rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
                              {currentPage.sections.map((sec) => {
                                const anchorVal = `#${sec.id}`;
                                const isSelected = value === anchorVal;
                                return (
                                  <button
                                    key={`${field.key}:${sec.id}`}
                                    type="button"
                                    onClick={() => updateWidgetField(field.key, anchorVal)}
                                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-all ${
                                      isSelected ? "bg-teal-500/15 text-teal-300" : "text-white/45 hover:bg-white/[0.04] hover:text-white/75"
                                    }`}
                                  >
                                    <Anchor size={9} className="flex-shrink-0 opacity-50" />
                                    <span className="truncate">{sec.name || sec.type}</span>
                                    {isSelected && <span className="ml-auto text-[9px] text-teal-400/60">selected</span>}
                                  </button>
                                );
                              })}
                            </div>
                          ) : <p className="px-1 text-[10px] text-white/25">No sections on this page.</p>
                        )}

                        {widgetLinkType === "url" && (
                          <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.05] px-2 py-1.5">
                            <Globe size={10} className="flex-shrink-0 text-white/25" />
                            <input
                              value={value}
                              onFocus={() => setActiveField(focusKey)}
                              onChange={(e) => updateWidgetField(field.key, e.target.value)}
                              onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                              placeholder="https://example.com"
                              className="editor-plain-input min-w-0 flex-1 bg-transparent text-[11px] text-white/60 placeholder-white/18 focus:outline-none"
                            />
                          </div>
                        )}

                        {widgetLinkType === "email" && (
                          <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.05] px-2 py-1.5">
                            <Mail size={10} className="flex-shrink-0 text-white/25" />
                            <input
                              value={value.replace("mailto:", "")}
                              onFocus={() => setActiveField(focusKey)}
                              onChange={(e) => updateWidgetField(field.key, `mailto:${e.target.value}`)}
                              onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                              placeholder="hello@example.com"
                              className="editor-plain-input min-w-0 flex-1 bg-transparent text-[11px] text-white/60 placeholder-white/18 focus:outline-none"
                            />
                          </div>
                        )}

                        {widgetLinkType === "phone" && (
                          <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.05] px-2 py-1.5">
                            <Phone size={10} className="flex-shrink-0 text-white/25" />
                            <input
                              value={value.replace("tel:", "")}
                              onFocus={() => setActiveField(focusKey)}
                              onChange={(e) => updateWidgetField(field.key, `tel:${e.target.value}`)}
                              onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                              placeholder="+1 555 000 0000"
                              className="editor-plain-input min-w-0 flex-1 bg-transparent text-[11px] text-white/60 placeholder-white/18 focus:outline-none"
                            />
                          </div>
                        )}

                        {widgetLinkType === "page" && (() => {
                          const normalized = value === "//" ? "/" : (normalizeInternalPageHref(value) ?? value);
                          const targetPage = (project?.pages ?? []).find((p) => pageHrefFor(p) === normalized);
                          return targetPage ? (
                            <button
                              type="button"
                              onClick={() => selectPage(targetPage.id)}
                              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#5B8CFF]/20 py-1.5 text-[10px] font-medium text-[#5B8CFF] transition-colors hover:bg-[#5B8CFF]/10"
                            >
                              <FileText size={9} />
                              Go to {targetPage.name} page
                            </button>
                          ) : null;
                        })()}
                      </div>
                    );
                  }

                  if (field.type === "textarea") {
                    return (
                      <div key={field.key} className="space-y-1.5">
                        <Label>{field.label}</Label>
                        <textarea
                          value={value}
                          rows={Math.min(6, Math.max(3, value.split("\n").length || 3))}
                          onFocus={() => setActiveField(focusKey)}
                          onChange={(e) => updateWidgetField(field.key, e.target.value)}
                          onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                          placeholder={placeholder}
                          className={PANEL_TEXTAREA}
                        />
                      </div>
                    );
                  }

                  if (isCountdownTarget) {
                    return (
                      <div key={field.key} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <Label>{field.label}</Label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateWidgetField(field.key, futureLocalDateTime(1))}
                              className={PANEL_BUTTON_SECONDARY}
                            >
                              +1 day
                            </button>
                            <button
                              type="button"
                              onClick={() => updateWidgetField(field.key, futureLocalDateTime(7))}
                              className={PANEL_BUTTON_SECONDARY}
                            >
                              +7 days
                            </button>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={value}
                          onFocus={() => setActiveField(focusKey)}
                          onChange={(e) => updateWidgetField(field.key, e.target.value)}
                          onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                          placeholder={field.placeholder || "YYYY-MM-DDTHH:mm"}
                          className={PANEL_INPUT}
                        />
                        <p className="text-[9px] text-white/24">
                          Use local time format like <span className="text-white/40">2026-04-05T18:00</span>.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div key={field.key} className="space-y-1.5">
                      <Label>{field.label}</Label>
                      <input
                        type={field.type === "number" || field.type === "datetime-local" ? field.type : "text"}
                        value={value}
                        min={field.type === "number" ? field.min : undefined}
                        max={field.type === "number" ? field.max : undefined}
                        step={field.type === "number" ? field.step ?? 1 : undefined}
                        onFocus={() => setActiveField(focusKey)}
                        onChange={(e) => updateWidgetField(field.key, e.target.value)}
                        onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                        placeholder={placeholder}
                        className={PANEL_INPUT}
                      />
                    </div>
                  );
                })}
              </div>

            </div>
          </Accordion>
        )}

        {showLogoPanel && (
          <Accordion title="Logos" icon={<Type size={12}/>} open={open.content} toggle={() => toggle("content")}>
            <div className="space-y-2">
              <Label>Logo Items</Label>
              <textarea
                value={logoItemsDraft}
                rows={Math.min(10, Math.max(4, logoItemsDraft.split("\n").length || 4))}
                onFocus={() => setActiveField("logoItems")}
                onChange={(e) => applyLogoItems(e.target.value)}
                onBlur={() => {
                  applyLogoItems(logoItemsDraft);
                  setActiveField(null);
                }}
                className={`${PANEL_TEXTAREA} min-h-[96px]`}
                placeholder={"One item per line\nUse a company name or a logo image URL"}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] leading-relaxed text-[var(--text-tertiary)]">
                  One logo per line. Use names or image URLs.
                </p>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setMediaPickerTarget("logos")}
                    className={PANEL_BUTTON_SECONDARY}
                  >
                    Media gallery
                  </button>
                </div>
              </div>
            </div>
          </Accordion>
        )}

        {showStandaloneCollectionPanel && collectionFields.length > 0 && (
          <Accordion title={collectionLabel} icon={<Layers size={12}/>} open={open.items} toggle={() => toggle("items")}>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                    Structured content
                  </p>
                  <p className="text-[10px] leading-relaxed text-[var(--text-tertiary)]">
                    Edit repeated items live.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {node.collectionFixed && (
                    <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-4)] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-disabled)]">
                      fixed set
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {collectionDraft.map((item, index) => (
                  <div key={item.id || `${node.collectionKind}-${index}`} className={COLLECTION_ITEM_PANEL}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className={COLLECTION_ITEM_EYEBROW}>Item {formatCollectionItemIndex(index)}</p>
                        <p className={COLLECTION_ITEM_HEADING}>{getCollectionItemHeading(collectionFields, item)}</p>
                      </div>

                      {!node.collectionFixed ? (
                        <div className="flex items-center justify-end gap-1.5 shrink-0">
                          <div className={SECTION_CONTROL_ACTION_BAR}>
                            <button
                              type="button"
                              onClick={() => duplicateCollectionItem(index)}
                              className={SECTION_CONTROL_ACTION_ICON}
                              title="Duplicate item"
                              aria-label={`Duplicate item ${index + 1}`}
                            >
                              <Copy size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeCollectionItem(index)}
                              disabled={collectionDraft.length <= 1}
                              className={SECTION_CONTROL_ACTION_ICON_DANGER}
                              title="Remove item"
                              aria-label={`Remove item ${index + 1}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className={useCompactCollectionGrid ? "grid grid-cols-2 gap-2.5" : "space-y-2.5"}>
                      {collectionFields.map((field) => {
                        const itemId = item.id || `item-${index + 1}`;
                        const value = item.fields?.[field.key] ?? "";
                        const focusKey = `collection:${index}:${field.key}`;
                        const isLinkField = isCollectionLinkField(field);
                        const fieldClassName = collectionFieldSpansFullRow(field, useCompactCollectionGrid) ? "col-span-2" : "";
                        const currentLinkType =
                          collectionLinkTypes[collectionLinkTypeStateKey(itemId, field.key)] ??
                          inferLinkTypeFromValue(value);
                        const labelText =
                          field.type === "image"
                            ? `${field.label} URL`
                            : field.label;
                        const placeholder =
                          field.placeholder ||
                          (field.type === "image"
                            ? "https://example.com/image.jpg"
                            : field.type === "list"
                            ? "One item per line"
                            : `Edit ${field.label.toLowerCase()}…`);
                        if (field.type === "textarea" || field.type === "list") {
                          return (
                            <div key={field.key} className={`${fieldClassName} space-y-1.5`.trim()}>
                              <Label>{labelText}</Label>
                              <textarea
                                value={value}
                                rows={Math.min(7, Math.max(3, value.split("\n").length || 3))}
                                onFocus={() => setActiveField(focusKey)}
                                onChange={(e) => updateCollectionField(index, field.key, e.target.value)}
                                onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                                placeholder={placeholder}
                                className={PANEL_TEXTAREA}
                              />
                              {field.type === "list" && (
                                <p className="text-[9px] text-[var(--text-disabled)]">Use one line per item.</p>
                              )}
                            </div>
                          );
                        }

                        if (isLinkField) {
                          return (
                            <div key={field.key} className={`${fieldClassName} space-y-2`.trim()}>
                              <Label>{field.label}</Label>
                              <div className="grid grid-cols-3 gap-1.5">
                                {[
                                  { val: "page" as const, label: "Page", icon: <FileText size={11} /> },
                                  { val: "anchor" as const, label: "Section", icon: <Anchor size={11} /> },
                                  { val: "url" as const, label: "URL", icon: <Globe size={11} /> },
                                  { val: "email" as const, label: "Email", icon: <Mail size={11} /> },
                                  { val: "phone" as const, label: "Phone", icon: <Phone size={11} /> },
                                  { val: "none" as const, label: "None", icon: <X size={11} /> },
                                ].map(({ val, label, icon }) => {
                                  const active = currentLinkType === val;
                                  return (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => setCollectionLinkType(index, itemId, field.key, val)}
                                      className={`inline-flex items-center justify-center gap-1.5 rounded-[14px] border px-2.5 py-2 text-[10px] font-medium transition-all ${
                                        active
                                          ? "border-[#5B8CFF]/22 bg-[#5B8CFF]/10 text-[#8EA8FF]"
                                          : "border-[var(--border-soft)] bg-[var(--surface-4)] text-[var(--text-tertiary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                                      }`}
                                    >
                                      {icon}
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>

                              {currentLinkType === "page" && (
                                project?.pages && project.pages.length > 0 ? (
                                  <select
                                    value={normalizeInternalPageHref(value) ?? ""}
                                    onFocus={() => setActiveField(focusKey)}
                                    onChange={(e) => updateCollectionField(index, field.key, e.target.value)}
                                    onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                                    className={PANEL_SELECT}
                                  >
                                    <option value="">Choose page</option>
                                    {project.pages.map((p) => (
                                      <option key={`${itemId}:${field.key}:${p.id}`} value={pageHrefFor(p)}>
                                        {p.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : <p className="px-1 text-[10px] text-[var(--text-disabled)]">No pages in this project.</p>
                              )}

                              {currentLinkType === "anchor" && (
                                currentPage && currentPage.sections.length > 0 ? (
                                  <select
                                    value={value.startsWith("#") ? value : ""}
                                    onFocus={() => setActiveField(focusKey)}
                                    onChange={(e) => updateCollectionField(index, field.key, e.target.value)}
                                    onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                                    className={PANEL_SELECT}
                                  >
                                    <option value="">Choose section</option>
                                    {currentPage.sections.map((sec) => (
                                      <option key={`${itemId}:${field.key}:${sec.id}`} value={`#${sec.id}`}>
                                        {sec.name || sec.type}
                                      </option>
                                    ))}
                                  </select>
                                ) : <p className="px-1 text-[10px] text-[var(--text-disabled)]">No sections on this page.</p>
                              )}

                              {currentLinkType === "url" && (
                                <input
                                  value={value}
                                  onFocus={() => setActiveField(focusKey)}
                                  onChange={(e) => updateCollectionField(index, field.key, e.target.value)}
                                  onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                                  placeholder="https://example.com"
                                  className={PANEL_INPUT}
                                />
                              )}

                              {currentLinkType === "email" && (
                                <input
                                  value={value.replace("mailto:", "")}
                                  onFocus={() => setActiveField(focusKey)}
                                  onChange={(e) => updateCollectionField(index, field.key, `mailto:${e.target.value}`)}
                                  onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                                  placeholder="hello@example.com"
                                  className={PANEL_INPUT}
                                />
                              )}

                              {currentLinkType === "phone" && (
                                <input
                                  value={value.replace("tel:", "")}
                                  onFocus={() => setActiveField(focusKey)}
                                  onChange={(e) => updateCollectionField(index, field.key, `tel:${e.target.value}`)}
                                  onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                                  placeholder="+1 555 000 0000"
                                  className={PANEL_INPUT}
                                />
                              )}
                            </div>
                          );
                        }

                        return (
                          <div key={field.key} className={`${fieldClassName} min-w-0 space-y-1.5`.trim()}>
                            <Label>{labelText}</Label>
                            <input
                              value={value}
                              onFocus={() => setActiveField(focusKey)}
                              onChange={(e) => updateCollectionField(index, field.key, e.target.value)}
                              onBlur={() => setActiveField((current) => (current === focusKey ? null : current))}
                              placeholder={placeholder}
                              className={PANEL_INPUT}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {!node.collectionFixed ? (
                  <button
                    type="button"
                    onClick={addCollectionItem}
                    className={COLLECTION_ADD_BUTTON}
                    aria-label="Add collection item"
                  >
                    <Plus size={12} />
                    Add item
                  </button>
                ) : null}
              </div>

              <p className="text-[10px] leading-relaxed text-[var(--text-tertiary)]">
                Collection changes update the block immediately without breaking its layout.
              </p>
            </div>
          </Accordion>
        )}

        {showTextContentPanel && (
          <Accordion title="Content" icon={<Type size={12}/>} open={open.content} toggle={() => toggle("content")}>
            <div className="space-y-2">
              <Label>Edit Text</Label>
              <textarea
                value={localEditableText}
                rows={Math.min(8, Math.max(3, localEditableText.split("\n").length || 3))}
                onFocus={() => setActiveField("editableText")}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setLocalEditableText(nextValue);
                  applyTextContent(nextValue);
                }}
                onBlur={() => {
                  setActiveField(null);
                }}
                className={PANEL_TEXTAREA}
                placeholder="Edit the selected text…"
              />
            </div>
          </Accordion>
        )}

        {/* ── Typography ── */}
        {(hasEditableText || node.isBtn || node.tag === "a" || (node as any).isInput) && (
          <Accordion title="Typography" icon={<Type size={12}/>} open={open.typography} toggle={() => toggle("typography")}>
            {/* Font family */}
            <div className={INSPECTOR_GROUP}>
              <Label>Font</Label>
              <select value={node.fontFamily} onChange={(e) => applyStyle("fontFamily", e.target.value)}
                className={PANEL_SELECT}>
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* Size + Weight row */}
            <div className={`${INSPECTOR_GROUP} grid grid-cols-2 gap-2.5`}>
              <div>
                <SliderField
                  label="Size"
                  value={localFontSize}
                  min={8}
                  max={160}
                  step={1}
                  unit="px"
                  overrideActive={hasResponsiveProp("fontSize")}
                  onReset={() => resetResponsiveProp(["fontSize"])}
                  onFocus={() => setActiveField("fontSize")}
                  onChange={(next) => {
                    setLocalFontSize(next);
                    if (next !== "") applyStyle("fontSize", `${next}px`);
                  }}
                  onCommit={(current) => {
                    const next = current.trim() === "" ? "16" : current;
                    setLocalFontSize(parseSizeToken(next, 16));
                    applyStyle("fontSize", `${next}px`);
                    setActiveField(null);
                  }}
                />
              </div>
              <div>
                <Label
                  overrideActive={hasResponsiveProp("fontWeight")}
                  onReset={() => resetResponsiveProp(["fontWeight"])}
                >
                  Weight
                </Label>
                <select value={node.fontWeight} onChange={(e) => applyStyle("fontWeight", e.target.value)}
                  className={PANEL_SELECT}>
                  {WEIGHTS.map((w) => <option key={w.v} value={w.v}>{w.l}</option>)}
                </select>
              </div>
            </div>

            {/* Line height + Letter spacing */}
            <div className={`${INSPECTOR_GROUP} grid grid-cols-2 gap-2.5`}>
              <SliderField
                label="Line Height"
                value={localLineHeight}
                min={0.5}
                max={3}
                step={0.05}
                onFocus={() => setActiveField("lineHeight")}
                onChange={(next) => {
                  setLocalLineHeight(next);
                  if (next !== "") applyStyle("lineHeight", next);
                }}
                onCommit={(current) => {
                  const next = current.trim() === "" ? "1.5" : current;
                  setLocalLineHeight(next);
                  applyStyle("lineHeight", next);
                  setActiveField(null);
                }}
              />
              <SliderField
                label="Tracking"
                value={localLetterSpacing}
                min={-5}
                max={20}
                step={0.1}
                unit="px"
                onFocus={() => setActiveField("letterSpacing")}
                onChange={(next) => {
                  setLocalLetterSpacing(next);
                  if (next !== "") applyStyle("letterSpacing", `${next}px`);
                }}
                onCommit={(current) => {
                  const next = current.trim() === "" ? "0" : current;
                  setLocalLetterSpacing(next);
                  applyStyle("letterSpacing", `${next}px`);
                  setActiveField(null);
                }}
              />
            </div>

            {/* Text align */}
            <div className={INSPECTOR_GROUP}>
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
            <div className={INSPECTOR_GROUP}>
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
            <div className={INSPECTOR_GROUP}>
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

            <div className={`${INSPECTOR_GROUP} grid grid-cols-2 gap-2.5`}>
              <div>
                <Label
                  overrideActive={hasResponsiveProp("fontVariantCaps")}
                  onReset={() => resetResponsiveProp(["fontVariantCaps"])}
                >
                  Variant
                </Label>
                <select
                  value={node.fontVariantCaps || "normal"}
                  onChange={(e) => applyStyle("fontVariantCaps", e.target.value)}
                  className={PANEL_SELECT}
                >
                  {FONT_VARIANT_CAPS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <SliderField
                label="Indent"
                value={localTextIndent}
                min={0}
                max={160}
                step={1}
                unit="px"
                overrideActive={hasResponsiveProp("textIndent")}
                onReset={() => resetResponsiveProp(["textIndent"])}
                onFocus={() => setActiveField("textIndent")}
                onChange={(next) => {
                  setLocalTextIndent(next);
                  if (next !== "") applyStyle("textIndent", `${next}px`);
                }}
                onCommit={(current) => {
                  const next = current.trim() === "" ? "0" : current;
                  setLocalTextIndent(next);
                  applyStyle("textIndent", `${next}px`);
                  setActiveField(null);
                }}
              />
            </div>

            <div className={`${INSPECTOR_GROUP} grid grid-cols-2 gap-2.5`}>
              <div>
                <Label
                  overrideActive={hasResponsiveProp("whiteSpace")}
                  onReset={() => resetResponsiveProp(["whiteSpace"])}
                >
                  White Space
                </Label>
                <select
                  value={node.whiteSpace || "normal"}
                  onChange={(e) => applyStyle("whiteSpace", e.target.value)}
                  className={PANEL_SELECT}
                >
                  {WHITE_SPACE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label
                  overrideActive={hasResponsiveProp("overflowWrap")}
                  onReset={() => resetResponsiveProp(["overflowWrap"])}
                >
                  Wrap
                </Label>
                <select
                  value={node.overflowWrap || "normal"}
                  onChange={(e) => applyStyle("overflowWrap", e.target.value)}
                  className={PANEL_SELECT}
                >
                  {OVERFLOW_WRAP_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={INSPECTOR_GROUP}>
              <Label
                overrideActive={hasResponsiveProp("wordBreak")}
                onReset={() => resetResponsiveProp(["wordBreak"])}
              >
                Word Break
              </Label>
              <select
                value={node.wordBreak || "normal"}
                onChange={(e) => applyStyle("wordBreak", e.target.value)}
                className={PANEL_SELECT}
              >
                {WORD_BREAK_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {showListControls && (
              <div className={`${INSPECTOR_GROUP} grid grid-cols-2 gap-2.5`}>
                <div>
                  <Label
                    overrideActive={hasResponsiveProp("listStyleType")}
                    onReset={() => resetResponsiveProp(["listStyleType"], "list")}
                  >
                    List Marker
                  </Label>
                  <select
                    value={node.listStyleType || "disc"}
                    onChange={(e) => applyListStyle("listStyleType", e.target.value)}
                    className={PANEL_SELECT}
                  >
                    {LIST_STYLE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label
                    overrideActive={hasResponsiveProp("listStylePosition")}
                    onReset={() => resetResponsiveProp(["listStylePosition"], "list")}
                  >
                    Marker Position
                  </Label>
                  <select
                    value={node.listStylePosition || "outside"}
                    onChange={(e) => applyListStyle("listStylePosition", e.target.value)}
                    className={PANEL_SELECT}
                  >
                    {LIST_STYLE_POSITION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {showColumnsControls && (
              <div className={`${INSPECTOR_GROUP} grid grid-cols-2 gap-2.5`}>
                <SliderField
                  label="Columns"
                  value={localColumnCount}
                  min={1}
                  max={6}
                  step={1}
                  overrideActive={hasResponsiveProp("columnCount")}
                  onReset={() => resetResponsiveProp(["columnCount"])}
                  onFocus={() => setActiveField("columnCount")}
                  onChange={(next) => {
                    setLocalColumnCount(next);
                    if (next !== "") applyStyle("columnCount", next);
                  }}
                  onCommit={(current) => {
                    const next = current.trim() === "" ? "1" : current;
                    setLocalColumnCount(next);
                    applyStyle("columnCount", next);
                    setActiveField(null);
                  }}
                />
                <SliderField
                  label="Column Gap"
                  value={localColumnGap}
                  min={0}
                  max={120}
                  step={1}
                  unit="px"
                  overrideActive={hasResponsiveProp("columnGap")}
                  onReset={() => resetResponsiveProp(["columnGap"])}
                  onFocus={() => setActiveField("columnGap")}
                  onChange={(next) => {
                    setLocalColumnGap(next);
                    if (next !== "") applyStyle("columnGap", `${next}px`);
                  }}
                  onCommit={(current) => {
                    const next = current.trim() === "" ? "24" : current;
                    setLocalColumnGap(next);
                    applyStyle("columnGap", `${next}px`);
                    setActiveField(null);
                  }}
                />
              </div>
            )}

            {showParagraphSpacing && (
              <div className={`${INSPECTOR_GROUP} space-y-2.5`}>
                <SliderField
                  label="Space After"
                  value={localParagraphGap}
                  min={0}
                  max={96}
                  step={1}
                  unit="px"
                  overrideActive={hasResponsiveProp("marginBottom")}
                  onReset={() => resetResponsiveProp(["marginBottom"])}
                  onFocus={() => setActiveField("paragraphGap")}
                  onChange={(next) => {
                    setLocalParagraphGap(next);
                    if (next !== "") applyStyle("marginBottom", `${next}px`);
                  }}
                  onCommit={(current) => {
                    const next = current.trim() === "" ? "0" : current;
                    setLocalParagraphGap(next);
                    applyStyle("marginBottom", `${next}px`);
                    setActiveField(null);
                  }}
                />
                <PresetSelect
                  value=""
                  onChange={(value) => {
                    setLocalParagraphGap(value);
                    applyStyle("marginBottom", `${value}px`);
                  }}
                  options={PARAGRAPH_SPACING_PRESETS}
                  placeholder="Paragraph preset"
                />
              </div>
            )}

            {showLinkDecorationControls && (
              <div className={`${INSPECTOR_GROUP} grid grid-cols-2 gap-2.5`}>
                <div>
                  <Label
                    overrideActive={hasResponsiveProp("textDecorationStyle")}
                    onReset={() => resetResponsiveProp(["textDecorationStyle"], "link")}
                  >
                    Link Underline
                  </Label>
                  <select
                    value={node.textDecorationStyle || "solid"}
                    onChange={(e) => applyLinkStyle("textDecorationStyle", e.target.value)}
                    className={PANEL_SELECT}
                  >
                    {LINK_DECORATION_STYLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <SliderField
                  label="Underline Offset"
                  value={localUnderlineOffset}
                  min={0}
                  max={24}
                  step={1}
                  unit="px"
                  overrideActive={hasResponsiveProp("textUnderlineOffset")}
                  onReset={() => resetResponsiveProp(["textUnderlineOffset"], "link")}
                  onFocus={() => setActiveField("underlineOffset")}
                  onChange={(next) => {
                    setLocalUnderlineOffset(next);
                    if (next !== "") applyLinkStyle("textUnderlineOffset", `${next}px`);
                  }}
                  onCommit={(current) => {
                    const next = current.trim() === "" ? "0" : current;
                    setLocalUnderlineOffset(next);
                    applyLinkStyle("textUnderlineOffset", `${next}px`);
                    setActiveField(null);
                  }}
                />
              </div>
            )}

            {/* Text color */}
            <div className={INSPECTOR_GROUP}>
              <Label
                overrideActive={hasResponsiveProp("color")}
                onReset={() => resetResponsiveProp(["color"])}
              >
                Color
              </Label>
              <ColorPicker value={txtColor} onChange={(hex) => applyTextColor(hex, textOpacityValue, { batch: true })} />
            </div>

            <div className={INSPECTOR_GROUP}>
              <SliderField
                label="Text Opacity"
                value={localTextOpacity}
                min={0}
                max={100}
                step={1}
                unit="%"
                overrideActive={hasResponsiveProp("color")}
                onReset={() => resetResponsiveProp(["color"])}
                onFocus={() => setActiveField("textOpacity")}
                onChange={(next) => {
                  setLocalTextOpacity(next);
                  if (next !== "") applyTextOpacity(next, { batch: true });
                }}
                onCommit={(current) => {
                  const next = current.trim() === "" ? "100" : current;
                  setLocalTextOpacity(next);
                  applyTextOpacity(next);
                  setActiveField(null);
                }}
              />
            </div>

            {/* Text shadow */}
            <div className={`${INSPECTOR_GROUP} space-y-2.5`}>
              <Label>Text Shadow</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {TEXT_SHADOW_PRESETS.map(p => (
                  <button key={p.label}
                    onClick={() => applyStyle("textShadow", p.value)}
                    className="rounded-[12px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.02)] py-2 text-[10px] font-medium text-[var(--text-secondary)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-5)] hover:text-[var(--text-primary)]">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Gradient text */}
            <div className={`${INSPECTOR_GROUP} space-y-2.5`}>
              <div className="mb-0 flex items-center justify-between">
                <Label>Gradient Text</Label>
                <EditorSwitch
                  checked={gradientOn}
                  onChange={() => {
                  const next = !gradientOn;
                  setGradientOn(next);
                  if (next) {
                    const grad = gradDir === "circle at center"
                      ? `radial-gradient(${gradDir}, ${gradFrom}, ${gradTo})`
                      : `linear-gradient(${gradDir}, ${gradFrom}, ${gradTo})`;
                    applyStyleToNode(node.textTargetNodeId ?? node.nodeId, "backgroundImage", grad);
                    applyStyleToNode(node.textTargetNodeId ?? node.nodeId, "webkitBackgroundClip", "text");
                    applyStyleToNode(node.textTargetNodeId ?? node.nodeId, "backgroundClip", "text");
                    applyStyleToNode(node.textTargetNodeId ?? node.nodeId, "webkitTextFillColor", "transparent");
                  } else {
                    applyStyleToNode(node.textTargetNodeId ?? node.nodeId, "backgroundImage", "none");
                    applyStyleToNode(node.textTargetNodeId ?? node.nodeId, "webkitBackgroundClip", "");
                    applyStyleToNode(node.textTargetNodeId ?? node.nodeId, "backgroundClip", "");
                    applyStyleToNode(node.textTargetNodeId ?? node.nodeId, "webkitTextFillColor", "");
                  }
                }}
                  title={gradientOn ? "Gradient text on" : "Gradient text off"}
                />
              </div>
              {gradientOn && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    {GRADIENT_DIRS.map(d => (
                      <button key={d.value} onClick={() => {
                        setGradDir(d.value);
                        const grad = d.value === "circle at center"
                          ? `radial-gradient(${d.value}, ${gradFrom}, ${gradTo})`
                          : `linear-gradient(${d.value}, ${gradFrom}, ${gradTo})`;
                        applyStyleToNode(node.textTargetNodeId ?? node.nodeId, "backgroundImage", grad);
                      }} className={`rounded-[12px] border py-2 text-[11px] transition-all ${gradDir === d.value ? "border-[#5B8CFF]/22 bg-[#5B8CFF]/10 text-[#8EA8FF]" : "border-[var(--border-soft)] bg-[rgba(255,255,255,0.02)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-5)] hover:text-[var(--text-primary)]"}`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>From</Label>
                      <ColorPicker value={gradFrom} onChange={(hex) => {
                        setGradFrom(hex);
                        const grad = gradDir === "circle at center"
                          ? `radial-gradient(${gradDir}, ${hex}, ${gradTo})`
                          : `linear-gradient(${gradDir}, ${hex}, ${gradTo})`;
                        applyStyleToNode(node.textTargetNodeId ?? node.nodeId, "backgroundImage", grad, { batch: true });
                      }} />
                    </div>
                    <div>
                      <Label>To</Label>
                      <ColorPicker value={gradTo} onChange={(hex) => {
                        setGradTo(hex);
                        const grad = gradDir === "circle at center"
                          ? `radial-gradient(${gradDir}, ${gradFrom}, ${hex})`
                          : `linear-gradient(${gradDir}, ${gradFrom}, ${hex})`;
                        applyStyleToNode(node.textTargetNodeId ?? node.nodeId, "backgroundImage", grad, { batch: true });
                      }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Text stroke */}
            <div className={`${INSPECTOR_GROUP} space-y-2.5`}>
              <Label>Stroke</Label>
              <div className="grid grid-cols-2 gap-2.5">
                <SliderField
                  label="Width"
                  value={textStroke}
                  min={0}
                  max={8}
                  step={0.5}
                  unit="px"
                  onChange={(next) => {
                    setTextStroke(next);
                    send("apply-style", { prop: "webkitTextStroke", value: `${next}px ${textStrokeColor}`, batch: true });
                  }}
                  onCommit={(current) => {
                    const next = current.trim() === "" ? "0" : current;
                    setTextStroke(next);
                    send("apply-style", { prop: "webkitTextStroke", value: `${next}px ${textStrokeColor}` });
                  }}
                />
                <div>
                  <Label>Color</Label>
                  <ColorPicker value={textStrokeColor} onChange={(hex) => {
                    setTextStrokeColor(hex);
                    if (parseFloat(textStroke) > 0) {
                      send("apply-style", { prop: "webkitTextStroke", value: `${textStroke}px ${hex}`, batch: true });
                    }
                  }} />
                </div>
              </div>
            </div>
          </Accordion>
        )}

        {/* ── Image ── */}
        {node.isImg && (
          <Accordion title="Image" icon={<ImageIcon size={12}/>} open={open.image} toggle={() => toggle("image")}>
            <div>
              <Label>Source URL</Label>
              <UrlApplyField
                value={imgUrl}
                onChange={setImgUrl}
                onApply={() => {
                  if (imgUrl.trim()) sendMediaAttr("src", imgUrl.trim());
                }}
                onOpenLibrary={() => setMediaPickerTarget("image")}
                onClear={() => {
                  setImgUrl("");
                  sendMediaAttr("src", null);
                }}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Alt Text</Label>
              <input
                value={(node as any).altText ?? ""}
                onChange={(e) => sendMediaAttr("alt", e.target.value)}
                placeholder="Describe the image…"
                className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[11px] text-white/60 placeholder-white/18 focus:outline-none focus:border-[#5B8CFF]/30 transition-colors"
              />
            </div>
            <div>
              <Label
                overrideActive={hasResponsiveProp("objectFit")}
                onReset={() => resetResponsiveProp(["objectFit"], "media")}
              >
                Object Fit
              </Label>
              <ToggleGroup
                value={node.objectFit || "cover"}
                onChange={(v) => applyMediaStyle("objectFit", v)}
                options={[
                  { val: "cover",   icon: <span className="text-[9px] font-semibold">Cover</span>,   title: "Cover" },
                  { val: "contain", icon: <span className="text-[9px] font-semibold">Contain</span>, title: "Contain" },
                  { val: "fill",    icon: <span className="text-[9px] font-semibold">Fill</span>,    title: "Fill" },
                ]}
              />
            </div>
            <div>
              <Label
                overrideActive={hasResponsiveProp("objectPosition")}
                onReset={() => resetResponsiveProp(["objectPosition"], "media")}
              >
                Object Position
              </Label>
              <div className="grid grid-cols-3 gap-1">
                {OBJECT_POSITION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    title={option.title}
                    onClick={() => applyMediaStyle("objectPosition", option.value)}
                    className={`h-7 rounded-lg border text-[10px] font-medium transition-all ${
                      (node.objectPosition || "50% 50%") === option.value
                        ? "bg-[#5B8CFF]/12 text-[#5B8CFF] border-[#5B8CFF]/20"
                        : "bg-white/[0.03] text-white/35 border-white/[0.06] hover:border-white/[0.12] hover:text-white/60"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </Accordion>
        )}

        {/* ── Icon ── */}
        {(node as any).isSvg && (
          <Accordion title="Icon" icon={<Layers size={12}/>} open={open.icon} toggle={() => toggle("icon")}>
            {/* Color + stroke width row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Color</Label>
                <ColorPicker
                  value={safeHex((node as any).svgStroke !== 'currentColor' ? (node as any).svgStroke : node.color)}
                  onChange={(hex) => {
                    send("apply-attr", { attr: "stroke", value: hex });
                    send("apply-style", { prop: "color", value: hex, batch: true });
                  }}
                />
              </div>
              <div>
                <Label>Stroke</Label>
                <select
                  value={(node as any).svgStrokeWidth ?? "2"}
                  onChange={(e) => send("apply-attr", { attr: "stroke-width", value: e.target.value })}
                  className={PANEL_SELECT}
                >
                  {["0.5","1","1.5","2","2.5","3"].map((v) => (
                    <option key={v} value={v}>{v}px</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Size slider — only for icons with a wrapper span */}
            {(node as any).isIconEl && (
              <div>
                <Label>Size</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={12} max={160} step={2}
                    value={iconSize}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setIconSize(v);
                      send("apply-icon-size", { size: v, wrapperNodeId: (node as any).iconWrapperNodeId, batch: true });
                    }}
                    onMouseUp={() => send("apply-icon-size", { size: iconSize, wrapperNodeId: (node as any).iconWrapperNodeId })}
                    className="flex-1 h-1 accent-[#5B8CFF]"
                  />
                  <input
                    type="number"
                    min={12} max={160} step={2}
                    value={iconSize}
                    onChange={(e) => {
                      const v = Math.max(12, Math.min(160, Number(e.target.value)));
                      setIconSize(v);
                      send("apply-icon-size", { size: v, wrapperNodeId: (node as any).iconWrapperNodeId });
                    }}
                    className="w-14 bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[11px] text-white/70 text-center focus:outline-none appearance-none"
                  />
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <input
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                placeholder="Search icons…"
                className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-[11px] text-white/60 placeholder-white/20 focus:outline-none focus:border-[#5B8CFF]/30 transition-colors"
              />
            </div>

            {/* Icon grid */}
            <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
              {ICONS
                .filter((ic: IconDef) => !iconSearch || ic.name.toLowerCase().includes(iconSearch.toLowerCase()))
                .map((ic: IconDef) => {
                  const stroke = (node as any).svgStroke && (node as any).svgStroke !== 'currentColor'
                    ? (node as any).svgStroke
                    : safeHex(node.color);
                  const sw = (node as any).svgStrokeWidth ?? "2";
                  return (
                    <button
                      key={ic.id}
                      title={ic.name}
                      onClick={() => send("replace-svg", { inner: ic.paths, stroke, strokeWidth: sw })}
                      className="flex items-center justify-center w-full aspect-square rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-[#5B8CFF]/10 hover:border-[#5B8CFF]/20 transition-all group"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white/50 group-hover:text-accent-400 transition-colors"
                        dangerouslySetInnerHTML={{ __html: ic.paths }}
                      />
                    </button>
                  );
                })}
            </div>
          </Accordion>
        )}

        {/* ── Video ── */}
        {node.isVideo && (
          <Accordion title="Video" icon={<Video size={12}/>} open={open.video} toggle={() => toggle("video")}>
            <div>
              <Label>Source URL</Label>
              <UrlApplyField
                value={imgUrl}
                onChange={setImgUrl}
                onApply={() => {
                  if (imgUrl.trim()) sendMediaAttr("src", imgUrl.trim());
                }}
                onOpenLibrary={() => setMediaPickerTarget("video")}
                onClear={() => {
                  setImgUrl("");
                  sendMediaAttr("src", null);
                }}
                placeholder="https://example.com/video.mp4"
              />
            </div>
            <div>
              <Label
                overrideActive={hasResponsiveProp("objectFit")}
                onReset={() => resetResponsiveProp(["objectFit"], "media")}
              >
                Object Fit
              </Label>
              <ToggleGroup
                value={node.objectFit || "cover"}
                onChange={(v) => applyMediaStyle("objectFit", v)}
                options={[
                  { val: "cover",   icon: <span className="text-[9px] font-semibold">Cover</span>,   title: "Cover" },
                  { val: "contain", icon: <span className="text-[9px] font-semibold">Contain</span>, title: "Contain" },
                  { val: "fill",    icon: <span className="text-[9px] font-semibold">Fill</span>,    title: "Fill" },
                ]}
              />
            </div>
            <div>
              <Label
                overrideActive={hasResponsiveProp("objectPosition")}
                onReset={() => resetResponsiveProp(["objectPosition"], "media")}
              >
                Object Position
              </Label>
              <div className="grid grid-cols-3 gap-1">
                {OBJECT_POSITION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    title={option.title}
                    onClick={() => applyMediaStyle("objectPosition", option.value)}
                    className={`h-7 rounded-lg border text-[10px] font-medium transition-all ${
                      (node.objectPosition || "50% 50%") === option.value
                        ? "bg-[#5B8CFF]/12 text-[#5B8CFF] border-[#5B8CFF]/20"
                        : "bg-white/[0.03] text-white/35 border-white/[0.06] hover:border-white/[0.12] hover:text-white/60"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {([
                { key: "autoplay", label: "Autoplay", active: node.videoAutoplay },
                { key: "loop",     label: "Loop",     active: node.videoLoop },
                { key: "muted",    label: "Muted",    active: node.videoMuted },
                { key: "controls", label: "Controls", active: node.videoControls },
              ] as const).map(({ key, label, active }) => (
                <button key={key}
                  onClick={() => sendMediaAttr(key, active ? null : "")}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] border transition-all ${
                    active
                      ? "bg-[#5B8CFF]/12 text-[#5B8CFF] border-[#5B8CFF]/20"
                      : "text-white/35 border-white/[0.06] hover:border-white/[0.12] hover:text-white/60"
                  }`}>
                  <span>{label}</span>
                  <ToggleLeft size={12} className={active ? "text-accent-400" : "text-white/20"} />
                </button>
              ))}
            </div>
          </Accordion>
        )}

        {/* ── Embed ── */}
        {node.isIframe && (
          <Accordion title="Embed" icon={<Video size={12}/>} open={open.embed} toggle={() => toggle("embed")}>
            <div>
              <Label>Embed Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: "youtube", label: "YouTube" },
                  { key: "map", label: "Map" },
                  { key: "custom", label: "Custom" },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setEmbedMode(key);
                      if (embedUrl.trim()) {
                        setEmbedUrl(normalizeEmbedUrl(embedUrl, key));
                      }
                    }}
                    className={`py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                      embedMode === key
                        ? "bg-[#5B8CFF]/12 text-[#5B8CFF] border-[#5B8CFF]/20"
                        : "text-white/35 border-white/[0.06] hover:border-white/[0.12] hover:text-white/60"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>
                {embedMode === "youtube"
                  ? "YouTube URL"
                  : embedMode === "map"
                    ? "Map Location"
                    : "Embed URL"}
              </Label>
              <div onFocus={() => setActiveField("embedUrl")} onBlur={() => setActiveField(null)}>
                <UrlApplyField
                  value={embedUrl}
                  onChange={setEmbedUrl}
                  onApply={() => commitEmbedUrl(embedUrl)}
                  onClear={() => {
                    setEmbedUrl("");
                    sendMediaAttr("src", null);
                  }}
                  applyLabel={embedMode === "map" && isResolvingEmbed ? "Resolving..." : "Apply"}
                  disabled={embedMode === "map" && isResolvingEmbed}
                  placeholder={
                    embedMode === "youtube"
                      ? "https://youtube.com/watch?v=..."
                      : embedMode === "map"
                        ? "Dubai Marina or a Google Maps link"
                        : "https://example.com/embed/..."
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { attr: "allowfullscreen", label: "Fullscreen" },
                { attr: "allow", label: "Autoplay", value: "autoplay" },
              ]).map(({ attr, label, value }) => {
                const active = value
                  ? (node.embedAllow ?? "").includes(value)
                  : node.embedAllowFullscreen;
                return (
                  <button key={attr}
                    onClick={() => sendMediaAttr(attr, value ?? "")}
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
                          ? "bg-[#5B8CFF]/12 text-[#5B8CFF] border-[#5B8CFF]/20"
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
                className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[11px] text-white/60 placeholder-white/18 focus:outline-none focus:border-[#5B8CFF]/30 transition-colors"
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
                className="w-full bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 text-[11px] text-white/60 placeholder-white/18 focus:outline-none focus:border-[#5B8CFF]/30 transition-colors"
              />
            </div>
          </Accordion>
        )}

        {/* ── Layout ── */}
        {showLayoutPanel && (
        <Accordion title="Layout" icon={<Layout size={12}/>} open={open.layout} toggle={() => toggle("layout")}>
          <>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label
                overrideActive={hasResponsiveProp("position")}
                onReset={() => resetResponsiveProp(["position"])}
              >
                Position
              </Label>
              <select
                value={node.position || "static"}
                onChange={(e) => applyStyle("position", e.target.value)}
                className={PANEL_SELECT}
              >
                {POSITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label
                overrideActive={hasResponsiveProp("overflow")}
                onReset={() => resetResponsiveProp(["overflow"])}
              >
                Overflow
              </Label>
              <select
                value={node.overflow || "visible"}
                onChange={(e) => applyStyle("overflow", e.target.value)}
                className={PANEL_SELECT}
              >
                {OVERFLOW_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label
              overrideActive={hasResponsiveProp("zIndex")}
              onReset={() => resetResponsiveProp(["zIndex"])}
            >
              Z-index
            </Label>
            <input value={zIndexVal}
              onFocus={() => setActiveField("zIndex")}
              onChange={(e) => {
                const next = e.target.value;
                setZIndexVal(next);
                if (next !== "") applyStyle("zIndex", next);
              }}
              onBlur={() => {
                const next = zIndexVal.trim() === "" ? "auto" : zIndexVal;
                setZIndexVal(next);
                applyStyle("zIndex", next);
                setActiveField(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const next = zIndexVal.trim() === "" ? "auto" : zIndexVal;
                  setZIndexVal(next);
                  applyStyle("zIndex", next);
                }
              }}
              placeholder="auto"
              className={PANEL_INPUT}
            />
          </div>

          {node.position && node.position !== "static" && (
            <div>
              <Label
                overrideActive={hasResponsiveProp("top", "right", "bottom", "left")}
                onReset={() => resetResponsiveProp(["top", "right", "bottom", "left"])}
              >
                Inset
              </Label>
              <div className="grid grid-cols-2 gap-2.5">
                <input value={topVal}
                  onFocus={() => setActiveField("top")}
                  onChange={(e) => {
                    const next = e.target.value;
                    setTopVal(next);
                    if (next !== "") applyStyle("top", next);
                  }}
                  onBlur={() => {
                    const next = topVal.trim() === "" ? "auto" : topVal;
                    setTopVal(next);
                    applyStyle("top", next);
                    setActiveField(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && applyStyle("top", topVal.trim() === "" ? "auto" : topVal)}
                  placeholder="top"
                  className={PANEL_INPUT}
                />
                <input value={rightVal}
                  onFocus={() => setActiveField("right")}
                  onChange={(e) => {
                    const next = e.target.value;
                    setRightVal(next);
                    if (next !== "") applyStyle("right", next);
                  }}
                  onBlur={() => {
                    const next = rightVal.trim() === "" ? "auto" : rightVal;
                    setRightVal(next);
                    applyStyle("right", next);
                    setActiveField(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && applyStyle("right", rightVal.trim() === "" ? "auto" : rightVal)}
                  placeholder="right"
                  className={PANEL_INPUT}
                />
                <input value={bottomVal}
                  onFocus={() => setActiveField("bottom")}
                  onChange={(e) => {
                    const next = e.target.value;
                    setBottomVal(next);
                    if (next !== "") applyStyle("bottom", next);
                  }}
                  onBlur={() => {
                    const next = bottomVal.trim() === "" ? "auto" : bottomVal;
                    setBottomVal(next);
                    applyStyle("bottom", next);
                    setActiveField(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && applyStyle("bottom", bottomVal.trim() === "" ? "auto" : bottomVal)}
                  placeholder="bottom"
                  className={PANEL_INPUT}
                />
                <input value={leftVal}
                  onFocus={() => setActiveField("left")}
                  onChange={(e) => {
                    const next = e.target.value;
                    setLeftVal(next);
                    if (next !== "") applyStyle("left", next);
                  }}
                  onBlur={() => {
                    const next = leftVal.trim() === "" ? "auto" : leftVal;
                    setLeftVal(next);
                    applyStyle("left", next);
                    setActiveField(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && applyStyle("left", leftVal.trim() === "" ? "auto" : leftVal)}
                  placeholder="left"
                  className={PANEL_INPUT}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
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
                className={PANEL_INPUT}
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
                className={PANEL_INPUT}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label>Min width</Label>
              <input value={mwVal}
                onFocus={() => setActiveField("minWidth")}
                onChange={(e) => {
                  const next = e.target.value;
                  setMwVal(next);
                  applyStyle("minWidth", next);
                }}
                onBlur={() => { applyStyle("minWidth", mwVal); setActiveField(null); }}
                onKeyDown={(e) => e.key === "Enter" && applyStyle("minWidth", mwVal)}
                className={PANEL_INPUT}
              />
            </div>
            <div>
              <Label>Max width</Label>
              <input value={mxVal}
                onFocus={() => setActiveField("maxWidth")}
                onChange={(e) => {
                  const next = e.target.value;
                  setMxVal(next);
                  applyStyle("maxWidth", next);
                }}
                onBlur={() => { applyStyle("maxWidth", mxVal); setActiveField(null); }}
                onKeyDown={(e) => e.key === "Enter" && applyStyle("maxWidth", mxVal)}
                className={PANEL_INPUT}
              />
            </div>
          </div>
          {(!isMediaNode && !node.isText) && (
          <>
          <div>
            <Label
              overrideActive={hasResponsiveProp("display")}
              onReset={() => resetResponsiveProp(["display"])}
            >
              Display
            </Label>
            <ToggleGroup
              value={node.display}
              onChange={(v) => applyStyle("display", v)}
              options={[
                { val: "block",        icon: <span className="text-[10px] font-semibold tracking-tight">Block</span>,  title: "Block" },
                { val: "flex",         icon: <span className="text-[10px] font-semibold tracking-tight">Flex</span>,   title: "Flex" },
                { val: "grid",         icon: <span className="text-[10px] font-semibold tracking-tight">Grid</span>,   title: "Grid" },
                { val: "inline-block", icon: <span className="text-[10px] font-semibold tracking-tight">Inline</span>, title: "Inline Block" },
              ]}
            />
          </div>
          {isFlexContainer && (
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
              <div>
                <Label>Wrap</Label>
                <select
                  value={node.flexWrap || "nowrap"}
                  onChange={(e) => applyStyle("flexWrap", e.target.value)}
                  className={PANEL_SELECT}
                >
                  {FLEX_WRAP_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Justify</Label>
                  <select value={node.justifyContent} onChange={(e) => applyStyle("justifyContent", e.target.value)}
                    className={PANEL_SELECT}>
                    {["flex-start","center","flex-end","space-between","space-around","space-evenly"].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Align</Label>
                  <select value={node.alignItems} onChange={(e) => applyStyle("alignItems", e.target.value)}
                    className={PANEL_SELECT}>
                    {["flex-start","center","flex-end","stretch","baseline"].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label>Align Content</Label>
                <select
                  value={node.alignContent || "normal"}
                  onChange={(e) => applyStyle("alignContent", e.target.value)}
                  className={PANEL_SELECT}
                >
                  {ALIGN_CONTENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <SliderField
                  label="Gap"
                  value={gapVal}
                  min={0}
                  max={120}
                  step={1}
                  unit="px"
                  onFocus={() => setActiveField("gap")}
                  onChange={(next) => {
                    setGapVal(next);
                    if (next !== "") applyStyle("gap", `${next}px`);
                  }}
                  onCommit={(current) => {
                    const next = current.trim() === "" ? "0" : current;
                    setGapVal(parseSizeToken(next, 0));
                    applyStyle("gap", `${next}px`);
                    setActiveField(null);
                  }}
                />
                <SliderField
                  label="Row Gap"
                  value={rowGapVal}
                  min={0}
                  max={120}
                  step={1}
                  unit="px"
                  onFocus={() => setActiveField("rowGap")}
                  onChange={(next) => {
                    setRowGapVal(next);
                    if (next !== "") applyStyle("rowGap", `${next}px`);
                  }}
                  onCommit={(current) => {
                    const next = current.trim() === "" ? "0" : current;
                    setRowGapVal(parseSizeToken(next, 0));
                    applyStyle("rowGap", `${next}px`);
                    setActiveField(null);
                  }}
                />
                <SliderField
                  label="Column Gap"
                  value={columnGapVal}
                  min={0}
                  max={120}
                  step={1}
                  unit="px"
                  onFocus={() => setActiveField("columnGap")}
                  onChange={(next) => {
                    setColumnGapVal(next);
                    if (next !== "") applyStyle("columnGap", `${next}px`);
                  }}
                  onCommit={(current) => {
                    const next = current.trim() === "" ? "0" : current;
                    setColumnGapVal(parseSizeToken(next, 0));
                    applyStyle("columnGap", `${next}px`);
                    setActiveField(null);
                  }}
                />
              </div>
              </>
          )}
          {isGridContainer && (
              <>
              {/* Grid column quick presets */}
              <div>
                <Label>Column Presets</Label>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { label: "1", value: "1fr" },
                    { label: "2", value: "repeat(2, 1fr)" },
                    { label: "3", value: "repeat(3, 1fr)" },
                    { label: "4", value: "repeat(4, 1fr)" },
                    { label: "1:2", value: "1fr 2fr" },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => { setGridColsVal(p.value); applyStyle("gridTemplateColumns", p.value); }}
                      className={`${INSPECTOR_PRESET_BTN} ${
                        gridColsVal === p.value ? INSPECTOR_PRESET_BTN_ON : INSPECTOR_PRESET_BTN_OFF
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Columns</Label>
                  <input
                    value={gridColsVal}
                    onFocus={() => setActiveField("gridCols")}
                    onChange={(e) => {
                      const next = e.target.value;
                      setGridColsVal(next);
                      applyStyle("gridTemplateColumns", next);
                    }}
                    onBlur={() => {
                      applyStyle("gridTemplateColumns", gridColsVal);
                      setActiveField(null);
                    }}
                    placeholder="repeat(3, minmax(0, 1fr))"
                    className={PANEL_INPUT}
                  />
                </div>
                <div>
                  <Label>Rows</Label>
                  <input
                    value={gridRowsVal}
                    onFocus={() => setActiveField("gridRows")}
                    onChange={(e) => {
                      const next = e.target.value;
                      setGridRowsVal(next);
                      applyStyle("gridTemplateRows", next);
                    }}
                    onBlur={() => {
                      applyStyle("gridTemplateRows", gridRowsVal);
                      setActiveField(null);
                    }}
                    placeholder="auto auto"
                    className={PANEL_INPUT}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Auto Flow</Label>
                  <select
                    value={node.gridAutoFlow || "row"}
                    onChange={(e) => applyStyle("gridAutoFlow", e.target.value)}
                    className={PANEL_SELECT}
                  >
                    {GRID_AUTO_FLOW_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Justify Items</Label>
                  <select
                    value={node.justifyItems || "normal"}
                    onChange={(e) => applyStyle("justifyItems", e.target.value)}
                    className={PANEL_SELECT}
                  >
                    {JUSTIFY_ITEMS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <SliderField
                  label="Gap"
                  value={gapVal}
                  min={0}
                  max={120}
                  step={1}
                  unit="px"
                  onFocus={() => setActiveField("gap")}
                  onChange={(next) => {
                    setGapVal(next);
                    if (next !== "") applyStyle("gap", `${next}px`);
                  }}
                  onCommit={(current) => {
                    const next = current.trim() === "" ? "0" : current;
                    setGapVal(parseSizeToken(next, 0));
                    applyStyle("gap", `${next}px`);
                    setActiveField(null);
                  }}
                />
                <SliderField
                  label="Row Gap"
                  value={rowGapVal}
                  min={0}
                  max={120}
                  step={1}
                  unit="px"
                  onFocus={() => setActiveField("rowGap")}
                  onChange={(next) => {
                    setRowGapVal(next);
                    if (next !== "") applyStyle("rowGap", `${next}px`);
                  }}
                  onCommit={(current) => {
                    const next = current.trim() === "" ? "0" : current;
                    setRowGapVal(parseSizeToken(next, 0));
                    applyStyle("rowGap", `${next}px`);
                    setActiveField(null);
                  }}
                />
                <SliderField
                  label="Column Gap"
                  value={columnGapVal}
                  min={0}
                  max={120}
                  step={1}
                  unit="px"
                  onFocus={() => setActiveField("columnGap")}
                  onChange={(next) => {
                    setColumnGapVal(next);
                    if (next !== "") applyStyle("columnGap", `${next}px`);
                  }}
                  onCommit={(current) => {
                    const next = current.trim() === "" ? "0" : current;
                    setColumnGapVal(parseSizeToken(next, 0));
                    applyStyle("columnGap", `${next}px`);
                    setActiveField(null);
                  }}
                />
              </div>
              </>
          )}
          {(isFlexChild || isGridChild) && (
                  <>
                {isFlexChild && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label>Grow</Label>
                        <input
                          value={flexGrowVal}
                          type="text"
                          inputMode="numeric"
                          onFocus={() => setActiveField("flexGrow")}
                          onChange={(e) => {
                            const next = e.target.value.replace(/[^\d.-]/g, "");
                            setFlexGrowVal(next);
                            if (next !== "") applyStyle("flexGrow", next);
                          }}
                          onBlur={() => {
                            const next = flexGrowVal.trim() === "" ? "0" : flexGrowVal;
                            setFlexGrowVal(parseSizeToken(next, 0));
                            applyStyle("flexGrow", next);
                            setActiveField(null);
                          }}
                          className={`${PANEL_INPUT} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
                        />
                      </div>
                      <div>
                        <Label>Shrink</Label>
                        <input
                          value={flexShrinkVal}
                          type="text"
                          inputMode="numeric"
                          onFocus={() => setActiveField("flexShrink")}
                          onChange={(e) => {
                            const next = e.target.value.replace(/[^\d.-]/g, "");
                            setFlexShrinkVal(next);
                            if (next !== "") applyStyle("flexShrink", next);
                          }}
                          onBlur={() => {
                            const next = flexShrinkVal.trim() === "" ? "1" : flexShrinkVal;
                            setFlexShrinkVal(parseSizeToken(next, 1));
                            applyStyle("flexShrink", next);
                            setActiveField(null);
                          }}
                          className={`${PANEL_INPUT} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
                        />
                      </div>
                      <div>
                        <Label>Basis</Label>
                        <input
                          value={flexBasisVal}
                          onFocus={() => setActiveField("flexBasis")}
                          onChange={(e) => {
                            const next = e.target.value;
                            setFlexBasisVal(next);
                            applyStyle("flexBasis", next);
                          }}
                          onBlur={() => {
                            applyStyle("flexBasis", flexBasisVal.trim() === "" ? "auto" : flexBasisVal);
                            setActiveField(null);
                          }}
                          placeholder="auto"
                          className={PANEL_INPUT}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Align Self</Label>
                      <select
                        value={node.alignSelf || "auto"}
                        onChange={(e) => applyStyle("alignSelf", e.target.value)}
                        className={PANEL_SELECT}
                      >
                        {ALIGN_SELF_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                {isGridChild && (
                  <div className="space-y-2">
                    {/* Column span quick picks */}
                    <div>
                      <Label>Col Span</Label>
                      <div className="grid grid-cols-5 gap-1">
                        {(["auto","span 1","span 2","span 3","span 4"] as const).map((v) => (
                          <button key={v}
                            onClick={() => applyStyle("gridColumn", v)}
                            className={`${INSPECTOR_PRESET_BTN} ${
                              (node.gridColumn || "auto") === v ? INSPECTOR_PRESET_BTN_ON : INSPECTOR_PRESET_BTN_OFF
                            }`}>
                            {v === "auto" ? "auto" : v.replace("span ","")}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Row span quick picks */}
                    <div>
                      <Label>Row Span</Label>
                      <div className="grid grid-cols-5 gap-1">
                        {(["auto","span 1","span 2","span 3","span 4"] as const).map((v) => (
                          <button key={v}
                            onClick={() => applyStyle("gridRow", v)}
                            className={`${INSPECTOR_PRESET_BTN} ${
                              (node.gridRow || "auto") === v ? INSPECTOR_PRESET_BTN_ON : INSPECTOR_PRESET_BTN_OFF
                            }`}>
                            {v === "auto" ? "auto" : v.replace("span ","")}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Raw inputs for advanced values */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Column</Label>
                        <input
                          value={node.gridColumn || "auto"}
                          onChange={(e) => applyStyle("gridColumn", e.target.value)}
                          placeholder="auto / span 2 / 1 / 3"
                          className={PANEL_INPUT}
                        />
                      </div>
                      <div>
                        <Label>Row</Label>
                        <input
                          value={node.gridRow || "auto"}
                          onChange={(e) => applyStyle("gridRow", e.target.value)}
                          placeholder="auto / span 2 / 1 / 3"
                          className={PANEL_INPUT}
                        />
                      </div>
                    </div>
                  </div>
                )}
                  </>
          )}
          </>
          )}
          </>
        </Accordion>
        )}

        {/* ── Spacing ── */}
        <Accordion title="Spacing" icon={<Square size={12}/>} open={open.spacing} toggle={() => toggle("spacing")}>
          <>
          <div className="grid grid-cols-2 gap-2.5">
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
            accent="border-[#5B8CFF]/12"
            fieldKey="padding"
            activeField={activeField}
            setActiveField={setActiveField}
            overrideActive={hasResponsiveProp("padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft")}
            onReset={() => resetResponsiveProp(["padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"])}
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
            overrideActive={hasResponsiveProp("margin", "marginTop", "marginRight", "marginBottom", "marginLeft")}
            onReset={() => resetResponsiveProp(["margin", "marginTop", "marginRight", "marginBottom", "marginLeft"])}
          />
          </>
        </Accordion>

        {/* ── Background ── */}
        {showBackgroundPanel && (
        <Accordion title="Background" icon={<Layers size={12}/>} open={open.background} toggle={() => toggle("background")}>
          <>
          {node.isBtn && (
            <div>
              <Label>Button surface</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "solid", label: "Solid" },
                  { id: "outline", label: "Outline" },
                  { id: "ghost", label: "Ghost" },
                ].map((option) => {
                  const active = currentButtonSurface === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => applyButtonSurfacePreset(option.id as "solid" | "outline" | "ghost")}
                      className={`h-10 rounded-[12px] border text-[11px] font-semibold transition-all ${
                        active
                          ? "border-[#5B8CFF]/20 bg-[#5B8CFF]/10 text-white"
                          : "border-white/[0.08] bg-white/[0.045] text-white/62 hover:border-white/[0.14] hover:text-white/84"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <Label
              overrideActive={hasResponsiveProp("backgroundColor")}
              onReset={() => resetResponsiveProp(["backgroundColor"])}
            >
              Color
            </Label>
            <ColorPicker
              value={(node.isBtn ? buttonSurfaceBgColor : bgColor) ?? "#ffffff"}
              onChange={(hex) => {
                if (node.isBtn) {
                  applyStyleToNode(buttonSurfaceTargetId, "backgroundColor", hex, { batch: true });
                  return;
                }
                applyStyle("backgroundColor", hex, { batch: true });
              }}
              allowClear={!!(node.isBtn ? buttonSurfaceBgColor : bgColor)}
              onClear={() => {
                if (node.isBtn) {
                  applyStyleToNode(buttonSurfaceTargetId, "backgroundColor", "transparent");
                  return;
                }
                applyStyle("backgroundColor", "transparent");
              }}
            />
          </div>
          {/* Background Image */}
          <BgImageEditor
            value={localBgImage} pos={localBgPos} size={localBgSize}
            overrideActive={hasResponsiveProp("backgroundImage", "backgroundPosition", "backgroundSize")}
            onReset={() => resetResponsiveProp(["backgroundImage", "backgroundPosition", "backgroundSize"])}
            onChange={(v) => { setLocalBgImage(v); setActiveField("backgroundImage"); }}
            onApply={(v, pos, size) => { setBgGradientOn(false); applyBgImage(v, pos, size); setActiveField(null); }}
            onPosChange={(pos) => { setLocalBgPos(pos); applyBgImage(localBgImage, pos, localBgSize); }}
            onSizeChange={(size) => { setLocalBgSize(size); applyBgImage(localBgImage, localBgPos, size); }}
            onClear={() => { setLocalBgImage(""); setBgGradientOn(false); applyBgImage(""); }}
            onOpenLibrary={() => setMediaPickerTarget("background")}
          />
          <SurfaceBackgroundEditor
            repeat={localBgRepeat}
            attachment={localBgAttachment}
            blend={localBgBlend}
            onRepeatChange={(value) => { setLocalBgRepeat(value); applyBgSurface({ repeat: value }); }}
            onAttachmentChange={(value) => { setLocalBgAttachment(value); applyBgSurface({ attachment: value }); }}
            onBlendChange={(value) => { setLocalBgBlend(value); applyBgSurface({ blend: value }); }}
            gradientEnabled={bgGradientOn}
            onToggleGradient={() => {
              const next = !bgGradientOn;
              setBgGradientOn(next);
              if (next) {
                setLocalBgImage("");
                applyGradientFill(bgGradDir, bgGradFrom, bgGradTo);
              } else {
                applyStyle("backgroundImage", "none");
              }
            }}
            gradientDir={bgGradDir}
            onGradientDirChange={(value) => {
              setBgGradDir(value);
              applyGradientFill(value, bgGradFrom, bgGradTo);
            }}
            gradientFrom={bgGradFrom}
            onGradientFromChange={(value) => {
              setBgGradFrom(value);
              applyGradientFill(bgGradDir, value, bgGradTo);
            }}
            gradientTo={bgGradTo}
            onGradientToChange={(value) => {
              setBgGradTo(value);
              applyGradientFill(bgGradDir, bgGradFrom, value);
            }}
            onClearGradient={() => {
              setBgGradientOn(false);
              applyStyle("backgroundImage", "none");
            }}
          />
          </>
        </Accordion>
        )}

        {/* ── Border ── */}
        {showBorderPanel && (
        <Accordion title="Border & Radius" icon={<Square size={12}/>} open={open.border} toggle={() => toggle("border")}>
          <>
          <SliderField
            label="Width"
            value={borderWidthVal}
            min={0}
            max={20}
            step={1}
            unit="px"
            overrideActive={hasResponsiveProp("borderWidth")}
            onReset={() => resetResponsiveProp(["borderWidth"])}
            onFocus={() => setActiveField("borderWidth")}
            onChange={(next) => {
              setBorderWidthVal(next);
              if (next !== "") applyBorderConfig(next, borderStyleVal, borderColorVal);
            }}
            onCommit={(current) => {
              const next = current.trim() === "" ? "0" : current;
              setBorderWidthVal(parseSizeToken(next, 0));
              applyBorderConfig(next, borderStyleVal, borderColorVal);
              setActiveField(null);
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label
                overrideActive={hasResponsiveProp("borderStyle")}
                onReset={() => resetResponsiveProp(["borderStyle"])}
              >
                Style
              </Label>
              <select
                value={borderStyleVal}
                onChange={(e) => {
                  setBorderStyleVal(e.target.value);
                  applyBorderConfig(borderWidthVal, e.target.value, borderColorVal);
                }}
                className={PANEL_SELECT}
              >
                {BORDER_STYLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label
                overrideActive={hasResponsiveProp("borderColor")}
                onReset={() => resetResponsiveProp(["borderColor"])}
              >
                Color
              </Label>
              <ColorPicker
                value={borderColorVal}
                onChange={(hex) => {
                  setBorderColorVal(hex);
                  applyBorderConfig(borderWidthVal, borderStyleVal, hex);
                }}
              />
            </div>
          </div>
          <div>
            <Label>Border CSS</Label>
            <input value={localBorder}
              onChange={(e) => setLocalBorder(e.target.value)}
              onBlur={() => applyStyle("border", localBorder)}
              onKeyDown={(e) => e.key === "Enter" && applyStyle("border", localBorder)}
              placeholder="1px solid #ccc"
              className={`${PANEL_INPUT} font-mono text-[10.5px]`}
            />
          </div>
          <div>
            <Label
              overrideActive={hasResponsiveProp("borderRadius")}
              onReset={() => resetResponsiveProp(["borderRadius"])}
            >
              Radius (TL / TR / BR / BL)
            </Label>
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
          </>
        </Accordion>
        )}

        {/* ── Animation ── */}
        <Accordion title="Animation" icon={<Sparkles size={12}/>} open={open.animation} toggle={() => toggle("animation")}>
          <div className="space-y-2">
            <p className="text-[10px] text-[var(--text-disabled)] leading-relaxed">
              Builder motion overrides generated motion on this block.
            </p>
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => previewAnimation("entrance")}
                disabled={!node.animationIn || node.animationIn === "none" || node.animationIn === "custom"}
                className="px-2 py-1 rounded-md text-[10px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-5)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Preview in
              </button>
              <button
                onClick={() => previewAnimation("hover")}
                disabled={!node.animationHover || node.animationHover === "none" || node.animationHover === "custom"}
                className="px-2 py-1 rounded-md text-[10px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-5)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Preview hover
              </button>
              <button
                onClick={() => applyAnimationConfig({ entrance: "none", hover: "none", duration: "600ms", delay: "0ms", ease: "cubic-bezier(0.22,1,0.36,1)" })}
                className="px-2 py-1 rounded-md text-[10px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-5)] transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Entrance</Label>
              <select
                value={node.animationIn || "none"}
                onChange={(e) => {
                  if (e.target.value === "custom") return;
                  applyAnimationConfig({ entrance: e.target.value });
                }}
                className={PANEL_SELECT}
              >
                {ENTRANCE_ANIMATIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Hover</Label>
              <select
                value={node.animationHover || "none"}
                onChange={(e) => {
                  if (e.target.value === "custom") return;
                  applyAnimationConfig({ hover: e.target.value });
                }}
                className={PANEL_SELECT}
              >
                {HOVER_ANIMATIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            </div>
          {((node.hasCustomEntranceAnimation && node.animationIn === "custom") || (node.hasCustomHoverAnimation && node.animationHover === "custom")) && (
            <p className="text-[10px] text-amber-300/70 leading-relaxed">
              Existing CSS animation detected on this element. Selecting a preset here will override it.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <SliderField
              label="Duration"
              value={animDurationVal}
              min={0}
              max={3000}
              step={50}
              unit="ms"
              onFocus={() => setActiveField("animDuration")}
              onChange={(next) => {
                setAnimDurationVal(next);
                if (next !== "") applyAnimationConfig({ duration: `${Math.max(0, Number(next))}ms` });
              }}
              onCommit={(current) => {
                const next = current.trim() === "" ? "600" : current;
                setAnimDurationVal(next);
                applyAnimationConfig({ duration: `${Math.max(0, Number(next))}ms` });
                setActiveField(null);
              }}
            />
            <SliderField
              label="Delay"
              value={animDelayVal}
              min={0}
              max={2000}
              step={50}
              unit="ms"
              onFocus={() => setActiveField("animDelay")}
              onChange={(next) => {
                setAnimDelayVal(next);
                if (next !== "") applyAnimationConfig({ delay: `${Math.max(0, Number(next))}ms` });
              }}
              onCommit={(current) => {
                const next = current.trim() === "" ? "0" : current;
                setAnimDelayVal(next);
                applyAnimationConfig({ delay: `${Math.max(0, Number(next))}ms` });
                setActiveField(null);
              }}
            />
          </div>
          <div>
            <Label>Easing</Label>
            <select
              value={node.animationEase || "cubic-bezier(0.22,1,0.36,1)"}
              onChange={(e) => applyAnimationConfig({ ease: e.target.value })}
              className={PANEL_SELECT}
            >
              {ANIMATION_EASINGS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </Accordion>

        {/* ── Effects ── */}
        <Accordion title="Effects" icon={<Sparkles size={12}/>} open={open.effects} toggle={() => toggle("effects")}>
          <div className="grid grid-cols-2 gap-2">
            <SliderField
              label="Blur"
              value={blurVal}
              min={0}
              max={40}
              step={1}
              unit="px"
              onFocus={() => setActiveField("blur")}
              onChange={(next) => {
                setBlurVal(next);
                if (next !== "") applyFilterConfig({ blur: next });
              }}
              onCommit={(current) => {
                const next = current.trim() === "" ? "0" : current;
                setBlurVal(parseSizeToken(next, 0));
                applyFilterConfig({ blur: next });
                setActiveField(null);
              }}
            />
            <SliderField
              label="Backdrop Blur"
              value={backdropBlurVal}
              min={0}
              max={40}
              step={1}
              unit="px"
              onFocus={() => setActiveField("backdropBlur")}
              onChange={(next) => {
                setBackdropBlurVal(next);
                if (next !== "") applyBackdropBlur(next);
              }}
              onCommit={(current) => {
                const next = current.trim() === "" ? "0" : current;
                setBackdropBlurVal(parseSizeToken(next, 0));
                applyBackdropBlur(next);
                setActiveField(null);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <SliderField
              label="Brightness"
              value={brightnessVal}
              min={0}
              max={200}
              step={5}
              unit="%"
              onFocus={() => setActiveField("brightness")}
              onChange={(next) => {
                setBrightnessVal(next);
                if (next !== "") applyFilterConfig({ brightness: next });
              }}
              onCommit={(current) => {
                const next = current.trim() === "" ? "100" : current;
                setBrightnessVal(parseSizeToken(next, 100));
                applyFilterConfig({ brightness: next });
                setActiveField(null);
              }}
            />
            <SliderField
              label="Contrast"
              value={contrastVal}
              min={0}
              max={200}
              step={5}
              unit="%"
              onFocus={() => setActiveField("contrast")}
              onChange={(next) => {
                setContrastVal(next);
                if (next !== "") applyFilterConfig({ contrast: next });
              }}
              onCommit={(current) => {
                const next = current.trim() === "" ? "100" : current;
                setContrastVal(parseSizeToken(next, 100));
                applyFilterConfig({ contrast: next });
                setActiveField(null);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <SliderField
              label="Grayscale"
              value={grayscaleVal}
              min={0}
              max={100}
              step={5}
              unit="%"
              onFocus={() => setActiveField("grayscale")}
              onChange={(next) => {
                setGrayscaleVal(next);
                if (next !== "") applyFilterConfig({ grayscale: next });
              }}
              onCommit={(current) => {
                const next = current.trim() === "" ? "0" : current;
                setGrayscaleVal(parseSizeToken(next, 0));
                applyFilterConfig({ grayscale: next });
                setActiveField(null);
              }}
            />
            <SliderField
              label="Saturate"
              value={saturateVal}
              min={0}
              max={200}
              step={5}
              unit="%"
              onFocus={() => setActiveField("saturate")}
              onChange={(next) => {
                setSaturateVal(next);
                if (next !== "") applyFilterConfig({ saturate: next });
              }}
              onCommit={(current) => {
                const next = current.trim() === "" ? "100" : current;
                setSaturateVal(parseSizeToken(next, 100));
                applyFilterConfig({ saturate: next });
                setActiveField(null);
              }}
            />
          </div>

          <div>
            <Label>Mix Blend</Label>
            <select
              value={mixBlendVal}
              onChange={(e) => {
                setMixBlendVal(e.target.value);
                applyStyle("mixBlendMode", e.target.value);
              }}
              className={PANEL_SELECT}
            >
              {MIX_BLEND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Opacity */}
          <div className="space-y-2">
            <Label
              overrideActive={hasResponsiveProp("opacity")}
              onReset={() => resetResponsiveProp(["opacity"])}
            >
              Opacity
            </Label>
            <div className="flex justify-end">
              <div className="relative w-[86px] max-w-full">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(localOpacity * 100)}
                  onFocus={() => setActiveField("opacity")}
                  onChange={(e) => {
                    const next = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                    setLocalOpacity(next / 100);
                    applyStyle("opacity", String(next / 100));
                  }}
                  onBlur={() => setActiveField(null)}
                  className="w-full min-w-0 bg-white/[0.05] border border-white/[0.07] rounded-lg px-2 py-1.5 pr-7 text-[11px] text-left text-white/70 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] uppercase tracking-[0.12em] text-white/28">%</span>
              </div>
            </div>
            <RangeSlider
              min={0}
              max={1}
              step={0.01}
              value={localOpacity}
              onFocus={() => setActiveField("opacity")}
              onBlur={() => setActiveField(null)}
              onChange={(value) => {
                const next = parseFloat(value);
                setLocalOpacity(next);
                applyStyle("opacity", String(next));
              }}
            />
          </div>
          {/* Shadow builder */}
          <div>
            <Label>Box Shadow</Label>
            {/* Quick presets */}
            <div className="grid grid-cols-6 gap-1 mb-2.5">
              {SHADOW_PRESETS.map((s) => (
                <button key={s.label}
                  onClick={() => applyStyle("boxShadow", s.value)}
                  className={`py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                    node.boxShadow === s.value || (s.value === "none" && (!node.boxShadow || node.boxShadow === "none"))
                      ? "bg-[#5B8CFF]/12 text-[#5B8CFF] border-[#5B8CFF]/20"
                      : "text-white/35 border-white/[0.06] hover:border-white/[0.12] hover:text-white/60"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
            {/* Visual layer builder */}
            <ShadowBuilder
              value={node.boxShadow || "none"}
              onChange={(css) => applyStyle("boxShadow", css)}
            />
          </div>
        </Accordion>

        {/* ── Section ── */}
        {node.isSec && (
          <Accordion title="Section" icon={<Layers size={12}/>} open={open.section} toggle={() => toggle("section")}>
            <div>
              <Label
                overrideActive={hasResponsiveProp("background", "backgroundColor")}
                onReset={() => resetResponsiveProp(["background", "backgroundColor"])}
              >
                Background Color
              </Label>
              <ColorPicker
                value={secBgColor ?? "#ffffff"}
                onChange={(hex) => applySectionStyle("background", hex, { batch: true })}
              />
            </div>
            {/* Section Background Image — edits the section element itself */}
            <BgImageEditor
              value={localBgImage} pos={localBgPos} size={localBgSize}
              onChange={(v) => { setLocalBgImage(v); setActiveField("backgroundImage"); }}
              onApply={(v, pos, size) => {
                if (sectionUsesVisualFallback) applySectionVisual(v, pos, size);
                else {
                  setBgGradientOn(false);
                  applyBgImage(v, pos, size);
                }
                setActiveField(null);
              }}
              onPosChange={(pos) => {
                setLocalBgPos(pos);
                if (sectionUsesVisualFallback) applySectionVisual(localBgImage, pos, localBgSize);
                else applyBgImage(localBgImage, pos, localBgSize);
              }}
              onSizeChange={(size) => {
                setLocalBgSize(size);
                if (sectionUsesVisualFallback) applySectionVisual(localBgImage, localBgPos, size);
                else applyBgImage(localBgImage, localBgPos, size);
              }}
              onClear={() => {
                setLocalBgImage("");
                if (sectionUsesVisualFallback) applySectionVisual("", localBgPos, localBgSize);
                else {
                  setBgGradientOn(false);
                  applyBgImage("");
                }
              }}
              onOpenLibrary={() => setMediaPickerTarget("section-own-background")}
            />
            {!sectionUsesVisualFallback ? (
              <SurfaceBackgroundEditor
                repeat={localBgRepeat}
                attachment={localBgAttachment}
                blend={localBgBlend}
                onRepeatChange={(value) => { setLocalBgRepeat(value); applyBgSurface({ repeat: value }); }}
                onAttachmentChange={(value) => { setLocalBgAttachment(value); applyBgSurface({ attachment: value }); }}
                onBlendChange={(value) => { setLocalBgBlend(value); applyBgSurface({ blend: value }); }}
                gradientEnabled={bgGradientOn}
                onToggleGradient={() => {
                  const next = !bgGradientOn;
                  setBgGradientOn(next);
                  if (next) {
                    setLocalBgImage("");
                    applyGradientFill(bgGradDir, bgGradFrom, bgGradTo);
                  } else {
                    applyStyle("backgroundImage", "none");
                  }
                }}
                gradientDir={bgGradDir}
                onGradientDirChange={(value) => {
                  setBgGradDir(value);
                  applyGradientFill(value, bgGradFrom, bgGradTo);
                }}
                gradientFrom={bgGradFrom}
                onGradientFromChange={(value) => {
                  setBgGradFrom(value);
                  applyGradientFill(bgGradDir, value, bgGradTo);
                }}
                gradientTo={bgGradTo}
                onGradientToChange={(value) => {
                  setBgGradTo(value);
                  applyGradientFill(bgGradDir, bgGradFrom, value);
                }}
                onClearGradient={() => {
                  setBgGradientOn(false);
                  applyStyle("backgroundImage", "none");
                }}
              />
            ) : (
              <p className="text-[10px] text-white/28 leading-relaxed">
                This section uses a media backdrop, so repeat, blend, and gradient controls are managed through that visual layer.
              </p>
            )}
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
              overrideActive={hasResponsiveProp("padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft")}
              onReset={() => resetResponsiveProp(["padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"])}
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

        {/* ── Section Background Image (shown for CHILD elements whose parent section has a bg image) ── */}
        {!node.isSec && (node.secHasBgImage || !!node.sectionVisualNodeId) && (
          <Accordion title="Section Background" icon={<Layers size={12}/>} open={open.section} toggle={() => toggle("section")}>
            <p className="text-[9.5px] text-teal-300/60 mb-2">Editing background of parent section: <span className="text-teal-300">{node.sectionName}</span></p>
            <BgImageEditor
              value={localSecBgImage} pos={localSecBgPos} size={localSecBgSize}
              onChange={(v) => { setLocalSecBgImage(v); setActiveField("backgroundImage"); }}
              onApply={(v, pos, size) => {
                if (sectionUsesVisualFallback) applySectionVisual(v, pos, size);
                else applySecBgImage(v, pos, size);
                setActiveField(null);
              }}
              onPosChange={(pos) => {
                setLocalSecBgPos(pos);
                if (sectionUsesVisualFallback) applySectionVisual(localSecBgImage, pos, localSecBgSize);
                else applySecBgImage(localSecBgImage, pos, localSecBgSize);
              }}
              onSizeChange={(size) => {
                setLocalSecBgSize(size);
                if (sectionUsesVisualFallback) applySectionVisual(localSecBgImage, localSecBgPos, size);
                else applySecBgImage(localSecBgImage, localSecBgPos, size);
              }}
              onClear={() => {
                setLocalSecBgImage("");
                if (sectionUsesVisualFallback) applySectionVisual("", localSecBgPos, localSecBgSize);
                else applySecBgImage("");
              }}
              onOpenLibrary={() => setMediaPickerTarget("section-background")}
            />
            {!sectionUsesVisualFallback && (
              <p className="text-[10px] text-white/24 leading-relaxed">
                For repeat, blend, and gradient controls, select the section itself from the navigator first.
              </p>
            )}
          </Accordion>
        )}

        {/* ── CSS Editor ── */}
        <Accordion title="CSS" icon={<Code2 size={12}/>} open={open.css} toggle={() => toggle("css")}>
          <div className="space-y-3">
            <textarea
              value={cssDraft}
              onChange={(e) => setCssDraft(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  // Parse lines into prop/value pairs and apply each
                  const lines = cssDraft.split("\n");
                  lines.forEach((line) => {
                    const trimmed = line.trim().replace(/;$/, "");
                    if (!trimmed) return;
                    const colonIdx = trimmed.indexOf(":");
                    if (colonIdx < 1) return;
                    const rawProp = trimmed.slice(0, colonIdx).trim();
                    const val = trimmed.slice(colonIdx + 1).trim();
                    // Convert kebab-case to camelCase
                    const prop = rawProp.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
                    if (prop && val) send("apply-style", { prop, value: val });
                  });
                }
              }}
              rows={8}
              placeholder={"color: #ffffff\nfont-size: 18px\nborder-radius: 12px"}
              spellCheck={false}
              className="w-full resize-y bg-black/25 border border-white/[0.08] rounded-xl px-3 py-2.5 text-[11px] leading-relaxed text-white/70 font-mono focus:outline-none focus:border-[#5B8CFF]/30 transition-colors placeholder:text-white/16 min-h-[120px]"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const lines = cssDraft.split("\n");
                  lines.forEach((line) => {
                    const trimmed = line.trim().replace(/;$/, "");
                    if (!trimmed) return;
                    const colonIdx = trimmed.indexOf(":");
                    if (colonIdx < 1) return;
                    const rawProp = trimmed.slice(0, colonIdx).trim();
                    const val = trimmed.slice(colonIdx + 1).trim();
                    const prop = rawProp.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
                    if (prop && val) send("apply-style", { prop, value: val });
                  });
                }}
                className="flex-1 rounded-xl border border-[#5B8CFF]/20 bg-[#5B8CFF]/10 py-2 text-[10px] font-semibold text-[#5B8CFF]/90 hover:bg-[#5B8CFF]/16 transition-all"
              >
                Apply CSS <span className="opacity-50 ml-1 text-[9px]">⌘↵</span>
              </button>
              <button
                onClick={() => setCssDraft("")}
                className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-[10px] text-white/35 hover:text-white/60 hover:border-white/[0.14] transition-all"
              >
                Clear
              </button>
            </div>
          </div>
        </Accordion>

        {responsiveAccordion}

      </div>
      </div>
      {project && mediaPickerTarget ? (
        <MediaLibraryModal
          title={mediaPickerTitle}
          description={mediaPickerDescription}
          allowedKinds={mediaPickerKinds}
          allowMultiple={mediaPickerTarget === "logos"}
          selectedUrls={mediaPickerSelectedUrls}
          actionLabel={mediaPickerActionLabel}
          onSelect={(assets) => {
            applyMediaFromLibrary(assets);
            closeMediaPicker();
          }}
          onClose={closeMediaPicker}
        />
      ) : null}
    </>
  );
}
