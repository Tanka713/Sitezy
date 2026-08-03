import type { SiteBrief, SiteFormat } from "@/types";
import { DESIGN_ARCHETYPES, buildDesignGuidance, selectFontPairingForBrief } from "@/lib/ai/design-archetypes";
import { buildCreativeDna } from "@/lib/ai/creative-dna";
import { businessBriefToPartialSiteBrief } from "@/lib/ai/adapters/wizardAdapter";
import { jsonCompletion } from "@/lib/ai/runtime";
import { buildDesignSystemPrompt, buildDesignUserPrompt } from "@/lib/ai/prompts/design";
import type { BusinessBrief, DesignPlan, StrategyPlan } from "@/lib/ai/types";
import type { WebInspirationResult } from "@/lib/ai/web-inspiration";
import {
  getIndustryDesignCues,
  getIndustryHeroApproaches,
  getIndustryHierarchyRules,
  inferIndustryKey,
  inferStyleKeywords,
} from "@/lib/ai/utils/sectionRules";
import { cleanList, dedupeStrings, toSentence } from "@/lib/ai/utils/normalize";

const SITE_FORMATS: SiteFormat[] = [
  "editorial-feature",
  "campaign-poster",
  "menu-first-catalog",
  "club-community",
  "showroom-split",
  "story-journey",
  "magazine-rail",
  "product-showroom",
  "gallery-showcase",
  "trust-proof",
];

function inferArchetype(sourceBrief?: SiteBrief, businessBrief?: BusinessBrief) {
  const preferred = sourceBrief?.generationDesignStyle;
  if (preferred && DESIGN_ARCHETYPES[preferred]) {
    return preferred;
  }

  const keywords = businessBrief
    ? inferStyleKeywords(businessBrief)
    : dedupeStrings([
        ...cleanList(sourceBrief?.colorPreference),
        sourceBrief?.tone ?? "",
        sourceBrief?.smartBrief?.stylePreference ?? "",
      ], 8);
  const haystack = keywords
    .join(" ")
    .toLowerCase();
  const industry = businessBrief ? inferIndustryKey(businessBrief) : undefined;
  if ((industry === "agency" || industry === "portfolio") && /editorial|magazine|story/.test(haystack)) {
    return "editorial";
  }
  if (/luxury|premium|exclusive|high-end/.test(haystack)) return "luxury";
  if (/playful|colorful|friendly|fun/.test(haystack)) return "playful";
  if (/editorial|magazine|story/.test(haystack)) return "editorial";
  if (/future|futuristic|tech|cyber/.test(haystack)) return "futuristic";
  if (/brutal|edgy|raw/.test(haystack)) return "brutalist";
  return "minimal";
}

function buildPseudoSiteBrief(businessBrief: BusinessBrief, sourceBrief?: SiteBrief): SiteBrief {
  const partial = businessBriefToPartialSiteBrief(businessBrief, sourceBrief);
  return {
    siteName: partial.siteName || businessBrief.businessName,
    description: partial.description || businessBrief.businessDescription,
    siteType: partial.siteType || businessBrief.industry,
    tone: partial.tone || businessBrief.tone || "Professional",
    pages: partial.pages || businessBrief.pages,
    features: partial.features || businessBrief.offerSummary,
    targetAudience: partial.targetAudience || businessBrief.audience,
    competitors: partial.competitors || businessBrief.references.join(", "),
    colorPreference: partial.colorPreference || businessBrief.brandColors.join(", "),
    colorPalette: partial.colorPalette || businessBrief.brandColors,
    imageStyle: partial.imageStyle || "photos",
    generatorMode: partial.generatorMode || "conversation",
    smartBrief: partial.smartBrief,
    hasLogo: partial.hasLogo,
    currency: sourceBrief?.currency,
    generationDesignStyle: (sourceBrief?.generationDesignStyle ?? inferArchetype(sourceBrief, businessBrief)) as SiteBrief["generationDesignStyle"],
    generationCreativityLevel: sourceBrief?.generationCreativityLevel,
    generationStructurePreference: sourceBrief?.generationStructurePreference,
    generationContentDensity: sourceBrief?.generationContentDensity,
    defaultTypographyStyle: sourceBrief?.defaultTypographyStyle,
    defaultLayoutSpacing: sourceBrief?.defaultLayoutSpacing,
    defaultNavigationStyle: sourceBrief?.defaultNavigationStyle,
    creativeMode: sourceBrief?.creativeMode,
    businessBrief,
  };
}

function mapBrandColors(brief: BusinessBrief, fallback: DesignPlan["colorScheme"]) {
  if (!brief.brandColors.length) return fallback;
  const [primary, secondary, accent, bg] = brief.brandColors;
  return {
    primary: primary || fallback.primary,
    secondary: secondary || fallback.secondary || primary || fallback.primary,
    accent: accent || primary || fallback.accent,
    bg: bg || fallback.bg,
    text: fallback.text,
    muted: fallback.muted,
    border: fallback.border,
  };
}

