import type { SiteBrief } from "@/types";
import type {
  BriefLogoAsset,
  BriefLogoStatus,
  BriefImageAsset,
  BusinessBrief,
  BusinessBriefFieldId,
  BusinessBriefStage,
} from "@/lib/ai/types";

export function slugifyText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toSentence(value: unknown, fallback = ""): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

export function cleanList(value: unknown, limit = 12): string[] {
  if (Array.isArray(value)) {
    return dedupeStrings(
      value
        .map((entry) => String(entry ?? "").replace(/\s+/g, " ").trim())
        .filter(Boolean),
      limit
    );
  }

  return dedupeStrings(
    String(value ?? "")
      .split(/\r?\n|,|•|·|;/)
      .map((entry) => entry.replace(/^[\s*-]+/, "").trim())
      .filter(Boolean),
    limit
  );
}

export function dedupeStrings(values: string[], limit = values.length): string[] {
  const seen = new Set<string>();
  const next: string[] = [];

  values.forEach((value) => {
    const cleaned = value.replace(/\s+/g, " ").trim();
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    next.push(cleaned);
  });

  return next.slice(0, limit);
}

export function normalizeHexColors(values: string[]): string[] {
  return dedupeStrings(
    values
      .map((value) => value.trim())
      .filter((value) => /^#[0-9a-f]{6}$/i.test(value))
      .map((value) => value.toLowerCase()),
    6
  );
}

export function cleanUrl(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(text)) return `https://${text}`;
  return text;
}

export function createEmptyLogoAsset(): BriefLogoAsset {
  return { status: "unknown" };
}

export function normalizeBriefImageAsset(asset: Partial<BriefImageAsset> & { url?: string }): BriefImageAsset | null {
  const url = cleanUrl(asset.url);
  if (!url) return null;
  return {
    assetId: toSentence(asset.assetId),
    url,
    name: toSentence(asset.name),
    storageBucket: asset.storageBucket ?? null,
    storagePath: asset.storagePath ?? null,
    altText: toSentence(asset.altText),
    notes: toSentence(asset.notes),
  };
}

export function normalizeBriefImageAssets(input: unknown, limit = 8): BriefImageAsset[] {
  if (!Array.isArray(input)) return [];
  const byUrl = new Map<string, BriefImageAsset>();
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const normalized = normalizeBriefImageAsset(item as Partial<BriefImageAsset> & { url?: string });
    if (normalized && !byUrl.has(normalized.url)) byUrl.set(normalized.url, normalized);
  }
  return Array.from(byUrl.values()).slice(0, limit);
}

export function createEmptyBusinessBrief(): BusinessBrief {
  return {
    version: 2,
    businessName: "",
    industry: "",
    location: "",
    businessDescription: "",
    offerSummary: "",
    audience: "",
    differentiators: [],
    websiteGoals: [],
    tone: "",
    styleDirection: [],
    brandColors: [],
    pages: [],
    services: [],
    testimonials: [],
    socialProof: [],
    story: "",
    references: [],
    contactInfo: {},
    brand: {
      hasExistingStyle: null,
      mood: [],
      references: [],
    },
    assets: {
      logo: createEmptyLogoAsset(),
      images: [],
    },
    intelligence: {
      stage: "identity",
      missingFields: [],
      knownFields: [],
      declinedFields: [],
      readinessScore: 0,
      recommendedNextPrompt: null,
      lastUpdatedAt: new Date().toISOString(),
    },
  };
}

export function mergeLogoAsset(current?: BriefLogoAsset, patch?: Partial<BriefLogoAsset> | null): BriefLogoAsset {
  const base = current ?? createEmptyLogoAsset();
  const nextStatus = normalizeLogoStatus(patch?.status ?? base.status);
  return {
    ...base,
    ...patch,
    status: nextStatus,
    fileUrl: cleanUrl(patch?.fileUrl ?? base.fileUrl),
    sourceUrl: cleanUrl(patch?.sourceUrl ?? base.sourceUrl),
    fileName: toSentence(patch?.fileName ?? base.fileName),
    altText: toSentence(patch?.altText ?? base.altText),
    notes: toSentence(patch?.notes ?? base.notes),
  };
}

export function normalizeLogoStatus(value: unknown): BriefLogoStatus {
  return value === "uploaded" || value === "url" || value === "missing" ? value : "unknown";
}

