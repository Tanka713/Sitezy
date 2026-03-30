import type { PageSection } from "@/types";
import type { BlockPlacement } from "@/lib/blocks/library";
import { getBlockDefinition, normalizeStoredElementId } from "@/lib/blocks/registry";
import { slugify, uid } from "@/lib/utils";

export interface DerivedPageState {
  html: string;
  sections: PageSection[];
}

export interface InsertBlockResult extends DerivedPageState {
  insertedSectionId: string | null;
}

export interface SectionContext {
  section: PageSection;
  sectionHtml: string;
  previousSectionName: string | null;
  nextSectionName: string | null;
}

export interface ReplaceSectionResult extends DerivedPageState {
  replacedSectionId: string | null;
}

export interface MutateSectionResult extends DerivedPageState {
  sectionId: string | null;
}

// ─── DOM parse cache ──────────────────────────────────────────────────────────
// Avoids re-parsing the same HTML string when multiple operations run on the
// same page content within the same editor interaction.
const _domCache = new Map<string, Document>();
const DOM_CACHE_MAX = 4;

function getParserDoc(html: string): Document | null {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return null;
  const body = extractBodyHtml(html);
  if (_domCache.has(body)) return _domCache.get(body)!.cloneNode(true) as Document;
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${body}</body>`, "text/html");
  if (_domCache.size >= DOM_CACHE_MAX) {
    _domCache.delete(_domCache.keys().next().value!);
  }
  _domCache.set(body, doc);
  return doc.cloneNode(true) as Document;
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
  // Wrap bare body-level text nodes so they appear as selectable/removable elements in the editor
  Array.from(doc.body.childNodes).forEach((n) => {
    if (n.nodeType === 3 && n.nodeValue && n.nodeValue.trim()) {
      const sp = doc.createElement("span");
      sp.setAttribute("data-sz-orphan", "1");
      sp.textContent = n.nodeValue;
      n.parentNode?.replaceChild(sp, n);
    }
  });
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

function firstContentContainer(section: HTMLElement): HTMLElement {
  // Match containers using inline margin:0 auto (older pattern) OR Tailwind mx-auto class
  return (
    section.querySelector<HTMLElement>('div[style*="margin:0 auto"]') ??
    section.querySelector<HTMLElement>('div[class*="mx-auto"]') ??
    section
  );
}

function pickInlineTargetSection(doc: Document, sectionId?: string | null): HTMLElement | null {
  if (sectionId) {
    const explicit = querySectionById(doc, sectionId);
    if (explicit) return explicit;
  }

  const sections = topLevelElements(doc).filter((node) => inferType(node) !== "footer");
  return sections.at(-1) ?? null;
}

function normalizeSectionType(type: string | null | undefined): string | null {
  const normalized = normalizeStoredElementId(type);
  return normalized ? normalized : (type?.trim() || null);
}

function inferType(node: HTMLElement): string {
  const explicit = normalizeSectionType(node.dataset.szSectionType?.trim());
  if (explicit) return explicit;

  const tag = node.tagName.toLowerCase();
  const attrs = `${node.id} ${node.className} ${node.getAttribute("data-section") ?? ""}`.toLowerCase();
  const text = (node.textContent || "").slice(0, 400).toLowerCase();
  const headings = Array.from(node.querySelectorAll("h1,h2,h3"))
    .map((h) => h.textContent || "")
    .join(" ")
    .toLowerCase()
    .slice(0, 200);

  // Hard structural matches first
  if (tag === "nav" || attrs.includes("nav")) return normalizeSectionType("navbar") ?? "navbar";
  if (tag === "footer" || attrs.includes("footer")) return normalizeSectionType("footer") ?? "footer";

  // Explicit keyword matches in class/id
  if (attrs.includes("hero") || tag === "header") return normalizeSectionType("hero") ?? "hero";
  if (attrs.includes("testimonial") || attrs.includes("review") || attrs.includes("social-proof")) return normalizeSectionType("testimonial") ?? "testimonial";
  if (attrs.includes("gallery") || attrs.includes("portfolio") || attrs.includes("work")) return normalizeSectionType("gallery") ?? "gallery";
  if (attrs.includes("feature") || attrs.includes("benefit") || attrs.includes("highlight")) return normalizeSectionType("features") ?? "features";
  if (attrs.includes("pricing") || attrs.includes("price") || attrs.includes("plan") || attrs.includes("tier")) return normalizeSectionType("pricing") ?? "pricing";
  if (attrs.includes("faq") || attrs.includes("accordion") || attrs.includes("question")) return normalizeSectionType("faq") ?? "faq";
  if (attrs.includes("team") || attrs.includes("staff") || attrs.includes("member") || attrs.includes("people")) return normalizeSectionType("team") ?? "team";
  if (attrs.includes("stat") || attrs.includes("counter") || attrs.includes("metric") || attrs.includes("number")) return normalizeSectionType("stats") ?? "stats";
  if (attrs.includes("contact") || attrs.includes("form") || attrs.includes("reach")) return normalizeSectionType("contact") ?? "contact";
  if (attrs.includes("about") || attrs.includes("story") || attrs.includes("mission")) return "about";
  if (attrs.includes("cta") || attrs.includes("call-to-action") || attrs.includes("convert")) return normalizeSectionType("cta") ?? "cta";
  if (attrs.includes("logo") || attrs.includes("brand") || attrs.includes("client") || attrs.includes("partner")) return normalizeSectionType("logos") ?? "logos";

  // Heading text content signals
  if (headings.match(/\bfaq\b|frequently asked|questions/)) return normalizeSectionType("faq") ?? "faq";
  if (headings.match(/\bpric|\bplan\b|\btier\b/)) return normalizeSectionType("pricing") ?? "pricing";
  if (headings.match(/\bteam\b|\bstaff\b|\bmeet\b/)) return normalizeSectionType("team") ?? "team";
  if (headings.match(/\bfeature|\bbenefit|\bhow it work/)) return normalizeSectionType("features") ?? "features";
  if (headings.match(/\btestimoni|\bwhat.*say|\breview/)) return normalizeSectionType("testimonial") ?? "testimonial";

  // CTA signals from body text
  if (text.match(/\bget started\b|\bsign up\b|\bbook now\b|\btry for free\b|\bstart today\b/)) return normalizeSectionType("cta") ?? "cta";

  // Hero signals: large screen-filling section at the top with a heading
  const firstHeading = node.querySelector("h1");
  if (firstHeading && (attrs.includes("min-h-screen") || attrs.includes("min-h-") || attrs.includes("py-24") || attrs.includes("py-32") || attrs.includes("py-20"))) return normalizeSectionType("hero") ?? "hero";

  if (tag === "section" || tag === "article" || tag === "main") return "section";
  return tag;
}

const SECTION_TYPE_LABELS: Record<string, string> = {
  navbar: "Navigation", hero: "Hero", features: "Features", testimonial: "Testimonials",
  gallery: "Gallery", cta: "Call to Action", footer: "Footer", faq: "FAQ",
  pricing: "Pricing", team: "Team", stats: "Stats", contact: "Contact",
  about: "About", logos: "Logos", section: "Section",
};

function inferName(node: HTMLElement, type: string): string {
  const explicit = node.dataset.szSectionName?.trim();
  if (explicit) return explicit;

  const aria = node.getAttribute("aria-label")?.trim();
  if (aria) return aria.slice(0, 48);

  // For navbar/footer use the type label directly — their heading text is usually nav links
  if (type === "navbar" || type === "footer") return SECTION_TYPE_LABELS[type] ?? type;

  const heading = node.querySelector("h1, h2, h3, h4, h5, h6");
  const headingText = (heading?.textContent || "").trim();
  if (headingText && headingText.length <= 52) return headingText;
  if (headingText) return headingText.slice(0, 48) + "…";

  const blockDefinition = getBlockDefinition(type);
  if (blockDefinition?.label) return blockDefinition.label;

  return SECTION_TYPE_LABELS[type] ?? type
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function ensureSectionNode(node: HTMLElement): PageSection {
  const type = normalizeSectionType(inferType(node)) ?? "section";
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

function normalizeSectionRecord(section: Partial<PageSection>, index: number): PageSection {
  const type = normalizeSectionType(section.type) ?? "section";
  const blockDefinition = getBlockDefinition(type);
  const name =
    section.name?.trim() ||
    blockDefinition?.label ||
    SECTION_TYPE_LABELS[type] ||
    `Section ${index + 1}`;
  const id = section.id?.trim() || `sec-${uid()}`;

  return { id, type, name };
}

export function derivePageStateFromHtml(html: string, fallbackSections: PageSection[] = []): DerivedPageState {
  const doc = getParserDoc(html);
  if (!doc) {
    return {
      html: extractBodyHtml(html),
      sections: fallbackSections.map((section, index) => normalizeSectionRecord(section, index)),
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

export function insertElementIntoPageHtml(
  pageHtml: string,
  elementHtml: string,
  placement: BlockPlacement,
  targetSectionId?: string | null
): InsertBlockResult {
  if (placement === "section") {
    return insertBlockIntoPageHtml(pageHtml, elementHtml, targetSectionId);
  }

  const pageDoc = getParserDoc(pageHtml);
  const elementDoc = getParserDoc(elementHtml);

  if (!pageDoc || !elementDoc) {
    const merged = placement === "bottom"
      ? `${extractBodyHtml(pageHtml)}\n${extractBodyHtml(elementHtml)}`
      : `${extractBodyHtml(elementHtml)}\n${extractBodyHtml(pageHtml)}`;
    const next = derivePageStateFromHtml(merged);
    return {
      ...next,
      insertedSectionId: placement === "inline" ? targetSectionId ?? next.sections.at(-1)?.id ?? null : next.sections.at(placement === "top" ? 0 : -1)?.id ?? null,
    };
  }

  sanitizeDoc(pageDoc);
  sanitizeDoc(elementDoc);

  const elementNodes = topLevelElements(elementDoc);
  if (elementNodes.length === 0) {
    const next = derivePageStateFromHtml(pageHtml);
    return { ...next, insertedSectionId: null };
  }

  const clones = elementNodes.map((node) => node.cloneNode(true) as HTMLElement);

  if (placement === "inline") {
    const section = pickInlineTargetSection(pageDoc, targetSectionId);
    if (!section) {
      const next = derivePageStateFromHtml(pageDoc.body.innerHTML);
      return { ...next, insertedSectionId: null };
    }

    const container = firstContentContainer(section);
    clones.forEach((node) => container.appendChild(node));
    const next = derivePageStateFromHtml(pageDoc.body.innerHTML);
    return {
      html: next.html,
      sections: next.sections,
      insertedSectionId: section.dataset.szSectionId ?? null,
    };
  }

  const inserted: PageSection[] = [];
  const sectionClones = clones.map((node) => {
    inserted.push(ensureSectionNode(node));
    return node;
  });

  if (placement === "top") {
    let ref = pageDoc.body.firstElementChild;
    sectionClones.forEach((node) => {
      pageDoc.body.insertBefore(node, ref);
    });
  } else {
    sectionClones.forEach((node) => pageDoc.body.appendChild(node));
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

function querySectionById(doc: Document, sectionId: string): HTMLElement | null {
  return doc.body.querySelector<HTMLElement>(`[data-sz-section-id="${sectionId.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`);
}

function remapSectionClone(node: HTMLElement): HTMLElement {
  const all = [node, ...Array.from(node.querySelectorAll<HTMLElement>("*"))];
  const idMap: Record<string, string> = {};
  const nameMap: Record<string, string> = {};

  all.forEach((el) => {
    el.removeAttribute("data-sz-id");
    el.removeAttribute("data-sz-sel");
    el.removeAttribute("data-sz-hov");
    el.removeAttribute("data-sz-sec");
    el.removeAttribute("data-sz-sec-hov");
    el.removeAttribute("data-sz-drag");
    el.removeAttribute("data-sz-hover-preview");
    el.removeAttribute("contenteditable");

    if (el.id) {
      const nextId = slugify(`${el.id}-${uid().slice(-4)}`) || `id-${uid()}`;
      idMap[el.id] = nextId;
      el.id = nextId;
    }

    if (el.tagName.toLowerCase() === "input" && (el.getAttribute("type") || "").toLowerCase() === "radio") {
      const radioName = el.getAttribute("name");
      if (radioName) {
        nameMap[radioName] = nameMap[radioName] ?? `grp-${uid()}`;
        el.setAttribute("name", nameMap[radioName]);
      }
    }
  });

  all.forEach((el) => {
    ["aria-controls", "aria-labelledby", "aria-describedby"].forEach((attr) => {
      const raw = el.getAttribute(attr);
      if (!raw) return;
      const next = raw
        .split(/\s+/)
        .map((part) => idMap[part] || part)
        .join(" ")
        .trim();
      if (next) el.setAttribute(attr, next);
    });

    const htmlFor = el.getAttribute("for");
    if (htmlFor && idMap[htmlFor]) {
      el.setAttribute("for", idMap[htmlFor]);
    }

    const href = el.getAttribute("href");
    if (href?.startsWith("#")) {
      const anchorId = href.slice(1);
      if (idMap[anchorId]) {
        el.setAttribute("href", `#${idMap[anchorId]}`);
      }
    }

    ["onclick", "onchange", "oninput"].forEach((attr) => {
      const raw = el.getAttribute(attr);
      if (!raw) return;
      let next = raw;
      Object.entries(idMap).forEach(([from, to]) => {
        next = next.split(from).join(to);
      });
      Object.entries(nameMap).forEach(([from, to]) => {
        next = next.split(from).join(to);
      });
      el.setAttribute(attr, next);
    });
  });

  const type = normalizeSectionType(node.dataset.szSectionType?.trim()) ?? inferType(node);
  const currentName = inferName(node, type).trim() || SECTION_TYPE_LABELS[type] || "Section";
  const nextName = /\bcopy$/i.test(currentName) ? currentName : `${currentName} Copy`;
  const nextSectionId = `sec-${uid()}`;

  node.dataset.szSectionId = nextSectionId;
  node.dataset.szSectionType = type;
  node.dataset.szSectionName = nextName;
  node.id = slugify(`${nextName}-${nextSectionId.slice(-4)}`) || nextSectionId;

  return node;
}

function pickReplacementNode(
  doc: Document,
  target: HTMLElement,
  expectedType: string,
  expectedName: string
): HTMLElement | null {
  const nodes = topLevelElements(doc);
  if (nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0];

  const sameId = nodes.find((node) => node.dataset.szSectionId === target.dataset.szSectionId);
  if (sameId) return sameId;

  const sameType = nodes.find((node) => inferType(node) === expectedType);
  if (sameType) return sameType;

  const expectedNameNormalized = expectedName.trim().toLowerCase();
  if (expectedNameNormalized) {
    const sameName = nodes.find((node) => inferName(node, inferType(node)).trim().toLowerCase() === expectedNameNormalized);
    if (sameName) return sameName;
  }

  const sameTag = nodes.find((node) => node.tagName === target.tagName);
  return sameTag ?? nodes[0];
}

export function getSectionContext(pageHtml: string, sectionId: string): SectionContext | null {
  const doc = getParserDoc(pageHtml);
  if (!doc) return null;

  sanitizeDoc(doc);
  const nodes = topLevelElements(doc);
  const sections = nodes.map((node) => ensureSectionNode(node));
  const index = sections.findIndex((section) => section.id === sectionId);
  if (index === -1) return null;

  return {
    section: sections[index],
    sectionHtml: nodes[index].outerHTML.trim(),
    previousSectionName: sections[index - 1]?.name ?? null,
    nextSectionName: sections[index + 1]?.name ?? null,
  };
}

export function replaceSectionInPageHtml(
  pageHtml: string,
  sectionId: string,
  sectionHtml: string,
  fallbackSection?: PageSection | null
): ReplaceSectionResult {
  const pageDoc = getParserDoc(pageHtml);
  const sectionDoc = getParserDoc(sectionHtml);

  if (!pageDoc || !sectionDoc) {
    const next = derivePageStateFromHtml(pageHtml, fallbackSection ? [fallbackSection] : []);
    return { ...next, replacedSectionId: null };
  }

  sanitizeDoc(pageDoc);
  sanitizeDoc(sectionDoc);

  const target = querySectionById(pageDoc, sectionId);
  if (!target) {
    const next = derivePageStateFromHtml(pageHtml, fallbackSection ? [fallbackSection] : []);
    return { ...next, replacedSectionId: null };
  }

  const targetSection = ensureSectionNode(target);
  const replacement = pickReplacementNode(
    sectionDoc,
    target,
    fallbackSection?.type ?? targetSection.type,
    fallbackSection?.name ?? targetSection.name
  );

  if (!replacement) {
    const next = derivePageStateFromHtml(pageHtml, fallbackSection ? [fallbackSection] : []);
    return { ...next, replacedSectionId: null };
  }

  const clone = replacement.cloneNode(true) as HTMLElement;
  clone.dataset.szSectionId = targetSection.id;
  clone.dataset.szSectionType = fallbackSection?.type ?? targetSection.type;
  clone.dataset.szSectionName = fallbackSection?.name ?? targetSection.name;

  if (target.id && !clone.id) {
    clone.id = target.id;
  }

  target.replaceWith(clone);

  const next = derivePageStateFromHtml(pageDoc.body.innerHTML);
  return {
    html: next.html,
    sections: next.sections,
    replacedSectionId: targetSection.id,
  };
}

export function removeSectionFromPageHtml(pageHtml: string, sectionId: string): MutateSectionResult {
  const pageDoc = getParserDoc(pageHtml);
  if (!pageDoc) {
    const next = derivePageStateFromHtml(pageHtml);
    return { ...next, sectionId: null };
  }

  sanitizeDoc(pageDoc);
  const target = querySectionById(pageDoc, sectionId);
  if (!target) {
    const next = derivePageStateFromHtml(pageDoc.body.innerHTML);
    return { ...next, sectionId: null };
  }

  const targetSection = ensureSectionNode(target);
  target.remove();

  const next = derivePageStateFromHtml(pageDoc.body.innerHTML);
  return {
    html: next.html,
    sections: next.sections,
    sectionId: targetSection.id,
  };
}

export function moveSectionInPageHtml(
  pageHtml: string,
  sectionId: string,
  direction: -1 | 1
): MutateSectionResult {
  const pageDoc = getParserDoc(pageHtml);
  if (!pageDoc) {
    const next = derivePageStateFromHtml(pageHtml);
    return { ...next, sectionId: null };
  }

  sanitizeDoc(pageDoc);
  const target = querySectionById(pageDoc, sectionId);
  if (!target) {
    const next = derivePageStateFromHtml(pageDoc.body.innerHTML);
    return { ...next, sectionId: null };
  }

  const targetSection = ensureSectionNode(target);
  const sibling = direction < 0 ? target.previousElementSibling : target.nextElementSibling;
  if (!(sibling instanceof HTMLElement) || sibling.parentElement !== pageDoc.body) {
    const next = derivePageStateFromHtml(pageDoc.body.innerHTML);
    return { ...next, sectionId: targetSection.id };
  }

  if (direction < 0) {
    pageDoc.body.insertBefore(target, sibling);
  } else {
    pageDoc.body.insertBefore(sibling, target);
  }

  const next = derivePageStateFromHtml(pageDoc.body.innerHTML);
  return {
    html: next.html,
    sections: next.sections,
    sectionId: targetSection.id,
  };
}

export function moveSectionToIndex(
  pageHtml: string,
  sectionId: string,
  targetIndex: number
): MutateSectionResult {
  const pageDoc = getParserDoc(pageHtml);
  if (!pageDoc) {
    const next = derivePageStateFromHtml(pageHtml);
    return { ...next, sectionId: null };
  }

  sanitizeDoc(pageDoc);
  const sections = topLevelElements(pageDoc);
  const target = sections.find((node) => node.dataset.szSectionId === sectionId);
  if (!target) {
    const next = derivePageStateFromHtml(pageDoc.body.innerHTML);
    return { ...next, sectionId: null };
  }

  const clampedIndex = Math.max(0, Math.min(targetIndex, sections.length - 1));
  const referenceNode = sections[clampedIndex];
  if (referenceNode === target) {
    const next = derivePageStateFromHtml(pageDoc.body.innerHTML);
    return { ...next, sectionId };
  }

  // Insert before the reference if target was after it, otherwise insert after
  const targetOriginalIndex = sections.indexOf(target);
  if (targetOriginalIndex > clampedIndex) {
    pageDoc.body.insertBefore(target, referenceNode);
  } else {
    referenceNode.after(target);
  }

  const next = derivePageStateFromHtml(pageDoc.body.innerHTML);
  return { html: next.html, sections: next.sections, sectionId };
}

export function duplicateSectionInPageHtml(pageHtml: string, sectionId: string): MutateSectionResult {
  const pageDoc = getParserDoc(pageHtml);
  if (!pageDoc) {
    const next = derivePageStateFromHtml(pageHtml);
    return { ...next, sectionId: null };
  }

  sanitizeDoc(pageDoc);
  const target = querySectionById(pageDoc, sectionId);
  if (!target) {
    const next = derivePageStateFromHtml(pageDoc.body.innerHTML);
    return { ...next, sectionId: null };
  }

  const clone = remapSectionClone(target.cloneNode(true) as HTMLElement);
  const insertedSection = ensureSectionNode(clone);
  target.parentNode?.insertBefore(clone, target.nextSibling);

  const next = derivePageStateFromHtml(pageDoc.body.innerHTML);
  return {
    html: next.html,
    sections: next.sections,
    sectionId: insertedSection.id,
  };
}
