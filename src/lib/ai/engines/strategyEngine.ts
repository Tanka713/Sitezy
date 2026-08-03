import type { BusinessBrief, StrategyPagePlan, StrategyPlan } from "@/lib/ai/types";
import { jsonCompletion } from "@/lib/ai/runtime";
import { buildStrategySystemPrompt, buildStrategyUserPrompt } from "@/lib/ai/prompts/strategy";
import {
  buildPageKeyMoments,
  buildPageNarrativeSummary,
  buildPageStoryArc,
  buildSuggestedSections,
  getIndustryDesignCues,
  getIndustryHierarchyRules,
  getIndustryTrustSignals,
  inferDefaultPages,
} from "@/lib/ai/utils/sectionRules";
import { cleanList, dedupeStrings, slugifyText, toSentence } from "@/lib/ai/utils/normalize";

function fallbackPagePlan(brief: BusinessBrief, pageName: string): StrategyPagePlan {
  const slug = slugifyText(pageName) || "home";
  const sectionTypes = buildSuggestedSections(brief, pageName);
  const keyMoments = buildPageKeyMoments(brief, pageName);
  const isHome = slug === "home";

  return {
    pageId: slug,
    name: pageName,
    slug,
    purpose:
      isHome
        ? `${buildPageNarrativeSummary(brief, pageName)} Drive visitors toward ${brief.websiteGoals[0] || "the primary call to action"} without relying on generic filler sections.`
        : buildPageStoryArc(brief, pageName, sectionTypes),
    conversionGoal:
      brief.websiteGoals[0] ||
      (brief.contactInfo.bookingEnabled ? "Drive bookings" : "Generate qualified leads"),
    keyMoments,
    mustIncludeSectionTypes: sectionTypes,
    optionalSectionTypes: dedupeStrings([
      ...sectionTypes.slice(2, Math.max(sectionTypes.length - 1, 2)),
      ...getIndustryTrustSignals(brief).map((signal) =>
        /rating|review|proof|guest|client/i.test(signal) ? "testimonial" : ""
      ),
    ], 8).filter((type) => type && !sectionTypes.includes(type)),
    trustSignals: getIndustryTrustSignals(brief),
  };
}

function normalizePagePlan(brief: BusinessBrief, candidate: Partial<StrategyPagePlan>, pageName: string): StrategyPagePlan {
  const fallback = fallbackPagePlan(brief, pageName);
  const mustInclude = dedupeStrings([
    ...cleanList(candidate.mustIncludeSectionTypes),
    ...fallback.mustIncludeSectionTypes,
  ], 10);
  if (!mustInclude.includes("navbar")) {
    mustInclude.unshift("navbar");
  }
  if (!mustInclude.includes("footer")) {
    mustInclude.push("footer");
  }

  return {
    pageId: slugifyText(candidate.pageId || candidate.slug || candidate.name || fallback.pageId) || fallback.pageId,
    name: toSentence(candidate.name, fallback.name),
    slug: slugifyText(candidate.slug || candidate.name || fallback.slug) || fallback.slug,
    purpose: toSentence(candidate.purpose, fallback.purpose),
    conversionGoal: toSentence(candidate.conversionGoal, fallback.conversionGoal),
    keyMoments: dedupeStrings([
      ...cleanList(candidate.keyMoments),
      ...fallback.keyMoments,
    ], 6),
    mustIncludeSectionTypes: mustInclude,
    optionalSectionTypes: dedupeStrings([
      ...cleanList(candidate.optionalSectionTypes),
      ...fallback.optionalSectionTypes,
    ], 8).filter((type) => !mustInclude.includes(type)),
    trustSignals: dedupeStrings([
      ...cleanList(candidate.trustSignals),
      ...fallback.trustSignals,
    ], 6),
  };
}