function inferSiteFormat(layoutStyle: DesignPlan["layoutStyle"], brief: BusinessBrief): SiteFormat {
  const industry = inferIndustryKey(brief);
  if (industry === "automotive") return "showroom-split";
  if (industry === "restaurant") return "menu-first-catalog";
  if (industry === "commerce") return "product-showroom";
  if (industry === "portfolio") return "gallery-showcase";
  if (industry === "saas") return "showroom-split";
  if (industry === "agency") return "editorial-feature";
  if (industry === "local") return "trust-proof";
  if (layoutStyle === "magazine" || layoutStyle === "editorial") return "magazine-rail";
  if (layoutStyle === "split-screen") return "showroom-split";
  if (layoutStyle === "storytelling") return "story-journey";
  return "trust-proof";
}

function inferFallbackLayoutStyle(style: string, brief: BusinessBrief): DesignPlan["layoutStyle"] {
  const industry = inferIndustryKey(brief);
  if (industry === "automotive") return "split-screen";
  if (industry === "saas") return "product-first";
  if (industry === "commerce") return "product-first";
  if (industry === "restaurant" || industry === "hospitality") {
    return style === "luxury" ? "storytelling" : "editorial";
  }
  if (industry === "agency" || industry === "portfolio") {
    return style === "brutalist" ? "grid" : "magazine";
  }
  if (industry === "local") return "editorial";
  if (industry === "wellness") return "storytelling";
  if (industry === "education") return "asymmetric";
  if (style === "editorial") return "magazine";
  if (style === "brutalist") return "grid";
  return "editorial";
}

function inferNavigationStyle(brief: BusinessBrief): DesignPlan["navigationStyle"] {
  const industry = inferIndustryKey(brief);
  if (industry === "portfolio") return "minimal";
  if (industry === "automotive" || industry === "restaurant" || industry === "hospitality") return "floating";
  return "full";
}

function inferFooterStyle(style: string, brief: BusinessBrief): DesignPlan["footerStyle"] {
  const industry = inferIndustryKey(brief);
  if (style === "luxury" || industry === "automotive" || industry === "restaurant" || industry === "hospitality") return "bold";
  if (industry === "portfolio") return "minimal";
  return "detailed";
}

function inferAnimationStyle(style: string, brief: BusinessBrief): DesignPlan["animationStyle"] {
  const industry = inferIndustryKey(brief);
  if (industry === "automotive" || industry === "restaurant" || industry === "portfolio") return "moderate";
  if (style === "futuristic") return "moderate";
  return "subtle";
}

function withIndefiniteArticle(value: string): string {
  return `${/^[aeiou]/i.test(value) ? "An" : "A"} ${value}`;
}

// Maps the DNA layout motif to the closest layoutStyle so fallback plans vary
// per business instead of one fixed style per industry.
const MOTIF_TO_LAYOUT_STYLE: Record<string, DesignPlan["layoutStyle"]> = {
  "Bento feature grid": "bento",
  "Editorial overlap": "editorial",
  "Numbered process rail": "storytelling",
  "Alternating chapter splits": "zigzag",
  "Full-bleed interlude": "storytelling",
  "Masonry showcase": "grid",
  "Spotlight proof wall": "card-based",
  "Sticky decision rail": "sidebar-led",
};

