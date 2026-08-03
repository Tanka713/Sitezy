import type {
  BusinessBrief,
  CopyPlan,
  DesignPlan,
  LayoutPageBlueprint,
  LayoutPlan,
  LayoutSectionBlueprint,
  StrategyPlan,
} from "@/lib/ai/types";
import { jsonCompletion } from "@/lib/ai/runtime";
import type { WebInspirationResult } from "@/lib/ai/web-inspiration";
import { buildLayoutSystemPrompt, buildLayoutUserPrompt } from "@/lib/ai/prompts/layout";
import {
  buildPageCtaStrategy,
  buildPageRhythmPlan,
  buildPageStoryArc,
  buildSectionBlueprintSeed,
  buildSectionName,
} from "@/lib/ai/utils/sectionRules";
import { cleanList, dedupeStrings, slugifyText, toSentence } from "@/lib/ai/utils/normalize";

function buildFallbackSection(
  brief: BusinessBrief,
  pageName: string,
  pageId: string,
  type: string,
  index: number
): LayoutSectionBlueprint {
  const id = `${pageId}-${type}-${index + 1}`;
  const blueprint = buildSectionBlueprintSeed(brief, pageName, type, id);
  return {
    id,
    type,
    name: buildSectionName(type, id),
    variation: blueprint.variation,
    compositionMode: blueprint.compositionMode,
    spacingProfile: blueprint.spacingProfile,
    surfaceStyle: blueprint.surfaceStyle,
    ctaPlacement: blueprint.ctaPlacement,
    contrastWithPrevious: blueprint.contrastWithPrevious,
    purpose: blueprint.purpose,
    layoutIdea: blueprint.layoutIdea,
    emphasis: blueprint.emphasis,
    visualHook: blueprint.visualHook,
    interactionHint: blueprint.interactionHint,
    hierarchy: blueprint.hierarchy,
    contentKeys: blueprint.contentKeys,
    mediaBriefs: dedupeStrings([
      ...blueprint.mediaBriefs,
      brief.assets.logo.status !== "missing" ? "Respect the brand mark when relevant." : "",
      brief.styleDirection[0] || "",
      brief.brand.mood[0] || "",
    ], 5),
    premiumDetails: blueprint.premiumDetails,
  };
}

function buildFallbackPage(
  brief: BusinessBrief,
  strategy: StrategyPlan,
  copy: CopyPlan,
  pageId: string
): LayoutPageBlueprint {
  const strategyPage = strategy.pagePlans.find((page) => page.pageId === pageId) ?? strategy.pagePlans[0];
  const copyPage = copy.pages.find((page) => page.pageId === pageId) ?? copy.pages[0];
  const sectionTypes = strategyPage.mustIncludeSectionTypes.length
    ? strategyPage.mustIncludeSectionTypes
    : copyPage.sections.map((section) => section.type);

  return {
    pageId: strategyPage.pageId,
    name: strategyPage.name,
    slug: strategyPage.slug,
    purpose: strategyPage.purpose,
    storyArc: buildPageStoryArc(brief, strategyPage.name, sectionTypes),
    rhythmPlan: buildPageRhythmPlan(brief, strategyPage.name, sectionTypes),
    ctaStrategy: buildPageCtaStrategy(brief, strategyPage.name, sectionTypes),
    navbarConcept: brief.assets.logo.status === "missing"
      ? "Use a confident text wordmark and high-clarity navigation."
      : "Use the supplied logo with a navigation treatment that feels part of the overall direction.",
    signatureMoment: strategyPage.keyMoments[0] || copyPage.intro,
    sections: sectionTypes.map((type, index) => buildFallbackSection(brief, strategyPage.name, strategyPage.pageId, type, index)),
  };
}

