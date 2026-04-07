"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  BLOCK_PICKER_DEFINITIONS,
  EDITOR_INSERTION_CATEGORIES,
  ICON_DEFINITIONS,
  getElementCategoryDefinition,
  getBlockDefinition,
  renderEditorElementHtml,
  type BlockElementDefinition,
  type ElementCategoryKey,
  type IconElementDefinition,
  type InsertionCategory,
} from "@/lib/blocks/registry";
import { useAppStore } from "@/lib/store";
import {
  API_GENERATE_001,
  API_RESPONSE_001,
  API_UNKNOWN_001,
  createAppError,
  logAppError,
  normalizeError,
  type ErrorCode,
} from "@/lib/errors";
import { uid, extractNavbarHtml } from "@/lib/utils";
import {
  LayoutGrid, Send, Loader2,
  X, Wand2, ImageIcon, Link, ChevronDown, ChevronUp, Sparkles,
  RefreshCw, Menu, Zap, HelpCircle, Users, Mail, Tag, BarChart2,
  Quote, Info, Building2, Type,
} from "lucide-react";
import { EditorSwitch } from "./EditorSwitch";
import { EditPanel } from "./EditPanel";
import type { Project, AIChatMessage } from "@/types";

// Parse a streaming AI assistant reply that may contain a Sitezy edit block.
// Returns { message, edit } where edit is null if the block is missing/incomplete.
function parseAssistReply(full: string): {
  message: string;
  edit: { sectionId?: string; sectionType?: string; html: string } | null;
} {
  const editIdx = full.indexOf("---SITEZY-EDIT---");
  if (editIdx === -1) return { message: full.trim(), edit: null };
  const message = full.slice(0, editIdx).trim();
  const rest = full.slice(editIdx + "---SITEZY-EDIT---".length);
  const htmlIdx = rest.indexOf("---SITEZY-HTML---");
  if (htmlIdx === -1) return { message, edit: null };
  const metaStr = rest.slice(0, htmlIdx).trim();
  const afterHtml = rest.slice(htmlIdx + "---SITEZY-HTML---".length);
  const endIdx = afterHtml.indexOf("---SITEZY-END---");
  if (endIdx === -1) return { message, edit: null };
  const html = afterHtml.slice(0, endIdx).trim();
  let meta: { sectionId?: string; sectionType?: string } = {};
  try { meta = JSON.parse(metaStr); } catch {}
  if (!html) return { message, edit: null };
  return { message, edit: { ...meta, html } };
}

// Strip the edit block + any partial markers from a streaming reply for display.
function stripEditMarkers(full: string): string {
  const editIdx = full.indexOf("---SITEZY-EDIT---");
  if (editIdx !== -1) return full.slice(0, editIdx).trim();
  // Hide a trailing partial marker so the user never sees "---SITE…" mid-stream.
  const partial = full.match(/-{1,3}S?I?T?E?Z?Y?-?E?D?I?T?-{0,3}$/);
  if (partial && partial.index !== undefined) return full.slice(0, partial.index).trim();
  return full.trim();
}

// Replace a single section in pageHtml by data-sz-section-id, preserving the
// surrounding document. Returns null if the target id can't be found.
function replaceSectionById(pageHtml: string, sectionId: string, replacement: string): string | null {
  const marker = `data-sz-section-id="${sectionId}"`;
  const markerIdx = pageHtml.indexOf(marker);
  if (markerIdx === -1) return null;
  const start = pageHtml.lastIndexOf("<", markerIdx);
  if (start === -1) return null;
  const tagMatch = pageHtml.slice(start + 1).match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
  if (!tagMatch) return null;
  const tag = tagMatch[1];
  const openEnd = pageHtml.indexOf(">", markerIdx);
  if (openEnd === -1) return null;
  const openRe = new RegExp(`<${tag}\\b`, "gi");
  const closeRe = new RegExp(`</${tag}\\s*>`, "gi");
  let depth = 1;
  let pos = openEnd + 1;
  while (depth > 0) {
    openRe.lastIndex = pos;
    closeRe.lastIndex = pos;
    const o = openRe.exec(pageHtml);
    const c = closeRe.exec(pageHtml);
    if (!c) return null;
    if (o && o.index < c.index) {
      depth++;
      pos = o.index + o[0].length;
    } else {
      depth--;
      pos = c.index + c[0].length;
    }
  }
  return pageHtml.slice(0, start) + replacement.trim() + pageHtml.slice(pos);
}

// ── Props panel helpers ───────────────────────────────────────────────────────

interface ExtractedField {
  key: string;
  label: string;
  kind: "text" | "src" | "href";
  selector: string;
  nth: number;
  value: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_TYPE_ICONS: Record<string, any> = {
  navbar:      Menu,
  hero:        LayoutGrid,
  features:    LayoutGrid,
  testimonial: Quote,
  cta:         Zap,
  footer:      Menu,
  faq:         HelpCircle,
  pricing:     Tag,
  contact:     Mail,
  about:       Info,
  team:        Users,
  gallery:     ImageIcon,
  logos:       Building2,
  stats:       BarChart2,
};

function getSectionIcon(type: string) {
  const Icon = SECTION_TYPE_ICONS[type] ?? LayoutGrid;
  return <Icon size={11} />;
}

/** Parse all sections directly from page HTML — more reliable than page.sections. */
function parseSectionsFromPageHtml(html: string): { id: string; type: string; name: string }[] {
  if (typeof window === "undefined" || !html) return [];
  try {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
    return Array.from(doc.body.children)
      .filter((el): el is HTMLElement => el instanceof HTMLElement &&
        !["script","style","link","meta"].includes(el.tagName.toLowerCase()))
      .map((el, i) => ({
        id:   el.dataset.szSectionId   || `sec-fallback-${i}`,
        type: el.dataset.szSectionType || "section",
        name: el.dataset.szSectionName ||
              el.querySelector("h1,h2,h3")?.textContent?.trim()?.slice(0, 52) ||
              `Section ${i + 1}`,
      }));
  } catch {
    return [];
  }
}

/** Extract the HTML of a single section from full page HTML. */
function extractSectionHtml(pageHtml: string, sectionId: string): string | null {
  if (typeof window === "undefined" || !pageHtml) return null;
  try {
    const doc = new DOMParser().parseFromString(`<body>${pageHtml}</body>`, "text/html");
    const el = doc.querySelector(`[data-sz-section-id="${sectionId}"]`) as HTMLElement | null;
    return el?.outerHTML ?? null;
  } catch {
    return null;
  }
}

/** Extract editable fields (headings, body text, CTAs, images) from section HTML. */
function extractEditableFields(sectionHtml: string): ExtractedField[] {
  if (typeof window === "undefined" || !sectionHtml) return [];
  try {
    const doc = new DOMParser().parseFromString(`<body>${sectionHtml}</body>`, "text/html");
    const root = doc.body.firstElementChild as HTMLElement | null;
    if (!root) return [];

    const fields: ExtractedField[] = [];
    let h1n = 0, h2n = 0, h3n = 0;

    root.querySelectorAll("h1,h2,h3").forEach((el) => {
      const text = el.textContent?.trim() ?? "";
      if (!text) return;
      const tag = el.tagName.toLowerCase() as "h1" | "h2" | "h3";
      const nth = tag === "h1" ? h1n++ : tag === "h2" ? h2n++ : h3n++;
      const labelMap: Record<string, string[]> = {
        h1: ["Headline", "Headline 2"],
        h2: ["Subheading", "Subheading 2", "Subheading 3"],
        h3: ["Section title", "Section title 2", "Section title 3"],
      };
      fields.push({ key: `${tag}-${nth}`, label: labelMap[tag]?.[nth] ?? `${tag.toUpperCase()} ${nth + 1}`,
        kind: "text", selector: tag, nth, value: text });
    });

    const p = root.querySelector("p");
    if (p) {
      const text = p.textContent?.trim() ?? "";
      if (text) fields.push({ key: "p-0", label: "Body text", kind: "text", selector: "p", nth: 0, value: text });
    }

    // CTAs: buttons + links that look like buttons (not nav/list items)
    const ctaCandidates: Element[] = [];
    root.querySelectorAll("a,button").forEach((el) => {
      const text = el.textContent?.trim() ?? "";
      if (!text || text.length > 80 || text.length < 2) return;
      if (el.closest("nav") || el.closest("ul") || el.closest("ol")) return;
      const cls = (el.getAttribute("class") || "").toLowerCase();
      const isButtonLike =
        el.tagName === "BUTTON" ||
        cls.includes("btn") || cls.includes("button") || cls.includes("cta") ||
        (cls.includes("px-") && cls.includes("py-")) ||
        (cls.includes("px-") && cls.includes("rounded"));
      if (isButtonLike) ctaCandidates.push(el);
    });
    const ctaLabels = ["CTA Button", "Secondary CTA", "Third CTA"];
    ctaCandidates.slice(0, 3).forEach((el, i) => {
      const text = el.textContent?.trim() ?? "";
      fields.push({ key: `cta-text-${i}`, label: ctaLabels[i] ?? `Button ${i + 1}`,
        kind: "text", selector: el.tagName.toLowerCase(), nth: i, value: text });
      if (el.tagName === "A") {
        const href = el.getAttribute("href") ?? "";
        fields.push({ key: `cta-href-${i}`, label: `${ctaLabels[i]} Link`,
          kind: "href", selector: "a", nth: i, value: href });
      }
    });

    // Images
    root.querySelectorAll("img[src]").forEach((img, i) => {
      const src = img.getAttribute("src") ?? "";
      if (!src) return;
      const alt = img.getAttribute("alt")?.trim() || (i === 0 ? "Image" : `Image ${i + 1}`);
      fields.push({ key: `img-${i}`, label: alt.slice(0, 32), kind: "src",
        selector: "img", nth: i, value: src });
    });

    return fields;
  } catch {
    return [];
  }
}

/** Update text content of an element while preserving inner elements (spans, em, etc.). */
function updateElementText(el: HTMLElement, newValue: string, doc: Document): void {
  const tag = el.tagName.toLowerCase();
  // For CTAs/buttons just replace all text (simpler, icon HTML preserved via deep walk)
  if (tag === "a" || tag === "button") {
    const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
    } as NodeFilter);
    const textNodes: Text[] = [];
    let n;
    while ((n = walker.nextNode() as Text | null)) textNodes.push(n);
    if (textNodes.length > 0) {
      textNodes[textNodes.length - 1].nodeValue = newValue;
      for (let j = 0; j < textNodes.length - 1; j++) textNodes[j].nodeValue = "";
    } else {
      el.textContent = newValue;
    }
    return;
  }
  // For headings/paragraphs: preserve child elements (color spans, em, etc.)
  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
  } as NodeFilter);
  const textNodes: Text[] = [];
  let n;
  while ((n = walker.nextNode() as Text | null)) textNodes.push(n);
  if (textNodes.length === 0) { el.textContent = newValue; return; }
  if (textNodes.length === 1) { textNodes[0].nodeValue = newValue; return; }
  // Multiple text nodes — put all text in first, clear others
  textNodes[0].nodeValue = newValue;
  for (let j = 1; j < textNodes.length; j++) textNodes[j].nodeValue = "";
}

