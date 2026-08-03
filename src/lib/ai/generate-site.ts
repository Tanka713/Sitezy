import type { BlueprintPage, SiteBlueprint, SiteBrief } from "@/types";
import { buildBlueprintFromPlan, buildPageHtmlFromPlan } from "@/lib/ai/engines/buildEngine";
import { runCopyEngine } from "@/lib/ai/engines/copyEngine";
import { runDesignEngine } from "@/lib/ai/engines/designEngine";
import { runLayoutEngine } from "@/lib/ai/engines/layoutEngine";
import { runPolishEngine } from "@/lib/ai/engines/polishEngine";
import { runStrategyEngine } from "@/lib/ai/engines/strategyEngine";
import type { SiteGenerationPlan } from "@/lib/ai/types";
import type { PageChromeReuse } from "@/lib/ai/prompts/build";
import { siteBriefToBusinessBrief } from "@/lib/ai/adapters/wizardAdapter";
import { buildBusinessFingerprint } from "@/lib/ai/utils/normalize";
import { fetchWebInspiration } from "@/lib/ai/web-inspiration";
import { retrieveSimilarExamples } from "@/lib/server/generation-knowledge";
import { getIndustryPattern } from "@/lib/server/pattern-extractor";

const generationPlanCache = new Map<string, Promise<SiteGenerationPlan>>();

function isPremiumGenerationMode(): boolean {
  return process.env.SITEZY_GENERATION_MODE === "premium";
}

function cloneBriefForPageExpansion(brief: SiteBrief, pageName: string): SiteBrief {
  const pages = brief.pages.includes(pageName) ? brief.pages : [...brief.pages, pageName];
  const businessBrief = brief.businessBrief
    ? {
        ...brief.businessBrief,
        pages: brief.businessBrief.pages.includes(pageName)
          ? brief.businessBrief.pages
          : [...brief.businessBrief.pages, pageName],
      }
    : undefined;

  return {
    ...brief,
    pages,
    businessBrief,
  };
}

function cacheKeyForBrief(brief: SiteBrief) {
  return buildBusinessFingerprint(siteBriefToBusinessBrief(brief));
}

export async function buildSiteGenerationPlan(
  brief: SiteBrief,
  options?: { selfLearning?: boolean }
): Promise<SiteGenerationPlan> {
  const businessBrief = siteBriefToBusinessBrief(brief);
  const premiumMode = isPremiumGenerationMode();

  // Premium mode runs the multi-step AI planning engines. Efficient mode uses
  // deterministic plans and spends API budget on the actual page HTML.
  // Research + learning are ALWAYS on regardless of mode:
  // - fetchWebInspiration researches real sites in the industry (one call per
  //   project plan — the plan is cached/persisted, so this doesn't repeat per
  //   page). Bounded by a timeout so slow research never stalls generation.
  // - retrieveSimilarExamples / getIndustryPattern are cheap DB reads pulling
  //   what previously published, user-accepted sites taught the system.
  const RESEARCH_TIMEOUT_MS = 75_000;
  const researchWithTimeout = Promise.race([
    fetchWebInspiration(businessBrief),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), RESEARCH_TIMEOUT_MS)),
  ]);

  const [webInspirationResult, examplesResult, patternResult] = await Promise.allSettled([
    researchWithTimeout,
    retrieveSimilarExamples(businessBrief),
    getIndustryPattern(businessBrief.industry),
  ]);

  const webInspiration = webInspirationResult.status === "fulfilled" ? webInspirationResult.value : null;
  const retrievedExamples =
    examplesResult.status === "fulfilled" ? examplesResult.value : [];
  const learnedPatterns =
    patternResult.status === "fulfilled" ? patternResult.value : null;

  // Strategy runs with learned patterns + examples as additional context
  const strategy = await runStrategyEngine(businessBrief, {
    examples: retrievedExamples,
    pattern: learnedPatterns,
    skipAI: !premiumMode,
  });

  const design = await runDesignEngine(businessBrief, strategy, brief, webInspiration, {
    examples: retrievedExamples,
    skipAI: !premiumMode,
  });
  const copy = await runCopyEngine(businessBrief, strategy, design, { skipAI: !premiumMode });
  const layout = await runLayoutEngine(businessBrief, strategy, design, copy, webInspiration, { skipAI: !premiumMode });
  const polish = runPolishEngine(businessBrief, strategy, design, copy, layout);

  return {
    generatedAt: new Date().toISOString(),
    businessBrief,
    strategy,
    design,
    copy,
    layout,
    polish,
    webInspiration,
    retrievedExamples: retrievedExamples.length ? retrievedExamples : null,
    learnedPatterns,
  };
}

export async function ensureSiteGenerationPlan(
  brief: SiteBrief,
  blueprint?: SiteBlueprint | null,
  options?: { selfLearning?: boolean }
): Promise<SiteGenerationPlan> {
  if (blueprint?.generationPlan) {
    return blueprint.generationPlan as SiteGenerationPlan;
  }

  const key = cacheKeyForBrief(brief);
  const cached = generationPlanCache.get(key);
  if (cached) {
    return cached;
  }

  const nextPromise = buildSiteGenerationPlan(brief, options)
    .finally(() => {
      generationPlanCache.delete(key);
    });

  generationPlanCache.set(key, nextPromise);
  return nextPromise;
}

export async function generateBlueprintForBrief(
  brief: SiteBrief,
  options?: { selfLearning?: boolean }
): Promise<SiteBlueprint> {
  const plan = await ensureSiteGenerationPlan(brief, null, options);
  return buildBlueprintFromPlan(brief, plan);
}

export async function generatePageForBlueprint(
  blueprint: SiteBlueprint,
  page: BlueprintPage,
  brief: SiteBrief,
  onChunk?: (chunk: string, full: string) => void,
  instruction?: string | null,
  options?: { selfLearning?: boolean; chrome?: PageChromeReuse | null }
): Promise<{ html: string; plan: SiteGenerationPlan }> {
  const plan = await ensureSiteGenerationPlan(brief, blueprint, options);
  const html = await buildPageHtmlFromPlan(plan, page, brief, onChunk, instruction, options?.chrome ?? null);
  return { html, plan };
}

export async function generateAdditionalPageForBlueprint(
  blueprint: SiteBlueprint,
  pageName: string,
  brief: SiteBrief,
  options?: { selfLearning?: boolean; chrome?: PageChromeReuse | null }
): Promise<{ blueprint: SiteBlueprint; page: BlueprintPage; html: string; plan: SiteGenerationPlan }> {
  const expandedBrief = cloneBriefForPageExpansion(brief, pageName);
  const plan = await buildSiteGenerationPlan(expandedBrief, options);
  const nextBlueprint = buildBlueprintFromPlan(expandedBrief, plan);
  const page = nextBlueprint.pages.find(
    (entry) =>
      entry.name === pageName ||
      entry.slug === pageName.toLowerCase().replace(/\s+/g, "-")
  );
  if (!page) {
    throw new Error(`Could not resolve generated page "${pageName}" from plan`);
  }

  const html = await buildPageHtmlFromPlan(plan, page, expandedBrief, undefined, null, options?.chrome ?? null);
  return {
    blueprint: nextBlueprint,
    page,
    html,
    plan,
  };
}
