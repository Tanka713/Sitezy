import type {
  AnimationStyle,
  ColorScheme,
  LayoutStyle,
  SiteBlueprint,
  SiteBrief,
  SiteFormat,
  Typography,
} from "@/types";

export type BriefLogoStatus = "uploaded" | "url" | "missing" | "unknown";

export interface BriefLogoAsset {
  status: BriefLogoStatus;
  assetId?: string;
  fileUrl?: string;
  fileName?: string;
  sourceUrl?: string;
  storageBucket?: string | null;
  storagePath?: string | null;
  altText?: string;
  notes?: string;
}

export interface BriefImageAsset {
  assetId?: string;
  url: string;
  name?: string;
  storageBucket?: string | null;
  storagePath?: string | null;
  altText?: string;
  notes?: string;
}

export type BusinessBriefStage =
  | "identity"
  | "offer"
  | "goal"
  | "style"
  | "content"
  | "logo"
  | "finalize"
  | "ready";

export type BusinessBriefFieldId =
  | "businessName"
  | "industry"
  | "location"
  | "businessDescription"
  | "offerSummary"
  | "audience"
  | "differentiators"
  | "websiteGoals"
  | "tone"
  | "styleDirection"
  | "brandColors"
  | "pages"
  | "services"
  | "testimonials"
  | "socialProof"
  | "story"
  | "contactInfo"
  | "leadCapture"
  | "logo";

export interface BusinessContactInfo {
  email?: string;
  phone?: string;
  address?: string;
  hours?: string;
  cta?: string;
  bookingEnabled?: boolean;
  leadCaptureEnabled?: boolean;
}

export interface BusinessBrief {
  version: 2;
  businessName: string;
  industry: string;
  location: string;
  businessDescription: string;
  offerSummary: string;
  audience: string;
  differentiators: string[];
  websiteGoals: string[];
  tone: string;
  styleDirection: string[];
  brandColors: string[];
  pages: string[];
  services: string[];
  testimonials: string[];
  socialProof: string[];
  story: string;
  references: string[];
  contactInfo: BusinessContactInfo;
  brand: {
    hasExistingStyle: boolean | null;
    mood: string[];
    references: string[];
  };
  assets: {
    logo: BriefLogoAsset;
    images: BriefImageAsset[];
  };
  intelligence: {
    stage: BusinessBriefStage;
    missingFields: BusinessBriefFieldId[];
    knownFields: BusinessBriefFieldId[];
    declinedFields?: BusinessBriefFieldId[];
    readinessScore: number;
    recommendedNextPrompt?: string | null;
    lastUpdatedAt?: string;
  };
}

export interface BriefChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BriefInterviewResult {
  reply: string;
  summary: string;
  stage: BusinessBriefStage;
  businessBrief: BusinessBrief;
  partialBrief: Partial<SiteBrief>;
  missingFields: BusinessBriefFieldId[];
  readinessScore: number;
  isComplete: boolean;
}

export interface StrategyPagePlan {
  pageId: string;
  name: string;
  slug: string;
  purpose: string;
  conversionGoal: string;
  keyMoments: string[];
  mustIncludeSectionTypes: string[];
  optionalSectionTypes: string[];
  trustSignals: string[];
}

export interface StrategyPlan {
  positioning: string;
  audiencePriorities: string[];
  conversionStrategy: string[];
  trustSignals: string[];
  siteNarrative: string;
  contentPriorities: string[];
  sectionPrinciples: string[];
  pagePlans: StrategyPagePlan[];
}

export interface DesignPlan {
  conceptName: string;
  brandCore: string;
  visualSignature: string;
  layoutStyle: LayoutStyle;
  siteFormat: SiteFormat;
  navigationStyle: "minimal" | "full" | "sidebar" | "floating";
  footerStyle: "simple" | "detailed" | "bold" | "minimal";
  animationStyle: AnimationStyle;
  colorScheme: ColorScheme;
  typography: Typography;
  sectionRhythm: string;
  heroApproach: string;
  componentLanguage: string[];
  structuralComposition: string[];
  visualHierarchyRules: string[];
  logoTreatment: string;
  motionGuidance: string[];
  accessibilityPrinciples: string[];
}

export interface CopySectionPlan {
  sectionId: string;
  type: string;
  name: string;
  eyebrow?: string;
  headline: string;
  subheadline: string;
  body: string[];
  bullets: string[];
  stats: string[];
  proofItems: string[];
  ctaPrimary?: string;
  ctaSecondary?: string;
  mediaNotes: string[];
}

export interface CopyPagePlan {
  pageId: string;
  name: string;
  title: string;
  intro: string;
  metaDescription: string;
  sections: CopySectionPlan[];
}

export interface CopyPlan {
  tagline: string;
  brandPromise: string;
  voiceNotes: string[];
  primaryCta: string;
  secondaryCta: string;
  pages: CopyPagePlan[];
}

export interface LayoutSectionBlueprint {
  id: string;
  type: string;
  name: string;
  variation: string;
  compositionMode: string;
  spacingProfile: string;
  surfaceStyle: string;
  ctaPlacement: string;
  contrastWithPrevious: string;
  purpose: string;
  layoutIdea: string;
  emphasis: string;
  visualHook: string;
  interactionHint: string;
  hierarchy: string[];
  contentKeys: string[];
  mediaBriefs: string[];
  premiumDetails: string[];
}

export interface LayoutPageBlueprint {
  pageId: string;
  name: string;
  slug: string;
  purpose: string;
  storyArc: string;
  rhythmPlan: string;
  ctaStrategy: string;
  navbarConcept: string;
  signatureMoment: string;
  sections: LayoutSectionBlueprint[];
}

export interface LayoutPlan {
  antiRepetitionRules: string[];
  siteWidePatterns: string[];
  pages: LayoutPageBlueprint[];
}

export interface PolishedPagePlan {
  pageId: string;
  seoTitle: string;
  seoDescription: string;
  animationHints: string[];
  responsivenessNotes: string[];
  accessibilityNotes: string[];
}

export interface PolishPlan {
  siteWideNotes: string[];
  pages: PolishedPagePlan[];
}

export interface SiteGenerationPlan {
  generatedAt: string;
  businessBrief: BusinessBrief;
  strategy: StrategyPlan;
  design: DesignPlan;
  copy: CopyPlan;
  layout: LayoutPlan;
  polish: PolishPlan;
  /** Web inspiration research — competitor sites and design patterns for this industry */
  webInspiration?: import("@/lib/ai/web-inspiration").WebInspirationResult | null;
  /** Retrieved high-quality examples from similar past generations (RAG) */
  retrievedExamples?: import("@/lib/server/generation-knowledge").SiteGenerationExample[] | null;
  /** Extracted industry patterns from aggregate successful generations */
  learnedPatterns?: import("@/lib/server/pattern-extractor").IndustryPattern | null;
}

export interface BlueprintGenerationBundle {
  blueprint: SiteBlueprint;
  plan: SiteGenerationPlan;
}
