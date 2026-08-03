import type { SiteBrief, SmartBrief } from "@/types";
import type { BusinessBrief } from "@/lib/ai/types";
import {
  cleanList,
  cleanUrl,
  createEmptyBusinessBrief,
  hasResolvedLogo,
  logoUrlFromAsset,
  mergeBusinessBrief,
  summarizeList,
  toSentence,
} from "@/lib/ai/utils/normalize";
import { inferDefaultPages, inferOfferingsType } from "@/lib/ai/utils/sectionRules";
import { getKnownFields, getMissingFields, getReadinessScore, inferStage } from "@/lib/ai/utils/validation";

function inferLogoFromLegacy(brief: Partial<SiteBrief>) {
  const nestedLogo = brief.smartBrief?.logo;
  if (nestedLogo) {
    return nestedLogo;
  }

  const legacyLogoUrl = cleanUrl(brief.smartBrief?.logoUrl);
  if (legacyLogoUrl) {
    return {
      status: "uploaded" as const,
      fileUrl: legacyLogoUrl,
      fileName: "uploaded-logo",
    };
  }

  if (brief.hasLogo) {
    return {
      status: "unknown" as const,
    };
  }

  return {
    status: "unknown" as const,
  };
}

function inferBusinessDescription(brief: Partial<SiteBrief>) {
  return toSentence(brief.description);
}

function inferOfferSummary(brief: Partial<SiteBrief>) {
  const offerings = toSentence(brief.smartBrief?.offeringsText);
  if (offerings) return offerings;
  if (brief.features?.trim()) return brief.features.trim();
  return toSentence(brief.description);
}

export function siteBriefToBusinessBrief(brief: Partial<SiteBrief> | null | undefined): BusinessBrief {
  const source = brief ?? {};
  const merged = mergeBusinessBrief(createEmptyBusinessBrief(), {
    ...(source.businessBrief ?? {}),
    businessName: source.businessBrief?.businessName ?? source.siteName,
    industry:
      source.businessBrief?.industry ??
      source.smartBrief?.industry ??
      (typeof source.siteType === "string" ? source.siteType : ""),
    location:
      source.businessBrief?.location ??
      source.smartBrief?.contactDetails?.address ??
      "",
    businessDescription:
      source.businessBrief?.businessDescription ?? inferBusinessDescription(source),
    offerSummary:
      source.businessBrief?.offerSummary ?? inferOfferSummary(source),
    audience:
      source.businessBrief?.audience ??
      source.targetAudience ??
      "",
    differentiators:
      source.businessBrief?.differentiators ??
      cleanList(source.features),
    websiteGoals:
      source.businessBrief?.websiteGoals ??
      cleanList(source.features),
    tone:
      source.businessBrief?.tone ??
      (typeof source.tone === "string" ? source.tone : ""),
    styleDirection:
      source.businessBrief?.styleDirection ??
      cleanList([
        source.smartBrief?.stylePreference ?? "",
        source.colorPreference ?? "",
      ]),
    brandColors:
      source.businessBrief?.brandColors ?? source.colorPalette ?? [],
    pages:
      source.businessBrief?.pages ??
      source.pages ??
      [],
    services:
      source.businessBrief?.services ??
      cleanList(source.smartBrief?.offeringsText || source.features),
    testimonials:
      source.businessBrief?.testimonials ?? [],
    socialProof:
      source.businessBrief?.socialProof ?? [],
    story:
      source.businessBrief?.story ??
      toSentence(source.description),
    references:
      source.businessBrief?.references ??
      cleanList(source.competitors),
    contactInfo: {
      email: source.businessBrief?.contactInfo?.email ?? source.smartBrief?.contactDetails?.email,
      phone: source.businessBrief?.contactInfo?.phone ?? source.smartBrief?.contactDetails?.phone,
      address: source.businessBrief?.contactInfo?.address ?? source.smartBrief?.contactDetails?.address,
      hours: source.businessBrief?.contactInfo?.hours ?? source.smartBrief?.contactDetails?.hours,
      cta: source.businessBrief?.contactInfo?.cta,
      bookingEnabled: source.businessBrief?.contactInfo?.bookingEnabled,
      leadCaptureEnabled: source.businessBrief?.contactInfo?.leadCaptureEnabled,
    },
    brand: {
      hasExistingStyle:
        source.businessBrief?.brand?.hasExistingStyle ??
        Boolean(source.smartBrief?.stylePreference || source.colorPreference || source.hasLogo),
      mood:
        source.businessBrief?.brand?.mood ??
        cleanList([source.tone ?? "", source.smartBrief?.stylePreference ?? ""]),
      references:
        source.businessBrief?.brand?.references ??
        cleanList(source.competitors),
    },
    assets: {
      logo: source.businessBrief?.assets?.logo ?? inferLogoFromLegacy(source),
      images: source.businessBrief?.assets?.images ?? [],
    },
  });

  const pages = merged.pages.length ? merged.pages : inferDefaultPages(merged);
  const next = mergeBusinessBrief(merged, {
    pages,
    intelligence: {
      ...merged.intelligence,
      knownFields: getKnownFields(merged),
      missingFields: getMissingFields(merged),
      readinessScore: getReadinessScore(merged),
      stage: inferStage(merged),
    },
  });

  return next;
}

