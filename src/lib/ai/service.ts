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
  if (!key) {
    throw new Error(
      "No API key found. Add SITEZY_SPARK_KEY (or ANTHROPIC_API_KEY) to your .env.local file."
    );
  }
  return new Anthropic({ apiKey: key });
}

function getModel(): string {
  return process.env.SITEZY_SPARK_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
}

// ─── Streaming ────────────────────────────────────────────────────────────────
export async function streamCompletion(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (chunk: string, full: string) => void
): Promise<string> {
  const client = getClient();
  let full = "";
  const stream = await client.messages.create({
    model: getModel(),
    max_tokens: 4096,
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

// ─── JSON completion with retry + repair ─────────────────────────────────────
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
      // Repair pass
      if (attempt < maxRetries) {
        try {
          const repairMsg = await client.messages.create({
            model: getModel(),
            max_tokens: 4096,
            system: "You are a JSON repair assistant. Fix the malformed JSON and return ONLY valid JSON.",
            messages: [{ role: "user", content: `Fix this malformed JSON:\n\n${raw}\n\nReturn ONLY the corrected JSON.` }],
          });
          const repaired = repairMsg.content
            .filter((b) => b.type === "text")
            .map((b) => (b as { type: "text"; text: string }).text)
            .join("")
            .replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
          return JSON.parse(repaired) as T;
        } catch {}
      }
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

// ─── Page generation ──────────────────────────────────────────────────────────
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
Generate production-ready HTML for a single website page.

TECHNICAL REQUIREMENTS:
- Output pure HTML for the <body> content (no <html>/<head> tags)
- Use inline Tailwind CSS classes via CDN (these are already loaded)
- Use inline styles with CSS variables (--primary, --secondary, --accent, --bg, --text)
- Make it visually stunning and unique — not a generic template
- Include smooth hover effects using inline CSS transitions
- Use semantic HTML5 elements
- Make responsive with Tailwind responsive prefixes (sm:, md:, lg:)
- Do NOT use any external JS libraries
${wantsImages ? "- Use the real image URLs provided — do NOT use picsum.photos or placeholder URLs" : "- Do NOT use any images"}

DESIGN REQUIREMENTS:
- Layout style: ${blueprint.layoutStyle}
- Brand personality: ${blueprint.brandPersonality}
- Colors: primary=${blueprint.colorScheme.primary}, secondary=${blueprint.colorScheme.secondary}, accent=${blueprint.colorScheme.accent}
- Typography: headings use ${blueprint.typography.headingFont}, body uses ${blueprint.typography.bodyFont}
- Animation style: ${blueprint.animationStyle}
- Design direction: ${blueprint.designDirection}

${imageGuide}`;

  const user = `Generate the "${page.name}" page for ${blueprint.siteName}.

Site Brief: ${brief.description}
Site Type: ${brief.siteType}
Tone: ${brief.tone}
Special Features: ${brief.features}
Image Style: ${brief.imageStyle || "photos"}
${brief.imageStyle === "none" ? "IMPORTANT: No images — design with pure color, typography, and layout only." : brief.imageStyle === "minimal" ? "IMPORTANT: Minimal images — 1-2 max." : ""}

Page Purpose: ${page.purpose}
Sections to include: ${page.sections.join(", ")}
Navigation links to: ${blueprint.pages.map((p) => p.name).join(", ")}

Return JSON:
{
  "html": "complete body HTML as a single string",
  "sections": [{ "id":"uid","type":"section-type","name":"Display Name" }]
}`;

  if (onChunk) {
    let fullText = "";
    await streamCompletion(
      system + "\n\nCRITICAL: Respond ONLY with valid JSON. No markdown fences, no explanation.",
      user,
      (chunk, full) => { fullText = full; onChunk(chunk, full); }
    );
    try {
      const cleaned = fullText.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
      return JSON.parse(cleaned);
    } catch {
      const match = fullText.match(/\{[\s\S]*\}/);
      if (match) { try { return JSON.parse(match[0]); } catch {} }
      const htmlMatch = fullText.match(/"html"\s*:\s*"([\s\S]*?)"\s*[,}]/);
      return {
        html: htmlMatch ? htmlMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : fullText,
        sections: page.sections.map((s, i) => ({ id: `section-${i}`, type: s, name: s.charAt(0).toUpperCase() + s.slice(1) })),
      };
    }
  }

  return jsonCompletion<{ html: string; sections: PageSection[] }>(system, user);
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
  const system = `You are an elite frontend developer. Regenerate a specific section. Match existing style perfectly.\n${imageGuide}`;
  const user   = `Regenerate the "${sectionType}" section.\n\nPage HTML:\n${pageHtml.slice(0, 3000)}\n\nInstruction: ${instruction}\nColors: primary=${blueprint.colorScheme.primary}\n\nReturn JSON: { "sectionHtml": "new HTML string" }`;
  const result = await jsonCompletion<{ sectionHtml: string }>(system, user);
  return result.sectionHtml;
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
Blueprint: ${JSON.stringify(context.blueprint ?? {}).slice(0, 500)}
${context.pageName ? `Current page: ${context.pageName}` : ""}
Be concise and specific. Use real image URLs when generating HTML.\n${imageGuide}`;
  const user = context.pageHtml
    ? `Current page HTML (first 2000 chars):\n${context.pageHtml.slice(0, 2000)}\n\nUser: ${instruction}`
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
  const planSystem = "You are a web architect. Plan a new page for an existing website. Return JSON only.";
  const planUser   = `Add a "${pageName}" page to ${blueprint.siteName}.\nDescription: ${pageDescription}\nExisting pages: ${blueprint.pages.map(p=>p.name).join(", ")}\nReturn JSON: { "id":"uid","name":"${pageName}","slug":"url-slug","sections":["type1","type2"],"purpose":"string" }`;
  const pageBlueprint = await jsonCompletion<BlueprintPage>(planSystem, planUser);
  const result        = await generatePage(blueprint, pageBlueprint, brief);
  return { page: pageBlueprint, html: result.html, sections: result.sections };
}

// ─── Engine availability (simplified — Spark only) ────────────────────────────
export function getEngineAvailability() {
  const hasKey = !!(process.env.SITEZY_SPARK_KEY || process.env.ANTHROPIC_API_KEY);
  return { spark: hasKey };
}