/** Apply a batch of field edits to section HTML, return updated section outerHTML. */
function applyFieldEditsToSection(
  sectionHtml: string,
  fields: ExtractedField[],
  edits: Record<string, string>
): string | null {
  if (typeof window === "undefined") return null;
  try {
    const doc = new DOMParser().parseFromString(`<body>${sectionHtml}</body>`, "text/html");
    const root = doc.body.firstElementChild as HTMLElement | null;
    if (!root) return null;

    for (const field of fields) {
      const newVal = edits[field.key];
      if (newVal === undefined) continue;

      // CTA href/src fields — the selector and nth need to match the paired cta-text selector
      // For `cta-href-N`, selector is "a" and nth is N among all `a` elements in the section.
      // But we stored nth as the index among the ctaCandidates slice which may differ from DOM order.
      // Re-use the same candidate list for consistency.
      if (field.key.startsWith("cta-")) {
        const allCandidates = Array.from(root.querySelectorAll("a,button")).filter((el) => {
          const txt = el.textContent?.trim() ?? "";
          if (!txt || txt.length > 80 || txt.length < 2) return false;
          if (el.closest("nav") || el.closest("ul") || el.closest("ol")) return false;
          const cls = (el.getAttribute("class") || "").toLowerCase();
          return (
            el.tagName === "BUTTON" ||
            cls.includes("btn") || cls.includes("button") || cls.includes("cta") ||
            (cls.includes("px-") && cls.includes("py-")) ||
            (cls.includes("px-") && cls.includes("rounded"))
          );
        });
        const ctaIdx = parseInt(field.key.replace(/\D/g, ""), 10);
        const target = allCandidates[ctaIdx] as HTMLElement | null;
        if (!target) continue;
        if (field.kind === "text") updateElementText(target, newVal, doc);
        else if (field.kind === "href") target.setAttribute("href", newVal);
        continue;
      }

      const targets = Array.from(root.querySelectorAll(field.selector)) as HTMLElement[];
      const target = targets[field.nth];
      if (!target) continue;

      if (field.kind === "text")      updateElementText(target, newVal, doc);
      else if (field.kind === "src")  { target.setAttribute("src", newVal); target.removeAttribute("srcset"); }
      else if (field.kind === "href") target.setAttribute("href", newVal);
    }

    return root.outerHTML;
  } catch {
    return null;
  }
}

function getRequestId(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;

  if ("metadata" in error) {
    const metadata = (error as { metadata?: Record<string, unknown> }).metadata;
    const requestId = metadata?.requestId;
    if (typeof requestId === "string" && requestId.trim()) return requestId;
  }

  if ("requestId" in error) {
    const requestId = (error as { requestId?: unknown }).requestId;
    if (typeof requestId === "string" && requestId.trim()) return requestId;
  }

  return null;
}

function buildClientApiError(error: unknown, fallbackCode: ErrorCode, metadata?: Record<string, unknown>) {
  const requestId = getRequestId(error);
  const appErr = normalizeError(error, fallbackCode, {
    ...metadata,
    ...(requestId ? { requestId } : {}),
  });

  return {
    appErr,
    apiError: {
      message: appErr.userMessage,
      requestId,
      code: appErr.code,
    },
  };
}

interface Props { project: Project; }

function createPriorityMap(ids: string[]) {
  return new Map(ids.map((id, index) => [id, index]));
}

const DEFAULT_BLOCK_PRIORITY = createPriorityMap([
  "hero",
  "hero-split",
  "split-image",
  "features",
  "features-list",
  "stats",
  "cta",
  "cta-strip",
  "testimonials",
  "pricing",
  "faq",
  "contact-form",
  "newsletter",
  "team",
  "logo-wall",
  "logo-scroller",
  "video-section",
  "navbar",
  "navbar-center",
  "navbar-minimal",
  "footer",
  "gallery",
  "two-columns",
  "three-columns",
  "grid",
  "container",
  "flex-container",
  "heading",
  "paragraph",
  "button",
  "image",
  "social-links",
  "map-embed",
]);

const INLINE_BLOCK_PRIORITY = createPriorityMap([
  "heading",
  "paragraph",
  "button",
  "button-outline",
  "badge",
  "highlight-text",
  "blockquote",
  "image",
  "video",
  "youtube",
  "embed",
  "list",
  "icon-list",
  "pill-list",
  "divider",
  "icon-circle",
]);

const MEDIA_BLOCK_PRIORITY = createPriorityMap([
  "image",
  "video",
  "youtube",
  "embed",
  "gallery",
  "logo-wall",
  "logo-scroller",
  "map-embed",
]);

const FORM_BLOCK_PRIORITY = createPriorityMap([
  "text-input",
  "textarea-field",
  "select-field",
  "checkbox-field",
  "radio-group",
  "toggle-switch",
  "contact-form",
  "button",
]);

const TEXT_BLOCK_PRIORITY = createPriorityMap([
  "heading",
  "paragraph",
  "button",
  "button-outline",
  "badge",
  "highlight-text",
  "blockquote",
  "list",
  "icon-list",
  "pill-list",
  "divider",
]);

function priorityRank(map: Map<string, number>, blockId: string) {
  return map.get(blockId) ?? Number.MAX_SAFE_INTEGER;
}

