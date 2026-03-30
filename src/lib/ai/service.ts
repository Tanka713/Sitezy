import Anthropic from "@anthropic-ai/sdk";
import { getSiteImagePalette, formatPaletteForPrompt } from "@/lib/utils/images";
import {
  API_AUTH_001,
  API_GENERATE_001,
  API_GENERATE_002,
  createAppError,
} from "@/lib/errors";
import type {
  SiteBrief,
  SiteBlueprint,
  BlueprintPage,
  PageSection,
} from "@/types";

// ─── Client ───────────────────────────────────────────────────────────────────
function getClient(): Anthropic {
  const key = process.env.SITEZY_SPARK_KEY || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw createAppError({
      code: API_AUTH_001,
      devMessage: "Anthropic client initialization failed: missing SITEZY_SPARK_KEY / ANTHROPIC_API_KEY",
      severity: "fatal",
    });
  }
  return new Anthropic({ apiKey: key });
}

function getModel(): string {
  return process.env.SITEZY_SPARK_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
}

// ─── Streaming helper ─────────────────────────────────────────────────────────
export async function streamCompletion(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (chunk: string, full: string) => void
): Promise<string> {
  const client = getClient();
  let full = "";
  const stream = await client.messages.create({
    model: getModel(),
    max_tokens: 8000,
    stream: true,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      full += event.delta.text;
      onChunk(event.delta.text, full);
    }
  }
  return full;
}

// ─── JSON completion (for small responses only — blueprint, sections list) ────
export async function jsonCompletion<T = unknown>(
  systemPrompt: string,
  userPrompt: string,
  maxRetries = 4
): Promise<T> {
  const client = getClient();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2 ** (attempt - 1) * 500));
    }
    const msg = await client.messages.create({
      model: getModel(),
      max_tokens: 4096,
      system: systemPrompt + "\n\nCRITICAL: Respond ONLY with valid JSON. No markdown fences, no explanation.",
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
      return JSON.parse(cleaned) as T;
    } catch (e) {
      lastError = e as Error;
      const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) { try { return JSON.parse(match[0]) as T; } catch {} }
    }
  }
  throw createAppError({
    code: API_GENERATE_002,
    devMessage: `JSON generation failed after ${maxRetries + 1} attempts: ${lastError?.message ?? "unknown parse error"}`,
    severity: "error",
    metadata: { maxRetries },
    cause: lastError,
  });
}

// ─── Blueprint ────────────────────────────────────────────────────────────────
export async function generateBlueprint(brief: SiteBrief): Promise<SiteBlueprint> {
  const system = `You are an expert web architect, designer, and brand strategist.
Generate a unique, premium website blueprint as JSON.

CRITICAL UNIQUENESS RULES:
- Every site MUST be structurally unique based on business type
- Vary layouts: editorial, bento, asymmetric, split-screen, grid, storytelling, card-based, zigzag, product-first, magazine, sidebar-led
- Choose fonts that match the brand personality — never use generic fonts
- Color schemes must reflect the brand and industry
- Do NOT default to the same hero+features+footer pattern every time`;

  const user = `Create a unique website blueprint for:

Site Name: ${brief.siteName}
Description: ${brief.description}
Type: ${brief.siteType || "auto-detect from description"}
Tone: ${brief.tone}
Required Pages: ${brief.pages.join(", ")}
Special Features: ${brief.features || "none"}
Target Audience: ${brief.targetAudience || "general"}
Color Preference: ${brief.colorPreference || "choose colors that perfectly match the business type and tone"}
${brief.colorPalette && brief.colorPalette.length > 0 ? `Specific Colors: ${brief.colorPalette.join(", ")} — build the color scheme around these exact hex values` : ""}
Image Style: ${brief.imageStyle || "photos"}

Return JSON:
{
  "siteName": "string",
  "tagline": "string",
  "brandPersonality": "string (2-3 sentences)",
  "colorScheme": { "primary":"#hex","secondary":"#hex","accent":"#hex","bg":"#hex","text":"#hex","muted":"#hex","border":"#hex" },
  "typography": { "headingFont":"Google Font name","bodyFont":"Google Font name","style":"string","headingWeight":"700|800|900","lineHeight":"1.1|1.2|1.3" },
  "layoutStyle": "editorial|bento|asymmetric|split-screen|grid|storytelling|card-based|zigzag|product-first|magazine|sidebar-led",
  "navigationStyle": "minimal|full|floating",
  "footerStyle": "simple|detailed|bold|minimal",
  "animationStyle": "none|subtle|moderate|expressive",
  "designDirection": "string (detailed direction for page generation)",
  "pages": [{ "id":"uid","name":"string","slug":"url-slug","sections":["type1","type2"],"purpose":"string","priority":1 }]
}`;

  return jsonCompletion<SiteBlueprint>(system, user);
}

