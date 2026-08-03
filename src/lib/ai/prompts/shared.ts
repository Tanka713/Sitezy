import type {
  BusinessBrief,
  CopyPagePlan,
  DesignPlan,
  LayoutPageBlueprint,
  SiteGenerationPlan,
  StrategyPagePlan,
} from "@/lib/ai/types";
import { logoUrlFromAsset, summarizeList } from "@/lib/ai/utils/normalize";

export function formatBusinessBrief(brief: BusinessBrief): string {
  const logo = brief.assets.logo;
  const logoLine =
    logo.status === "missing"
      ? "Logo: no existing logo"
      : logoUrlFromAsset(logo)
      ? `Logo: available at ${logoUrlFromAsset(logo)}`
      : "Logo: not yet confirmed";

  return [
    `Business name: ${brief.businessName || "Unknown"}`,
    `Industry: ${brief.industry || "Unknown"}`,
    `Location: ${brief.location || "Not provided"}`,
    `Business summary: ${brief.businessDescription || "Not provided"}`,
    `Offer: ${brief.offerSummary || summarizeList(brief.services)}`,
    `Audience: ${brief.audience || "Not provided"}`,
    `Differentiators: ${summarizeList(brief.differentiators)}`,
    `Website goals: ${summarizeList(brief.websiteGoals)}`,
    `Tone: ${brief.tone || "Not provided"}`,
    `Style direction: ${summarizeList(brief.styleDirection)}`,
    `Brand colors: ${summarizeList(brief.brandColors)}`,
    `Pages: ${summarizeList(brief.pages)}`,
    `Services/products: ${summarizeList(brief.services)}`,
    `Testimonials: ${summarizeList(brief.testimonials)}`,
    `Social proof: ${summarizeList(brief.socialProof)}`,
    `Story: ${brief.story || "Not provided"}`,
    `CTA preference: ${brief.contactInfo.cta || "Not provided"}`,
    `Booking enabled: ${brief.contactInfo.bookingEnabled === true ? "yes" : brief.contactInfo.bookingEnabled === false ? "no" : "unknown"}`,
    `Lead capture enabled: ${brief.contactInfo.leadCaptureEnabled === true ? "yes" : brief.contactInfo.leadCaptureEnabled === false ? "no" : "unknown"}`,
    `Contact email: ${brief.contactInfo.email || "Not provided"}`,
    `Contact phone: ${brief.contactInfo.phone || "Not provided"}`,
    `Contact address: ${brief.contactInfo.address || "Not provided"}`,
    `Contact hours: ${brief.contactInfo.hours || "Not provided"}`,
    logoLine,
  ].join("\n");
}

export function formatStrategyPage(page: StrategyPagePlan): string {
  return [
    `Page: ${page.name} (${page.slug})`,
    `Purpose: ${page.purpose}`,
    `Conversion goal: ${page.conversionGoal}`,
    `Key moments: ${summarizeList(page.keyMoments)}`,
    `Must-include sections: ${summarizeList(page.mustIncludeSectionTypes)}`,
    `Optional sections: ${summarizeList(page.optionalSectionTypes)}`,
    `Trust signals: ${summarizeList(page.trustSignals)}`,
  ].join("\n");
}

export function formatDesignPlan(plan: DesignPlan): string {
  return [
    `Concept: ${plan.conceptName}`,
    `Brand core: ${plan.brandCore}`,
    `Visual signature: ${plan.visualSignature}`,
    `Layout style: ${plan.layoutStyle}`,
    `Site format: ${plan.siteFormat}`,
    `Navigation style: ${plan.navigationStyle}`,
    `Footer style: ${plan.footerStyle}`,
    `Animation: ${plan.animationStyle}`,
    `Section rhythm: ${plan.sectionRhythm}`,
    `Hero approach: ${plan.heroApproach}`,
    `Logo treatment: ${plan.logoTreatment}`,
    `Colors: primary ${plan.colorScheme.primary}, secondary ${plan.colorScheme.secondary}, accent ${plan.colorScheme.accent}, bg ${plan.colorScheme.bg}, text ${plan.colorScheme.text}`,
    `Typography: ${plan.typography.headingFont} / ${plan.typography.bodyFont}`,
    `Component language: ${summarizeList(plan.componentLanguage)}`,
    `Structural composition: ${summarizeList(plan.structuralComposition)}`,
    `Visual hierarchy rules: ${summarizeList(plan.visualHierarchyRules)}`,
    `Motion guidance: ${summarizeList(plan.motionGuidance)}`,
  ].join("\n");
}

export function formatCopyPage(page: CopyPagePlan): string {
  return [
    `Page: ${page.name}`,
    `Title: ${page.title}`,
    `Intro: ${page.intro}`,
    `Meta description: ${page.metaDescription}`,
    ...page.sections.map((section) =>
      [
        `Section ${section.name} (${section.type})`,
        `Headline: ${section.headline}`,
        `Subheadline: ${section.subheadline}`,
        `Body: ${summarizeList(section.body)}`,
        `Bullets: ${summarizeList(section.bullets)}`,
        `Proof: ${summarizeList(section.proofItems)}`,
        `Primary CTA: ${section.ctaPrimary || "Not provided"}`,
        `Secondary CTA: ${section.ctaSecondary || "Not provided"}`,
      ].join("\n")
    ),
  ].join("\n");
}

export function formatLayoutPage(page: LayoutPageBlueprint): string {
  return [
    `Page: ${page.name} (${page.slug})`,
    `Purpose: ${page.purpose}`,
    `Story arc: ${page.storyArc}`,
    `Rhythm plan: ${page.rhythmPlan}`,
    `CTA strategy: ${page.ctaStrategy}`,
    `Navbar concept: ${page.navbarConcept}`,
    `Signature moment: ${page.signatureMoment}`,
    ...page.sections.map((section) =>
      [
        `Section ${section.name} (${section.type})`,
        `Variation: ${section.variation}`,
        `Composition mode: ${section.compositionMode}`,
        `Spacing profile: ${section.spacingProfile}`,
        `Surface style: ${section.surfaceStyle}`,
        `CTA placement: ${section.ctaPlacement}`,
        `Contrast from previous: ${section.contrastWithPrevious}`,
        `Purpose: ${section.purpose}`,
        `Layout idea: ${section.layoutIdea}`,
        `Emphasis: ${section.emphasis}`,
        `Visual hook: ${section.visualHook}`,
        `Interaction hint: ${section.interactionHint}`,
        `Hierarchy: ${summarizeList(section.hierarchy)}`,
        `Content keys: ${summarizeList(section.contentKeys)}`,
        `Media briefs: ${summarizeList(section.mediaBriefs)}`,
        `Premium details: ${summarizeList(section.premiumDetails)}`,
      ].join("\n")
    ),
  ].join("\n");
}

export function formatGenerationPlan(plan: SiteGenerationPlan): string {
  return [
    formatBusinessBrief(plan.businessBrief),
    formatDesignPlan(plan.design),
    ...plan.strategy.pagePlans.map(formatStrategyPage),
    ...plan.layout.pages.map(formatLayoutPage),
  ].join("\n\n");
}