function buildFallbackDesignPlan(businessBrief: BusinessBrief, sourceBrief?: SiteBrief): DesignPlan {
  const pseudoBrief = buildPseudoSiteBrief(businessBrief, sourceBrief);
  const fontPair = selectFontPairingForBrief(pseudoBrief);
  const style = pseudoBrief.generationDesignStyle ?? "minimal";
  const industry = inferIndustryKey(businessBrief);
  // The same DNA the prompts inject — keeps fallback plans and the build
  // prompt's binding contract aligned while varying every axis per business.
  const dna = buildCreativeDna(businessBrief);
  const layoutStyle =
    pseudoBrief.generationStructurePreference === "asymmetric"
      ? "asymmetric"
      : MOTIF_TO_LAYOUT_STYLE[dna.layoutMotif.name] ?? inferFallbackLayoutStyle(style, businessBrief);
  const designCues = getIndustryDesignCues(businessBrief);
  const hierarchyRules = getIndustryHierarchyRules(businessBrief);
  const heroApproaches = getIndustryHeroApproaches(businessBrief);

  return {
    conceptName: `${businessBrief.businessName || pseudoBrief.siteName} — ${dna.paletteName}`.trim(),
    brandCore: businessBrief.offerSummary || businessBrief.businessDescription,
    visualSignature: `${withIndefiniteArticle(style)} direction built on the ${dna.paletteName} palette strategy, a ${dna.hero.name.toLowerCase()}, and the ${dna.layoutMotif.name.toLowerCase()} motif — so ${businessBrief.businessName || "this brand"} reads unmistakably its own.`,
    layoutStyle,
    siteFormat: inferSiteFormat(layoutStyle, businessBrief),
    navigationStyle:
      pseudoBrief.defaultNavigationStyle === "floating"
        ? "floating"
        : inferNavigationStyle(businessBrief),
    footerStyle: inferFooterStyle(style, businessBrief),
    animationStyle: dna.animationStyle ?? inferAnimationStyle(style, businessBrief),
    colorScheme: mapBrandColors(
      businessBrief,
      // DNA palette is null exactly when brand colors are supplied, in which
      // case mapBrandColors uses those and only leans on these per-field.
      dna.palette ?? {
        primary: pseudoBrief.colorPalette?.[0] || "#1f2937",
        secondary: pseudoBrief.colorPalette?.[1] || "#0f172a",
        accent: pseudoBrief.colorPalette?.[2] || pseudoBrief.colorPalette?.[0] || "#2563eb",
        bg: pseudoBrief.colorPalette?.[3] || "#ffffff",
        text: "#111111",
        muted: "#6b7280",
        border: "#e5e7eb",
      }
    ),
    typography: {
      headingFont: fontPair.heading,
      bodyFont: fontPair.body,
      style: fontPair.style,
      headingWeight: "700",
      lineHeight: "1.2",
    },
    sectionRhythm:
      style === "luxury"
        ? "unhurried, chapter-like spacing with high contrast between dense and quiet moments"
        : industry === "saas"
        ? "tight product storytelling with fast clarity, then deliberate proof-led breathing room"
        : industry === "automotive"
        ? "cinematic opening moments with structured showroom pacing and sharp booking cues"
        : industry === "restaurant" || industry === "hospitality"
        ? "slow, cinematic pacing with a few richer signature moments between practical conversion cues"
        : "confident pacing with clear section contrast and breathable transitions",
    heroApproach: `${dna.hero.name}: ${dna.hero.guidance}`,
    componentLanguage: dedupeStrings([
      dna.shape,
      dna.imageTreatment,
      style === "luxury" ? "framed editorial blocks" : "clean asymmetric surfaces",
      industry === "automotive"
        ? "showroom-led vehicle panels"
        : industry === "saas"
        ? "workflow-led product panels"
        : industry === "commerce"
        ? "merchandising-led product groupings"
        : industry === "restaurant"
        ? "atmosphere-led editorial panels"
        : industry === "local"
        ? "trust-first reassurance panels"
        : style === "editorial"
        ? "type-led callouts"
        : "proof-driven layouts",
      businessBrief.assets.logo.status !== "missing" ? "logo-led brand moments" : "text-led identity treatment",
      ...designCues,
    ], 7),
    structuralComposition: dedupeStrings([
      `Signature layout motif — ${dna.layoutMotif.name}: ${dna.layoutMotif.guidance}`,
      `Canvas plan: ${dna.canvas}`,
      "Vary widths, alignments, and section density from page to page.",
      "Use one signature composition per page instead of repeating card grids.",
      "Let proof sections feel different from offer sections.",
      ...designCues,
      ...heroApproaches.slice(0, 1).map((approach) => `Industry hero instinct to blend in: ${approach}`),
    ], 8),
    visualHierarchyRules: dedupeStrings([
      "Create a clear first read, second read, and action layer in every major section.",
      "Give one dominant element in each section visibly more weight than its supporting content.",
      "Avoid equal-weight rows of cards when the content has different importance.",
      ...hierarchyRules,
    ], 8),
    logoTreatment:
      businessBrief.assets.logo.status === "missing"
        ? "Use a refined text wordmark in navigation and footer."
        : "Anchor navigation and footer with the supplied logo while keeping supporting text editable.",
    motionGuidance: dedupeStrings([
      `${dna.motionName}: ${dna.motionGuidance}`,
      `Wildcard detail — ${dna.wildcard.name}: ${dna.wildcard.guidance}`,
      "Use motion to support pacing and emphasis, not to decorate every block.",
      "Reserve the strongest animation for hero, proof, and CTA moments.",
    ], 6),
    accessibilityPrinciples: [
      "Maintain clear color contrast and readable type sizes.",
      "Keep interactions obvious and text editable inside normal semantic elements.",
    ],
  };
}

function normalizeSiteFormat(value: unknown, fallback: SiteFormat): SiteFormat {
  return SITE_FORMATS.includes(value as SiteFormat) ? (value as SiteFormat) : fallback;
}

