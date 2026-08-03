/**
 * Business Research
 *
 * Given just a business name (plus optional logo URL / hints), identify what the
 * business is and infer a website brief seed — industry, description, offer,
 * audience, tone, suggested pages — so the onboarding wizard can pre-fill most of
 * the brief and the user barely has to answer anything.
 *
 * Primary:  Anthropic web_search_20250305 tool (real live web results)
 * Fallback: Claude knowledge synthesis
 * Never throws — returns null if both fail.
 */

import Anthropic from "@anthropic-ai/sdk";
import { getClient, getModel, extractText, jsonCompletion } from "@/lib/ai/runtime";
import type { BusinessBrief } from "@/lib/ai/types";

export interface BusinessResearchResult {
  /** Whether a real/plausible business identity was determined */
  found: boolean;
  confidence: "high" | "medium" | "low";
  industry?: string;
  businessDescription?: string;
  offerSummary?: string;
  audience?: string;
  differentiators?: string[];
  tone?: string;
  suggestedPages?: string[];
  socialProof?: string[];
  /** One short human sentence identifying the business, e.g. "Stanlee looks like a premium reusable water bottle brand." */
  notes?: string;
}

export interface BusinessResearchInput {
  name: string;
  industryHint?: string;
  location?: string;
  logoUrl?: string;
}

const RESULT_SHAPE = [
  "Return ONLY this JSON (no markdown):",
  "{",
  '  "found": true,',
  '  "confidence": "high | medium | low",',
  '  "industry": "string — the most specific business type",',
  '  "businessDescription": "string — 1–2 sentences on what they do",',
  '  "offerSummary": "string — the core products/services to feature first",',
  '  "audience": "string — the ideal customer",',
  '  "differentiators": ["string — what makes them notable or different"],',
  '  "tone": "string — e.g. premium, warm, bold, minimal, playful",',
  '  "suggestedPages": ["string — e.g. Home, Products, About, Contact"],',
  '  "socialProof": ["string — real awards/press/metrics ONLY if confidently known, else empty"],',
  '  "notes": "string — one short sentence identifying the business"',
  "}",
  "Rules: never invent fake awards, reviews, or facts — leave socialProof empty unless you genuinely know them.",
  "If you cannot identify the specific business, set found=false and confidence=low, and infer a reasonable generic brief from the name alone.",
].join("\n");

function buildUserPrompt(input: BusinessResearchInput, search: boolean): string {
  return [
    `Business name: ${input.name}`,
    input.industryHint ? `Hint about what they do: ${input.industryHint}` : "",
    input.location ? `Location: ${input.location}` : "",
    input.logoUrl ? `Logo URL (for reference): ${input.logoUrl}` : "",
    "",
    search
      ? `Search the web to identify this specific business and what it sells, then infer the website brief below.`
      : `Using your knowledge, identify this business (or the most likely business with this name) and infer the website brief below.`,
    "",
    RESULT_SHAPE,
  ]
    .filter(Boolean)
    .join("\n");
}

const SYSTEM_PROMPT = [
  "You are Sitezy's business research assistant.",
  "Given a business name, determine what the business is and infer a concise, accurate website brief.",
  "Prefer specific, real information; never fabricate awards, testimonials, or metrics.",
  "Return structured JSON only — no markdown, no explanation.",
].join("\n");

function parseResult(raw: string): BusinessResearchResult {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();
  return JSON.parse(cleaned) as BusinessResearchResult;
}

async function runWithWebSearch(input: BusinessResearchInput): Promise<BusinessResearchResult> {
  const client = getClient();
  const model = getModel();

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildUserPrompt(input, true) },
  ];
  const tools: Anthropic.Tool[] = [
    // @ts-expect-error web_search_20250305 is a server-side Anthropic tool
    { type: "web_search_20250305", name: "web_search" },
  ];

  const MAX_TURNS = 5;
  for (let turns = 0; turns < MAX_TURNS; turns++) {
    const response = await client.messages.create({
      model,
      max_tokens: 1600,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });
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

    const raw = extractText(response.content);
    if (raw.trim()) return parseResult(raw);
    break;
  }

  throw new Error("Business research web search produced no result");
}

async function runWithKnowledge(input: BusinessResearchInput): Promise<BusinessResearchResult> {
  return jsonCompletion<BusinessResearchResult>(
    SYSTEM_PROMPT,
    buildUserPrompt(input, false),
    2,
    1600
  );
}

// Hard ceiling so research can never hang a request (web_search loops can be slow).
const RESEARCH_TIMEOUT_MS = 22_000;

async function researchInternal(
  input: BusinessResearchInput
): Promise<BusinessResearchResult | null> {
  try {
    return await runWithWebSearch(input);
  } catch {
    // fall through to knowledge synthesis
  }
  try {
    return await runWithKnowledge(input);
  } catch {
    return null;
  }
}

export async function researchBusinessIdentity(
  input: BusinessResearchInput
): Promise<BusinessResearchResult | null> {
  if (!input.name || input.name.trim().length < 2) return null;
  return Promise.race([
    researchInternal(input),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), RESEARCH_TIMEOUT_MS)),
  ]);
}

/** Map a research result into a partial brief patch (only fields it produced). */
export function researchToBriefPatch(r: BusinessResearchResult): Partial<BusinessBrief> {
  const patch: Partial<BusinessBrief> = {};
  if (r.industry?.trim()) patch.industry = r.industry.trim();
  if (r.businessDescription?.trim()) patch.businessDescription = r.businessDescription.trim();
  if (r.offerSummary?.trim()) patch.offerSummary = r.offerSummary.trim();
  if (r.audience?.trim()) patch.audience = r.audience.trim();
  if (r.tone?.trim()) patch.tone = r.tone.trim();
  if (r.differentiators?.length) patch.differentiators = r.differentiators;
  if (r.suggestedPages?.length) patch.pages = r.suggestedPages;
  if (r.socialProof?.length) patch.socialProof = r.socialProof;
  return patch;
}
