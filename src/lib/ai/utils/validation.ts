import type { BusinessBrief, BusinessBriefFieldId, BusinessBriefStage } from "@/lib/ai/types";
import { hasResolvedLogo } from "@/lib/ai/utils/normalize";

type Requirement = {
  field: BusinessBriefFieldId;
  test: (brief: BusinessBrief) => boolean;
};

const FIELD_REQUIREMENTS: Requirement[] = [
  { field: "businessName", test: (brief) => brief.businessName.trim().length > 1 },
  { field: "industry", test: (brief) => brief.industry.trim().length > 1 },
  { field: "location", test: (brief) => brief.location.trim().length > 1 },
  { field: "businessDescription", test: (brief) => brief.businessDescription.trim().length > 20 },
  { field: "offerSummary", test: (brief) => brief.offerSummary.trim().length > 10 || brief.services.length > 0 },
  { field: "audience", test: (brief) => brief.audience.trim().length > 6 },
  { field: "differentiators", test: (brief) => brief.differentiators.length > 0 },
  { field: "websiteGoals", test: (brief) => brief.websiteGoals.length > 0 },
  { field: "tone", test: (brief) => brief.tone.trim().length > 1 },
  { field: "styleDirection", test: (brief) => brief.styleDirection.length > 0 || brief.brand.mood.length > 0 },
  { field: "brandColors", test: (brief) => brief.brandColors.length > 0 },
  { field: "pages", test: (brief) => brief.pages.length > 0 },
  { field: "services", test: (brief) => brief.services.length > 0 || brief.offerSummary.trim().length > 10 },
  { field: "testimonials", test: (brief) => brief.testimonials.length > 0 || brief.socialProof.length > 0 },
  { field: "socialProof", test: (brief) => brief.socialProof.length > 0 || brief.testimonials.length > 0 },
  { field: "story", test: (brief) => brief.story.trim().length > 10 },
  {
    field: "contactInfo",
    test: (brief) =>
      !!brief.contactInfo.email ||
      !!brief.contactInfo.phone ||
      !!brief.contactInfo.address,
  },
  {
    field: "leadCapture",
    test: (brief) =>
      typeof brief.contactInfo.bookingEnabled === "boolean" ||
      typeof brief.contactInfo.leadCaptureEnabled === "boolean" ||
      !!brief.contactInfo.cta,
  },
  {
    field: "logo",
    test: (brief) =>
      hasResolvedLogo(brief.assets.logo) || brief.assets.logo.status === "missing",
  },
];

const STAGE_ORDER: Array<{ stage: BusinessBriefStage; fields: BusinessBriefFieldId[] }> = [
  { stage: "identity", fields: ["businessName", "industry", "location", "businessDescription"] },
  { stage: "offer", fields: ["offerSummary", "services", "audience", "differentiators"] },
  { stage: "goal", fields: ["websiteGoals", "leadCapture"] },
  { stage: "style", fields: ["tone", "styleDirection", "brandColors"] },
  { stage: "content", fields: ["pages", "story", "testimonials", "socialProof", "contactInfo"] },
  { stage: "logo", fields: ["logo"] },
  { stage: "finalize", fields: [] },
];

export function getKnownFields(brief: BusinessBrief): BusinessBriefFieldId[] {
  return FIELD_REQUIREMENTS.filter((entry) => entry.test(brief)).map((entry) => entry.field);
}

export function getMissingFields(brief: BusinessBrief): BusinessBriefFieldId[] {
  return FIELD_REQUIREMENTS.filter((entry) => !entry.test(brief)).map((entry) => entry.field);
}

export function getReadinessScore(brief: BusinessBrief): number {
  const complete = getKnownFields(brief).length;
  return Math.max(0, Math.min(1, complete / FIELD_REQUIREMENTS.length));
}

export function inferStage(brief: BusinessBrief): BusinessBriefStage {
  const missing = new Set(getMissingFields(brief));
  for (const stage of STAGE_ORDER) {
    if (stage.fields.some((field) => missing.has(field))) {
      return stage.stage;
    }
  }
  return "ready";
}

export function shouldAllowGeneration(brief: BusinessBrief): boolean {
  const missing = new Set(getMissingFields(brief));
  const required: BusinessBriefFieldId[] = [
    "businessName",
    "industry",
    "businessDescription",
    "offerSummary",
    "audience",
    "websiteGoals",
    "styleDirection",
    "pages",
    "logo",
  ];

  return required.every((field) => !missing.has(field));
}

export function summarizeCompletion(brief: BusinessBrief): string {
  const missing = getMissingFields(brief);
  if (missing.length === 0) {
    return "The brief is complete and ready for generation.";
  }

  if (missing.length <= 2) {
    return `Almost ready. Still useful to confirm ${missing.join(" and ")}.`;
  }

  return `Collected the core business story. Still missing ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ", and a few finishing details" : ""}.`;
}