export function RightSidebar({ project }: Props) {
  const rightPanelTab = useAppStore((s) => s.editor.rightPanelTab);
  const selectedNode  = useAppStore((s) => s.editor.selectedNode);
  const setRightPanel = useAppStore((s) => s.setRightPanel);
  const previousSelectedNodeIdRef = useRef<string | null>(null);

  // Stable iframe ref via MutationObserver
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    function find() {
      const el = document.querySelector('iframe[data-sitezy-preview-frame="1"]') as HTMLIFrameElement | null;
      if (el) iframeRef.current = el;
    }
    find();
    const obs = new MutationObserver(find);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  // New selection can hand off to the inspector, but do not lock the user there.
  useEffect(() => {
    const nextId = selectedNode?.nodeId ?? null;
    const prevId = previousSelectedNodeIdRef.current;
    previousSelectedNodeIdRef.current = nextId;

    if (!nextId || nextId === prevId) return;
    if (rightPanelTab === "style" || rightPanelTab === "properties") return;
    setRightPanel("style");
  }, [selectedNode?.nodeId, rightPanelTab, setRightPanel]);

  const tabs = [
    { key: "style"  as const, label: "Style" },
    { key: "blocks" as const, label: "Blocks" },
    { key: "ai"     as const, label: "AI" },
  ];

  const tabMeta: Record<typeof rightPanelTab, { title: string; subtitle: string }> = {
    style: {
      title: "Inspector",
      subtitle: selectedNode ? "Style and settings for the current selection." : "Select something on the canvas to start editing.",
    },
    theme: {
      title: "Design System",
      subtitle: "Site-wide design archetype, typography, spacing, and color direction.",
    },
    blocks: {
      title: "Elements",
      subtitle: "Insert layout, content, media, and interaction blocks into the current page.",
    },
    ai: {
      title: "AI assistant",
      subtitle: "Generate refinements, copy changes, and structural ideas without leaving the editor.",
    },
    properties: {
      title: "Properties",
      subtitle: "Inspect configuration and metadata for the current selection.",
    },
  };

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/[0.04] bg-[#0e1117]/95 backdrop-blur-2xl">
      <div className="flex flex-shrink-0 flex-col gap-2.5 px-3.5 pb-2.5 pt-3.5">
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setRightPanel(t.key)}
              className={`relative flex h-8 flex-1 items-center justify-center rounded-[10px] text-center transition-all duration-200 ${
                rightPanelTab === t.key
                  ? "bg-white/[0.08] text-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "text-white/32 hover:text-white/55"
              }`}
            >
              <span className="text-[10.5px] font-medium tracking-wide">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3">
        {rightPanelTab === "style"      && <EditPanel iframeRef={iframeRef as React.RefObject<HTMLIFrameElement>} onClose={() => setRightPanel("ai")} project={project} />}
        {rightPanelTab === "ai"         && <AIPanel project={project} />}
        {rightPanelTab === "properties" && <PropsPanel project={project} />}
        {rightPanelTab === "blocks"     && <BlocksPanel project={project} />}
      </div>
    </aside>
  );
}

// ── AI Panel ──────────────────────────────────────────────────────────────────