// ─── Extract sections from raw HTML ──────────────────────────────────────────
// Parses data-sz-section-* attributes written by the AI (mandatory since Phase 1).
// Falls back to inferring from tag names when attributes are absent.
// Runs server-side so no DOMParser — regex only.
function extractSections(html: string): PageSection[] {
  const uid = () => Math.random().toString(36).slice(2, 9);

  // Match top-level opening tags that carry data-sz-section-id
  const attrRe = /<(?:nav|header|section|article|footer|div|main|aside)[^>]+data-sz-section-id="([^"]+)"[^>]*>/gi;
  const typeRe  = /data-sz-section-type="([^"]+)"/i;
  const nameRe  = /data-sz-section-name="([^"]+)"/i;

  const sections: PageSection[] = [];
  let m: RegExpExecArray | null;

  while ((m = attrRe.exec(html)) !== null && sections.length < 30) {
    const tag   = m[0];
    const id    = m[1].trim() || `sec-${uid()}`;
    const type  = typeRe.exec(tag)?.[1]?.trim() || "section";
    const name  = nameRe.exec(tag)?.[1]?.trim() || type.charAt(0).toUpperCase() + type.slice(1);
    sections.push({ id, type, name });
  }

  if (sections.length > 0) return sections;

  // Fallback: infer from semantic tag names (no data-sz attributes present)
  const tagMap: Record<string, string> = {
    nav: "navbar", header: "hero", main: "content",
    section: "section", article: "article", footer: "footer", aside: "sidebar",
  };
  const tagRe = /<(nav|header|main|section|article|footer|aside)[^>]*>/gi;
  let count = 0;
  while ((m = tagRe.exec(html)) !== null && count < 20) {
    const tag  = m[1].toLowerCase();
    const type = tagMap[tag] ?? tag;
    if (!sections.find((s) => s.type === type)) {
      sections.push({ id: `sec-${uid()}`, type, name: type.charAt(0).toUpperCase() + type.slice(1) });
      count++;
    }
  }

  return sections.length > 0 ? sections : [{ id: `sec-${uid()}`, type: "content", name: "Content" }];
}