export function businessBriefToPartialSiteBrief(
  businessBrief: BusinessBrief,
  fallback?: Partial<SiteBrief>
): Partial<SiteBrief> {
  const logoUrl = logoUrlFromAsset(businessBrief.assets.logo);
  const styleSummary = summarizeList(businessBrief.styleDirection, businessBrief.tone || "distinctive");
  const storySummary = toSentence(
    [businessBrief.businessDescription, businessBrief.offerSummary]
      .filter(Boolean)
      .join(" ")
  );

  const smartBrief: SmartBrief = {
    ...(fallback?.smartBrief ?? {}),
    industry: businessBrief.industry,
    offeringsType: inferOfferingsType(businessBrief),
    offeringsText: businessBrief.services.length
      ? businessBrief.services.join("\n")
      : businessBrief.offerSummary,
    stylePreference: styleSummary,
    logoUrl,
    logo: {
      ...businessBrief.assets.logo,
      status: businessBrief.assets.logo.status,
      fileUrl: businessBrief.assets.logo.fileUrl,
      sourceUrl: businessBrief.assets.logo.sourceUrl,
    },
    contactDetails: {
      email: businessBrief.contactInfo.email || "",
      phone: businessBrief.contactInfo.phone || "",
      address: businessBrief.contactInfo.address || "",
      hours: businessBrief.contactInfo.hours || "",
    },
  };

  return {
    ...fallback,
    businessBrief,
    siteName: businessBrief.businessName,
    description: storySummary,
    siteType: businessBrief.industry,
    tone: businessBrief.tone || fallback?.tone || "Professional",
    pages: businessBrief.pages.length ? businessBrief.pages : inferDefaultPages(businessBrief),
    features: [
      ...businessBrief.websiteGoals,
      ...businessBrief.differentiators,
      ...businessBrief.socialProof,
    ]
      .filter(Boolean)
      .join(", "),
    targetAudience: businessBrief.audience || fallback?.targetAudience || "",
    competitors: businessBrief.references.join(", "),
    colorPreference:
      businessBrief.brandColors.length > 0
        ? businessBrief.brandColors.join(", ")
        : businessBrief.styleDirection.join(", "),
    colorPalette:
      businessBrief.brandColors.length > 0
        ? businessBrief.brandColors
        : fallback?.colorPalette,
    generatorMode: "conversation",
    smartBrief,
    hasLogo:
      hasResolvedLogo(businessBrief.assets.logo) ||
      businessBrief.assets.logo.status === "uploaded" ||
      businessBrief.assets.logo.status === "url",
  };
}

export function resolveLogoUrlFromSiteBrief(brief: SiteBrief | Partial<SiteBrief> | null | undefined): string {
  if (!brief) return "";
  if (brief.businessBrief?.assets?.logo) {
    const fromBusiness = logoUrlFromAsset(brief.businessBrief.assets.logo);
    if (fromBusiness) return fromBusiness;
  }

  if (brief.smartBrief?.logo) {
    const nested = logoUrlFromAsset(brief.smartBrief.logo);
    if (nested) return nested;
  }

  return cleanUrl(brief.smartBrief?.logoUrl);
}