function normalizeDesignPlan(businessBrief: BusinessBrief, candidate: Partial<DesignPlan> | null, sourceBrief?: SiteBrief): DesignPlan {
  const fallback = buildFallbackDesignPlan(businessBrief, sourceBrief);
  const layoutStyle = candidate?.layoutStyle ?? fallback.layoutStyle;

  return {
    conceptName: toSentence(candidate?.conceptName, fallback.conceptName),
    brandCore: toSentence(candidate?.brandCore, fallback.brandCore),
    visualSignature: toSentence(candidate?.visualSignature, fallback.visualSignature),
    layoutStyle,
    siteFormat: normalizeSiteFormat(candidate?.siteFormat, inferSiteFormat(layoutStyle, businessBrief)),
    navigationStyle:
      candidate?.navigationStyle === "minimal" ||
      candidate?.navigationStyle === "sidebar" ||
      candidate?.navigationStyle === "floating"
        ? candidate.navigationStyle
        : fallback.navigationStyle,
    footerStyle:
      candidate?.footerStyle === "simple" ||
      candidate?.footerStyle === "bold" ||
      candidate?.footerStyle === "minimal"
        ? candidate.footerStyle
        : fallback.footerStyle,
    animationStyle:
      candidate?.animationStyle === "none" ||
      candidate?.animationStyle === "moderate" ||
      candidate?.animationStyle === "expressive"
        ? candidate.animationStyle
        : fallback.animationStyle,
    colorScheme: mapBrandColors(businessBrief, {
      primary: candidate?.colorScheme?.primary || fallback.colorScheme.primary,
      secondary: candidate?.colorScheme?.secondary || fallback.colorScheme.secondary,
      accent: candidate?.colorScheme?.accent || fallback.colorScheme.accent,
      bg: candidate?.colorScheme?.bg || fallback.colorScheme.bg,
      text: candidate?.colorScheme?.text || fallback.colorScheme.text,
      muted: candidate?.colorScheme?.muted || fallback.colorScheme.muted,
      border: candidate?.colorScheme?.border || fallback.colorScheme.border,
    }),
    typography: {
      headingFont: candidate?.typography?.headingFont || fallback.typography.headingFont,
      bodyFont: candidate?.typography?.bodyFont || fallback.typography.bodyFont,
      style: candidate?.typography?.style || fallback.typography.style,
      headingWeight: candidate?.typography?.headingWeight || fallback.typography.headingWeight,
      lineHeight: candidate?.typography?.lineHeight || fallback.typography.lineHeight,
    },
    sectionRhythm: toSentence(candidate?.sectionRhythm, fallback.sectionRhythm),
    heroApproach: toSentence(candidate?.heroApproach, fallback.heroApproach),
    componentLanguage: dedupeStrings([
      ...cleanList(candidate?.componentLanguage),
      ...fallback.componentLanguage,
    ], 8),
    structuralComposition: dedupeStrings([
      ...cleanList(candidate?.structuralComposition),
      ...fallback.structuralComposition,
    ], 8),
    visualHierarchyRules: dedupeStrings([
      ...cleanList(candidate?.visualHierarchyRules),
      ...fallback.visualHierarchyRules,
    ], 8),
    logoTreatment: toSentence(candidate?.logoTreatment, fallback.logoTreatment),
    motionGuidance: dedupeStrings([
      ...cleanList(candidate?.motionGuidance),
      ...fallback.motionGuidance,
    ], 6),
    accessibilityPrinciples: dedupeStrings([
      ...cleanList(candidate?.accessibilityPrinciples),
      ...fallback.accessibilityPrinciples,
    ], 6),
  };
}

export async function runDesignEngine(
  businessBrief: BusinessBrief,
  strategy: StrategyPlan,
  sourceBrief?: SiteBrief,
  webInspiration?: WebInspirationResult | null,
  knowledge?: { examples?: import("@/lib/server/generation-knowledge").SiteGenerationExample[]; skipAI?: boolean }
): Promise<DesignPlan> {
  const pseudoBrief = buildPseudoSiteBrief(businessBrief, sourceBrief);
  const guidance = buildDesignGuidance(pseudoBrief);
  if (knowledge?.skipAI) return buildFallbackDesignPlan(businessBrief, sourceBrief);

  try {
    const raw = await jsonCompletion<DesignPlan>(
      buildDesignSystemPrompt(),
      buildDesignUserPrompt(businessBrief, strategy, guidance, webInspiration, knowledge?.examples),
      2,
      5_000
    );
    return normalizeDesignPlan(businessBrief, raw, sourceBrief);
  } catch {
    return buildFallbackDesignPlan(businessBrief, sourceBrief);
  }
}