export function mergeBusinessBrief(
  current: Partial<BusinessBrief> | null | undefined,
  patch?: Partial<BusinessBrief> | null
): BusinessBrief {
  const base = withBusinessBriefDefaults(current);
  const next = patch ?? {};

  return {
    ...base,
    ...next,
    businessName: toSentence(next.businessName ?? base.businessName),
    industry: toSentence(next.industry ?? base.industry),
    location: toSentence(next.location ?? base.location),
    businessDescription: toSentence(next.businessDescription ?? base.businessDescription),
    offerSummary: toSentence(next.offerSummary ?? base.offerSummary),
    audience: toSentence(next.audience ?? base.audience),
    differentiators: cleanList(next.differentiators ?? base.differentiators),
    websiteGoals: cleanList(next.websiteGoals ?? base.websiteGoals),
    tone: toSentence(next.tone ?? base.tone),
    styleDirection: cleanList(next.styleDirection ?? base.styleDirection),
    brandColors: normalizeHexColors(cleanList(next.brandColors ?? base.brandColors, 6)),
    pages: cleanList(next.pages ?? base.pages, 8),
    services: cleanList(next.services ?? base.services),
    testimonials: cleanList(next.testimonials ?? base.testimonials, 8),
    socialProof: cleanList(next.socialProof ?? base.socialProof, 8),
    story: toSentence(next.story ?? base.story),
    references: dedupeStrings([
      ...cleanList(base.references),
      ...cleanList(base.brand?.references),
      ...cleanList(next.references),
      ...cleanList(next.brand?.references),
    ], 8),
    contactInfo: {
      email: toSentence(next.contactInfo?.email ?? base.contactInfo.email),
      phone: toSentence(next.contactInfo?.phone ?? base.contactInfo.phone),
      address: toSentence(next.contactInfo?.address ?? base.contactInfo.address),
      hours: toSentence(next.contactInfo?.hours ?? base.contactInfo.hours),
      cta: toSentence(next.contactInfo?.cta ?? base.contactInfo.cta),
      bookingEnabled: next.contactInfo?.bookingEnabled ?? base.contactInfo.bookingEnabled,
      leadCaptureEnabled: next.contactInfo?.leadCaptureEnabled ?? base.contactInfo.leadCaptureEnabled,
    },
    brand: {
      hasExistingStyle:
        typeof next.brand?.hasExistingStyle === "boolean"
          ? next.brand.hasExistingStyle
          : base.brand.hasExistingStyle,
      mood: dedupeStrings([
        ...cleanList(base.brand.mood),
        ...cleanList(next.brand?.mood),
      ], 8),
      references: dedupeStrings([
        ...cleanList(base.brand.references),
        ...cleanList(next.brand?.references),
      ], 8),
    },
    assets: {
      logo: mergeLogoAsset(base.assets.logo, next.assets?.logo),
      images: normalizeBriefImageAssets(next.assets?.images ?? base.assets.images),
    },
    intelligence: {
      stage: normalizeStage(next.intelligence?.stage ?? base.intelligence.stage),
      missingFields: cleanFieldIds(next.intelligence?.missingFields ?? base.intelligence.missingFields),
      knownFields: cleanFieldIds(next.intelligence?.knownFields ?? base.intelligence.knownFields),
      declinedFields: cleanFieldIds(
        next.intelligence?.declinedFields ?? base.intelligence.declinedFields
      ),
      readinessScore: clampNumber(next.intelligence?.readinessScore ?? base.intelligence.readinessScore, 0, 1),
      recommendedNextPrompt: toSentence(
        next.intelligence?.recommendedNextPrompt ?? base.intelligence.recommendedNextPrompt
      ),
      lastUpdatedAt: next.intelligence?.lastUpdatedAt ?? new Date().toISOString(),
    },
  };
}

