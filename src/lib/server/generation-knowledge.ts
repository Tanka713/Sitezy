import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BusinessBrief, SiteGenerationPlan } from "@/lib/ai/types";

export interface SiteGenerationExample {
  id: string;
  industry: string;
  businessType: string;
  goalsText: string;
  tone: string;
  qualityScore: number;
  structuralRetention: number;
  generationPlanJson: Partial<SiteGenerationPlan>;
  sectionTypesAccepted: string[];
  designStyle: string | null;
  colorApproach: string | null;
  layoutDensity: string | null;
  createdAt: string;
}

export interface KnowledgeBaseStats {
  totalExamples: number;
  examplesForIndustry: number;
  industryPatternConfidence: number | null;
  industryPatternExtractedAt: string | null;
}

function anonymizeBrief(brief: BusinessBrief): Partial<BusinessBrief> {
  return {
    industry: brief.industry,
    businessDescription: brief.businessDescription,
    offerSummary: brief.offerSummary,
    audience: brief.audience,
    differentiators: brief.differentiators,
    websiteGoals: brief.websiteGoals,
    tone: brief.tone,
    styleDirection: brief.styleDirection,
    pages: brief.pages,
    services: brief.services,
    // PII stripped: businessName, contactInfo, brand.references, testimonials, references
  };
}

function anonymizePlan(plan: SiteGenerationPlan): Partial<SiteGenerationPlan> {
  return {
    strategy: plan.strategy,
    design: plan.design,
    copy: {
      ...plan.copy,
      // Strip any business-name-specific copy to avoid PII leaking into examples
    },
    layout: plan.layout,
    polish: plan.polish,
  };
}

export async function indexGenerationExample(input: {
  generationRunId?: string | null;
  brief: BusinessBrief;
  plan: SiteGenerationPlan;
  qualityScore: number;
  structuralRetention: number;
  acceptedSectionTypes: string[];
}): Promise<void> {
  if (input.qualityScore < 0.65 || input.structuralRetention < 0.65) return;

  const db = getSupabaseAdminClient();

  const { brief, plan } = input;
  const goalsText = brief.websiteGoals.join(" ");
  const tone = brief.tone || "professional";
  const designStyle = plan.design?.layoutStyle ?? null;
  const colorApproach = (plan.design?.colorScheme as Record<string, unknown> | undefined)?.approach as string | null ?? null;
  const layoutDensity = plan.design?.animationStyle ?? null;

  // Infer business_type from the first service or description word
  const businessType =
    brief.services[0] ||
    brief.businessDescription.split(" ").slice(0, 3).join(" ") ||
    brief.industry;

  await db.from("site_generation_examples").insert({
    generation_run_id: input.generationRunId ?? null,
    industry: brief.industry,
    business_type: businessType,
    goals_text: goalsText,
    tone,
    quality_score: input.qualityScore,
    structural_retention: input.structuralRetention,
    generation_plan_json: anonymizePlan(plan),
    section_types_accepted: input.acceptedSectionTypes,
    design_style: designStyle,
    color_approach: colorApproach,
    layout_density: layoutDensity,
  });
}

export async function retrieveSimilarExamples(
  brief: BusinessBrief,
  limit = 3
): Promise<SiteGenerationExample[]> {
  const db = getSupabaseAdminClient();

  const searchQuery = [brief.industry, brief.tone, ...brief.websiteGoals.slice(0, 2)]
    .filter(Boolean)
    .join(" ");

  const { data, error } = await db
    .from("site_generation_examples")
    .select("*")
    .textSearch("search_vector", searchQuery, { type: "plain", config: "english" })
    .gte("quality_score", 0.65)
    .order("quality_score", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    industry: row.industry,
    businessType: row.business_type,
    goalsText: row.goals_text,
    tone: row.tone,
    qualityScore: row.quality_score,
    structuralRetention: row.structural_retention,
    generationPlanJson: row.generation_plan_json,
    sectionTypesAccepted: row.section_types_accepted ?? [],
    designStyle: row.design_style ?? null,
    colorApproach: row.color_approach ?? null,
    layoutDensity: row.layout_density ?? null,
    createdAt: row.created_at,
  }));
}

export async function getKnowledgeBaseStats(industry: string): Promise<KnowledgeBaseStats> {
  const db = getSupabaseAdminClient();

  const [totalResult, industryResult, patternResult] = await Promise.all([
    db.from("site_generation_examples").select("id", { count: "exact", head: true }),
    db
      .from("site_generation_examples")
      .select("id", { count: "exact", head: true })
      .eq("industry", industry),
    db
      .from("ai_industry_patterns")
      .select("confidence_score, extracted_at")
      .eq("industry", industry)
      .maybeSingle(),
  ]);

  return {
    totalExamples: totalResult.count ?? 0,
    examplesForIndustry: industryResult.count ?? 0,
    industryPatternConfidence: patternResult.data?.confidence_score ?? null,
    industryPatternExtractedAt: patternResult.data?.extracted_at ?? null,
  };
}

export function formatExamplesForPrompt(examples: SiteGenerationExample[]): string {
  if (!examples.length) return "";

  const lines = examples.map((ex, i) => {
    const sections = ex.sectionTypesAccepted.slice(0, 6).join(", ");
    const style = [ex.designStyle, ex.colorApproach, ex.layoutDensity]
      .filter(Boolean)
      .join(", ");
    return [
      `Example ${i + 1} (${ex.industry}, quality ${Math.round(ex.qualityScore * 100)}%):`,
      `  Business type: ${ex.businessType}`,
      `  Goals: ${ex.goalsText.slice(0, 120)}`,
      `  Accepted sections: ${sections}`,
      style ? `  Design: ${style}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    "HIGH-QUALITY REFERENCE EXAMPLES (similar businesses, accepted by users):",
    "Use these as inspiration — adapt to this specific business, do not copy.",
    "",
    ...lines,
  ].join("\n");
}
