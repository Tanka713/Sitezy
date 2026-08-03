import type { BusinessBrief } from "@/lib/ai/types";
import type { ProjectPage } from "@/types";

export interface GenerationQualityScore {
  total: number;
  completeness: number;
  diversity: number;
  copyQuality: number;
  brandAlignment: number;
}

const REQUIRED_SECTION_TYPES = ["hero", "features", "cta"];
const MIN_SECTION_COUNT = 3;
const LOREM_PATTERN = /lorem\s+ipsum/i;

export function scoreGeneration(
  brief: BusinessBrief,
  pages: ProjectPage[]
): GenerationQualityScore {
  if (!pages.length) {
    return { total: 0, completeness: 0, diversity: 0, copyQuality: 0, brandAlignment: 0 };
  }

  const allSections = pages.flatMap((p) => p.sections);
  if (!allSections.length) {
    return { total: 0, completeness: 0, diversity: 0, copyQuality: 0, brandAlignment: 0 };
  }

  const sectionTypes = allSections.map((s) => s.type.toLowerCase());
  const uniqueTypes = new Set(sectionTypes);

  // Completeness: required sections present + minimum count met
  const requiredPresent = REQUIRED_SECTION_TYPES.filter((t) =>
    sectionTypes.some((st) => st.includes(t))
  ).length;
  const completeness = Math.min(
    1,
    (requiredPresent / REQUIRED_SECTION_TYPES.length) * 0.7 +
      (allSections.length >= MIN_SECTION_COUNT ? 0.3 : (allSections.length / MIN_SECTION_COUNT) * 0.3)
  );

  // Diversity: unique section types relative to total
  const diversity = Math.min(1, uniqueTypes.size / Math.max(allSections.length, 1));

  // Copy quality: no lorem ipsum, reasonable content length in page HTML
  const htmlContent = pages.map((p) => p.html ?? "").join(" ");
  const hasLorem = LOREM_PATTERN.test(htmlContent);
  const wordCount = htmlContent
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  const copyQuality = hasLorem ? 0.2 : Math.min(1, wordCount / 200);

  // Brand alignment: business name + key words appear in copy
  const brandKeywords = [
    brief.businessName,
    ...brief.services.slice(0, 3),
    ...brief.differentiators.slice(0, 2),
  ].filter(Boolean);
  const lowerHtml = htmlContent.toLowerCase();
  const keywordsFound = brandKeywords.filter((kw) =>
    lowerHtml.includes(kw.toLowerCase())
  ).length;
  const brandAlignment = brandKeywords.length
    ? Math.min(1, keywordsFound / brandKeywords.length)
    : 0.5;

  const total =
    completeness * 0.35 +
    diversity * 0.2 +
    copyQuality * 0.25 +
    brandAlignment * 0.2;

  return {
    total: Math.round(total * 1000) / 1000,
    completeness: Math.round(completeness * 1000) / 1000,
    diversity: Math.round(diversity * 1000) / 1000,
    copyQuality: Math.round(copyQuality * 1000) / 1000,
    brandAlignment: Math.round(brandAlignment * 1000) / 1000,
  };
}

export function meetsIndexingThreshold(score: GenerationQualityScore): boolean {
  return score.total >= 0.65;
}
