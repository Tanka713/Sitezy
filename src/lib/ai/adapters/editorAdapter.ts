import type { BlueprintPage, PageSection, SiteBlueprint, SiteBrief } from "@/types";
import type {
  CopyPagePlan,
  LayoutPageBlueprint,
  SiteGenerationPlan,
  StrategyPlan,
} from "@/lib/ai/types";
import { slugifyText, toSentence } from "@/lib/ai/utils/normalize";

function buildCreativeDirection(plan: SiteGenerationPlan) {
  return {
    conceptName: plan.design.conceptName,
    brandCore: plan.design.brandCore,
    brandWorld: plan.strategy.siteNarrative,
    audienceFantasy: plan.strategy.audiencePriorities.join(", "),
    visualSignature: plan.design.visualSignature,
    layoutDna: [...plan.design.structuralComposition, plan.design.sectionRhythm].join(" / "),
    experiencePrinciples: [
      ...plan.strategy.sectionPrinciples,
      ...plan.design.structuralComposition,
    ].slice(0, 6),
    memorableMoments: plan.strategy.contentPriorities.slice(0, 4),
    antiGenericRules: plan.layout.antiRepetitionRules.slice(0, 4),
    colorStory: `Primary ${plan.design.colorScheme.primary}, secondary ${plan.design.colorScheme.secondary}, accent ${plan.design.colorScheme.accent}.`,
    typographyStory: `${plan.design.typography.headingFont} for expression with ${plan.design.typography.bodyFont} for readable interface copy.`,
    motionStory: plan.design.motionGuidance.join(" "),
  };
}

function buildBlueprintPages(plan: SiteGenerationPlan): BlueprintPage[] {
  return plan.layout.pages.map((page, index) => ({
    id: page.pageId || slugifyText(page.slug || page.name),
    name: page.name,
    slug: page.slug || slugifyText(page.name),
    purpose: page.purpose,
    priority: plan.strategy.pagePlans.find((entry) => entry.pageId === page.pageId)?.keyMoments.length
      ? index + 1
      : index + 1,
    sections: page.sections.map((section) => section.type),
  }));
}

export function buildEditorCompatibleBlueprint(
  brief: SiteBrief,
  plan: SiteGenerationPlan
): SiteBlueprint {
  return {
    siteName: plan.businessBrief.businessName || brief.siteName,
    tagline: plan.copy.tagline,
    brandPersonality: `${plan.design.brandCore} ${plan.strategy.positioning}`.trim(),
    colorScheme: plan.design.colorScheme,
    typography: plan.design.typography,
    layoutStyle: plan.design.layoutStyle,
    siteFormat: plan.design.siteFormat,
    signatureShell: plan.design.componentLanguage.join(", "),
    heroApproach: plan.design.heroApproach,
    sectionRhythm: plan.design.sectionRhythm,
    pages: buildBlueprintPages(plan),
    designDirection: [
      plan.design.visualSignature,
      `Component language: ${plan.design.componentLanguage.slice(0, 3).join(", ")}.`,
      `Composition rules: ${plan.design.structuralComposition.slice(0, 2).join(", ")}.`,
      `Hierarchy rules: ${plan.design.visualHierarchyRules.slice(0, 2).join(", ")}.`,
      `Section rhythm: ${plan.design.sectionRhythm}.`,
      `Site patterns: ${plan.layout.siteWidePatterns.slice(0, 2).join(", ")}.`,
    ].join(" "),
    animationStyle: plan.design.animationStyle,
    navigationStyle: plan.design.navigationStyle,
    footerStyle: plan.design.footerStyle,
    creativeDirection: buildCreativeDirection(plan),
    generationPlan: plan,
  };
}

export function findStrategyPagePlan(
  strategy: StrategyPlan,
  pageId: string
) {
  return strategy.pagePlans.find((page) => page.pageId === pageId) ?? null;
}

export function findLayoutPageBlueprint(
  plan: SiteGenerationPlan,
  pageId: string
): LayoutPageBlueprint | null {
  return plan.layout.pages.find((page) => page.pageId === pageId) ?? null;
}

export function findCopyPagePlan(
  plan: SiteGenerationPlan,
  pageId: string
): CopyPagePlan | null {
  return plan.copy.pages.find((page) => page.pageId === pageId) ?? null;
}

export function extractSectionsFromGeneratedHtml(html: string): PageSection[] {
  const attrRe =
    /<(?:nav|header|section|article|footer|div|main|aside)[^>]+data-sz-section-id="([^"]+)"[^>]*>/gi;
  const typeRe = /data-sz-section-type="([^"]+)"/i;
  const nameRe = /data-sz-section-name="([^"]+)"/i;

  const sections: PageSection[] = [];
  let match: RegExpExecArray | null;

  while ((match = attrRe.exec(html)) !== null && sections.length < 40) {
    const tag = match[0];
    const id = match[1].trim();
    const type = typeRe.exec(tag)?.[1]?.trim() ?? "section";
    const name = nameRe.exec(tag)?.[1]?.trim() ?? toSentence(type, "Section");
    sections.push({ id, type, name });
  }

  return sections;
}
