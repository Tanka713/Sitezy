import { NextRequest } from "next/server";
import { jsonCompletion } from "@/lib/ai/service";
import { handleRouteError, parseRequestBody } from "@/lib/errors";
import { API_UNKNOWN_001 } from "@/lib/errors";
import type { SiteBlueprint } from "@/types";

export const runtime    = "nodejs";
export const maxDuration = 30;

interface IntelligenceRequest {
  sectionHtml?: string;
  sectionName?: string;
  sectionType?: string;
  nodeTag?: string;
  nodeRole?: string;
  pageName?: string;
  blueprint?: SiteBlueprint | null;
}

interface Suggestion {
  label: string;
  prompt: string;
  icon: string;
}

/** Strip noise from HTML so it fits in a prompt without wasting tokens */
function cleanHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s+data-sz-[a-z-]+="[^"]*"/g, " ")   // strip internal data attrs
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 4500);
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const body = await parseRequestBody<IntelligenceRequest>(req);

    const sectionHtml  = body.sectionHtml  ?? "";
    const sectionName  = body.sectionName  ?? "Unknown section";
    const sectionType  = body.sectionType  ?? "section";
    const nodeRole     = body.nodeRole     ?? "container";
    const pageName     = body.pageName     ?? "page";
    const bp           = body.blueprint;

    const colorInfo = bp?.colorScheme
      ? `Background: ${bp.colorScheme.bg}, Primary: ${bp.colorScheme.primary}, Accent: ${bp.colorScheme.accent}`
      : "Unknown";
    const fontInfo  = bp?.typography
      ? `Heading: ${bp.typography.headingFont}, Body: ${bp.typography.bodyFont}`
      : "Unknown";
    const toneInfo  = bp?.brandPersonality ?? "Professional";
    const siteType  = "website";

    const cleanedHtml = cleanHtml(sectionHtml);

    const system = `You are a world-class product designer and CRO (conversion rate optimization) expert.
You analyze real website HTML and return specific, high-impact design improvement suggestions.

RULES:
- Read the ACTUAL HTML content — reference real text, real structure, real colors you see
- Be SPECIFIC: "Change the hero headline from 'Welcome' to something benefit-driven" not "Improve the headline"
- Be ACTIONABLE: each suggestion must be a clear instruction an AI can execute via HTML/CSS edits
- Cover different dimensions: copy, visual design, spacing/layout, conversion — don't repeat types
- "label" must be ≤ 5 words, action-oriented (e.g. "Sharpen the headline copy")
- "prompt" is the instruction the AI assistant will receive — make it specific with context from the HTML
- "icon" is a single relevant emoji

CRITICAL: Return ONLY a valid JSON array. No markdown. No explanation. No trailing commas.`;

    const user = `Analyze this ${sectionType} section from the "${pageName}" page and return exactly 3 high-impact design improvements.

SECTION: "${sectionName}" (type: ${sectionType}, element: ${nodeRole})
SITE TYPE: ${siteType}
BRAND COLORS: ${colorInfo}
FONTS: ${fontInfo}
TONE: ${toneInfo}

HTML:
${cleanedHtml}

Return a JSON array of exactly 3 objects:
[
  { "label": "Short action label", "prompt": "Specific, detailed instruction referencing the actual content", "icon": "emoji" },
  { "label": "...", "prompt": "...", "icon": "..." },
  { "label": "...", "prompt": "...", "icon": "..." }
]`;

    const suggestions = await jsonCompletion<Suggestion[]>(system, user, 1);

    // Validate and sanitize
    const safe = (Array.isArray(suggestions) ? suggestions : [])
      .slice(0, 3)
      .map((s) => ({
        id:     String(s.label ?? "").toLowerCase().replace(/\s+/g, "-").slice(0, 30),
        label:  String(s.label ?? "Improve this section").slice(0, 60),
        prompt: String(s.prompt ?? "").slice(0, 600),
        icon:   String(s.icon ?? "✨").slice(0, 4),
      }));

    return Response.json({ suggestions: safe });
  } catch (err) {
    return handleRouteError(err, requestId, API_UNKNOWN_001);
  }
}
