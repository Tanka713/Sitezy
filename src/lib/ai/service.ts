import Anthropic from "@anthropic-ai/sdk";
import { getSiteImagePalette, formatPaletteForPrompt } from "@/lib/utils/images";
import type {
  SiteBrief,
  SiteBlueprint,
  BlueprintPage,
  PageSection,
} from "@/types";

// ─── Client ───────────────────────────────────────────────────────────────────
function getClient(): Anthropic {
  const key = process.env.SITEZY_SPARK_KEY || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("No API key found. Add SITEZY_SPARK_KEY to your .env.local file.");
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
  maxRetries = 2
): Promise<T> {
  const client = getClient();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
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
  throw new Error(`JSON generation failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
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
// Infers sections from top-level HTML tags — no JSON needed
function extractSections(html: string, pageSections: string[]): PageSection[] {
  const uid = () => Math.random().toString(36).slice(2, 9);

  // If we know the planned sections, use them directly
  if (pageSections.length > 0) {
    return pageSections.map((s) => ({
      id: uid(),
      type: s,
      name: s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "),
    }));
  }

  // Infer from HTML tags
  const sections: PageSection[] = [];
  const tagMap: Record<string, string> = {
    nav: "navbar", header: "hero", main: "content",
    section: "section", article: "article", footer: "footer", aside: "sidebar",
  };

  const tagRe = /<(nav|header|main|section|article|footer|aside|div)[^>]*>/gi;
  let m: RegExpExecArray | null;
  let count = 0;
  while ((m = tagRe.exec(html)) !== null && count < 20) {
    const tag = m[1].toLowerCase();
    const type = tagMap[tag] ?? tag;
    if (!sections.find((s) => s.type === type)) {
      sections.push({ id: uid(), type, name: type.charAt(0).toUpperCase() + type.slice(1) });
      count++;
    }
  }
  return sections.length > 0 ? sections : [{ id: uid(), type: "content", name: "Content" }];
}

function sanitizeGeneratedHtml(raw: string): string {
  let html = raw
    .replace(/^```html?\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();

  if (!html) {
    throw new Error("Generation returned empty HTML.");
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
    throw new Error("Generation did not return valid HTML.");
  }

  return html;
}

// ─── Page generation — streams raw HTML directly, no JSON wrapper ─────────────
export async function generatePage(
  blueprint: SiteBlueprint,
  page: BlueprintPage,
  brief: SiteBrief,
  onChunk?: (chunk: string, full: string) => void
): Promise<{ html: string; sections: PageSection[] }> {
  const wantsImages = !brief.imageStyle || brief.imageStyle === "photos" || brief.imageStyle === "illustrations";
  const palette     = wantsImages ? getSiteImagePalette(brief.siteType || "agency") : null;
  const imageGuide  = palette ? formatPaletteForPrompt(palette) : "";

  const system = `You are an elite frontend developer specializing in premium, unique website design.
Generate production-ready HTML for a single website page body.

OUTPUT RULES — CRITICAL:
- Output ONLY the raw HTML body content. Nothing else.
- Do NOT wrap in JSON. Do NOT use markdown fences. Do NOT add explanation.
- Do NOT include <html>, <head>, or <body> tags — output only what goes INSIDE <body>
- Start your response directly with the first HTML tag (e.g. <nav or <header)

TECHNICAL REQUIREMENTS:
- Use inline Tailwind CSS classes (CDN already loaded)
- Use inline styles with CSS variables (--primary, --secondary, --accent, --bg, --text)
- Make it visually stunning — not a generic template
- Include smooth hover effects using CSS transitions
- Use semantic HTML5 elements (nav, header, section, article, footer)
- Make fully responsive with Tailwind prefixes (sm:, md:, lg:)
- Do NOT use external JS libraries
${wantsImages ? "- Use the real image URLs provided — do NOT use placeholder.com or picsum.photos" : "- Do NOT use any images. Design with color and typography only."}

DESIGN REQUIREMENTS:
- Layout: ${blueprint.layoutStyle}
- Brand: ${blueprint.brandPersonality}
- Colors: primary=${blueprint.colorScheme.primary}, secondary=${blueprint.colorScheme.secondary}, accent=${blueprint.colorScheme.accent}, bg=${blueprint.colorScheme.bg}, text=${blueprint.colorScheme.text}
- Heading font: ${blueprint.typography.headingFont}
- Body font: ${blueprint.typography.bodyFont}
- Animation: ${blueprint.animationStyle}
- Direction: ${blueprint.designDirection}

${imageGuide}`;

  const user = `Generate the "${page.name}" page body for ${blueprint.siteName}.

Brief: ${brief.description}
Type: ${brief.siteType}
Tone: ${brief.tone}
Features: ${brief.features || "none"}
Image style: ${brief.imageStyle || "photos"}
Page purpose: ${page.purpose}
Sections to include: ${page.sections.join(", ")}
Navigation links: ${blueprint.pages.map((p) => p.name).join(", ")}

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

  const sections = extractSections(fullHtml, page.sections);
  return { html: fullHtml, sections };
}

// ─── Section regeneration ─────────────────────────────────────────────────────
export async function regenerateSection(
  blueprint: SiteBlueprint,
  pageHtml: string,
  sectionType: string,
  instruction: string,
  siteType = "agency"
): Promise<string> {
  const palette    = getSiteImagePalette(siteType);
  const imageGuide = formatPaletteForPrompt(palette);

  const system = `You are an elite frontend developer. Return ONLY the complete updated page HTML. No explanation, no markdown.
${imageGuide}`;

  const user = `Update the "${sectionType}" section of this page.
Instruction: ${instruction}
Colors: primary=${blueprint.colorScheme.primary}
Layout: ${blueprint.layoutStyle}

Current page HTML:
${pageHtml.slice(0, 8000)}

Return ONLY the complete updated page HTML with the ${sectionType} section changed. Nothing else.`;

  return streamCompletion(system, user, () => {});
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