export function withBusinessBriefDefaults(
  input: Partial<BusinessBrief> | null | undefined
): BusinessBrief {
  const base = createEmptyBusinessBrief();
  const raw = input ?? {};

  return {
    ...base,
    ...raw,
    businessName: toSentence(raw.businessName),
    industry: toSentence(raw.industry),
    location: toSentence(raw.location),
    businessDescription: toSentence(raw.businessDescription),
    offerSummary: toSentence(raw.offerSummary),
    audience: toSentence(raw.audience),
    differentiators: cleanList(raw.differentiators),
    websiteGoals: cleanList(raw.websiteGoals),
    tone: toSentence(raw.tone),
    styleDirection: cleanList(raw.styleDirection),
    brandColors: normalizeHexColors(cleanList(raw.brandColors, 6)),
    pages: cleanList(raw.pages, 8),
    services: cleanList(raw.services),
    testimonials: cleanList(raw.testimonials, 8),
    socialProof: cleanList(raw.socialProof, 8),
    story: toSentence(raw.story),
    references: cleanList(raw.references, 8),
    contactInfo: {
      email: toSentence(raw.contactInfo?.email),
      phone: toSentence(raw.contactInfo?.phone),
      address: toSentence(raw.contactInfo?.address),
      hours: toSentence(raw.contactInfo?.hours),
      cta: toSentence(raw.contactInfo?.cta),
      bookingEnabled: raw.contactInfo?.bookingEnabled,
      leadCaptureEnabled: raw.contactInfo?.leadCaptureEnabled,
    },
    brand: {
      hasExistingStyle:
        typeof raw.brand?.hasExistingStyle === "boolean"
          ? raw.brand.hasExistingStyle
          : null,
      mood: cleanList(raw.brand?.mood, 8),
      references: cleanList(raw.brand?.references, 8),
    },
    assets: {
      logo: mergeLogoAsset(base.assets.logo, raw.assets?.logo),
      images: normalizeBriefImageAssets(raw.assets?.images),
    },
    intelligence: {
      stage: normalizeStage(raw.intelligence?.stage),
      missingFields: cleanFieldIds(raw.intelligence?.missingFields),
      knownFields: cleanFieldIds(raw.intelligence?.knownFields),
      declinedFields: cleanFieldIds(raw.intelligence?.declinedFields),
      readinessScore: clampNumber(raw.intelligence?.readinessScore ?? 0, 0, 1),
      recommendedNextPrompt: toSentence(raw.intelligence?.recommendedNextPrompt),
      lastUpdatedAt: raw.intelligence?.lastUpdatedAt ?? base.intelligence.lastUpdatedAt,
    },
  };
}

export function normalizeStage(value: unknown): BusinessBriefStage {
  switch (value) {
    case "identity":
    case "offer":
    case "goal":
    case "style":
    case "content":
    case "logo":
    case "finalize":
    case "ready":
      return value;
    default:
      return "identity";
  }
}

export function cleanFieldIds(value: unknown): BusinessBriefFieldId[] {
  const valid = new Set<BusinessBriefFieldId>([
    "businessName",
    "industry",
    "location",
    "businessDescription",
    "offerSummary",
    "audience",
    "differentiators",
    "websiteGoals",
    "tone",
    "styleDirection",
    "brandColors",
    "pages",
    "services",
    "testimonials",
    "socialProof",
    "story",
    "contactInfo",
    "leadCapture",
    "logo",
  ]);

  return dedupeStrings(
    Array.isArray(value) ? value.map((entry) => String(entry ?? "")) : [],
    24
  ).filter((entry): entry is BusinessBriefFieldId => valid.has(entry as BusinessBriefFieldId));
}

export function clampNumber(value: unknown, min: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
}

export function hashText(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function pickByHash<T>(values: T[], seed: string, offset = 0): T {
  if (!values.length) {
    throw new Error("pickByHash requires at least one value");
  }
  const index = (hashText(`${seed}:${offset}`) + offset) % values.length;
  return values[index];
}

export function logoUrlFromAsset(logo?: BriefLogoAsset | null): string {
  if (!logo) return "";
  if (logo.status === "uploaded") return cleanUrl(logo.fileUrl);
  if (logo.status === "url") return cleanUrl(logo.sourceUrl || logo.fileUrl);
  return "";
}

export function hasResolvedLogo(logo?: BriefLogoAsset | null): boolean {
  return !!logoUrlFromAsset(logo);
}

export function summarizeList(items: string[], fallback = "Not provided"): string {
  return items.length ? items.join(", ") : fallback;
}

export function maybePush(target: string[], value: string) {
  const cleaned = toSentence(value);
  if (!cleaned) return;
  if (target.some((entry) => entry.toLowerCase() === cleaned.toLowerCase())) return;
  target.push(cleaned);
}

export function buildBusinessFingerprint(brief: BusinessBrief | SiteBrief): string {
  if ("businessName" in brief) {
    return [
      brief.businessName,
      brief.industry,
      brief.offerSummary,
      brief.audience,
      brief.pages.join("|"),
      brief.styleDirection.join("|"),
    ].join("::");
  }

  return [
    brief.siteName,
    brief.siteType,
    brief.description,
    brief.targetAudience,
    brief.pages.join("|"),
    brief.colorPreference,
  ].join("::");
}
