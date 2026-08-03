/**
 * Web Inspiration Engine
 *
 * Searches for real websites in the user's industry and extracts design signals —
 * color approaches, layout patterns, section compositions, and content tone —
 * to use as inspiration during site generation.
 *
 * Primary:  Anthropic web_search_20250305 tool (real live web results)
 * Fallback: Claude knowledge synthesis (accurate industry design knowledge)
 */

import Anthropic from "@anthropic-ai/sdk";
import { getClient, getModel, extractText, jsonCompletion } from "@/lib/ai/runtime";
import type { BusinessBrief } from "@/lib/ai/types";

// ─── Result Type ──────────────────────────────────────────────────────────────

export interface WebInspirationSource {
  /** Company or site name, e.g. "Airbnb", "Hertz" */
  name: string;
  /** Short descriptor, e.g. "vacation rental platform" */
  descriptor: string;
  /** Primary color family: "warm neutrals", "bold primary blue", etc. */
  colorProfile: string;
  /** Layout approach: "card-heavy grid", "full-bleed hero", etc. */
  layoutApproach: string;
  /** Section types this site uses prominently */
  sectionTypes: string[];
  /** What makes this site's design distinctive */
  designSignature: string;
}

export interface WebInspirationResult {
  /** Search query used */
  query: string;
  /** Whether results came from live web search vs. knowledge base */
  source: "web" | "knowledge";
  /** 3–5 reference sites with design breakdowns */
  sites: WebInspirationSource[];
  /** Synthesized cross-site insights */
  insights: {
    /** Dominant color approach for the industry */
    colorApproach: string;
    /** Typography style direction */
    typographyStyle: string;
    /** How dense/minimal sites in this space are */
    layoutDensity: string;
    /** Section types that consistently appear across sites */
    commonSectionTypes: string[];
    /** Tone of copy in this industry */
    contentTone: string;
    /** What high-performing sites in this space do differently */
    differentiators: string[];
    /** Best-fit layout style for this business type */
    suggestedLayoutStyle?: string;
    /** Key trust signals that convert in this industry */
    trustSignalPatterns: string[];
    /** Award-level design techniques that would elevate a site beyond the industry norm */
    standoutTechniques?: string[];
  };
}

// ─── Query Builder ────────────────────────────────────────────────────────────

function buildInspirationQuery(brief: BusinessBrief): string {
  const name = brief.businessName || "this business";
  const industry = brief.industry || "general services";
  const description = brief.businessDescription
    ? brief.businessDescription.slice(0, 120)
    : "";
  const location = brief.location || "";
  const goals = brief.websiteGoals.slice(0, 2).join(", ");

  const parts = [
    `Top websites for ${industry} businesses`,
    description ? `(like: ${description})` : "",
    location ? `in ${location}` : "",
    goals ? `focused on ${goals}` : "",
  ].filter(Boolean);

  return parts.join(" ");
}

function buildWebSearchPrompt(brief: BusinessBrief): string {
  const query = buildInspirationQuery(brief);
  return [
    `I'm building a website for: ${brief.businessName || "a business"} (${brief.industry}).`,
    `Business: ${brief.businessDescription || "Not provided"}.`,
    ``,
    `Search the web for: "${query}"`,
    ``,
    `Find 4–5 real, well-designed websites for similar businesses. For each site:`,
    `- Name the company and describe it briefly`,
    `- Describe their color palette (specific colors or families)`,
    `- Describe their layout approach (hero style, grid, density)`,
    `- List the main section types they use`,
    `- Note what makes their design distinctive`,
    ``,
    `Then synthesize cross-site patterns:`,
    `- What color approach dominates this industry?`,
    `- What typography style is common?`,
    `- How dense or minimal are sites in this space?`,
    `- What section types appear consistently?`,
    `- What is the typical content tone?`,
    `- What do high-performing sites do differently?`,
    `- What trust signal patterns convert in this space?`,
    `- What award-level design techniques (think Awwwards / FWA / SiteInspire winners: layout composition,`,
    `  scroll motion, typography scale, hover details) would elevate a site in this industry beyond the norm?`,
    ``,
    `Return ONLY this JSON (no markdown):`,
    `{`,
    `  "query": "string",`,
    `  "sites": [`,
    `    {`,
    `      "name": "string",`,
    `      "descriptor": "string",`,
    `      "colorProfile": "string",`,
    `      "layoutApproach": "string",`,
    `      "sectionTypes": ["string"],`,
    `      "designSignature": "string"`,
    `    }`,
    `  ],`,
    `  "insights": {`,
    `    "colorApproach": "string",`,
    `    "typographyStyle": "string",`,
    `    "layoutDensity": "string",`,
    `    "commonSectionTypes": ["string"],`,
    `    "contentTone": "string",`,
    `    "differentiators": ["string"],`,
    `    "suggestedLayoutStyle": "string",`,
    `    "trustSignalPatterns": ["string"],`,
    `    "standoutTechniques": ["string (concrete award-level layout/motion/typography techniques)"]`,
    `  }`,
    `}`,
  ].join("\n");
}