// ── AI Panel ──────────────────────────────────────────────────────────────────
function AIPanel({ project }: Props) {
  const selectedPageId   = useAppStore((s) => s.editor.selectedPageId);
  const aiChats          = useAppStore((s) => s.aiChats);
  const aiDraftPrompt    = useAppStore((s) => s.aiDraftPrompt);
  const addChatMessage   = useAppStore((s) => s.addChatMessage);
  const setAiDraftPrompt = useAppStore((s) => s.setAiDraftPrompt);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const clearChat        = useAppStore((s) => s.clearChat);
  const setApiError      = useAppStore((s) => s.setApiError);
  const setPageContent   = useAppStore((s) => s.setPageContent);
  const addGenLog        = useAppStore((s) => s.addGenLog);

  const pages    = project?.pages ?? [];
  const page     = pages.find((p) => p.id === selectedPageId) ?? null;
  const msgs: AIChatMessage[] = aiChats[currentProjectId ?? ""] ?? [];

  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => {
    if (!aiDraftPrompt) return;
    setAiDraftPrompt(null);
    send(aiDraftPrompt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiDraftPrompt]);

  const suggestions = page
    ? [`Improve ${page.name} copy`, "Make it more premium", "Stronger CTA", "Bolder headings", "Layout improvements"]
    : ["Improve hero copy", "Make it minimal", "Add a CTA", "Better tagline"];

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setInput(""); setLoading(true);
    const uid1 = uid();
    addChatMessage(currentProjectId ?? "", { id: uid1, role: "user", content: text, timestamp: Date.now(), pageId: selectedPageId ?? undefined });
    const aid = uid(); let full = "";
    try {
      const res = await fetch("/api/assist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: text, context: { projectName: project.name, blueprint: project.blueprint, pageName: page?.name, pageHtml: page?.html, siteType: project.brief?.siteType } }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; code?: string; requestId?: string | null };
        throw createAppError({
          code: (data.code as ErrorCode | undefined) ?? API_UNKNOWN_001,
          devMessage: `AI assist request failed (${res.status}): ${data.error ?? "unknown error"}`,
          userMessage: data.error,
          severity: res.status >= 500 ? "error" : "warn",
          metadata: { pageId: page?.id ?? null, pageName: page?.name ?? null, requestId: data.requestId ?? null, status: res.status },
        });
      }
      addChatMessage(currentProjectId ?? "", { id: aid, role: "assistant", content: "▌", timestamp: Date.now() });
      const reader = res.body?.getReader(); const dec = new TextDecoder();
      if (!reader) {
        throw createAppError({
          code: API_RESPONSE_001,
          devMessage: "AI assist response body was missing a stream reader",
          severity: "error",
          metadata: { pageId: page?.id ?? null, pageName: page?.name ?? null },
        });
      }
      let buf = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(l.slice(6)) as { type: string; chunk?: string; error?: string; requestId?: string; code?: string };
            if (d.type === "chunk") {
              full += d.chunk;
              const display = stripEditMarkers(full) || "▌";
              addChatMessage(currentProjectId ?? "", { id: aid, role: "assistant", content: display, timestamp: Date.now() });
            }
            if (d.type === "error") {
              if (d.requestId || d.code) setApiError({ message: d.error ?? "AI error", requestId: d.requestId ?? null, code: d.code ?? API_UNKNOWN_001 });
              addChatMessage(currentProjectId ?? "", { id: aid, role: "assistant", content: `⚠️ ${d.error ?? "Something went wrong"}`, timestamp: Date.now() });
            }
          } catch {}
        }
      }

      // Stream complete — parse the reply, finalise the visible message, apply any edit.
      const parsed = parseAssistReply(full);
      const finalMessage = parsed.message || (parsed.edit ? "Done." : full.trim());
      addChatMessage(currentProjectId ?? "", { id: aid, role: "assistant", content: finalMessage, timestamp: Date.now() });

      if (parsed.edit && page && parsed.edit.html) {
        const sectionId = parsed.edit.sectionId?.trim();
        let nextHtml: string | null = null;
        if (sectionId) {
          nextHtml = replaceSectionById(page.html ?? "", sectionId, parsed.edit.html);
        }
        if (nextHtml) {
          setPageContent(page.id, nextHtml, page.sections);
          addGenLog(`✅ ${parsed.edit.sectionType ?? "Section"} updated`, "success");
        } else {
          addChatMessage(currentProjectId ?? "", {
            id: uid(),
            role: "assistant",
            content: "⚠️ I couldn't locate that section to update. Try selecting it first or rephrasing the request.",
            timestamp: Date.now(),
          });
        }
      }
    } catch (err) {
      const { appErr, apiError } = buildClientApiError(err, API_UNKNOWN_001, {
        pageId: page?.id ?? null,
        pageName: page?.name ?? null,
      });
      logAppError(appErr);
      setApiError(apiError);
      addChatMessage(currentProjectId ?? "", { id: uid(), role: "assistant", content: `⚠️ ${appErr.userMessage}`, timestamp: Date.now() });
    } finally { setLoading(false); }
  }

  const deduped = msgs.reduce<AIChatMessage[]>((acc, m) => {
    const i = acc.findIndex((x) => x.id === m.id);
    if (i >= 0) { acc[i] = m; return acc; }
    return [...acc, m];
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-auto p-3 space-y-2 min-h-0">
        {deduped.length === 0 ? (
          <div className="py-6 px-3 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#5B8CFF]/10">
              <Sparkles size={15} className="text-[#5B8CFF]/70"/>
            </div>
            <p className="text-[11px] text-white/35">{page ? `AI for ${page.name}` : "Ask about your site"}</p>
            <div className="space-y-1.5 text-left">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="block w-full rounded-xl px-3 py-2.5 text-left text-[11px] text-white/40 transition-all duration-150 bg-white/[0.02] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:bg-white/[0.04] hover:text-white/70 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <button onClick={() => clearChat(currentProjectId ?? "")}
              className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-[9.5px] text-white/30 hover:bg-white/[0.04] hover:text-white/55 transition-colors">
              <X size={9}/> Clear
            </button>
            {deduped.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] px-3.5 py-2.5 text-[11.5px] leading-relaxed rounded-2xl ${
                  m.role === "user"
                    ? "bg-[#5B8CFF]/15 text-white/80 rounded-br-sm"
                    : "bg-white/[0.03] text-white/55 rounded-bl-sm shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.03] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] rounded-2xl rounded-bl-sm px-3 py-2">
                  <Loader2 size={11} className="text-[#5B8CFF] animate-spin"/>
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </>
        )}
      </div>
      <div className="border-t border-white/[0.04] p-3 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask AI to improve your site…" rows={2}
            className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-[11.5px] text-white/65 placeholder-white/16 outline-none resize-none transition-colors focus:border-white/[0.1]"/>
          <button onClick={() => send(input)} disabled={!input.trim() || loading}
            className="w-8 h-8 flex items-center justify-center bg-[#5B8CFF] hover:bg-[#6B99FF] disabled:opacity-20 rounded-xl transition-colors flex-shrink-0 shadow-[0_2px_8px_rgba(91,140,255,0.2)]">
            {loading ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Properties Panel ──────────────────────────────────────────────────────────
function PropsPanel({ project }: Props) {
  const selectedPageId    = useAppStore((s) => s.editor.selectedPageId);
  const selectedNode      = useAppStore((s) => s.editor.selectedNode);
  const selectedSectionId = useAppStore((s) => s.editor.selectedSectionId);
  const setPageContent    = useAppStore((s) => s.setPageContent);
  const addGenLog         = useAppStore((s) => s.addGenLog);
  const setApiError       = useAppStore((s) => s.setApiError);

  const page = (project?.pages ?? []).find((p) => p.id === selectedPageId) ?? null;

  // Always derive sections fresh from page HTML so we never miss any
  const liveSections = useMemo(
    () => (page?.html ? parseSectionsFromPageHtml(page.html) : page?.sections ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page?.html]
  );

  const [expandedId,    setExpandedId]    = useState<string | null>(null);
  const [activeTab,     setActiveTab]     = useState<Record<string, "fields" | "ai">>({});
  const [fieldEdits,    setFieldEdits]    = useState<Record<string, Record<string, string>>>({});
  const [aiInstructions,setAiInstructions]= useState<Record<string, string>>({});
  const [applying,      setApplying]      = useState<string | null>(null);
  // Fields are derived lazily when a section is expanded
  const [sectionFields, setSectionFields] = useState<Record<string, ExtractedField[]>>({});

  // Refs for scroll-to-section
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs        = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setExpandedId(null);
    setFieldEdits({});
    setAiInstructions({});
    setActiveTab({});
    setSectionFields({});
  }, [selectedPageId]);

  // When canvas selection changes to a section, auto-expand + scroll to it
  useEffect(() => {
    if (!selectedSectionId) return;
    const exists = liveSections.some(s => s.id === selectedSectionId);
    if (!exists) return;
    setExpandedId(selectedSectionId);
  }, [selectedSectionId]); // eslint-disable-line

  // Scroll to expanded section
  useEffect(() => {
    if (!expandedId) return;
    const el = sectionRefs.current[expandedId];
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [expandedId]);

  // When a section is expanded, extract its fields
  useEffect(() => {
    if (!expandedId || !page?.html) return;
    if (sectionFields[expandedId]) return; // already extracted
    const html = extractSectionHtml(page.html, expandedId);
    if (html) setSectionFields(prev => ({ ...prev, [expandedId]: extractEditableFields(html) }));
  }, [expandedId, page?.html, sectionFields]);

  // Refresh fields if the page HTML changes (after an AI edit)
  const prevHtmlRef = useRef<string>("");
  useEffect(() => {
    if (!page?.html || page.html === prevHtmlRef.current) return;
    prevHtmlRef.current = page.html;
    if (expandedId) {
      const html = extractSectionHtml(page.html, expandedId);
      if (html) {
        const newFields = extractEditableFields(html);
        setSectionFields(prev => ({ ...prev, [expandedId]: newFields }));
        // Clear field edits that are now stale (values match the updated page)
        setFieldEdits(prev => {
          const pending = prev[expandedId] ?? {};
          const refreshed: Record<string, string> = {};
          for (const [k, v] of Object.entries(pending)) {
            const field = newFields.find(f => f.key === k);
            if (field && v !== field.value) refreshed[k] = v;
          }
          return { ...prev, [expandedId]: refreshed };
        });
      }
    }
  }, [page?.html, expandedId]);

  /** Apply direct field edits — no AI round-trip. */
  async function applyFields(sec: { id: string; type: string; name: string }) {
    if (!page) return;
    const edits   = fieldEdits[sec.id] ?? {};
    const fields  = sectionFields[sec.id] ?? [];
    if (Object.keys(edits).length === 0 || fields.length === 0) return;
    setApplying(sec.id);
    try {
      const secHtml = extractSectionHtml(page.html, sec.id);
      if (!secHtml) { addGenLog("❌ Section not found in page", "error"); return; }

      const updatedSec = applyFieldEditsToSection(secHtml, fields, edits);
      if (!updatedSec) { addGenLog("❌ Field edit failed", "error"); return; }

      const newPageHtml = replaceSectionById(page.html, sec.id, updatedSec);
      if (!newPageHtml) { addGenLog("❌ Could not splice section", "error"); return; }

      setPageContent(page.id, newPageHtml, page.sections);
      setFieldEdits(prev => { const n = { ...prev }; delete n[sec.id]; return n; });
      addGenLog(`✅ ${sec.name} updated`, "success");
    } finally {
      setApplying(null);
    }
  }

  /** Regenerate a section using the AI — uses /api/regenerate-section. */
  async function regenerateSection(sec: { id: string; type: string; name: string }, instruction?: string) {
    if (!page || !project.blueprint) return;
    if (!project.brief) { addGenLog("❌ Project brief required for AI rewrite", "error"); return; }
    setApplying(`ai-${sec.id}`);
    try {
      const secHtml = extractSectionHtml(page.html, sec.id);
      if (!secHtml) throw new Error("Section not found in page HTML");

      const idx       = liveSections.findIndex(s => s.id === sec.id);
      const prevSec   = idx > 0 ? liveSections[idx - 1] : null;
      const nextSec   = idx < liveSections.length - 1 ? liveSections[idx + 1] : null;
      const bpPage    = project.blueprint.pages?.find(
        p => p.name.toLowerCase() === page.name.toLowerCase()
      ) ?? project.blueprint.pages?.[0];

      const res = await fetch("/api/regenerate-section", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: project.blueprint,
          brief:     project.brief,
          page:      { name: page.name, purpose: bpPage?.purpose ?? page.name },
          section:   {
            id:                  sec.id,
            type:                sec.type,
            name:                sec.name,
            html:                secHtml,
            previousSectionName: prevSec?.name ?? null,
            nextSectionName:     nextSec?.name ?? null,
          },
          instruction: instruction?.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; code?: string; requestId?: string | null };
        throw createAppError({
          code: (data.code as ErrorCode | undefined) ?? API_UNKNOWN_001,
          devMessage: `Regenerate section failed (${res.status}): ${data.error ?? ""}`,
          userMessage: data.error,
          severity: res.status >= 500 ? "error" : "warn",
          metadata: { pageId: page.id, sectionId: sec.id, sectionType: sec.type, requestId: data.requestId ?? null, status: res.status },
        });
      }

      const data = await res.json() as { html?: string };
      if (!data.html) throw new Error("No HTML returned from regenerate-section");

      const newPageHtml = replaceSectionById(page.html, sec.id, data.html);
      if (!newPageHtml) throw new Error("Failed to splice regenerated section into page");

      setPageContent(page.id, newPageHtml, page.sections);
      setAiInstructions(prev => { const n = { ...prev }; delete n[sec.id]; return n; });
      addGenLog(`✅ ${sec.name} regenerated`, "success");
    } catch (error) {
      const { appErr, apiError } = buildClientApiError(error, API_UNKNOWN_001, {
        pageId: page.id, pageName: page.name, sectionId: sec.id, sectionType: sec.type,
      });
      logAppError(appErr);
      setApiError(apiError);
      addGenLog(`❌ ${appErr.userMessage}`, "error");
    } finally {
      setApplying(null);
    }
  }

  if (!page) return (
    <div className="flex h-full items-center justify-center px-4 text-center text-[11px] text-white/18">
      Select a page to edit sections.
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/[0.04] px-3.5 py-2.5">
        <p className="text-[11px] font-medium text-white/40">{page.name}</p>
        <p className="mt-0.5 text-[9.5px] text-white/18">{liveSections.length} section{liveSections.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Canvas selection context banner */}
      {selectedNode && (
        <div className="flex-shrink-0 flex items-center gap-2 border-b border-[#5B8CFF]/10 bg-[#5B8CFF]/[0.04] px-3.5 py-2">
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#5B8CFF]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-medium text-[#5B8CFF]/80">{selectedNode.label}</p>
            {selectedNode.sectionName && (
              <p className="truncate text-[9px] text-white/30">in {selectedNode.sectionName}</p>
            )}
          </div>
        </div>
      )}

      {/* Section list */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {liveSections.length === 0 && (
          <div className="py-8 text-center text-[11px] text-white/20">No sections found.</div>
        )}
        {liveSections.map((sec) => {
          const isOpen     = expandedId === sec.id;
          const tab        = activeTab[sec.id] ?? "fields";
          const pending    = fieldEdits[sec.id] ?? {};
          const hasPending = Object.keys(pending).length > 0;
          const fields     = sectionFields[sec.id] ?? [];
          const isApplying    = applying === sec.id;
          const isAiApplying  = applying === `ai-${sec.id}`;
          const isAnyApplying = isApplying || isAiApplying;

          return (
            <div key={sec.id}
              ref={(el) => { sectionRefs.current[sec.id] = el; }}
              className={`overflow-hidden rounded-xl bg-white/[0.02] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] transition-shadow ${
                selectedSectionId === sec.id ? "shadow-[inset_0_0_0_1px_rgba(91,140,255,0.25)]" : ""
              }`}
            >
              {/* Row header */}
              <button
                onClick={() => setExpandedId(isOpen ? null : sec.id)}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
              >
                <span className={`flex-shrink-0 ${selectedSectionId === sec.id ? "text-[#5B8CFF]/60" : "text-white/25"}`}>
                  {getSectionIcon(sec.type)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[10.5px] font-medium ${selectedSectionId === sec.id ? "text-[#5B8CFF]/80" : "text-white/55"}`}>
                    {sec.name}
                  </span>
                  <span className="mt-0.5 block text-[9px] uppercase tracking-[0.1em] text-white/22">{sec.type}</span>
                </span>
                {hasPending && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#5B8CFF]" />}
                {isOpen
                  ? <ChevronUp size={10} className="flex-shrink-0 text-white/16"/>
                  : <ChevronDown size={10} className="flex-shrink-0 text-white/16"/>}
              </button>

              {/* Expanded body */}
              {isOpen && (
                <div className="border-t border-white/[0.04]">
                  {/* Tab bar */}
                  <div className="flex border-b border-white/[0.04]">
                    {(["fields", "ai"] as const).map((t) => (
                      <button key={t}
                        onClick={() => setActiveTab(p => ({ ...p, [sec.id]: t }))}
                        className={`flex-1 py-2 text-[9.5px] font-medium uppercase tracking-[0.08em] transition-colors ${
                          tab === t
                            ? "text-[#5B8CFF] border-b border-[#5B8CFF]"
                            : "text-white/22 hover:text-white/40"
                        }`}
                      >
                        {t === "fields" ? "Edit Fields" : "AI Rewrite"}
                      </button>
                    ))}
                  </div>

                  <div className="p-2.5 space-y-2">
                    {/* ── Edit Fields tab ── */}
                    {tab === "fields" && (
                      <>
                        {fields.length === 0 ? (
                          <p className="py-3 text-center text-[10px] text-white/22">
                            {sectionFields[sec.id] ? "No editable fields detected." : "Loading fields…"}
                          </p>
                        ) : (
                          <>
                            {fields.map((field) => (
                              <SectionFieldInput
                                key={field.key}
                                field={field}
                                value={pending[field.key] ?? field.value}
                                isDirty={pending[field.key] !== undefined && pending[field.key] !== field.value}
                                onChange={(val) =>
                                  setFieldEdits(prev => ({
                                    ...prev,
                                    [sec.id]: { ...(prev[sec.id] ?? {}), [field.key]: val },
                                  }))
                                }
                              />
                            ))}
                            <button
                              onClick={() => applyFields(sec)}
                              disabled={!hasPending || isAnyApplying}
                              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#5B8CFF]/[0.12] py-2 text-[10.5px] font-medium text-[#5B8CFF] transition-colors hover:bg-[#5B8CFF]/[0.2] disabled:opacity-25"
                            >
                              {isApplying
                                ? <><Loader2 size={10} className="animate-spin"/>Applying…</>
                                : "Apply Changes"}
                            </button>
                          </>
                        )}
                      </>
                    )}

                    {/* ── AI Rewrite tab ── */}
                    {tab === "ai" && (
                      <div className="space-y-2">
                        <textarea
                          value={aiInstructions[sec.id] ?? ""}
                          onChange={(e) => setAiInstructions(p => ({ ...p, [sec.id]: e.target.value }))}
                          placeholder={`e.g. "make the headline more compelling", "add urgency to the CTA"`}
                          rows={3}
                          disabled={isAnyApplying}
                          className="w-full resize-none rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 text-[11px] text-white/65 placeholder-white/14 outline-none transition-colors focus:border-white/[0.1] disabled:opacity-40"
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => regenerateSection(sec, aiInstructions[sec.id])}
                            disabled={!aiInstructions[sec.id]?.trim() || isAnyApplying}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#5B8CFF]/[0.12] py-2 text-[10.5px] font-medium text-[#5B8CFF] transition-colors hover:bg-[#5B8CFF]/[0.2] disabled:opacity-25"
                          >
                            {isAiApplying && applying === `ai-${sec.id}`
                              ? <><Loader2 size={10} className="animate-spin"/>Rewriting…</>
                              : <><Wand2 size={10}/>Rewrite</>}
                          </button>
                          <button
                            onClick={() => regenerateSection(sec)}
                            disabled={isAnyApplying}
                            title="Regenerate from scratch"
                            className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-[10px] text-white/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] transition-colors hover:bg-white/[0.05] hover:text-white/55 disabled:opacity-25"
                          >
                            <RefreshCw size={10}/> Regen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section field input ───────────────────────────────────────────────────────
function SectionFieldInput({
  field, value, isDirty, onChange,
}: {
  field: ExtractedField;
  value: string;
  isDirty: boolean;
  onChange: (val: string) => void;
}) {
  const isLong = value.length > 64 || field.kind === "text" && field.label.toLowerCase().includes("body");
  const isUrl  = field.kind === "src" || field.kind === "href";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="flex items-center gap-1 text-[8.5px] font-medium uppercase tracking-[0.12em] text-white/25">
          {isUrl ? <Link size={7}/> : <Type size={7}/>}
          {field.label}
        </label>
        {isDirty && <span className="text-[8px] text-[#5B8CFF]/70">edited</span>}
      </div>
      {isLong ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className={`w-full resize-none rounded-lg border ${isDirty ? "border-[#5B8CFF]/30" : "border-white/[0.06]"} bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-white/65 placeholder-white/14 outline-none transition-colors focus:border-white/[0.12]`}
        />
      ) : (
        <input
          type={isUrl ? "url" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-lg border ${isDirty ? "border-[#5B8CFF]/30" : "border-white/[0.06]"} bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-white/65 placeholder-white/14 outline-none transition-colors focus:border-white/[0.12]`}
        />
      )}
    </div>
  );
}

// ── Blocks Panel ──────────────────────────────────────────────────────────────
function BlocksPanel({ project }: Props) {
  const [cat,    setCat]    = useState<"all" | ElementCategoryKey>("all");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string|null>(null);
  const [aiStatus, setAiStatus] = useState<{ msg: string; type: "loading"|"success"|"error" } | null>(null);
  const [useAI,  setUseAI]  = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const insertBlock   = useAppStore((s) => s.insertBlock);
  const setPageContent= useAppStore((s) => s.setPageContent);
  const addGenLog     = useAppStore((s) => s.addGenLog);
  const setApiError   = useAppStore((s) => s.setApiError);
  const selectedPageId= useAppStore((s) => s.editor.selectedPageId);
  const selectedSectionId = useAppStore((s) => s.editor.selectedSectionId);
  const selectedNode = useAppStore((s) => s.editor.selectedNode);
  const page = (project?.pages ?? []).find((p) => p.id === selectedPageId) ?? null;
  const selectedSection = page?.sections.find((sec) => sec.id === selectedSectionId) ?? null;
  const searchQuery = search.trim().toLowerCase();

  const dragOverlayRef = useRef<HTMLDivElement | null>(null);
  const dropLineRef    = useRef<HTMLDivElement | null>(null);
  const dropHintRef    = useRef<HTMLDivElement | null>(null);
  const categoryTabs = useMemo(() => EDITOR_INSERTION_CATEGORIES, []);
  const categoryRows = useMemo(
    () =>
      [
        ["all", "sections", "layout", "basic"],
        ["media", "navigation", "typography", "interactive"],
        ["forms", "advanced", "icons"],
      ].map((row) =>
        row
          .map((key) => categoryTabs.find((tab) => tab.key === key))
          .filter((tab): tab is InsertionCategory => !!tab)
      ),
    [categoryTabs]
  );

  function blockScore(block: BlockElementDefinition) {
    let score = 0;

    if (!selectedNode && !selectedSectionId) {
      if (block.placement === "section") score += 3;
      if (block.placement === "top" || block.placement === "bottom") score += 1;
    }

    if (selectedSectionId) {
      if (block.placement === "inline") score += 3;
      if (block.placement === "section") score += 1;
    }

    if (selectedNode?.isText || selectedNode?.isBtn) {
      if (block.placement === "inline") score += 4;
      if (["heading", "paragraph", "button", "button-outline", "badge", "blockquote", "divider"].includes(block.id)) score += 3;
    }

    if (selectedNode?.isImg || selectedNode?.isVideo || selectedNode?.isIframe) {
      if (block.category === "media") score += 4;
      if (block.placement === "inline") score += 2;
    }

    if (selectedNode?.isInput || selectedNode?.tag === "form") {
      if (block.category === "forms") score += 5;
      if (block.placement === "inline") score += 2;
      if (block.placement === "section") score -= 1;
    }

    if (selectedNode && (block.placement === "top" || block.placement === "bottom")) score -= 1;
    return score;
  }

  function blockPriority(block: BlockElementDefinition) {
    let priority = priorityRank(DEFAULT_BLOCK_PRIORITY, block.id);

    if (!selectedNode && !selectedSectionId) {
      if (priority === Number.MAX_SAFE_INTEGER) {
        priority =
          block.placement === "section"
            ? 400
            : block.placement === "top" || block.placement === "bottom"
            ? 520
            : 640;
      }
      return priority;
    }

    if (selectedSectionId) {
      priority = Math.min(priority, priorityRank(INLINE_BLOCK_PRIORITY, block.id));
      if (priority === Number.MAX_SAFE_INTEGER) {
        priority =
          block.placement === "inline"
            ? 260
            : block.placement === "section"
            ? 360
            : 560;
      }
      return priority;
    }

    if (selectedNode?.isInput || selectedNode?.tag === "form") {
      priority = Math.min(priority, priorityRank(FORM_BLOCK_PRIORITY, block.id));
    }

    if (selectedNode?.isImg || selectedNode?.isVideo || selectedNode?.isIframe) {
      priority = Math.min(priority, priorityRank(MEDIA_BLOCK_PRIORITY, block.id));
    }

    if (selectedNode?.isText || selectedNode?.isBtn) {
      priority = Math.min(priority, priorityRank(TEXT_BLOCK_PRIORITY, block.id));
    }

    if (priority === Number.MAX_SAFE_INTEGER) {
      priority =
        block.placement === "inline"
          ? 280
          : block.category === "media"
          ? 340
          : block.category === "forms"
          ? 360
          : 460;
    }

    return priority;
  }

  function placementText(block: BlockElementDefinition) {
    if (block.placement === "top") return "Top of page";
    if (block.placement === "bottom") return "Bottom of page";
    if (block.placement === "section") return selectedSection?.name ? `After ${selectedSection.name}` : "Next section";
    if (selectedNode?.isInput || selectedNode?.tag === "form") return "Current form";
    if (selectedNode?.label) return `Near ${selectedNode.label}`;
    if (selectedSection?.name) return `Inside ${selectedSection.name}`;
    return "Current page";
  }

  const filtered = useMemo(() => {
    return BLOCK_PICKER_DEFINITIONS
      .filter((block) => cat === "all" || block.category === cat)
      .filter((block) => {
        if (!searchQuery) return true;
        return (
          block.label.toLowerCase().includes(searchQuery) ||
          block.preview.toLowerCase().includes(searchQuery) ||
          block.id.toLowerCase().includes(searchQuery) ||
          block.keywords.some((keyword) => keyword.includes(searchQuery))
        );
      })
      .map((block) => ({
        block,
        score: blockScore(block),
        priority: blockPriority(block),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.block.label.localeCompare(b.block.label);
      });
  }, [cat, searchQuery, selectedNode, selectedSectionId, selectedSection?.name]);

  function canReplaceSelectedTextWithIcon() {
    if (!selectedNode || !selectedNode.hasEditableText || selectedNode.isInput) return false;
    const text = String(selectedNode.editableText ?? selectedNode.text ?? "").trim();
    if (!text) return false;
    const compact = text.replace(/\s+/g, "");
    if (!compact) return false;
    if (!/[A-Za-z0-9]/.test(compact) && compact.length <= 8) return true;
    const decorativeChars = new Set(Array.from("★☆✦✧•◦▪▫■□◆◇◎◉○●◌⬤⬥⚡🔥💡🚀📍🎯✨⭐🌟❖❋❂❈❉❊✳✴✶✹✺✸✚➜➤➔→←↑↓"));
    return Array.from(compact).every((ch) => decorativeChars.has(ch) || ch.codePointAt(0)! > 0x1f000);
  }

  function getIframe() {
    return document.querySelector('iframe[data-sitezy-preview-frame="1"]') as HTMLIFrameElement | null;
  }

  function getSections(iframe: HTMLIFrameElement): HTMLElement[] {
    const doc = iframe.contentDocument;
    if (!doc) return [];
    return Array.from(doc.body.children).filter(
      (el) => !["SCRIPT","STYLE","NOSCRIPT"].includes(el.tagName)
    ) as HTMLElement[];
  }

  function sectionLabel(section: HTMLElement | null) {
    return section?.getAttribute("data-sz-section-name") || section?.getAttribute("data-sz-section-type") || "section";
  }

  function ensureDropHint() {
    if (dropHintRef.current) return dropHintRef.current;
    const hint = document.createElement("div");
    hint.style.cssText = [
      "position:fixed",
      "z-index:100001",
      "pointer-events:none",
      "display:none",
      "max-width:240px",
      "padding:10px 12px",
      "border-radius:14px",
      "border:1px solid rgba(255,255,255,0.08)",
      "background:linear-gradient(180deg,rgba(18,22,31,0.96),rgba(10,13,20,0.98))",
      "box-shadow:0 16px 40px rgba(0,0,0,0.28)",
      "backdrop-filter:blur(12px)",
      "color:rgba(255,255,255,0.86)",
      "font-size:11px",
      "font-weight:600",
      "line-height:1.4",
      "text-align:center",
      "transform:translate(-50%,-50%)",
    ].join(";");
    document.body.appendChild(hint);
    dropHintRef.current = hint;
    return hint;
  }

  function showDropHint(text: string, left: number, top: number) {
    const hint = ensureDropHint();
    hint.textContent = text;
    hint.style.left = `${left}px`;
    hint.style.top = `${top}px`;
    hint.style.display = "";
  }

  // Show an overlay that detects section boundaries (for "section" placement blocks).
  // Calls onDrop(afterSectionId) where null = before first / before footer.
  function showSectionOverlay(onDrop: (afterSectionId: string | null) => void) {
    const iframe = getIframe();
    if (!iframe) { onDrop(null); return; }
    const r = iframe.getBoundingClientRect();

    const line = document.createElement("div");
    line.style.cssText = `position:fixed;left:${r.left}px;width:${r.width}px;height:3px;background:#4f7eff;border-radius:2px;z-index:100000;display:none;pointer-events:none;box-shadow:0 0 8px rgba(79,126,255,.55);`;
    document.body.appendChild(line);
    dropLineRef.current = line;

    let afterSectionId: string | null = null;

    const overlay = document.createElement("div");
    overlay.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:99999;background:linear-gradient(180deg,rgba(79,126,255,0.04),rgba(79,126,255,0.02));border:1px dashed rgba(79,126,255,.34);border-radius:16px;box-sizing:border-box;pointer-events:all;`;

    overlay.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      const sections = getSections(iframe);
      if (!sections.length) {
        afterSectionId = null;
        line.style.display = "none";
        showDropHint("Drop to add the first section", r.left + r.width / 2, r.top + r.height / 2);
        return;
      }
      const mouseY = e.clientY;
      let placed = false;
      for (let i = 0; i < sections.length; i++) {
        const sr = sections[i].getBoundingClientRect();
        const midY = r.top + (sr.top + sr.bottom) / 2;
        if (mouseY < midY) {
          afterSectionId = i > 0 ? (sections[i-1].getAttribute("data-sz-section-id") ?? null) : null;
          line.style.top = `${r.top + sr.top}px`;
          line.style.display = "";
          showDropHint(
            i > 0 ? `Drop after ${sectionLabel(sections[i - 1])}` : "Drop at the top of the page",
            r.left + r.width / 2,
            r.top + sr.top - 20
          );
          placed = true;
          break;
        }
      }
      if (!placed) {
        const last = sections[sections.length-1];
        afterSectionId = last.getAttribute("data-sz-section-id") ?? null;
        line.style.top = `${r.top + last.getBoundingClientRect().bottom}px`;
        line.style.display = "";
        showDropHint(`Drop after ${sectionLabel(last)}`, r.left + r.width / 2, r.top + last.getBoundingClientRect().bottom + 20);
      }
    });
    overlay.addEventListener("dragleave", () => {
      line.style.display = "none";
      if (dropHintRef.current) dropHintRef.current.style.display = "none";
    });
    overlay.addEventListener("drop", (e) => { e.preventDefault(); onDrop(afterSectionId); hideDropOverlay(); });
    document.body.appendChild(overlay);
    dragOverlayRef.current = overlay;
  }

  // Show an overlay that highlights the hovered section (for "inline" placement blocks).
  // Calls onDrop(sectionId) with the section the mouse was over.
  function showInlineOverlay(onDrop: (sectionId: string | null) => void) {
    const iframe = getIframe();
    if (!iframe) { onDrop(null); return; }
    const r = iframe.getBoundingClientRect();

    const highlight = document.createElement("div");
    highlight.style.cssText = `position:fixed;background:rgba(79,126,255,.10);border:2px solid rgba(79,126,255,.5);border-radius:4px;z-index:100000;pointer-events:none;display:none;transition:top .08s,height .08s;`;
    document.body.appendChild(highlight);
    dropLineRef.current = highlight;

    let hoveredSectionId: string | null = null;

    const overlay = document.createElement("div");
    overlay.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:99999;background:linear-gradient(180deg,rgba(79,126,255,0.035),rgba(79,126,255,0.015));border:1px dashed rgba(79,126,255,.28);border-radius:16px;box-sizing:border-box;pointer-events:all;`;

    overlay.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      const sections = getSections(iframe);
      const mouseY = e.clientY;
      for (const sec of sections) {
        const sr = sec.getBoundingClientRect();
        if (mouseY >= r.top + sr.top && mouseY <= r.top + sr.bottom) {
          hoveredSectionId = sec.getAttribute("data-sz-section-id") ?? null;
          highlight.style.left = `${r.left}px`;
          highlight.style.top = `${r.top + sr.top}px`;
          highlight.style.width = `${r.width}px`;
          highlight.style.height = `${sr.height}px`;
          highlight.style.display = "";
          showDropHint(`Insert into ${sectionLabel(sec)}`, r.left + r.width / 2, r.top + sr.top + Math.min(sr.height * 0.18, 42));
          return;
        }
      }
      hoveredSectionId = null;
      highlight.style.display = "none";
      if (dropHintRef.current) dropHintRef.current.style.display = "none";
    });
    overlay.addEventListener("dragleave", () => {
      highlight.style.display = "none";
      if (dropHintRef.current) dropHintRef.current.style.display = "none";
    });
    overlay.addEventListener("drop", (e) => { e.preventDefault(); onDrop(hoveredSectionId); hideDropOverlay(); });
    document.body.appendChild(overlay);
    dragOverlayRef.current = overlay;
  }

  // Simple overlay for top/bottom blocks — any drop calls onDrop(null).
  function showSimpleOverlay(onDrop: () => void) {
    const iframe = getIframe();
    if (!iframe) { onDrop(); return; }
    const r = iframe.getBoundingClientRect();
    const overlay = document.createElement("div");
    overlay.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:99999;background:rgba(79,126,255,.06);border:1px dashed rgba(79,126,255,.34);border-radius:16px;box-sizing:border-box;pointer-events:all;`;
    overlay.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      showDropHint("Drop to place this block on the page", r.left + r.width / 2, r.top + r.height / 2);
    });
    overlay.addEventListener("drop", (e) => { e.preventDefault(); onDrop(); hideDropOverlay(); });
    document.body.appendChild(overlay);
    dragOverlayRef.current = overlay;
  }

  function hideDropOverlay() {
    dropLineRef.current?.remove();
    dropLineRef.current = null;
    dropHintRef.current?.remove();
    dropHintRef.current = null;
    dragOverlayRef.current?.remove();
    dragOverlayRef.current = null;
  }

  useEffect(() => () => hideDropOverlay(), []);

  function sendToIframe(type: string, html: string, sectionId?: string | null, extra?: Record<string, unknown>) {
    const iframe = getIframe();
    if (!iframe?.contentWindow) {
      const blockId = typeof extra?.blockId === "string" ? extra.blockId : null;
      if (blockId && getBlockDefinition(blockId)) insertBlock(blockId);
      return;
    }
    iframe.contentWindow.postMessage({ target: "sitezy-iframe", type, html, sectionId: sectionId ?? null, ...(extra ?? {}) }, "*");
  }

  function addIcon(icon: IconElementDefinition, targetId?: string | null) {
    const html = renderEditorElementHtml(icon.id, project, page, {
      placementHint: icon.placement,
    });
    const canReplace = targetId === undefined && canReplaceSelectedTextWithIcon();
    sendToIframe(canReplace ? "replace-text-with-icon" : "insert-smart", html, targetId ?? selectedSectionId ?? selectedNode?.sectionId ?? null, {
      blockId: icon.id,
      placement: "inline",
      nodeId: (selectedNode?.textTargetNodeId ?? selectedNode?.nodeId) ?? null,
    });
  }

  async function add(block: BlockElementDefinition, targetId?: string | null) {
    if (adding) return;
    setAdding(block.id);
    if (!useAI) {
      const html = renderEditorElementHtml(block.id, project, page, {
        placementHint: block.placement,
      });

      if (targetId === undefined) {
        sendToIframe("insert-smart", html, selectedSectionId ?? selectedNode?.sectionId ?? null, {
          blockId: block.id,
          placement: block.placement,
          nodeId: selectedNode?.nodeId ?? null,
        });
      } else {
        switch (block.placement) {
          case "top":
            sendToIframe("insert-top", html, null, { blockId: block.id });
            break;
          case "bottom":
            sendToIframe("insert-bottom", html, null, { blockId: block.id });
            break;
          case "inline":
            sendToIframe("insert-in-section", html, targetId ?? null, { blockId: block.id });
            break;
          case "section":
          default:
            sendToIframe("insert-after-section", html, targetId ?? null, { blockId: block.id });
            break;
        }
      }
      addGenLog(`✅ ${block.label} added`, "success");
      setAdding(null);
      return;
    }
    if (!page) { setAdding(null); setAiStatus({ msg: "No page selected.", type: "error" }); setTimeout(() => setAiStatus(null), 3000); return; }
    if (!project.blueprint) { setAdding(null); setAiStatus({ msg: "Project blueprint missing — regenerate the site first.", type: "error" }); setTimeout(() => setAiStatus(null), 4000); return; }
    setAiStatus({ msg: `Generating ${block.label}…`, type: "loading" });
    addGenLog(`🤖 Generating ${block.label}…`, "progress");
    try {
      // ── Determine insertion context ──────────────────────────────────────────
      const existingSections = page.sections.map((s) => s.name);
      let previousSectionName: string | null = null;
      let nextSectionName: string | null = null;
      let afterSectionId: string | null = null;
      let targetSectionId: string | null = null;

      if (block.placement === "section") {
        // targetId (from drag-drop) takes priority
        if (targetId !== undefined && targetId !== null) {
          afterSectionId = targetId;
          const afterIdx = page.sections.findIndex((s) => s.id === targetId);
          if (afterIdx >= 0) {
            previousSectionName = page.sections[afterIdx].name;
            nextSectionName = page.sections[afterIdx + 1]?.name ?? null;
          }
        } else if (selectedSectionId) {
          afterSectionId = selectedSectionId;
          const afterIdx = page.sections.findIndex((s) => s.id === selectedSectionId);
          if (afterIdx >= 0) {
            previousSectionName = page.sections[afterIdx].name;
            nextSectionName = page.sections[afterIdx + 1]?.name ?? null;
          }
        } else {
          // Default: insert before footer / last section
          const footerIdx = page.sections.findIndex((s) =>
            s.type === "footer" || s.name.toLowerCase().includes("footer")
          );
          const beforeIdx = footerIdx > 0 ? footerIdx - 1 : page.sections.length - 1;
          if (beforeIdx >= 0) {
            afterSectionId = page.sections[beforeIdx].id;
            previousSectionName = page.sections[beforeIdx].name;
            nextSectionName = page.sections[beforeIdx + 1]?.name ?? null;
          }
        }
      } else if (block.placement === "inline") {
        targetSectionId = targetId ?? selectedSectionId ?? selectedNode?.sectionId ?? null;
        if (selectedSection) {
          previousSectionName = selectedSection.name;
          const selIdx = page.sections.findIndex((s) => s.id === selectedSectionId);
          nextSectionName = selIdx >= 0 ? (page.sections[selIdx + 1]?.name ?? null) : null;
        }
      }

      // ── Extract existing navbar HTML so AI-inserted navbars stay consistent ──
      const existingNavbarHtml = block.id.startsWith("navbar") && page.html
        ? extractNavbarHtml(page.html)
        : null;

      // ── Call the dedicated insert-block API ──────────────────────────────────
      const res = await fetch("/api/insert-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: project.blueprint,
          brief: project.brief,
          page: { name: page.name, purpose: page.purpose || page.name },
          block: { type: block.id, label: block.label, placement: block.placement },
          context: {
            existingSections,
            previousSectionName,
            nextSectionName,
            selectedSectionName: selectedSection?.name ?? null,
            selectedNodeLabel: selectedNode?.label ?? null,
            navbarHtml: existingNavbarHtml,
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({})) as { error?: string; code?: string; requestId?: string | null; message?: string; errorCode?: string };
        const errorCode = errJson.code ?? errJson.errorCode;
        throw createAppError({
          code: (errorCode as ErrorCode | undefined) ?? API_GENERATE_001,
          devMessage: `Insert block failed for ${block.id} (${res.status}): ${errJson.error ?? errJson.message ?? "unknown error"}`,
          userMessage: errJson.error ?? errJson.message,
          severity: res.status >= 500 ? "error" : "warn",
          metadata: {
            pageId: page.id,
            pageName: page.name,
            blockId: block.id,
            blockLabel: block.label,
            requestId: errJson.requestId ?? null,
            status: res.status,
          },
        });
      }

      const data = await res.json() as { html?: string };
      const newBlockHtml = data.html ?? "";

      if (!newBlockHtml || !newBlockHtml.includes("<")) {
        throw createAppError({
          code: API_RESPONSE_001,
          devMessage: `Insert block response for ${block.id} did not include valid HTML`,
          severity: "error",
          metadata: { pageId: page.id, pageName: page.name, blockId: block.id, blockLabel: block.label },
        });
      }

      // ── Insert HTML into the iframe ──────────────────────────────────────────
      if (block.placement === "section") {
        sendToIframe("insert-after-section", newBlockHtml, afterSectionId, { blockId: block.id });
      } else if (block.placement === "inline") {
        sendToIframe("insert-in-section", newBlockHtml, targetSectionId, { blockId: block.id });
      } else if (block.placement === "top") {
        sendToIframe("insert-top", newBlockHtml, null, { blockId: block.id });
      } else {
        sendToIframe("insert-bottom", newBlockHtml, null, { blockId: block.id });
      }

      // ── Append to page sections in state ─────────────────────────────────────
      setPageContent(page.id, page.html, [...page.sections, { id: uid(), type: block.id, name: block.label }]);

      addGenLog(`✅ ${block.label} added`, "success");
      setAiStatus({ msg: `${block.label} added!`, type: "success" });
      setTimeout(() => setAiStatus(null), 2500);
    } catch(err) {
      const { appErr, apiError } = buildClientApiError(err, API_GENERATE_001, {
        pageId: page.id,
        pageName: page.name,
        blockId: block.id,
        blockLabel: block.label,
      });
      logAppError(appErr);
      setApiError(apiError);
      addGenLog(`❌ ${appErr.userMessage}`, "error");
      setAiStatus({ msg: appErr.userMessage, type: "error" });
      setTimeout(() => setAiStatus(null), 4000);
    }
    finally { setAdding(null); }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 px-0 pb-2.5 pt-1">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={cat === "icons" ? "Search elements and icons…" : "Search elements…"}
              className="w-full appearance-none border-0 bg-transparent text-[11px] text-white/55 placeholder-white/16 outline-none ring-0 shadow-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-white/18 hover:text-white/50 transition-colors">
                <X size={11} />
              </button>
            )}
          </div>

          <div className="h-6 w-px bg-white/[0.06]" />

          <div className="flex shrink-0 items-center gap-1.5">
            <p className="text-[9.5px] font-medium text-white/40">{useAI ? "AI" : "Direct"}</p>
            <EditorSwitch checked={useAI} onChange={() => setUseAI(!useAI)} title={useAI ? "AI insert on" : "AI insert off"} className="scale-[0.85]" />
          </div>
        </div>
      </div>
      <div className="px-0 pb-2 flex-shrink-0">
        <div className="space-y-1">
          {categoryRows.map((row, index) => (
            <div
              key={`category-row-${index}`}
              className={`grid gap-1 ${row.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}
            >
              {row.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCat(c.key)}
                  className={`rounded-lg px-2 py-1.5 text-[9px] font-medium transition-all duration-150 text-center ${
                    cat === c.key
                      ? "bg-[#5B8CFF]/12 text-[#5B8CFF]/80 shadow-[inset_0_0_0_1px_rgba(91,140,255,0.18)]"
                      : "text-white/28 hover:text-white/50 hover:bg-white/[0.03]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      {aiStatus && (
        <div className={`mx-1 mt-1.5 mb-0 px-3 py-2 rounded-lg flex items-center gap-2 text-[10.5px] font-medium flex-shrink-0 ${
          aiStatus.type === "loading" ? "bg-[#5B8CFF]/8 text-[#5B8CFF]/80 shadow-[inset_0_0_0_1px_rgba(91,140,255,0.15)]" :
          aiStatus.type === "success" ? "bg-emerald-500/8 text-emerald-400/80 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.15)]" :
          "bg-red-500/8 text-red-400/80 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.15)]"
        }`}>
          {aiStatus.type === "loading" && <Loader2 size={10} className="animate-spin flex-shrink-0" />}
          {aiStatus.type === "success" && <span className="flex-shrink-0">✓</span>}
          {aiStatus.type === "error"   && <span className="flex-shrink-0">✕</span>}
          <span className="truncate">{aiStatus.msg}</span>
        </div>
      )}
      {/* ── Icon picker ──────────────────────────────────────────────────────── */}
      {cat === "icons" && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-auto p-1.5 grid grid-cols-5 gap-1 content-start">
            {ICON_DEFINITIONS
              .filter((icon) =>
                !searchQuery ||
                icon.label.toLowerCase().includes(searchQuery) ||
                icon.id.includes(searchQuery) ||
                icon.keywords.some((keyword) => keyword.includes(searchQuery))
              )
              .map((icon) => (
              <button
                key={icon.id}
                title={icon.label}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "copy";
                  e.dataTransfer.setData("text/plain", icon.id);
                  setTimeout(() => showInlineOverlay((sectionId) => addIcon(icon, sectionId)), 0);
                }}
                onDragEnd={() => hideDropOverlay()}
                onClick={() => addIcon(icon)}
                className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/[0.015] hover:bg-[#5B8CFF]/8 transition-all duration-150 group cursor-grab active:cursor-grabbing"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
                  className="w-5 h-5 text-white/25 group-hover:text-[#5B8CFF]/70 transition-colors flex-shrink-0"
                  dangerouslySetInnerHTML={{ __html: icon.paths }}></svg>
                <span className="text-[8px] text-white/18 group-hover:text-white/40 transition-colors text-center leading-tight truncate w-full">{icon.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Blocks list ──────────────────────────────────────────────────────── */}
      {cat !== "icons" && (
      <div className="flex-1 overflow-auto px-1 py-2">
        {filtered.length === 0 && (
          <div className="rounded-xl px-4 py-7 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-white/25">
              <LayoutGrid size={15} />
            </div>
            <p className="mt-3 text-[11.5px] font-medium text-white/45">No matching elements</p>
            <p className="mt-1 text-[10px] leading-5 text-white/20">
              {search ? "Try a broader search or switch categories." : "This category has no available elements."}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-1.5 content-start">
          {filtered.map(({ block: b, score }) => {
            const categoryMeta = getElementCategoryDefinition(b.category);
            return (
              <div
                key={b.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "copy";
                  e.dataTransfer.setData("text/plain", b.id);
                  setTimeout(() => {
                    if (b.placement === "top" || b.placement === "bottom") {
                      showSimpleOverlay(() => add({ ...b }));
                    } else if (b.placement === "inline") {
                      showInlineOverlay((sectionId) => add({ ...b }, sectionId));
                    } else {
                      showSectionOverlay((afterId) => add({ ...b }, afterId));
                    }
                  }, 0);
                }}
                onDragEnd={() => {
                  hideDropOverlay();
                }}
                onClick={() => add(b)}
                className={`px-3 py-2.5 rounded-xl bg-white/[0.015] text-left hover:bg-[#5B8CFF]/6 transition-all duration-150 group cursor-grab active:cursor-grabbing select-none ${
                  score >= 4 ? "shadow-[inset_0_0_0_1px_rgba(91,140,255,0.12)]" : "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]"
                } ${adding===b.id?"opacity-30":""}`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="text-[14px] leading-none text-white/16 group-hover:text-[#5B8CFF]/60 transition-colors mt-0.5">{b.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[10.5px] text-white/55 font-semibold group-hover:text-white/80 transition-colors">{b.label}</p>
                      <p className="text-[9.5px] text-white/20 mt-0.5 line-clamp-1">{b.preview}</p>
                    </div>
                  </div>
                  {score >= 4 && (
                    <span className="px-1.5 py-0.5 rounded-md text-[7.5px] font-semibold uppercase tracking-[0.1em] text-[#5B8CFF]/70 bg-[#5B8CFF]/10 flex-shrink-0">
                      Smart
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[8.5px] text-white/16">
                  <span className="truncate">
                    {categoryMeta?.label ? `${categoryMeta.label} · ` : ""}
                    {placementText(b)}
                  </span>
                  <span className="font-medium uppercase tracking-[0.08em] text-white/20 flex-shrink-0">
                    {b.placement}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
