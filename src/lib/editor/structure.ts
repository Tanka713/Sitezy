import type { PageSection } from "@/types";
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

function inferType(node: HTMLElement): string {
  const explicit = node.dataset.szSectionType?.trim();
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
  if (tag === "nav" || attrs.includes("nav")) return "navbar";
  if (tag === "footer" || attrs.includes("footer")) return "footer";

  // Explicit keyword matches in class/id
  if (attrs.includes("hero") || tag === "header") return "hero";
  if (attrs.includes("testimonial") || attrs.includes("review") || attrs.includes("social-proof")) return "testimonial";
  if (attrs.includes("gallery") || attrs.includes("portfolio") || attrs.includes("work")) return "gallery";
  if (attrs.includes("feature") || attrs.includes("benefit") || attrs.includes("highlight")) return "features";
  if (attrs.includes("pricing") || attrs.includes("price") || attrs.includes("plan") || attrs.includes("tier")) return "pricing";
  if (attrs.includes("faq") || attrs.includes("accordion") || attrs.includes("question")) return "faq";
  if (attrs.includes("team") || attrs.includes("staff") || attrs.includes("member") || attrs.includes("people")) return "team";
  if (attrs.includes("stat") || attrs.includes("counter") || attrs.includes("metric") || attrs.includes("number")) return "stats";
  if (attrs.includes("contact") || attrs.includes("form") || attrs.includes("reach")) return "contact";
  if (attrs.includes("about") || attrs.includes("story") || attrs.includes("mission")) return "about";
  if (attrs.includes("cta") || attrs.includes("call-to-action") || attrs.includes("convert")) return "cta";
  if (attrs.includes("logo") || attrs.includes("brand") || attrs.includes("client") || attrs.includes("partner")) return "logos";

  // Heading text content signals
  if (headings.match(/\bfaq\b|frequently asked|questions/)) return "faq";
  if (headings.match(/\bpric|\bplan\b|\btier\b/)) return "pricing";
  if (headings.match(/\bteam\b|\bstaff\b|\bmeet\b/)) return "team";
  if (headings.match(/\bfeature|\bbenefit|\bhow it work/)) return "features";
  if (headings.match(/\btestimoni|\bwhat.*say|\breview/)) return "testimonial";

  // CTA signals from body text
  if (text.match(/\bget started\b|\bsign up\b|\bbook now\b|\btry for free\b|\bstart today\b/)) return "cta";

  // Hero signals: large screen-filling section at the top with a heading
  const firstHeading = node.querySelector("h1");
  if (firstHeading && (attrs.includes("min-h-screen") || attrs.includes("min-h-") || attrs.includes("py-24") || attrs.includes("py-32") || attrs.includes("py-20"))) return "hero";

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

  return SECTION_TYPE_LABELS[type] ?? type
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

function querySectionById(doc: Document, sectionId: string): HTMLElement | null {
  return doc.body.querySelector<HTMLElement>(`[data-sz-section-id="${sectionId.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`);
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