function buildKnowledgePrompt(brief: BusinessBrief): string {
  const query = buildInspirationQuery(brief);
  return [
    `Based on your comprehensive knowledge of website design across industries,`,
    `analyze what top-performing websites look like for: ${brief.industry} businesses`,
    `(specifically: ${brief.businessDescription || brief.businessName || "this type of business"}).`,
    ``,
    `Research context: "${query}"`,
    ``,
    `Draw from real companies and websites you know. Name 4–5 specific real examples`,
    `(e.g. for car rental: Hertz, Enterprise, Turo, Sixt, Rentalcars.com).`,
    ``,
    `For each real example, describe:`,
    `- Their actual color palette and branding`,
    `- Their layout approach and section density`,
    `- What section types they use prominently`,
    `- What makes their design distinctive or high-converting`,
    ``,
    `Then synthesize the patterns you observe across the industry, including the award-level design`,
    `techniques (Awwwards / FWA / SiteInspire-grade layout, motion, and typography moves) that would`,
    `make a site in this space feel a tier above the norm.`,
    ``,
    `Return ONLY this JSON (no markdown):`,
    `{`,
    `  "query": "${query.replace(/"/g, "'")}",`,
    `  "sites": [`,
    `    {`,
    `      "name": "string (real company name)",`,
    `      "descriptor": "string",`,
    `      "colorProfile": "string (specific colors)",`,
    `      "layoutApproach": "string",`,
    `      "sectionTypes": ["string"],`,
    `      "designSignature": "string"`,
    `    }`,
    `  ],`,
    `  "insights": {`,
    `    "colorApproach": "string",`,
    `    "typographyStyle": "string",`,
    `    "layoutDensity": "string",`,
    `    "commonSectionTypes": ["string"],`,
    `    "contentTone": "string",`,
    `    "differentiators": ["string"],`,
    `    "suggestedLayoutStyle": "string",`,
    `    "trustSignalPatterns": ["string"],`,
    `    "standoutTechniques": ["string (concrete award-level layout/motion/typography techniques)"]`,
    `  }`,
    `}`,
  ].join("\n");
}

// ─── Web Search (Anthropic tool) ──────────────────────────────────────────────