function sanitizeGeneratedHtml(raw: string): string {
  let html = raw
    .replace(/^```html?\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();

  if (!html) {
    throw createAppError({
      code: API_GENERATE_002,
      devMessage: "Generated HTML was empty after sanitization",
      severity: "error",
    });
  }

  if (html.startsWith("{") || html.startsWith('{"html"')) {
    try {
      const parsed = JSON.parse(html);
      if (typeof parsed.html === "string") {
        html = parsed.html.trim();
      }
    } catch {
      const m = html.match(/"html"\s*:\s*"([\s\S]*?)"\s*[,}]/);
      if (m) html = m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\").trim();
    }
  }

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch?.[1]) {
    html = bodyMatch[1].trim();
  }

  html = html
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\/?(html|head|body)[^>]*>/gi, "")
    .trim();

  if (!html.startsWith("<")) {
    throw createAppError({
      code: API_GENERATE_002,
      devMessage: "Generated content did not sanitize into valid HTML",
      severity: "error",
      metadata: { preview: html.slice(0, 160) },
    });
  }

  return html;
}

// ─── Page generation — streams raw HTML directly, no JSON wrapper ─────────────
export async function generatePage(
  blueprint: SiteBlueprint,
  page: BlueprintPage,
  brief: SiteBrief,
  onChunk?: (chunk: string, full: string) => void,
  navbarHtml?: string | null
): Promise<{ html: string; sections: PageSection[] }> {
  const wantsImages = !brief.imageStyle || brief.imageStyle === "photos" || brief.imageStyle === "illustrations";
  const palette     = wantsImages ? getSiteImagePalette(brief.siteType || "agency") : null;
  const imageGuide  = palette ? formatPaletteForPrompt(palette) : "";

  const logoInstruction = brief.hasLogo
    ? `\nLOGO IMAGE — CRITICAL: A custom logo image has been uploaded. In the navbar, use EXACTLY this as the logo element (no text brand name alongside it):\n<img src="__LOGO__" alt="${blueprint.siteName} logo" style="height:44px;width:auto;object-fit:contain;display:block;" />\nUse src="__LOGO__" exactly as written — it will be replaced with the real image. Do NOT show the site name as text next to it.`
    : "";

  const currencyInstruction = brief.currency
    ? `\nCURRENCY: All prices and monetary values MUST use ${brief.currency}. Do NOT use $ unless the currency is USD.`
    : "";

  const system = `You are an elite frontend developer specializing in premium, unique website design.
Generate production-ready HTML for a single website page body.

OUTPUT RULES — CRITICAL:
- Output ONLY the raw HTML body content. Nothing else.
- Do NOT wrap in JSON. Do NOT use markdown fences. Do NOT add explanation.
- Do NOT include <html>, <head>, or <body> tags — output only what goes INSIDE <body>
- Start your response directly with the first HTML tag (e.g. <nav or <header)

EDITOR DATA ATTRIBUTES — MANDATORY ON EVERY TOP-LEVEL SECTION:
Every direct child of the body MUST have these three attributes so the visual editor can identify, track, and style them:
  data-sz-section-id="sec-[8-char-random]"  — unique stable ID (e.g. "sec-a1b2c3d4"). Generate a DIFFERENT random suffix for EVERY section. NEVER reuse the same ID.
  data-sz-section-type="[type]"              — choose from: navbar, hero, features, testimonial, gallery, logos, cta, footer, faq, pricing, team, stats, contact, about, section
  data-sz-section-name="[Name]"             — short human-readable label, max 50 chars (e.g. "Navigation", "Hero", "Key Features", "Pricing Plans")
Examples:
  <nav data-sz-section-id="sec-n7x2k9qm" data-sz-section-type="navbar" data-sz-section-name="Navigation" class="...">
  <section data-sz-section-id="sec-h4p8r1wz" data-sz-section-type="hero" data-sz-section-name="Hero" class="...">
  <section data-sz-section-id="sec-f3m6y0je" data-sz-section-type="features" data-sz-section-name="Key Features" class="...">
  <section data-sz-section-id="sec-p9q2v5xt" data-sz-section-type="pricing" data-sz-section-name="Pricing Plans" class="...">
  <footer data-sz-section-id="sec-b1k7s4dn" data-sz-section-type="footer" data-sz-section-name="Footer" class="...">
All three attributes are REQUIRED — do not omit them on any top-level element.

NAVBAR RULES — CRITICAL:
- ALWAYS use position:sticky; top:0; z-index:1000 on the navbar — NEVER use position:fixed
- Sticky navbars stay in flow so no padding-top compensation is needed on sections below
${logoInstruction}

MAP / LOCATION RULES:
- For any map, location, or directions section: use a REAL Google Maps iframe embed
- Format: <iframe src="https://www.google.com/maps?q=[URL_ENCODED_ADDRESS_OR_BUSINESS_NAME]&output=embed" width="100%" height="400" style="border:0;display:block;" allowfullscreen loading="lazy"></iframe>
- Replace [URL_ENCODED_ADDRESS_OR_BUSINESS_NAME] with the actual address or business name URL-encoded (spaces → +)
- NEVER use a fake placeholder image as a map
${currencyInstruction}

TECHNICAL REQUIREMENTS:
- Use inline Tailwind CSS classes (CDN already loaded)
- Use inline styles with CSS variables (--primary, --secondary, --accent, --bg, --text)
- Make it visually stunning — not a generic template
- Include smooth hover effects using CSS transitions
- Use semantic HTML5 elements (nav, header, section, article, footer)
- Make fully responsive with Tailwind prefixes (sm:, md:, lg:)
- Do NOT use external JS libraries
${wantsImages ? "- Use ONLY the image URLs provided above — do NOT use placeholder.com or make up any other URLs" : "- Do NOT use any images. Design with color and typography only."}

DESIGN REQUIREMENTS:
- Layout: ${blueprint.layoutStyle}
- Brand: ${blueprint.brandPersonality}
- Colors: primary=${blueprint.colorScheme.primary}, secondary=${blueprint.colorScheme.secondary}, accent=${blueprint.colorScheme.accent}, bg=${blueprint.colorScheme.bg}, text=${blueprint.colorScheme.text}
- Heading font: ${blueprint.typography.headingFont}
- Body font: ${blueprint.typography.bodyFont}
- Animation: ${blueprint.animationStyle}
- Direction: ${blueprint.designDirection}

${imageGuide}`;

  const navLinks = blueprint.pages
    .map((p) => `${p.name} → /${p.slug || p.name.toLowerCase().replace(/\s+/g, "-")}`)
    .join(", ");

  const navbarInstruction = navbarHtml
    ? `\nNAVBAR — USE EXACTLY AS-IS (copy this HTML verbatim as the first element, do NOT regenerate it):\n${navbarHtml}\n\nAFTER the navbar above, generate the remaining sections for this page.`
    : `\nGenerate a navbar as the first section.`;

  const user = `Generate the "${page.name}" page body for ${blueprint.siteName}.

Brief: ${brief.description}
Type: ${brief.siteType}
Tone: ${brief.tone}
Features: ${brief.features || "none"}
Image style: ${brief.imageStyle || "photos"}
Page purpose: ${page.purpose}
Sections to include: ${page.sections.join(", ")}
Navigation links (use these exact hrefs — NOT hash anchors): ${navLinks}

IMPORTANT: For all navigation links use the slug paths above (e.g. href="/menu", href="/about"). Do NOT use href="#menu" or href="#about" — these break page navigation.
${navbarInstruction}

Output ONLY the raw HTML. Start with the first tag. No JSON, no markdown, no explanation.`;

  let fullHtml = "";

  if (onChunk) {
    await streamCompletion(system, user, (chunk, full) => {
      fullHtml = full;
      onChunk(chunk, full);
    });
  } else {
    fullHtml = await streamCompletion(system, user, () => {});
  }

  fullHtml = sanitizeGeneratedHtml(fullHtml);

  const sections = extractSections(fullHtml);
  return { html: fullHtml, sections };
}

// ─── Section regeneration ─────────────────────────────────────────────────────
export async function regenerateSection(
  blueprint: SiteBlueprint,
  brief: SiteBrief,
  page: Pick<BlueprintPage, "name" | "purpose">,
  section: {
    id?: string;
    type: string;
    name: string;
    html: string;
    previousSectionName?: string | null;
    nextSectionName?: string | null;
  },
  instruction?: string
): Promise<string> {
  const wantsImages = !brief.imageStyle || brief.imageStyle === "photos" || brief.imageStyle === "illustrations";
  const palette    = wantsImages ? getSiteImagePalette(brief.siteType || "agency") : null;
  const imageGuide = palette ? formatPaletteForPrompt(palette) : "";

  const system = `You are an elite frontend developer and web designer.
Return ONLY the replacement HTML for ONE section. No explanation, no markdown.

OUTPUT RULES:
- Return a single top-level semantic section block only
- Do NOT return the full page
- Do NOT wrap in JSON
- Do NOT include <html>, <head>, or <body>
- Match the existing site's visual language exactly
- Keep spacing rhythm, typography, color usage, and component tone consistent
- Preserve the semantic role of the section (hero, features, testimonial, footer, navbar, etc.)
- Use inline Tailwind utility classes and inline styles with CSS variables (--primary, --secondary, --accent, --bg, --text)
- PRESERVE ALL three data-sz-* attributes from the original section on the root element: data-sz-section-id, data-sz-section-type, data-sz-section-name
- If any are missing, add them: data-sz-section-id="${(section as { id?: string }).id ?? ""}" data-sz-section-type="${section.type}" data-sz-section-name="${section.name}"
- The data-sz-section-id MUST remain identical to the original — never change it

SITE DESIGN SYSTEM:
- Site: ${blueprint.siteName}
- Layout: ${blueprint.layoutStyle}
- Brand: ${blueprint.brandPersonality}
- Direction: ${blueprint.designDirection}
- Colors: primary=${blueprint.colorScheme.primary}, secondary=${blueprint.colorScheme.secondary}, accent=${blueprint.colorScheme.accent}, bg=${blueprint.colorScheme.bg}, text=${blueprint.colorScheme.text}
- Heading font: ${blueprint.typography.headingFont}
- Body font: ${blueprint.typography.bodyFont}

${imageGuide}`;

  const user = `Regenerate this page section so it feels fresh, premium, and on-brand.

Page: ${page.name}
Page purpose: ${page.purpose}
Business type: ${brief.siteType}
Tone: ${brief.tone}
Features: ${brief.features || "none"}

Section type: ${section.type}
Section name: ${section.name}
Previous section: ${section.previousSectionName || "none"}
Next section: ${section.nextSectionName || "none"}

Current section HTML:
${section.html.slice(0, 6000)}

Return ONLY the new HTML for this one section.
${instruction ? `Additional direction: ${instruction}` : ""}`;

  const html = await streamCompletion(system, user, () => {});
  return sanitizeGeneratedHtml(html);
}

// ─── Generate new block / section ────────────────────────────────────────────
export async function generateNewBlock(
  blueprint: SiteBlueprint,
  brief: SiteBrief,
  page: Pick<BlueprintPage, "name" | "purpose">,
  block: {
    type: string;
    label: string;
    placement: string;
  },
  context: {
    existingSections: string[];
    previousSectionName?: string | null;
    nextSectionName?: string | null;
    selectedSectionName?: string | null;
    selectedNodeLabel?: string | null;
    navbarHtml?: string | null;
  }
): Promise<string> {
  const wantsImages = !brief.imageStyle || brief.imageStyle === "photos" || brief.imageStyle === "illustrations";
  const palette    = wantsImages ? getSiteImagePalette(brief.siteType || "agency") : null;
  const imageGuide = palette ? formatPaletteForPrompt(palette) : "";

  const system = `You are an elite frontend developer generating a NEW block or section for an existing website.
Return ONLY the HTML for the new block/section. No explanation, no markdown, no full page.

OUTPUT RULES:
- Return a single top-level HTML block/section only
- Do NOT return the full page — only the new block
- Do NOT wrap in JSON
- Do NOT include <html>, <head>, or <body>
- Match the existing site's visual language exactly
- Use the same spacing rhythm, typography, color usage, and component tone
- Use inline Tailwind utility classes and inline styles with CSS variables (--primary, --secondary, --accent, --bg, --text)
${wantsImages ? "- Use ONLY the image URLs provided above — do NOT use placeholder.com or make up any other URLs" : "- Do NOT use any images. Design with color and typography only."}
- Add all three editor attributes on the ROOT element of the new block (required for the visual editor):
    data-sz-section-id="sec-[unique-8-char-random]"  — generate a fresh unique ID
    data-sz-section-type="${block.type}"
    data-sz-section-name="${block.label}"

SITE DESIGN SYSTEM:
- Site: ${blueprint.siteName}
- Layout: ${blueprint.layoutStyle}
- Brand: ${blueprint.brandPersonality}
- Direction: ${blueprint.designDirection}
- Colors: primary=${blueprint.colorScheme.primary}, secondary=${blueprint.colorScheme.secondary}, accent=${blueprint.colorScheme.accent}, bg=${blueprint.colorScheme.bg}, text=${blueprint.colorScheme.text}
- Heading font: ${blueprint.typography.headingFont}
- Body font: ${blueprint.typography.bodyFont}
- Animation: ${blueprint.animationStyle}

${imageGuide}`;

  // If inserting a navbar block and an existing navbar exists, reuse it exactly
  if (block.type === "navbar" && context.navbarHtml) {
    return sanitizeGeneratedHtml(context.navbarHtml);
  }

  const isInline = block.placement === "inline";
  const placementContext = block.placement === "top"
    ? "Position it at the very top of the page (e.g. a navbar or announcement bar)."
    : block.placement === "bottom"
    ? "Position it at the bottom of the page (e.g. a footer or bottom CTA)."
    : isInline
    ? `Insert it INLINE inside a section${context.selectedSectionName ? ` (inside "${context.selectedSectionName}")` : ""}${context.selectedNodeLabel ? ` near the element "${context.selectedNodeLabel}"` : ""}. Return a compact inline snippet, NOT a full section wrapper.`
    : `Insert it as a full standalone section${context.previousSectionName ? ` after "${context.previousSectionName}"` : ""}${context.nextSectionName ? ` before "${context.nextSectionName}"` : ""}.`;

  const user = `Generate a new "${block.label}" (type: ${block.type}) block for the "${page.name}" page.

Page purpose: ${page.purpose}
Business: ${brief.siteName} — ${brief.description}
Business type: ${brief.siteType}
Tone: ${brief.tone}
Features: ${brief.features || "none"}

Existing sections on this page (in order): ${context.existingSections.length > 0 ? context.existingSections.join(", ") : "none yet"}
${context.previousSectionName ? `Section immediately before: ${context.previousSectionName}` : ""}
${context.nextSectionName ? `Section immediately after: ${context.nextSectionName}` : ""}

Placement: ${placementContext}

Return ONLY the new ${isInline ? "inline snippet" : "section"} HTML. No JSON, no markdown, no explanation.`;

  const html = await streamCompletion(system, user, () => {});
  return sanitizeGeneratedHtml(html);
}

// ─── AI assistant ─────────────────────────────────────────────────────────────
export async function aiAssist(
  instruction: string,
  context: {
    projectName: string;
    blueprint?: SiteBlueprint | null;
    pageName?: string;
    pageHtml?: string;
    siteType?: string;
  },
  onChunk: (chunk: string, full: string) => void
): Promise<string> {
  const palette    = getSiteImagePalette(context.siteType || "agency");
  const imageGuide = formatPaletteForPrompt(palette);

  const system = `You are Sitezy's AI design and development assistant.
Project: ${context.projectName}
${context.pageName ? `Current page: ${context.pageName}` : ""}
Be concise and specific. When generating HTML, return raw HTML only — no JSON, no markdown fences.
${imageGuide}`;

  const user = context.pageHtml
    ? `Current page HTML:\n${context.pageHtml.slice(0, 6000)}\n\nUser request: ${instruction}`
    : instruction;

  return streamCompletion(system, user, onChunk);
}

// ─── Add new page ─────────────────────────────────────────────────────────────
export async function generateNewPage(
  blueprint: SiteBlueprint,
  pageName: string,
  pageDescription: string,
  brief: SiteBrief
): Promise<{ page: BlueprintPage; html: string; sections: PageSection[] }> {
  // Plan the page structure (small JSON — safe)
  const planSystem = "You are a web architect. Plan a new page for an existing website. Return JSON only.";
  const planUser   = `Add a "${pageName}" page to ${blueprint.siteName}.
Description: ${pageDescription}
Existing pages: ${blueprint.pages.map((p) => p.name).join(", ")}
Return JSON: { "id":"uid","name":"${pageName}","slug":"url-slug","sections":["type1","type2"],"purpose":"string" }`;

  const pageBlueprint = await jsonCompletion<BlueprintPage>(planSystem, planUser);

  // Generate the HTML (raw, no JSON)
  const result = await generatePage(blueprint, pageBlueprint, brief);
  return { page: pageBlueprint, html: result.html, sections: result.sections };
}

export function getEngineAvailability() {
  const hasKey = !!(process.env.SITEZY_SPARK_KEY || process.env.ANTHROPIC_API_KEY);
  return { spark: hasKey };
}
