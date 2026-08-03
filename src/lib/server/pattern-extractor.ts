import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { jsonCompletion } from "@/lib/ai/runtime";
import type { AIDesignStyle, AIContentDensity, AIStructurePreference } from "@/types";

export interface IndustryPattern {
  industry: string;
  topSectionSequences: string[][];
  bestDesignStyles: AIDesignStyle[];
  contentDensityNorm: AIContentDensity;
  colorApproachPatterns: string[];
  extractedAt: string;
  sampleCount: number;
  confidenceScore: number;
}

const MIN_SAMPLES_FOR_EXTRACTION = 5;
const MIN_CONFIDENCE_TO_INJECT = 0.5;

export async function extractIndustryPatterns(
  industry: string
): Promise<IndustryPattern | null> {
  const db = getSupabaseAdminClient();

  const { data: examples, error } = await db
    .from("site_generation_examples")
    .select(
      "section_types_accepted, design_style, color_approach, layout_density, quality_score, goals_text"
    )
    .eq("industry", industry)
    .gte("quality_score", 0.65)
    .order("quality_score", { ascending: false })
    .limit(20);

  if (error || !examples || examples.length < MIN_SAMPLES_FOR_EXTRACTION) return null;

  const systemPrompt = [
    "You are an AI analyzing which website design patterns perform best for a given industry.",
    "Given a list of accepted generations, extract the most common patterns.",
    "Return JSON only — no markdown, no explanation.",
  ].join("\n");

  const userPrompt = [
    `Industry: ${industry}`,
    `Samples: ${examples.length}`,
    "",
    "Accepted generations data:",
    examples
      .map(
        (ex, i) =>
          `${i + 1}. sections=[${ex.section_types_accepted?.join(",")}] style=${ex.design_style ?? "?"} density=${ex.layout_density ?? "?"} quality=${ex.quality_score}`
      )
      .join("\n"),
    "",
    "Return JSON matching this shape exactly:",
    JSON.stringify({
      topSectionSequences: [["hero", "features", "cta"], ["hero", "about", "services", "cta"]],
      bestDesignStyles: ["minimal", "professional"],
      contentDensityNorm: "moderate",
      colorApproachPatterns: ["light backgrounds", "strong accent colors"],
    }),
  ].join("\n");

  let pattern: Omit<IndustryPattern, "industry" | "extractedAt" | "sampleCount" | "confidenceScore">;
  try {
    pattern = await jsonCompletion(systemPrompt, userPrompt, 2, 2000);
  } catch {
    return null;
  }

  const confidenceScore = Math.min(1, examples.length / 20);
  const now = new Date().toISOString();

  const result: IndustryPattern = {
    industry,
    topSectionSequences: Array.isArray(pattern.topSectionSequences)
      ? pattern.topSectionSequences.slice(0, 3)
      : [],
    bestDesignStyles: Array.isArray(pattern.bestDesignStyles)
      ? (pattern.bestDesignStyles.slice(0, 3) as AIDesignStyle[])
      : [],
    contentDensityNorm: (pattern.contentDensityNorm as AIContentDensity) ?? "moderate",
    colorApproachPatterns: Array.isArray(pattern.colorApproachPatterns)
      ? pattern.colorApproachPatterns.slice(0, 4)
      : [],
    extractedAt: now,
    sampleCount: examples.length,
    confidenceScore,
  };

  // Upsert into DB
  await db.from("ai_industry_patterns").upsert(
    {
      industry,
      pattern_json: result,
      sample_count: examples.length,
      confidence_score: confidenceScore,
      extracted_at: now,
      updated_at: now,
    },
    { onConflict: "industry" }
  );

  return result;
}

export async function getIndustryPattern(industry: string): Promise<IndustryPattern | null> {
  const db = getSupabaseAdminClient();

  const { data, error } = await db
    .from("ai_industry_patterns")
    .select("pattern_json, confidence_score")
    .eq("industry", industry)
    .maybeSingle();

  if (error || !data) return null;
  if ((data.confidence_score ?? 0) < MIN_CONFIDENCE_TO_INJECT) return null;

  return data.pattern_json as IndustryPattern;
}

export async function maybeSchedulePatternExtraction(industry: string): Promise<void> {
  if (!industry) return;
  const db = getSupabaseAdminClient();

  const { count } = await db
    .from("site_generation_examples")
    .select("id", { count: "exact", head: true })
    .eq("industry", industry)
    .gte("quality_score", 0.65)
    .then((r) => ({ count: r.count ?? 0 }));

  // Re-extract at 5, 10, 25, 50 sample milestones
  const thresholds = [5, 10, 25, 50];
  if (thresholds.includes(count)) {
    // Fire-and-forget in background — if it fails, next publish will retry
    extractIndustryPatterns(industry).catch(() => {});
  }
}

export function formatPatternForPrompt(pattern: IndustryPattern): string {
  const sequences = pattern.topSectionSequences
    .slice(0, 2)
    .map((seq) => seq.join(" → "))
    .join("; ");
  const styles = pattern.bestDesignStyles.slice(0, 2).join(", ");

  return [
    `LEARNED INDUSTRY PATTERNS for "${pattern.industry}" (confidence ${Math.round(pattern.confidenceScore * 100)}%, ${pattern.sampleCount} accepted sites):`,
    sequences ? `  Common section flows: ${sequences}` : null,
    styles ? `  Preferred design styles: ${styles}` : null,
    pattern.contentDensityNorm ? `  Content density norm: ${pattern.contentDensityNorm}` : null,
    pattern.colorApproachPatterns.length
      ? `  Color patterns: ${pattern.colorApproachPatterns.slice(0, 2).join(", ")}`
      : null,
    "  Apply these as a baseline — but still adapt to this specific brief.",
  ]
    .filter(Boolean)
    .join("\n");
}