async function runWithWebSearch(brief: BusinessBrief): Promise<WebInspirationResult> {
  const client = getClient();
  const model = getModel();

  const systemPrompt = [
    "You are Sitezy's web inspiration researcher.",
    "Search the live web to find real websites in the user's industry.",
    "Extract concrete design patterns: colors, layouts, section types, content tone.",
    "Return structured JSON only — no markdown, no explanation.",
  ].join("\n");

  const userPrompt = buildWebSearchPrompt(brief);

  // Build the agentic message loop for tool use
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt },
  ];

  const tools: Anthropic.Tool[] = [
    // @ts-expect-error web_search_20250305 is a server-side Anthropic tool
    { type: "web_search_20250305", name: "web_search" },
  ];

  // Agentic loop: keep calling until stop_reason is "end_turn"
  const MAX_TURNS = 6;
  let turns = 0;

  while (turns < MAX_TURNS) {
    turns++;

    const response = await client.messages.create({
      model,
      max_tokens: 4000,
      system: systemPrompt,
      tools,
      messages,
    });

    if (response.stop_reason === "end_turn") {
      const raw = extractText(response.content);
      const cleaned = raw
        .replace(/^```(?:json)?\s*/m, "")
        .replace(/\s*```\s*$/m, "")
        .trim();
      const parsed = JSON.parse(cleaned) as WebInspirationResult;
      return { ...parsed, source: "web", query: buildInspirationQuery(brief) };
    }

    if (response.stop_reason === "tool_use") {
      // Push the assistant message with tool_use blocks
      messages.push({ role: "assistant", content: response.content });

      // Acknowledge each tool_use call with an empty tool_result
      // (Anthropic's server fills in the actual web search results)
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((block) => ({
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: [],
      }));

      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Any other stop reason: break and use what we have
    const raw = extractText(response.content);
    if (raw.trim()) {
      const cleaned = raw
        .replace(/^```(?:json)?\s*/m, "")
        .replace(/\s*```\s*$/m, "")
        .trim();
      const parsed = JSON.parse(cleaned) as WebInspirationResult;
      return { ...parsed, source: "web", query: buildInspirationQuery(brief) };
    }
    break;
  }

  throw new Error("Web search loop did not produce a result");
}

// ─── Knowledge Fallback ───────────────────────────────────────────────────────

async function runWithKnowledge(brief: BusinessBrief): Promise<WebInspirationResult> {
  const systemPrompt = [
    "You are Sitezy's web inspiration researcher.",
    "Draw from your comprehensive training knowledge of real websites across all industries.",
    "Name real companies. Provide specific, accurate design details.",
    "Return structured JSON only — no markdown, no explanation.",
  ].join("\n");

  const result = await jsonCompletion<Omit<WebInspirationResult, "source">>(
    systemPrompt,
    buildKnowledgePrompt(brief),
    2,
    3000
  );

  return { ...result, source: "knowledge", query: buildInspirationQuery(brief) };
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Fetch web inspiration for a business brief.
 *
 * Tries Anthropic's live web_search_20250305 tool first.
 * Falls back to Claude's knowledge synthesis on any error.
 * Never throws — returns null if both fail.
 */
export async function fetchWebInspiration(
  brief: BusinessBrief
): Promise<WebInspirationResult | null> {
  // Try live web search first
  try {
    return await runWithWebSearch(brief);
  } catch {
    // Fall through to knowledge-based approach
  }

  // Knowledge-based fallback
  try {
    return await runWithKnowledge(brief);
  } catch {
    return null;
  }
}

// ─── Format for Prompt Injection ─────────────────────────────────────────────

export function formatWebInspirationForPrompt(result: WebInspirationResult): string {
  const sourceLabel = result.source === "web" ? "Live web research" : "Industry research";

  const siteLines = result.sites
    .map(
      (site, i) =>
        [
          `  ${i + 1}. ${site.name} — ${site.descriptor}`,
          `     Colors: ${site.colorProfile}`,
          `     Layout: ${site.layoutApproach}`,
          `     Sections: ${site.sectionTypes.join(", ")}`,
          `     Signature: ${site.designSignature}`,
        ].join("\n")
    )
    .join("\n\n");

  const insights = result.insights;

  return [
    `── Web Inspiration (${sourceLabel}: "${result.query}") ──`,
    ``,
    `Reference sites found:`,
    siteLines,
    ``,
    `Cross-site patterns:`,
    `  Color approach: ${insights.colorApproach}`,
    `  Typography: ${insights.typographyStyle}`,
    `  Layout density: ${insights.layoutDensity}`,
    `  Common sections: ${insights.commonSectionTypes.join(", ")}`,
    `  Content tone: ${insights.contentTone}`,
    `  Suggested layout: ${insights.suggestedLayoutStyle ?? "not specified"}`,
    `  Trust patterns: ${insights.trustSignalPatterns.join(", ")}`,
    `  Differentiators: ${insights.differentiators.join("; ")}`,
    ...(insights.standoutTechniques?.length
      ? [`  Award-level techniques to adapt: ${insights.standoutTechniques.join("; ")}`]
      : []),
    ``,
    `Use these as INSPIRATION only — adapt patterns to this specific brand, do not copy.`,
    `──────────────────────────────────────────────`,
  ].join("\n");
}
