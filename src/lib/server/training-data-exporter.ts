import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export interface TrainingExampleInput {
  industry: string;
  businessType: string;
  goalsText: string;
  tone: string;
}

export interface TrainingExampleOutput {
  acceptedSectionTypes: string[];
  designStyle: string | null;
  colorApproach: string | null;
  layoutDensity: string | null;
  structuralRetention: number;
}

export interface TrainingExample {
  id: string;
  input: TrainingExampleInput;
  output: TrainingExampleOutput;
  qualityScore: number;
  createdAt: string;
}

export interface ExportOptions {
  minQualityScore?: number;
  minStructuralRetention?: number;
  industry?: string;
  limit?: number;
}

export async function exportTrainingData(options: ExportOptions = {}): Promise<string> {
  const {
    minQualityScore = 0.70,
    minStructuralRetention = 0.65,
    industry,
    limit = 1000,
  } = options;

  const db = getSupabaseAdminClient();

  let query = db
    .from("site_generation_examples")
    .select(
      "id, industry, business_type, goals_text, tone, quality_score, structural_retention, section_types_accepted, design_style, color_approach, layout_density, created_at"
    )
    .gte("quality_score", minQualityScore)
    .gte("structural_retention", minStructuralRetention)
    .order("quality_score", { ascending: false })
    .limit(limit);

  if (industry) {
    query = query.eq("industry", industry);
  }

  const { data, error } = await query;
  if (error || !data) return "";

  const examples: TrainingExample[] = data.map((row) => ({
    id: row.id,
    input: {
      industry: row.industry,
      businessType: row.business_type,
      goalsText: row.goals_text,
      tone: row.tone,
    },
    output: {
      acceptedSectionTypes: row.section_types_accepted ?? [],
      designStyle: row.design_style ?? null,
      colorApproach: row.color_approach ?? null,
      layoutDensity: row.layout_density ?? null,
      structuralRetention: row.structural_retention,
    },
    qualityScore: row.quality_score,
    createdAt: row.created_at,
  }));

  return examples.map((ex) => JSON.stringify(ex)).join("\n");
}

export async function getTrainingDataStats(): Promise<{
  total: number;
  byIndustry: Array<{ industry: string; count: number; avgQuality: number }>;
}> {
  const db = getSupabaseAdminClient();

  const { data: industryData, error } = await db
    .from("site_generation_examples")
    .select("industry, quality_score")
    .gte("quality_score", 0.65);

  if (error || !industryData) return { total: 0, byIndustry: [] };

  const grouped = new Map<string, number[]>();
  for (const row of industryData) {
    const arr = grouped.get(row.industry) ?? [];
    arr.push(row.quality_score);
    grouped.set(row.industry, arr);
  }

  const byIndustry = Array.from(grouped.entries())
    .map(([industry, scores]) => ({
      industry,
      count: scores.length,
      avgQuality: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count);

  return { total: industryData.length, byIndustry };
}