function buildFallbackStrategy(brief: BusinessBrief): StrategyPlan {
  const pages = inferDefaultPages(brief);
  const homeSections = buildSuggestedSections(brief, "Home");
  const industryDesignCues = getIndustryDesignCues(brief);
  const hierarchyRules = getIndustryHierarchyRules(brief);

  return {
    positioning: `${brief.businessName} should feel like the clearest and most credible choice for ${brief.audience || "the target audience"}, with a site structure that reflects ${brief.industry || "the business category"} rather than a generic template.`,
    audiencePriorities: dedupeStrings([
      brief.audience,
      brief.offerSummary,
      ...brief.websiteGoals,
      ...brief.differentiators,
    ], 6),
    conversionStrategy: dedupeStrings([
      brief.websiteGoals[0] || "Make the next step obvious",
      brief.contactInfo.bookingEnabled ? "Reduce friction toward booking" : "Capture intent early with clear CTAs",
      "Build trust before asking for action",
      ...hierarchyRules,
    ], 6),
    trustSignals: getIndustryTrustSignals(brief),
    siteNarrative: buildPageStoryArc(brief, "Home", homeSections),
    contentPriorities: dedupeStrings([
      brief.offerSummary,
      ...brief.services,
      ...brief.socialProof,
      ...brief.testimonials,
      ...industryDesignCues,
    ], 8),
    sectionPrinciples: dedupeStrings([
      "Open with clarity before style flourishes.",
      "Show proof before the strongest conversion ask.",
      "Use section variety to separate storytelling, offer details, and trust-building.",
      ...hierarchyRules,
    ], 8),
    pagePlans: pages.map((pageName) => fallbackPagePlan(brief, pageName)),
  };
}

function normalizeStrategyPlan(brief: BusinessBrief, candidate: Partial<StrategyPlan> | null): StrategyPlan {
  const fallback = buildFallbackStrategy(brief);
  const pages = inferDefaultPages(brief);
  const candidatePages = Array.isArray(candidate?.pagePlans) ? candidate.pagePlans : [];

  return {
    positioning: toSentence(candidate?.positioning, fallback.positioning),
    audiencePriorities: dedupeStrings([
      ...cleanList(candidate?.audiencePriorities),
      ...fallback.audiencePriorities,
    ], 8),
    conversionStrategy: dedupeStrings([
      ...cleanList(candidate?.conversionStrategy),
      ...fallback.conversionStrategy,
    ], 8),
    trustSignals: dedupeStrings([
      ...cleanList(candidate?.trustSignals),
      ...fallback.trustSignals,
    ], 8),
    siteNarrative: toSentence(candidate?.siteNarrative, fallback.siteNarrative),
    contentPriorities: dedupeStrings([
      ...cleanList(candidate?.contentPriorities),
      ...fallback.contentPriorities,
    ], 10),
    sectionPrinciples: dedupeStrings([
      ...cleanList(candidate?.sectionPrinciples),
      ...fallback.sectionPrinciples,
    ], 8),
    pagePlans: pages.map((pageName) => {
      const slug = slugifyText(pageName);
      const matched = candidatePages.find((page) =>
        slugifyText(page.pageId || "") === slug ||
        slugifyText(page.slug || "") === slug ||
        slugifyText(page.name || "") === slug
      );
      return normalizePagePlan(brief, matched ?? {}, pageName);
    }),
  };
}

export async function runStrategyEngine(
  brief: BusinessBrief,
  knowledge?: {
    examples?: import("@/lib/server/generation-knowledge").SiteGenerationExample[];
    pattern?: import("@/lib/server/pattern-extractor").IndustryPattern | null;
    skipAI?: boolean;
  }
): Promise<StrategyPlan> {
  const fallback = buildFallbackStrategy(brief);
  if (knowledge?.skipAI) return fallback;

  try {
    const raw = await jsonCompletion<StrategyPlan>(
      buildStrategySystemPrompt(),
      buildStrategyUserPrompt(brief, knowledge),
      2,
      5_000
    );
    return normalizeStrategyPlan(brief, raw);
  } catch {
    return fallback;
  }
}