function normalizeSection(
  brief: BusinessBrief,
  pageId: string,
  pageName: string,
  index: number,
  candidate: Partial<LayoutSectionBlueprint>,
  fallback: LayoutSectionBlueprint
): LayoutSectionBlueprint {
  const sectionId = slugifyText(candidate.id || candidate.type || fallback.id) || fallback.id;
  const blueprint = buildSectionBlueprintSeed(brief, pageName, candidate.type || fallback.type, sectionId);
  return {
    id: sectionId,
    type: toSentence(candidate.type, fallback.type),
    name: toSentence(candidate.name, buildSectionName(candidate.type || fallback.type, `${pageId}-${sectionId}`)),
    variation: toSentence(candidate.variation, blueprint.variation || fallback.variation),
    compositionMode: toSentence(candidate.compositionMode, fallback.compositionMode || blueprint.compositionMode),
    spacingProfile: toSentence(candidate.spacingProfile, fallback.spacingProfile || blueprint.spacingProfile),
    surfaceStyle: toSentence(candidate.surfaceStyle, fallback.surfaceStyle || blueprint.surfaceStyle),
    ctaPlacement: toSentence(candidate.ctaPlacement, fallback.ctaPlacement || blueprint.ctaPlacement),
    contrastWithPrevious: toSentence(candidate.contrastWithPrevious, fallback.contrastWithPrevious || blueprint.contrastWithPrevious),
    purpose: toSentence(candidate.purpose, fallback.purpose || blueprint.purpose),
    layoutIdea: toSentence(candidate.layoutIdea, fallback.layoutIdea || blueprint.layoutIdea),
    emphasis: toSentence(candidate.emphasis, fallback.emphasis || blueprint.emphasis),
    visualHook: toSentence(candidate.visualHook, fallback.visualHook || blueprint.visualHook),
    interactionHint: toSentence(candidate.interactionHint, fallback.interactionHint || blueprint.interactionHint),
    hierarchy: dedupeStrings([...cleanList(candidate.hierarchy), ...fallback.hierarchy, ...blueprint.hierarchy], 6),
    contentKeys: dedupeStrings([...cleanList(candidate.contentKeys), ...fallback.contentKeys, ...blueprint.contentKeys], 6),
    mediaBriefs: dedupeStrings([...cleanList(candidate.mediaBriefs), ...fallback.mediaBriefs, ...blueprint.mediaBriefs], 5),
    premiumDetails: dedupeStrings([...cleanList(candidate.premiumDetails), ...fallback.premiumDetails, ...blueprint.premiumDetails], 6),
  };
}

function normalizeLayoutPlan(
  brief: BusinessBrief,
  strategy: StrategyPlan,
  copy: CopyPlan,
  candidate: Partial<LayoutPlan> | null
): LayoutPlan {
  const fallbackPages = strategy.pagePlans.map((page) => buildFallbackPage(brief, strategy, copy, page.pageId));
  const rawPages = Array.isArray(candidate?.pages) ? candidate.pages : [];

  return {
    antiRepetitionRules: dedupeStrings([
      ...cleanList(candidate?.antiRepetitionRules),
      "Do not repeat the same section shell across the site.",
      "Use at least one structural surprise or contrast moment per page.",
      "Let proof sections and offer sections use different pacing.",
      "Keep at least one dominant element per section instead of equal-weight card rows.",
    ], 8),
    siteWidePatterns: dedupeStrings([
      ...cleanList(candidate?.siteWidePatterns),
      "Keep navigation clear and brand-aware.",
      "Use contrast in width, density, or background treatment between neighboring sections.",
    ], 8),
    pages: fallbackPages.map((fallbackPage) => {
      const rawPage = rawPages.find((page) =>
        slugifyText(page.pageId || "") === slugifyText(fallbackPage.pageId) ||
        slugifyText(page.slug || "") === slugifyText(fallbackPage.slug)
      );
      const rawSections = Array.isArray(rawPage?.sections) ? rawPage.sections : [];

      return {
        pageId: fallbackPage.pageId,
        name: toSentence(rawPage?.name, fallbackPage.name),
        slug: slugifyText(rawPage?.slug || fallbackPage.slug) || fallbackPage.slug,
        purpose: toSentence(rawPage?.purpose, fallbackPage.purpose),
        storyArc: toSentence(rawPage?.storyArc, fallbackPage.storyArc),
        rhythmPlan: toSentence(rawPage?.rhythmPlan, fallbackPage.rhythmPlan),
        ctaStrategy: toSentence(rawPage?.ctaStrategy, fallbackPage.ctaStrategy),
        navbarConcept: toSentence(rawPage?.navbarConcept, fallbackPage.navbarConcept),
        signatureMoment: toSentence(rawPage?.signatureMoment, fallbackPage.signatureMoment),
        sections: fallbackPage.sections.map((fallbackSection, index) => {
          const rawSection = rawSections.find((section) =>
            slugifyText(section.id || "") === slugifyText(fallbackSection.id) ||
            slugifyText(section.type || "") === slugifyText(fallbackSection.type)
          );
          return normalizeSection(brief, fallbackPage.pageId, fallbackPage.name, index, rawSection ?? {}, fallbackSection);
        }),
      };
    }),
  };
}

export async function runLayoutEngine(
  brief: BusinessBrief,
  strategy: StrategyPlan,
  design: DesignPlan,
  copy: CopyPlan,
  webInspiration?: WebInspirationResult | null,
  options?: { skipAI?: boolean }
): Promise<LayoutPlan> {
  if (options?.skipAI) return normalizeLayoutPlan(brief, strategy, copy, null);

  try {
    const raw = await jsonCompletion<LayoutPlan>(
      buildLayoutSystemPrompt(),
      buildLayoutUserPrompt(brief, strategy, design, copy, webInspiration),
      2,
      7_000
    );
    return normalizeLayoutPlan(brief, strategy, copy, raw);
  } catch {
    return normalizeLayoutPlan(brief, strategy, copy, null);
  }
}
