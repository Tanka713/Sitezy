import type { PageSection } from "@/types";
import { slugify, uid } from "@/lib/utils";

export interface DerivedPageState {
  html: string;
  sections: PageSection[];
}

export interface InsertBlockResult extends DerivedPageState {
  insertedSectionId: string | null;
}

function getParserDoc(html: string): Document | null {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return null;
  const parser = new DOMParser();
  return parser.parseFromString(`<body>${extractBodyHtml(html)}</body>`, "text/html");
}

function stripNonContentHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<meta\b[^>]*>/gi, "");
}

function sanitizeDoc(doc: Document): void {
  doc.querySelectorAll("script, style, noscript, link, meta").forEach((node) => node.remove());
}

function extractBodyHtml(html: string): string {
  const trimmed = (html || "").trim();
  if (!trimmed) return "";
  const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) return stripNonContentHtml(bodyMatch[1].trim());
  return stripNonContentHtml(trimmed
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<\/?(html|head|body)[^>]*>/gi, "")
    .trim());
}

function topLevelElements(doc: Document): HTMLElement[] {
  return Array.from(doc.body.children).filter(
    (node): node is HTMLElement =>
      node instanceof HTMLElement &&
      !["script", "style", "link", "meta"].includes(node.tagName.toLowerCase())
  );
}

function inferType(node: HTMLElement): string {
  const explicit = node.dataset.szSectionType?.trim();
  if (explicit) return explicit;

  const tag = node.tagName.toLowerCase();
  const attrs = `${node.id} ${node.className}`.toLowerCase();
  const text = (node.textContent || "").toLowerCase();

  if (tag === "nav" || attrs.includes("nav")) return "navbar";
  if (tag === "footer" || attrs.includes("footer")) return "footer";
  if (attrs.includes("testimonial") || text.includes("testimonial")) return "testimonial";
  if (attrs.includes("gallery")) return "gallery";
  if (attrs.includes("feature")) return "features";
  if (attrs.includes("hero") || tag === "header") return "hero";
  if (attrs.includes("cta") || text.includes("get started") || text.includes("book now")) return "cta";
  if (tag === "section") return "section";
  return tag;
}

function inferName(node: HTMLElement, type: string): string {
  const explicit = node.dataset.szSectionName?.trim();
  if (explicit) return explicit;

  const heading = node.querySelector("h1, h2, h3, h4, h5, h6");
  const headingText = (heading?.textContent || "").trim();
  if (headingText) return headingText.slice(0, 48);

  const aria = node.getAttribute("aria-label")?.trim();
  if (aria) return aria;

  return type
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function ensureSectionNode(node: HTMLElement): PageSection {
  const type = inferType(node);
  const name = inferName(node, type);
  const id = node.dataset.szSectionId?.trim() || `sec-${uid()}`;

  node.dataset.szSectionId = id;
  node.dataset.szSectionType = type;
  node.dataset.szSectionName = name;

  if (!node.id) {
    node.id = slugify(`${name}-${id.slice(-4)}`) || id;
  }

  return { id, type, name };
}

export function derivePageStateFromHtml(html: string, fallbackSections: PageSection[] = []): DerivedPageState {
  const doc = getParserDoc(html);
  if (!doc) {
    return {
      html: extractBodyHtml(html),
      sections: fallbackSections,
    };
  }

  sanitizeDoc(doc);

  const sections = topLevelElements(doc).map((node) => ensureSectionNode(node));

  return {
    html: doc.body.innerHTML.trim(),
    sections,
  };
}

export function insertBlockIntoPageHtml(
  pageHtml: string,
  blockHtml: string,
  afterSectionId?: string | null
): InsertBlockResult {
  const pageDoc = getParserDoc(pageHtml);
  const blockDoc = getParserDoc(blockHtml);

  if (!pageDoc || !blockDoc) {
    const next = derivePageStateFromHtml(`${extractBodyHtml(pageHtml)}\n${extractBodyHtml(blockHtml)}`);
    return { ...next, insertedSectionId: next.sections.at(-1)?.id ?? null };
  }

  sanitizeDoc(pageDoc);
  sanitizeDoc(blockDoc);

  const blockNodes = topLevelElements(blockDoc);
  if (blockNodes.length === 0) {
    const next = derivePageStateFromHtml(pageHtml);
    return { ...next, insertedSectionId: null };
  }

  const inserted: PageSection[] = [];
  const clones = blockNodes.map((node) => {
    const clone = node.cloneNode(true) as HTMLElement;
    inserted.push(ensureSectionNode(clone));
    return clone;
  });

  const target = afterSectionId
    ? pageDoc.body.querySelector<HTMLElement>(`[data-sz-section-id="${CSS.escape(afterSectionId)}"]`)
    : null;

  if (target && target.parentElement === pageDoc.body) {
    let ref: ChildNode | null = target.nextSibling;
    clones.forEach((node) => {
      pageDoc.body.insertBefore(node, ref);
    });
  } else {
    const footer = topLevelElements(pageDoc).find((node) => inferType(node) === "footer");
    if (footer && inferType(clones[0]) !== "footer") {
      clones.forEach((node) => pageDoc.body.insertBefore(node, footer));
    } else {
      clones.forEach((node) => pageDoc.body.appendChild(node));
    }
  }

  const next = derivePageStateFromHtml(pageDoc.body.innerHTML);
  const insertedIds = new Set(inserted.map((section) => section.id));
  const orderedInserted = next.sections.filter((section) => insertedIds.has(section.id));

  return {
    html: next.html,
    sections: next.sections,
    insertedSectionId: orderedInserted[0]?.id ?? null,
  };
}
