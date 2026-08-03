import { createHash } from "node:crypto";
import { defaultUserSettings } from "@/lib/settings";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { readUserSettings } from "@/lib/server/user-settings";
import type {
  AIContentDensity,
  AIDesignStyle,
  AIStructurePreference,
  ProjectPage,
  SiteBrief,
  UserSettings,
} from "@/types";

const ADAPTIVE_PROFILE_MIN_CONFIDENCE = 0.35;
const PROFILE_REBUILD_EVENT_LIMIT = 200;
const ADAPTIVE_POLICY_VERSION = "2026-04-19-phase3";
const ADAPTIVE_PROFILE_DECAY_HALF_LIFE_DAYS = 21;
const ADAPTIVE_PROFILE_RECENT_SIGNAL_WINDOW_DAYS = 45;
const ADAPTIVE_PROFILE_MIN_RECENT_POSITIVE_WEIGHT = 4;
const ADAPTIVE_PROFILE_MIN_UNIQUE_PROJECTS = 2;
const ADAPTIVE_PROFILE_SINGLE_PROJECT_ESCAPE_HATCH_WEIGHT = 7;
const ADAPTIVE_PROFILE_SINGLE_PROJECT_ESCAPE_HATCH_SAMPLES = 4;
const ADAPTIVE_FEEDBACK_DEDUPLICATION_WINDOW_MS = 5 * 60 * 1000;
const ADAPTIVE_PROFILE_REEVALUATE_AFTER_HOURS = 12;
const ADAPTIVE_GENERATION_BASELINE_LIMIT = 250;
const ADAPTIVE_DIAGNOSTIC_EVENT_LIMIT = 8;
const ADAPTIVE_DIAGNOSTIC_RUN_LIMIT = 8;

const DESIGN_STYLE_VALUES = [
  "ai-pick",
  "minimal",
  "luxury",
  "playful",
  "brutalist",
  "editorial",
  "futuristic",
  "organic",
  "neo-retro",
  "corporate",
  "artisan",
  "geometric",
  "dark-modern",
] satisfies AIDesignStyle[];

const STRUCTURE_VALUES = ["clean", "grid-heavy", "asymmetric"] satisfies AIStructurePreference[];
const CONTENT_DENSITY_VALUES = ["short", "balanced", "detailed"] satisfies AIContentDensity[];

export type AdaptiveLearningEventType =
  | "project_published"
  | "site_regenerated"
  | "section_regenerated"
  | "explicit_positive"
  | "explicit_negative"
  | "section_edited"
  | "section_deleted"
  | "section_reordered";

export type AdaptiveGenerationRunKind =
  | "blueprint"
  | "page"
  | "section";

export type AdaptiveFeedbackTone = "positive" | "negative";

export interface AdaptivePreferenceSnapshot {
  designStyle: AIDesignStyle;
  structurePreference: AIStructurePreference;
  contentDensity: AIContentDensity;
  creativityLevel: number;
  creativeMode: {
    surpriseMe: boolean;
    breakDesignRules: boolean;
  };
}

export interface AdaptiveGenerationOverrides {
  designStyle?: AIDesignStyle;
  structurePreference?: AIStructurePreference;
  contentDensity?: AIContentDensity;
  creativityLevel?: number;
  surpriseMe?: boolean;
  breakDesignRules?: boolean;
}

export interface AdaptiveGenerationProfile {
  userId: string;
  policyVersion: string;
  sampleCount: number;
  confidence: number;
  positiveSignalWeight: number;
  negativeSignalWeight: number;
  recentPositiveSignalWeight: number;
  uniqueProjectCount: number;
  stale: boolean;
  recommended: AdaptiveGenerationOverrides;
  scores: {
    designStyle: Partial<Record<AIDesignStyle, number>>;
    structurePreference: Partial<Record<AIStructurePreference, number>>;
    contentDensity: Partial<Record<AIContentDensity, number>>;
  };
  boldnessAverage: number;
  surpriseMeRate: number;
  breakDesignRulesRate: number;
  preferredSectionTypes: string[];
  lastSignalAt: string | null;
  lastEvaluatedAt: string | null;
  guardrails: {
    minConfidence: number;
    minRecentPositiveSignalWeight: number;
    minUniqueProjects: number;
    recentSignalWindowDays: number;
    decayHalfLifeDays: number;
    passesConfidence: boolean;
    passesRecency: boolean;
    passesDiversity: boolean;
    eligible: boolean;
  };
}

export interface AdaptiveGenerationState {
  settings: UserSettings | null;
  profile: AdaptiveGenerationProfile | null;
  adaptedBrief: SiteBrief;
  appliedOverrides: AdaptiveGenerationOverrides | null;
}

export interface AdaptiveSectionContentSnapshot {
  id: string;
  type: string;
  name: string;
  fingerprint: string | null;
  htmlLength: number;
}

export interface AdaptivePageContentSnapshot {
  pageId: string;
  pageName: string;
  slug: string;
  fingerprint: string | null;
  htmlLength: number;
  sections: AdaptiveSectionContentSnapshot[];
}

export interface AdaptivePublishAcceptanceSummary {
  comparedPageCount: number;
  baselinePageCount: number;
  baselineSectionCount: number;
  structurallyRetainedSectionCount: number;
  contentRetainedSectionCount: number;
  comparableContentSectionCount: number;
  addedSectionCount: number;
  pageCoverageRatio: number | null;
  structuralRetentionRatio: number | null;
  contentRetentionRatio: number | null;
  signalWeightMultiplier: number | null;
  acceptedSectionTypes: string[];
  changedSectionTypes: string[];
  addedSectionTypes: string[];
  baselineRunIds: string[];
}

export interface AdaptiveLearningDiagnosticEvent {
  id: string;
  eventType: AdaptiveLearningEventType;
  createdAt: string;
  projectId: string | null;
  generationRunId: string | null;
  signalWeight: number;
  signalWeightMultiplier: number;
  pageName: string | null;
  sectionName: string | null;
  sectionType: string | null;
  acceptedSectionTypes: string[];
  changedSectionTypes: string[];
  addedSectionTypes: string[];
  structuralRetentionRatio: number | null;
  contentRetentionRatio: number | null;
  summary: string;
}

export interface AdaptiveLearningDiagnosticRun {
  id: string;
  kind: AdaptiveGenerationRunKind;
  createdAt: string;
  projectId: string | null;
  adaptiveEnabled: boolean;
  title: string;
  detail: string;
  pageId: string | null;
  pageName: string | null;
  sectionId: string | null;
  sectionName: string | null;
  sectionType: string | null;
  htmlLength: number | null;
  sectionCount: number | null;
  adaptiveOverrideCount: number;
  adaptiveProfileEligible: boolean;
  adaptiveProfileConfidence: number | null;
}

export interface AdaptiveLatestPublishEvaluation {
  createdAt: string;
  projectId: string | null;
  signalWeight: number;
  signalWeightMultiplier: number;
  comparedPageCount: number | null;
  baselinePageCount: number | null;
  baselineSectionCount: number | null;
  structurallyRetainedSectionCount: number | null;
  contentRetainedSectionCount: number | null;
  comparableContentSectionCount: number | null;
  addedSectionCount: number | null;
  pageCoverageRatio: number | null;
  structuralRetentionRatio: number | null;
  contentRetentionRatio: number | null;
  acceptedSectionTypes: string[];
  changedSectionTypes: string[];
  addedSectionTypes: string[];
  comparedRunIds: string[];
}

export interface AdaptiveLearningDiagnostics {
  latestPublishEvaluation: AdaptiveLatestPublishEvaluation | null;
  recentEvents: AdaptiveLearningDiagnosticEvent[];
  recentGenerationRuns: AdaptiveLearningDiagnosticRun[];
}

export interface AdaptiveFeedbackPromptState {
  projectId: string | null;
  latestRunId: string | null;
  latestRunKind: AdaptiveGenerationRunKind | null;
  latestRunCreatedAt: string | null;
  hasRecordedFeedback: boolean;
  shouldPrompt: boolean;
}

interface AdaptiveLearningProfileRow {
  user_id: string;
  profile_json: Partial<AdaptiveGenerationProfile> | null;
  sample_count: number | null;
  confidence: number | null;
  created_at: string;
  updated_at: string;
}

interface AdaptiveLearningEventRow {
  id: string;
  user_id: string;
  project_id: string | null;
  generation_run_id: string | null;
  event_type: AdaptiveLearningEventType;
  preference_snapshot_json: AdaptivePreferenceSnapshot | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

interface AdaptiveGenerationRunRow {
  id: string;
  user_id: string;
  project_id: string | null;
  kind: AdaptiveGenerationRunKind;
  adaptive_enabled?: boolean | null;
  preference_snapshot_json: AdaptivePreferenceSnapshot | null;
  summary_json: Record<string, unknown> | null;
  created_at: string;
}

interface AdaptiveLearningFeedbackRow {
  id: string;
  generation_run_id: string | null;
  project_id: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

interface AdaptivePageBaselineSnapshot {
  runId: string;
  createdAt: string;
  snapshot: AdaptivePageContentSnapshot;
}

interface AdaptiveSectionBaselineSnapshot {
  runId: string;
  createdAt: string;
  pageId: string | null;
  snapshot: AdaptiveSectionContentSnapshot;
}

interface AdaptiveProjectGenerationBaselines {
  pageSnapshots: Map<string, AdaptivePageBaselineSnapshot>;
  sectionSnapshots: Map<string, AdaptiveSectionBaselineSnapshot>;
}

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

export interface AdaptiveGenerationContext {
  userId?: string | null;
  projectId?: string | null;
  settings?: UserSettings | null;
  admin?: boolean;
}

export interface RecordAdaptiveGenerationRunInput {
  userId: string;
  projectId?: string | null;
  kind: AdaptiveGenerationRunKind;
  brief: SiteBrief;
  summary: Record<string, unknown>;
  preferenceSnapshot?: AdaptivePreferenceSnapshot | null;
  appliedOverrides?: AdaptiveGenerationOverrides | null;
  profile?: AdaptiveGenerationProfile | null;
  adaptiveEnabled: boolean;
}

export interface RecordAdaptiveLearningEventInput {
  userId: string;
  projectId?: string | null;
  generationRunId?: string | null;
  eventType: AdaptiveLearningEventType;
  brief?: SiteBrief;
  preferenceSnapshot?: AdaptivePreferenceSnapshot | null;
  metadata?: Record<string, unknown> | null;
}

export interface SubmitAdaptiveFeedbackInput {
  userId: string;
  tone: AdaptiveFeedbackTone;
  projectId?: string | null;
  brief?: SiteBrief;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AdaptiveGenerationRunReference {
  id: string;
  projectId: string | null;
  kind: AdaptiveGenerationRunKind;
  preferenceSnapshot: AdaptivePreferenceSnapshot | null;
  summary: Record<string, unknown> | null;
  createdAt: string;
}

export type AdaptiveProfileState = "paused" | "empty" | "warming" | "active";

export interface AdaptiveProfileStatus {
  state: AdaptiveProfileState;
  reason: string;
  globalKillSwitchEnabled: boolean;
}

function getLearningClient(options?: { admin?: boolean }) {
  return options?.admin ? getSupabaseAdminClient() : getSupabaseServerClient();
}

function isLearningSchemaMissing(error: unknown): boolean {
  const maybe = (error ?? {}) as SupabaseErrorLike;
  return (
    maybe.code === "42P01" ||
    maybe.code === "42703" ||
    maybe.code === "PGRST202" ||
    maybe.code === "PGRST205" ||
    maybe.message?.includes("ai_learning_profiles") === true ||
    maybe.message?.includes("ai_learning_events") === true ||
    maybe.message?.includes("ai_generation_runs") === true
  );
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function roundMetric(value: number, digits = 3) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeStringList(
  value: unknown,
  limit = 24,
  options?: { dedupe?: boolean }
): string[] {
  if (!Array.isArray(value)) return [];

  const result: string[] = [];
  const seen = options?.dedupe ? new Set<string>() : null;

  for (const entry of value) {
    const normalized = normalizeString(entry)?.toLowerCase();
    if (!normalized) continue;
    if (seen?.has(normalized)) continue;
    seen?.add(normalized);
    result.push(normalized);
    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

function normalizeHtmlForFingerprint(html: string | null | undefined): string {
  return String(html ?? "")
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<\/?(html|head|body)\b[^>]*>/gi, "")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();
}

function fingerprintHtmlContent(html: string | null | undefined): string | null {
  const normalized = normalizeHtmlForFingerprint(html);
  if (!normalized) return null;
  return createHash("sha256").update(normalized).digest("hex");
}

function extractSectionHtmlById(pageHtml: string, sectionId: string): string | null {
  const marker = `data-sz-section-id="${sectionId}"`;
  const markerIdx = pageHtml.indexOf(marker);
  if (markerIdx === -1) return null;

  const start = pageHtml.lastIndexOf("<", markerIdx);
  if (start === -1) return null;

  const tagMatch = pageHtml.slice(start + 1).match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
  if (!tagMatch) return null;

  const tag = tagMatch[1];
  const openEnd = pageHtml.indexOf(">", markerIdx);
  if (openEnd === -1) return null;

  const openRe = new RegExp(`<${tag}\\b`, "gi");
  const closeRe = new RegExp(`</${tag}\\s*>`, "gi");
  let depth = 1;
  let pos = openEnd + 1;

  while (depth > 0) {
    openRe.lastIndex = pos;
    closeRe.lastIndex = pos;
    const openMatch = openRe.exec(pageHtml);
    const closeMatch = closeRe.exec(pageHtml);

    if (!closeMatch) {
      return null;
    }

    if (openMatch && openMatch.index < closeMatch.index) {
      depth += 1;
      pos = openMatch.index + openMatch[0].length;
    } else {
      depth -= 1;
      pos = closeMatch.index + closeMatch[0].length;
    }
  }

  return pageHtml.slice(start, pos);
}

function normalizeAdaptiveSectionContentSnapshot(
  input: unknown
): AdaptiveSectionContentSnapshot | null {
  const raw = typeof input === "object" && input ? (input as Partial<AdaptiveSectionContentSnapshot>) : null;
  const id = normalizeString(raw?.id);
  if (!id) return null;

  return {
    id,
    type: normalizeString(raw?.type)?.toLowerCase() ?? "section",
    name: normalizeString(raw?.name) ?? "Section",
    fingerprint: normalizeString(raw?.fingerprint),
    htmlLength: Math.max(0, Math.round(normalizeNumber(raw?.htmlLength) ?? 0)),
  };
}

function normalizeAdaptivePageContentSnapshot(
  input: unknown
): AdaptivePageContentSnapshot | null {
  const raw = typeof input === "object" && input ? (input as Partial<AdaptivePageContentSnapshot>) : null;
  const pageId = normalizeString(raw?.pageId);
  if (!pageId) return null;

  const seenSections = new Set<string>();
  const sections = Array.isArray(raw?.sections)
    ? raw.sections
        .map((section) => normalizeAdaptiveSectionContentSnapshot(section))
        .filter((section): section is AdaptiveSectionContentSnapshot => Boolean(section))
        .filter((section) => {
          if (seenSections.has(section.id)) {
            return false;
          }
          seenSections.add(section.id);
          return true;
        })
    : [];

  return {
    pageId,
    pageName: normalizeString(raw?.pageName) ?? "Page",
    slug: normalizeString(raw?.slug) ?? "",
    fingerprint: normalizeString(raw?.fingerprint),
    htmlLength: Math.max(0, Math.round(normalizeNumber(raw?.htmlLength) ?? 0)),
    sections,
  };
}

export function buildAdaptiveSectionContentSnapshot(
  section: Pick<ProjectPage["sections"][number], "id" | "type" | "name">,
  html: string | null | undefined
): AdaptiveSectionContentSnapshot | null {
  const id = normalizeString(section.id);
  if (!id) return null;

  const normalizedHtml = normalizeHtmlForFingerprint(html);
  return {
    id,
    type: normalizeString(section.type)?.toLowerCase() ?? "section",
    name: normalizeString(section.name) ?? "Section",
    fingerprint: fingerprintHtmlContent(normalizedHtml),
    htmlLength: normalizedHtml.length,
  };
}

export function buildAdaptivePageContentSnapshot(
  page: Pick<ProjectPage, "id" | "name" | "slug" | "html" | "sections">
): AdaptivePageContentSnapshot {
  const seenSections = new Set<string>();
  const sections = Array.isArray(page.sections)
    ? page.sections
        .map((section) =>
          buildAdaptiveSectionContentSnapshot(
            section,
            section.id ? extractSectionHtmlById(page.html ?? "", section.id) : null
          )
        )
        .filter((section): section is AdaptiveSectionContentSnapshot => Boolean(section))
        .filter((section) => {
          if (seenSections.has(section.id)) {
            return false;
          }
          seenSections.add(section.id);
          return true;
        })
    : [];

  const normalizedHtml = normalizeHtmlForFingerprint(page.html);
  return {
    pageId: normalizeString(page.id) ?? "page",
    pageName: normalizeString(page.name) ?? "Page",
    slug: normalizeString(page.slug) ?? "",
    fingerprint: fingerprintHtmlContent(normalizedHtml),
    htmlLength: normalizedHtml.length,
    sections,
  };
}

function readPageSnapshotFromSummary(summary: Record<string, unknown> | null): AdaptivePageContentSnapshot | null {
  return normalizeAdaptivePageContentSnapshot(summary?.pageSnapshot);
}

function readSectionSnapshotFromSummary(
  summary: Record<string, unknown> | null
): { pageId: string | null; snapshot: AdaptiveSectionContentSnapshot } | null {
  const nested = typeof summary?.sectionSnapshot === "object" && summary.sectionSnapshot
    ? (summary.sectionSnapshot as Record<string, unknown>)
    : null;
  const snapshot = normalizeAdaptiveSectionContentSnapshot(nested);

  if (!snapshot) {
    return null;
  }

  return {
    pageId: normalizeString(nested?.pageId ?? summary?.pageId),
    snapshot,
  };
}

function normalizePreferenceSnapshot(
  input?: Partial<AdaptivePreferenceSnapshot> | null
): AdaptivePreferenceSnapshot | null {
  if (!input) return null;
  const designStyle = DESIGN_STYLE_VALUES.includes(input.designStyle as AIDesignStyle)
    ? (input.designStyle as AIDesignStyle)
    : null;
  const structurePreference = STRUCTURE_VALUES.includes(input.structurePreference as AIStructurePreference)
    ? (input.structurePreference as AIStructurePreference)
    : null;
  const contentDensity = CONTENT_DENSITY_VALUES.includes(input.contentDensity as AIContentDensity)
    ? (input.contentDensity as AIContentDensity)
    : null;

  if (!designStyle || !structurePreference || !contentDensity) {
    return null;
  }

  return {
    designStyle,
    structurePreference,
    contentDensity,
    creativityLevel: clampNumber(
      typeof input.creativityLevel === "number" ? input.creativityLevel : defaultUserSettings.creativeMode.boldness,
      0,
      100
    ),
    creativeMode: {
      surpriseMe: normalizeBoolean(
        input.creativeMode?.surpriseMe,
        defaultUserSettings.creativeMode.surpriseMe
      ),
      breakDesignRules: normalizeBoolean(
        input.creativeMode?.breakDesignRules,
        defaultUserSettings.creativeMode.breakDesignRules
      ),
    },
  };
}

export function snapshotAdaptivePreferencesFromBrief(brief: SiteBrief): AdaptivePreferenceSnapshot {
  return {
    designStyle:
      DESIGN_STYLE_VALUES.includes(brief.generationDesignStyle as AIDesignStyle)
        ? (brief.generationDesignStyle as AIDesignStyle)
        : defaultUserSettings.ai.designStyle,
    structurePreference:
      STRUCTURE_VALUES.includes(brief.generationStructurePreference as AIStructurePreference)
        ? (brief.generationStructurePreference as AIStructurePreference)
        : defaultUserSettings.ai.structurePreference,
    contentDensity:
      CONTENT_DENSITY_VALUES.includes(brief.generationContentDensity as AIContentDensity)
        ? (brief.generationContentDensity as AIContentDensity)
        : defaultUserSettings.ai.contentDensity,
    creativityLevel: clampNumber(
      typeof brief.generationCreativityLevel === "number"
        ? brief.generationCreativityLevel
        : defaultUserSettings.creativeMode.boldness,
      0,
      100
    ),
    creativeMode: {
      surpriseMe: brief.creativeMode?.surpriseMe ?? defaultUserSettings.creativeMode.surpriseMe,
      breakDesignRules:
        brief.creativeMode?.breakDesignRules ?? defaultUserSettings.creativeMode.breakDesignRules,
    },
  };
}

function emptyAdaptiveProfile(userId: string): AdaptiveGenerationProfile {
  return {
    userId,
    policyVersion: ADAPTIVE_POLICY_VERSION,
    sampleCount: 0,
    confidence: 0,
    positiveSignalWeight: 0,
    negativeSignalWeight: 0,
    recentPositiveSignalWeight: 0,
    uniqueProjectCount: 0,
    stale: false,
    recommended: {},
    scores: {
      designStyle: {},
      structurePreference: {},
      contentDensity: {},
    },
    boldnessAverage: defaultUserSettings.creativeMode.boldness,
    surpriseMeRate: 0,
    breakDesignRulesRate: 0,
    preferredSectionTypes: [],
    lastSignalAt: null,
    lastEvaluatedAt: null,
    guardrails: {
      minConfidence: ADAPTIVE_PROFILE_MIN_CONFIDENCE,
      minRecentPositiveSignalWeight: ADAPTIVE_PROFILE_MIN_RECENT_POSITIVE_WEIGHT,
      minUniqueProjects: ADAPTIVE_PROFILE_MIN_UNIQUE_PROJECTS,
      recentSignalWindowDays: ADAPTIVE_PROFILE_RECENT_SIGNAL_WINDOW_DAYS,
      decayHalfLifeDays: ADAPTIVE_PROFILE_DECAY_HALF_LIFE_DAYS,
      passesConfidence: false,
      passesRecency: false,
      passesDiversity: false,
      eligible: false,
    },
  };
}

function normalizeAdaptiveProfile(
  userId: string,
  input?: Partial<AdaptiveGenerationProfile> | null,
  sampleCount?: number | null,
  confidence?: number | null
): AdaptiveGenerationProfile {
  const base = emptyAdaptiveProfile(userId);
  return {
    ...base,
    ...input,
    userId,
    policyVersion:
      typeof input?.policyVersion === "string" && input.policyVersion.trim()
        ? input.policyVersion
        : base.policyVersion,
    sampleCount:
      typeof sampleCount === "number"
        ? sampleCount
        : typeof input?.sampleCount === "number"
        ? input.sampleCount
        : base.sampleCount,
    confidence: clampNumber(
      typeof confidence === "number"
        ? confidence
        : typeof input?.confidence === "number"
        ? input.confidence
        : base.confidence,
      0,
      1
    ),
    positiveSignalWeight:
      typeof input?.positiveSignalWeight === "number" ? input.positiveSignalWeight : base.positiveSignalWeight,
    negativeSignalWeight:
      typeof input?.negativeSignalWeight === "number" ? input.negativeSignalWeight : base.negativeSignalWeight,
    recentPositiveSignalWeight:
      typeof input?.recentPositiveSignalWeight === "number"
        ? input.recentPositiveSignalWeight
        : base.recentPositiveSignalWeight,
    uniqueProjectCount:
      typeof input?.uniqueProjectCount === "number"
        ? Math.max(0, Math.round(input.uniqueProjectCount))
        : base.uniqueProjectCount,
    stale: typeof input?.stale === "boolean" ? input.stale : base.stale,
    recommended: {
      ...(input?.recommended ?? {}),
    },
    scores: {
      designStyle:
        input?.scores && typeof input.scores.designStyle === "object" && input.scores.designStyle
          ? input.scores.designStyle
          : base.scores.designStyle,
      structurePreference:
        input?.scores && typeof input.scores.structurePreference === "object" && input.scores.structurePreference
          ? input.scores.structurePreference
          : base.scores.structurePreference,
      contentDensity:
        input?.scores && typeof input.scores.contentDensity === "object" && input.scores.contentDensity
          ? input.scores.contentDensity
          : base.scores.contentDensity,
    },
    boldnessAverage:
      typeof input?.boldnessAverage === "number" ? clampNumber(input.boldnessAverage, 0, 100) : base.boldnessAverage,
    surpriseMeRate:
      typeof input?.surpriseMeRate === "number" ? clampNumber(input.surpriseMeRate, 0, 1) : base.surpriseMeRate,
    breakDesignRulesRate:
      typeof input?.breakDesignRulesRate === "number"
        ? clampNumber(input.breakDesignRulesRate, 0, 1)
        : base.breakDesignRulesRate,
    preferredSectionTypes: Array.isArray(input?.preferredSectionTypes)
      ? input!.preferredSectionTypes.map((value) => String(value).trim()).filter(Boolean).slice(0, 8)
      : base.preferredSectionTypes,
    lastSignalAt:
      typeof input?.lastSignalAt === "string" && input.lastSignalAt.trim()
        ? input.lastSignalAt
        : base.lastSignalAt,
    lastEvaluatedAt:
      typeof input?.lastEvaluatedAt === "string" && input.lastEvaluatedAt.trim()
        ? input.lastEvaluatedAt
        : base.lastEvaluatedAt,
    guardrails: {
      ...base.guardrails,
      ...(input?.guardrails ?? {}),
      minConfidence:
        typeof input?.guardrails?.minConfidence === "number"
          ? input.guardrails.minConfidence
          : base.guardrails.minConfidence,
      minRecentPositiveSignalWeight:
        typeof input?.guardrails?.minRecentPositiveSignalWeight === "number"
          ? input.guardrails.minRecentPositiveSignalWeight
          : base.guardrails.minRecentPositiveSignalWeight,
      minUniqueProjects:
        typeof input?.guardrails?.minUniqueProjects === "number"
          ? Math.max(0, Math.round(input.guardrails.minUniqueProjects))
          : base.guardrails.minUniqueProjects,
      recentSignalWindowDays:
        typeof input?.guardrails?.recentSignalWindowDays === "number"
          ? Math.max(1, Math.round(input.guardrails.recentSignalWindowDays))
          : base.guardrails.recentSignalWindowDays,
      decayHalfLifeDays:
        typeof input?.guardrails?.decayHalfLifeDays === "number"
          ? Math.max(1, Math.round(input.guardrails.decayHalfLifeDays))
          : base.guardrails.decayHalfLifeDays,
      passesConfidence:
        typeof input?.guardrails?.passesConfidence === "boolean"
          ? input.guardrails.passesConfidence
          : base.guardrails.passesConfidence,
      passesRecency:
        typeof input?.guardrails?.passesRecency === "boolean"
          ? input.guardrails.passesRecency
          : base.guardrails.passesRecency,
      passesDiversity:
        typeof input?.guardrails?.passesDiversity === "boolean"
          ? input.guardrails.passesDiversity
          : base.guardrails.passesDiversity,
      eligible:
        typeof input?.guardrails?.eligible === "boolean"
          ? input.guardrails.eligible
          : base.guardrails.eligible,
    },
  };
}

function parseAdaptiveBooleanEnv(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function isAdaptiveGenerationGloballyDisabled(): boolean {
  return parseAdaptiveBooleanEnv(process.env.SITEZY_DISABLE_ADAPTIVE_GENERATION);
}

function getEventAgeDays(createdAt: string, nowMs = Date.now()): number | null {
  const createdAtMs = Date.parse(createdAt);
  if (!Number.isFinite(createdAtMs)) return null;
  return Math.max(0, (nowMs - createdAtMs) / (1000 * 60 * 60 * 24));
}

function getEventDecayFactor(createdAt: string, nowMs = Date.now()): number {
  const ageDays = getEventAgeDays(createdAt, nowMs);
  if (ageDays == null) return 1;
  return Math.pow(0.5, ageDays / ADAPTIVE_PROFILE_DECAY_HALF_LIFE_DAYS);
}

function shouldRebuildAdaptiveProfile(profile: AdaptiveGenerationProfile, nowMs = Date.now()): boolean {
  if (profile.policyVersion !== ADAPTIVE_POLICY_VERSION) {
    return true;
  }

  if (!profile.lastEvaluatedAt) {
    return true;
  }

  const lastEvaluatedMs = Date.parse(profile.lastEvaluatedAt);
  if (!Number.isFinite(lastEvaluatedMs)) {
    return true;
  }

  const hoursSinceLastEvaluation = (nowMs - lastEvaluatedMs) / (1000 * 60 * 60);
  return hoursSinceLastEvaluation >= ADAPTIVE_PROFILE_REEVALUATE_AFTER_HOURS;
}

export function getAdaptiveProfileStatus(
  profile: AdaptiveGenerationProfile,
  options?: { adaptiveGenerationEnabled?: boolean }
): AdaptiveProfileStatus {
  const globalKillSwitchEnabled = isAdaptiveGenerationGloballyDisabled();
  if (globalKillSwitchEnabled) {
    return {
      state: "paused",
      reason: "Adaptive generation is paused globally by environment guardrail.",
      globalKillSwitchEnabled,
    };
  }

  if (options?.adaptiveGenerationEnabled === false) {
    return {
      state: "paused",
      reason: "Adaptive generation is turned off in your AI settings.",
      globalKillSwitchEnabled,
    };
  }

  if (profile.sampleCount === 0) {
    return {
      state: "empty",
      reason: "No learning signals yet. Publish or react to generated work to start warming the profile.",
      globalKillSwitchEnabled,
    };
  }

  if (profile.guardrails.eligible) {
    return {
      state: "active",
      reason: "Guardrails passed. Sitezy can safely bias defaulted briefs using your learned preferences.",
      globalKillSwitchEnabled,
    };
  }

  if (profile.stale) {
    return {
      state: "warming",
      reason: "The profile has gone stale, so adaptive nudges are paused until newer accepted work arrives.",
      globalKillSwitchEnabled,
    };
  }

  const missing: string[] = [];
  if (!profile.guardrails.passesConfidence) missing.push("confidence");
  if (!profile.guardrails.passesDiversity) missing.push("project diversity");
  if (!profile.guardrails.passesRecency) missing.push("recent positive signal strength");

  return {
    state: "warming",
    reason:
      missing.length > 0
        ? `Still warming up: waiting on stronger ${missing.join(", ")}.`
        : "Adaptive generation is warming up.",
    globalKillSwitchEnabled,
  };
}

function canApplyAdaptiveProfile(
  profile: AdaptiveGenerationProfile,
  options?: { adaptiveGenerationEnabled?: boolean }
): boolean {
  return getAdaptiveProfileStatus(profile, options).state === "active";
}

function getEventWeightMultiplier(metadata: Record<string, unknown> | null | undefined): number {
  const multiplier = normalizeNumber(metadata?.signalWeightMultiplier);
  if (multiplier == null) return 1;
  return clampNumber(multiplier, 0, 4);
}

function getEventBaseWeight(eventType: AdaptiveLearningEventType): number {
  switch (eventType) {
    case "project_published":
    case "explicit_positive":
      return 3;
    case "site_regenerated":
      return -2;
    case "section_regenerated":
      return -1;
    case "explicit_negative":
      return -3;
    default:
      return 0;
  }
}

function getEventWeight(
  eventType: AdaptiveLearningEventType,
  metadata?: Record<string, unknown> | null
): number {
  return roundMetric(getEventBaseWeight(eventType) * getEventWeightMultiplier(metadata), 4);
}

function formatAdaptiveDiagnosticEventSummary(
  eventType: AdaptiveLearningEventType,
  metadata: Record<string, unknown>
): string {
  switch (eventType) {
    case "project_published": {
      const retained = normalizeNumber(metadata.structurallyRetainedSectionCount);
      const baseline = normalizeNumber(
        metadata.generatedSectionBaselineCount ?? metadata.baselineSectionCount
      );
      const exact = normalizeNumber(metadata.contentRetainedSectionCount);
      const comparable = normalizeNumber(metadata.comparableContentSectionCount);
      const added = normalizeNumber(metadata.addedSectionCount);

      if (retained != null && baseline != null && baseline > 0) {
        const parts = [`Kept ${retained}/${baseline} generated sections structurally.`];
        if (exact != null && comparable != null && comparable > 0) {
          parts.push(`${exact}/${comparable} still matched exactly.`);
        }
        if (added != null && added > 0) {
          parts.push(`${added} sections were added after generation.`);
        }
        return parts.join(" ");
      }

      return "Published work counted as a positive adaptive signal.";
    }
    case "site_regenerated": {
      const previousPageCount = normalizeNumber(metadata.previousPageCount);
      return previousPageCount != null && previousPageCount > 0
        ? `Restarted full-site generation after ${previousPageCount} existing page${previousPageCount === 1 ? "" : "s"}.`
        : "Restarted full-site generation.";
    }
    case "section_regenerated": {
      const sectionName =
        normalizeString(metadata.sectionName) ??
        normalizeString(metadata.sectionType) ??
        "a section";
      const pageName = normalizeString(metadata.pageName);
      return `Regenerated ${sectionName}${pageName ? ` on ${pageName}` : ""}.`;
    }
    case "explicit_positive": {
      const source = normalizeString(metadata.source);
      const runKind = normalizeString(metadata.latestRunKind);
      if (source) {
        return `Marked the result as on target from ${source}.`;
      }
      return `Marked a recent ${runKind ?? "generation"} as helpful.`;
    }
    case "explicit_negative": {
      const source = normalizeString(metadata.source);
      const runKind = normalizeString(metadata.latestRunKind);
      if (source) {
        return `Marked the result as off target from ${source}.`;
      }
      return `Marked a recent ${runKind ?? "generation"} as off target.`;
    }
    default:
      return "Adaptive learning recorded a new signal.";
  }
}

function buildAdaptiveLearningDiagnosticEvent(
  row: Pick<
    AdaptiveLearningEventRow,
    "id" | "event_type" | "project_id" | "generation_run_id" | "metadata_json" | "created_at"
  >
): AdaptiveLearningDiagnosticEvent {
  const metadata = row.metadata_json ?? {};
  const signalWeightMultiplier = getEventWeightMultiplier(metadata);
  return {
    id: row.id,
    eventType: row.event_type,
    createdAt: row.created_at,
    projectId: row.project_id,
    generationRunId: row.generation_run_id,
    signalWeight: getEventWeight(row.event_type, metadata),
    signalWeightMultiplier,
    pageName: normalizeString(metadata.pageName),
    sectionName: normalizeString(metadata.sectionName),
    sectionType: normalizeString(metadata.sectionType)?.toLowerCase() ?? null,
    acceptedSectionTypes: normalizeStringList(metadata.acceptedSectionTypes, 8, { dedupe: true }),
    changedSectionTypes: normalizeStringList(metadata.changedSectionTypes, 8, { dedupe: true }),
    addedSectionTypes: normalizeStringList(metadata.addedSectionTypes, 8, { dedupe: true }),
    structuralRetentionRatio: normalizeNumber(metadata.structuralRetentionRatio),
    contentRetentionRatio: normalizeNumber(metadata.contentRetentionRatio),
    summary: formatAdaptiveDiagnosticEventSummary(row.event_type, metadata),
  };
}

function buildAdaptiveLatestPublishEvaluation(
  row: Pick<AdaptiveLearningEventRow, "event_type" | "project_id" | "metadata_json" | "created_at">
): AdaptiveLatestPublishEvaluation | null {
  if (row.event_type !== "project_published") {
    return null;
  }

  const metadata = row.metadata_json ?? {};
  return {
    createdAt: row.created_at,
    projectId: row.project_id,
    signalWeight: getEventWeight(row.event_type, metadata),
    signalWeightMultiplier: getEventWeightMultiplier(metadata),
    comparedPageCount: normalizeNumber(metadata.comparedPageCount),
    baselinePageCount: normalizeNumber(
      metadata.generatedPageBaselineCount ?? metadata.baselinePageCount
    ),
    baselineSectionCount: normalizeNumber(
      metadata.generatedSectionBaselineCount ?? metadata.baselineSectionCount
    ),
    structurallyRetainedSectionCount: normalizeNumber(metadata.structurallyRetainedSectionCount),
    contentRetainedSectionCount: normalizeNumber(metadata.contentRetainedSectionCount),
    comparableContentSectionCount: normalizeNumber(metadata.comparableContentSectionCount),
    addedSectionCount: normalizeNumber(metadata.addedSectionCount),
    pageCoverageRatio: normalizeNumber(metadata.pageCoverageRatio),
    structuralRetentionRatio: normalizeNumber(metadata.structuralRetentionRatio),
    contentRetentionRatio: normalizeNumber(metadata.contentRetentionRatio),
    acceptedSectionTypes: normalizeStringList(metadata.acceptedSectionTypes, 10, { dedupe: true }),
    changedSectionTypes: normalizeStringList(metadata.changedSectionTypes, 10, { dedupe: true }),
    addedSectionTypes: normalizeStringList(metadata.addedSectionTypes, 10, { dedupe: true }),
    comparedRunIds: normalizeStringList(metadata.comparedRunIds, 12, { dedupe: true }),
  };
}

function buildAdaptiveLearningDiagnosticRun(
  row: Pick<
    AdaptiveGenerationRunRow,
    "id" | "project_id" | "kind" | "adaptive_enabled" | "summary_json" | "created_at"
  >
): AdaptiveLearningDiagnosticRun | null {
  const summary = row.summary_json ?? {};
  const adaptiveOverrideCount = Math.max(
    0,
    Math.round(normalizeNumber(summary.adaptiveOverrideCount) ?? 0)
  );
  const adaptiveProfileConfidence = normalizeNumber(summary.adaptiveProfileConfidence);
  const adaptiveProfileEligible = Boolean(summary.adaptiveProfileEligible);

  if (row.kind === "page") {
    const snapshot = readPageSnapshotFromSummary(summary);
    if (!snapshot) return null;

    return {
      id: row.id,
      kind: row.kind,
      createdAt: row.created_at,
      projectId: row.project_id,
      adaptiveEnabled: row.adaptive_enabled !== false,
      title: `Page baseline: ${snapshot.pageName}`,
      detail: `${snapshot.sections.length} sections · ${snapshot.htmlLength.toLocaleString()} chars`,
      pageId: snapshot.pageId,
      pageName: snapshot.pageName,
      sectionId: null,
      sectionName: null,
      sectionType: null,
      htmlLength: snapshot.htmlLength,
      sectionCount: snapshot.sections.length,
      adaptiveOverrideCount,
      adaptiveProfileEligible,
      adaptiveProfileConfidence,
    };
  }

  if (row.kind === "section") {
    const resolved = readSectionSnapshotFromSummary(summary);
    if (!resolved) return null;
    const pageName = normalizeString(summary.pageName);

    return {
      id: row.id,
      kind: row.kind,
      createdAt: row.created_at,
      projectId: row.project_id,
      adaptiveEnabled: row.adaptive_enabled !== false,
      title: `Section baseline: ${resolved.snapshot.name}`,
      detail: [
        formatSectionLabelForDiagnostics(resolved.snapshot.type),
        pageName ? `on ${pageName}` : null,
        `${resolved.snapshot.htmlLength.toLocaleString()} chars`,
      ]
        .filter(Boolean)
        .join(" · "),
      pageId: resolved.pageId,
      pageName,
      sectionId: resolved.snapshot.id,
      sectionName: resolved.snapshot.name,
      sectionType: resolved.snapshot.type,
      htmlLength: resolved.snapshot.htmlLength,
      sectionCount: 1,
      adaptiveOverrideCount,
      adaptiveProfileEligible,
      adaptiveProfileConfidence,
    };
  }

  return null;
}

function formatSectionLabelForDiagnostics(value: string | null | undefined): string {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) return "Section";

  return normalized
    .split(/[-_\s]+/)
    .map((segment) => (segment ? segment[0].toUpperCase() + segment.slice(1) : ""))
    .join(" ")
    .trim();
}

function addToScore<T extends string>(store: Partial<Record<T, number>>, key: T, weight: number) {
  const next = (store[key] ?? 0) + weight;
  store[key] = Math.round(next * 100) / 100;
}

function pickRecommendedValue<T extends string>(
  values: readonly T[],
  scores: Partial<Record<T, number>>
): T | undefined {
  const ranked = values
    .map((value) => ({ value, score: scores[value] ?? 0 }))
    .sort((left, right) => right.score - left.score);

  const top = ranked[0];
  const runnerUp = ranked[1];
  if (!top || top.score < 2) {
    return undefined;
  }

  const margin = top.score - (runnerUp?.score ?? 0);
  if (margin < 0.75 && top.score < 3) {
    return undefined;
  }

  return top.value;
}

function fingerprintBrief(brief: SiteBrief): string {
  const payload = JSON.stringify({
    siteName: brief.siteName,
    description: brief.description,
    siteType: brief.siteType,
    tone: brief.tone,
    pages: brief.pages,
    features: brief.features,
    targetAudience: brief.targetAudience ?? "",
    generationDesignStyle: brief.generationDesignStyle ?? "",
    generationStructurePreference: brief.generationStructurePreference ?? "",
    generationContentDensity: brief.generationContentDensity ?? "",
    generationCreativityLevel: brief.generationCreativityLevel ?? null,
  });
  return createHash("sha256").update(payload).digest("hex");
}

function shouldOverrideStringPreference<T extends string>(
  current: T | undefined,
  defaultValue: T
) {
  return !current || current === defaultValue || current === "ai-pick";
}

async function readAdaptiveProjectGenerationBaselines(
  userId: string,
  projectId: string,
  options?: { admin?: boolean }
): Promise<AdaptiveProjectGenerationBaselines> {
  const client = getLearningClient(options);
  const empty: AdaptiveProjectGenerationBaselines = {
    pageSnapshots: new Map(),
    sectionSnapshots: new Map(),
  };

  const normalizedProjectId = normalizeString(projectId);
  if (!normalizedProjectId) {
    return empty;
  }

  const { data, error } = await client
    .from("ai_generation_runs")
    .select("id, kind, summary_json, created_at")
    .eq("user_id", userId)
    .eq("project_id", normalizedProjectId)
    .order("created_at", { ascending: false })
    .limit(ADAPTIVE_GENERATION_BASELINE_LIMIT);

  if (error) {
    if (isLearningSchemaMissing(error)) {
      return empty;
    }
    return empty;
  }

  const pageSnapshots = new Map<string, AdaptivePageBaselineSnapshot>();
  const sectionSnapshots = new Map<string, AdaptiveSectionBaselineSnapshot>();

  for (const row of (data ?? []) as Array<Pick<AdaptiveGenerationRunRow, "id" | "kind" | "summary_json" | "created_at">>) {
    if (row.kind === "page") {
      const snapshot = readPageSnapshotFromSummary(row.summary_json ?? null);
      if (snapshot && !pageSnapshots.has(snapshot.pageId)) {
        pageSnapshots.set(snapshot.pageId, {
          runId: row.id,
          createdAt: row.created_at,
          snapshot,
        });
      }
      continue;
    }

    if (row.kind !== "section") {
      continue;
    }

    const resolved = readSectionSnapshotFromSummary(row.summary_json ?? null);
    if (!resolved || sectionSnapshots.has(resolved.snapshot.id)) {
      continue;
    }

    sectionSnapshots.set(resolved.snapshot.id, {
      runId: row.id,
      createdAt: row.created_at,
      pageId: resolved.pageId,
      snapshot: resolved.snapshot,
    });
  }

  return { pageSnapshots, sectionSnapshots };
}

export async function summarizeAdaptivePublishAcceptance(
  input: {
    userId: string;
    projectId: string;
    pages: Pick<ProjectPage, "id" | "name" | "slug" | "html" | "sections">[];
  },
  options?: { admin?: boolean }
): Promise<AdaptivePublishAcceptanceSummary | null> {
  const baselines = await readAdaptiveProjectGenerationBaselines(input.userId, input.projectId, options);
  if (baselines.pageSnapshots.size === 0 && baselines.sectionSnapshots.size === 0) {
    return null;
  }

  let comparedPageCount = 0;
  let baselinePageCount = 0;
  let baselineSectionCount = 0;
  let structurallyRetainedSectionCount = 0;
  let contentRetainedSectionCount = 0;
  let comparableContentSectionCount = 0;
  let addedSectionCount = 0;

  const acceptedSectionTypes: string[] = [];
  const changedSectionTypes: string[] = [];
  const addedSectionTypes: string[] = [];
  const baselineRunIds = new Set<string>();

  for (const page of input.pages) {
    const currentSnapshot = buildAdaptivePageContentSnapshot(page);
    const pageBaseline = baselines.pageSnapshots.get(currentSnapshot.pageId) ?? null;
    const effectiveBaselines = new Map<string, AdaptiveSectionBaselineSnapshot>();

    if (pageBaseline) {
      baselinePageCount += 1;
      baselineRunIds.add(pageBaseline.runId);
      for (const section of pageBaseline.snapshot.sections) {
        effectiveBaselines.set(section.id, {
          runId: pageBaseline.runId,
          createdAt: pageBaseline.createdAt,
          pageId: pageBaseline.snapshot.pageId,
          snapshot: section,
        });
      }
    }

    for (const [sectionId, sectionBaseline] of baselines.sectionSnapshots.entries()) {
      const samePage = !sectionBaseline.pageId || sectionBaseline.pageId === currentSnapshot.pageId;
      if (!samePage) continue;

      const currentSectionExists = currentSnapshot.sections.some((section) => section.id === sectionId);
      if (!currentSectionExists && !effectiveBaselines.has(sectionId)) {
        continue;
      }

      const existing = effectiveBaselines.get(sectionId);
      const incomingCreatedAt = Date.parse(sectionBaseline.createdAt);
      const existingCreatedAt = existing ? Date.parse(existing.createdAt) : Number.NEGATIVE_INFINITY;
      const shouldReplace =
        !existing ||
        (!Number.isNaN(incomingCreatedAt) &&
          (Number.isNaN(existingCreatedAt) || incomingCreatedAt >= existingCreatedAt));

      if (shouldReplace) {
        effectiveBaselines.set(sectionId, sectionBaseline);
      }
    }

    if (effectiveBaselines.size === 0) {
      continue;
    }

    comparedPageCount += 1;
    baselineSectionCount += effectiveBaselines.size;

    const currentSectionsById = new Map(currentSnapshot.sections.map((section) => [section.id, section]));
    for (const [sectionId, sectionBaseline] of effectiveBaselines.entries()) {
      baselineRunIds.add(sectionBaseline.runId);
      const currentSection = currentSectionsById.get(sectionId);
      if (!currentSection || currentSection.type !== sectionBaseline.snapshot.type) {
        changedSectionTypes.push(sectionBaseline.snapshot.type);
        continue;
      }

      structurallyRetainedSectionCount += 1;
      acceptedSectionTypes.push(currentSection.type);

      if (sectionBaseline.snapshot.fingerprint) {
        comparableContentSectionCount += 1;
        if (currentSection.fingerprint === sectionBaseline.snapshot.fingerprint) {
          contentRetainedSectionCount += 1;
        } else {
          changedSectionTypes.push(currentSection.type);
        }
      }
    }

    for (const currentSection of currentSnapshot.sections) {
      if (effectiveBaselines.has(currentSection.id)) continue;
      addedSectionCount += 1;
      addedSectionTypes.push(currentSection.type);
    }
  }

  if (comparedPageCount === 0 || baselineSectionCount === 0) {
    return null;
  }

  const totalPages = input.pages.length;
  const pageCoverageRatio =
    totalPages > 0 ? roundMetric(comparedPageCount / totalPages) : null;
  const structuralRetentionRatio = roundMetric(
    structurallyRetainedSectionCount / baselineSectionCount
  );
  const contentRetentionRatio =
    comparableContentSectionCount > 0
      ? roundMetric(contentRetainedSectionCount / comparableContentSectionCount)
      : null;
  const signalWeightMultiplier = roundMetric(
    clampNumber(
      0.05 +
        structuralRetentionRatio * 0.65 +
        (contentRetentionRatio ?? structuralRetentionRatio) * 0.2 +
        (pageCoverageRatio ?? 0) * 0.1,
      0.15,
      1.1
    )
  );

  return {
    comparedPageCount,
    baselinePageCount,
    baselineSectionCount,
    structurallyRetainedSectionCount,
    contentRetainedSectionCount,
    comparableContentSectionCount,
    addedSectionCount,
    pageCoverageRatio,
    structuralRetentionRatio,
    contentRetentionRatio,
    signalWeightMultiplier,
    acceptedSectionTypes: normalizeStringList(acceptedSectionTypes, 16),
    changedSectionTypes: normalizeStringList(changedSectionTypes, 16),
    addedSectionTypes: normalizeStringList(addedSectionTypes, 16),
    baselineRunIds: [...baselineRunIds],
  };
}

export async function readAdaptiveLearningDiagnostics(
  userId: string,
  options?: { admin?: boolean }
): Promise<AdaptiveLearningDiagnostics> {
  const client = getLearningClient(options);
  const emptyDiagnostics: AdaptiveLearningDiagnostics = {
    latestPublishEvaluation: null,
    recentEvents: [],
    recentGenerationRuns: [],
  };

  try {
    const [
      { data: eventRows, error: eventsError },
      { data: runRows, error: runsError },
    ] = await Promise.all([
      client
        .from("ai_learning_events")
        .select("id, project_id, generation_run_id, event_type, metadata_json, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(ADAPTIVE_DIAGNOSTIC_EVENT_LIMIT),
      client
        .from("ai_generation_runs")
        .select("id, project_id, kind, adaptive_enabled, summary_json, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(ADAPTIVE_DIAGNOSTIC_RUN_LIMIT),
    ]);

    if (eventsError || runsError) {
      if (isLearningSchemaMissing(eventsError ?? runsError)) {
        return emptyDiagnostics;
      }
      return emptyDiagnostics;
    }

    const recentEvents = ((eventRows ?? []) as Array<
      Pick<
        AdaptiveLearningEventRow,
        "id" | "project_id" | "generation_run_id" | "event_type" | "metadata_json" | "created_at"
      >
    >).map(buildAdaptiveLearningDiagnosticEvent);

    const latestPublishEvaluation =
      ((eventRows ?? []) as Array<
        Pick<AdaptiveLearningEventRow, "event_type" | "project_id" | "metadata_json" | "created_at">
      >)
        .map(buildAdaptiveLatestPublishEvaluation)
        .find((value): value is AdaptiveLatestPublishEvaluation => Boolean(value)) ?? null;

    const recentGenerationRuns = ((runRows ?? []) as Array<
      Pick<
        AdaptiveGenerationRunRow,
        "id" | "project_id" | "kind" | "adaptive_enabled" | "summary_json" | "created_at"
      >
    >)
      .map(buildAdaptiveLearningDiagnosticRun)
      .filter((value): value is AdaptiveLearningDiagnosticRun => Boolean(value));

    return {
      latestPublishEvaluation,
      recentEvents,
      recentGenerationRuns,
    };
  } catch {
    return emptyDiagnostics;
  }
}

export async function readLatestAdaptiveGenerationRun(
  userId: string,
  options?: { admin?: boolean; projectId?: string | null }
): Promise<AdaptiveGenerationRunReference | null> {
  const client = getLearningClient(options);
  let query = client
    .from("ai_generation_runs")
    .select("id, user_id, project_id, kind, preference_snapshot_json, summary_json, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (options?.projectId?.trim()) {
    query = query.eq("project_id", options.projectId.trim());
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    if (isLearningSchemaMissing(error)) {
      return null;
    }
    return null;
  }

  if (!data) {
    return null;
  }

  const row = data as AdaptiveGenerationRunRow;
  return {
    id: row.id,
    projectId: row.project_id,
    kind: row.kind,
    preferenceSnapshot: normalizePreferenceSnapshot(row.preference_snapshot_json),
    summary: row.summary_json ?? null,
    createdAt: row.created_at,
  };
}

async function hasExplicitFeedbackForGenerationRun(
  input: {
    userId: string;
    projectId: string;
    generationRunId: string;
  },
  options?: { admin?: boolean }
): Promise<boolean> {
  const client = getLearningClient(options);
  const { data, error } = await client
    .from("ai_learning_events")
    .select("id, generation_run_id, project_id, metadata_json, created_at")
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .in("event_type", ["explicit_positive", "explicit_negative"])
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    if (isLearningSchemaMissing(error)) {
      return false;
    }
    return false;
  }

  return ((data ?? []) as AdaptiveLearningFeedbackRow[]).some((row) => {
    if (normalizeString(row.generation_run_id) === input.generationRunId) {
      return true;
    }

    const metadataRunId =
      typeof row.metadata_json?.latestRunId === "string"
        ? normalizeString(row.metadata_json.latestRunId)
        : null;

    return metadataRunId === input.generationRunId;
  });
}

export async function readAdaptiveFeedbackPromptState(
  userId: string,
  projectId: string,
  options?: { admin?: boolean }
): Promise<AdaptiveFeedbackPromptState> {
  const normalizedProjectId = normalizeString(projectId);
  if (!normalizedProjectId) {
    return {
      projectId: null,
      latestRunId: null,
      latestRunKind: null,
      latestRunCreatedAt: null,
      hasRecordedFeedback: false,
      shouldPrompt: false,
    };
  }

  const latestRun = await readLatestAdaptiveGenerationRun(userId, {
    admin: options?.admin,
    projectId: normalizedProjectId,
  });

  if (!latestRun) {
    return {
      projectId: normalizedProjectId,
      latestRunId: null,
      latestRunKind: null,
      latestRunCreatedAt: null,
      hasRecordedFeedback: false,
      shouldPrompt: false,
    };
  }

  const hasRecordedFeedback = await hasExplicitFeedbackForGenerationRun(
    {
      userId,
      projectId: normalizedProjectId,
      generationRunId: latestRun.id,
    },
    options
  );

  return {
    projectId: normalizedProjectId,
    latestRunId: latestRun.id,
    latestRunKind: latestRun.kind,
    latestRunCreatedAt: latestRun.createdAt,
    hasRecordedFeedback,
    shouldPrompt: !hasRecordedFeedback,
  };
}

export async function readAdaptiveLearningProfile(
  userId: string,
  options?: { admin?: boolean }
): Promise<AdaptiveGenerationProfile> {
  const client = getLearningClient(options);
  const { data, error } = await client
    .from("ai_learning_profiles")
    .select("user_id, profile_json, sample_count, confidence")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isLearningSchemaMissing(error)) {
      return emptyAdaptiveProfile(userId);
    }
    return emptyAdaptiveProfile(userId);
  }

  if (!data) {
    return emptyAdaptiveProfile(userId);
  }

  const row = data as AdaptiveLearningProfileRow;
  const profile = normalizeAdaptiveProfile(row.user_id, row.profile_json, row.sample_count, row.confidence);
  if (shouldRebuildAdaptiveProfile(profile)) {
    return rebuildAdaptiveLearningProfile(userId, options);
  }
  return profile;
}

export async function rebuildAdaptiveLearningProfile(
  userId: string,
  options?: { admin?: boolean }
): Promise<AdaptiveGenerationProfile> {
  const client = getLearningClient(options);
  const nowMs = Date.now();
  const { data, error } = await client
    .from("ai_learning_events")
    .select("id, user_id, project_id, generation_run_id, event_type, preference_snapshot_json, metadata_json, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(PROFILE_REBUILD_EVENT_LIMIT);

  if (error) {
    if (isLearningSchemaMissing(error)) {
      return emptyAdaptiveProfile(userId);
    }
    return emptyAdaptiveProfile(userId);
  }

  const designStyleScores: Partial<Record<AIDesignStyle, number>> = {};
  const structureScores: Partial<Record<AIStructurePreference, number>> = {};
  const contentDensityScores: Partial<Record<AIContentDensity, number>> = {};
  const sectionWeights = new Map<string, number>();
  const positiveProjects = new Set<string>();

  let sampleCount = 0;
  let positiveSignalWeight = 0;
  let negativeSignalWeight = 0;
  let recentPositiveSignalWeight = 0;
  let boldnessWeightedTotal = 0;
  let boldnessWeight = 0;
  let surpriseMePositive = 0;
  let surpriseMeWeight = 0;
  let breakRulesPositive = 0;
  let breakRulesWeight = 0;
  let lastSignalAt: string | null = null;

  for (const row of (data ?? []) as AdaptiveLearningEventRow[]) {
    const preferenceSnapshot = normalizePreferenceSnapshot(row.preference_snapshot_json);
    const metadata = row.metadata_json ?? {};
    const decayFactor = getEventDecayFactor(row.created_at, nowMs);
    const weight = getEventWeight(row.event_type, metadata) * decayFactor;
    const ageDays = getEventAgeDays(row.created_at, nowMs);
    if (!preferenceSnapshot || weight === 0) {
      continue;
    }

    sampleCount += 1;
    lastSignalAt = lastSignalAt ?? row.created_at;

    addToScore(designStyleScores, preferenceSnapshot.designStyle, weight);
    addToScore(structureScores, preferenceSnapshot.structurePreference, weight);
    addToScore(contentDensityScores, preferenceSnapshot.contentDensity, weight);

    if (weight > 0) {
      positiveSignalWeight += weight;
      if (ageDays == null || ageDays <= ADAPTIVE_PROFILE_RECENT_SIGNAL_WINDOW_DAYS) {
        recentPositiveSignalWeight += weight;
      }
      boldnessWeightedTotal += preferenceSnapshot.creativityLevel * weight;
      boldnessWeight += weight;
      surpriseMePositive += preferenceSnapshot.creativeMode.surpriseMe ? weight : 0;
      surpriseMeWeight += weight;
      breakRulesPositive += preferenceSnapshot.creativeMode.breakDesignRules ? weight : 0;
      breakRulesWeight += weight;

      if (row.project_id) {
        positiveProjects.add(row.project_id);
      }
      const sectionTypes = Array.isArray(metadata.acceptedSectionTypes)
        ? metadata.acceptedSectionTypes
        : Array.isArray(metadata.sectionTypes)
        ? metadata.sectionTypes
        : typeof metadata.sectionType === "string"
        ? [metadata.sectionType]
        : [];
      for (const sectionType of sectionTypes) {
        const key = String(sectionType).trim().toLowerCase();
        if (!key) continue;
        sectionWeights.set(key, (sectionWeights.get(key) ?? 0) + weight);
      }
    } else {
      negativeSignalWeight += Math.abs(weight);
    }
  }

  const uniqueProjectCount = positiveProjects.size;
  const lastSignalAgeDays =
    typeof lastSignalAt === "string" ? getEventAgeDays(lastSignalAt, nowMs) : null;
  const stale =
    lastSignalAgeDays != null && lastSignalAgeDays > ADAPTIVE_PROFILE_RECENT_SIGNAL_WINDOW_DAYS;
  const confidence = clampNumber(
    positiveSignalWeight === 0
      ? 0
      : (positiveSignalWeight - negativeSignalWeight * 0.35) / 8,
    0,
    1
  );

  const profile = normalizeAdaptiveProfile(
    userId,
    {
      policyVersion: ADAPTIVE_POLICY_VERSION,
      sampleCount,
      confidence,
      positiveSignalWeight,
      negativeSignalWeight,
      recentPositiveSignalWeight,
      uniqueProjectCount,
      stale,
      scores: {
        designStyle: designStyleScores,
        structurePreference: structureScores,
        contentDensity: contentDensityScores,
      },
      boldnessAverage:
        boldnessWeight > 0
          ? clampNumber(Math.round(boldnessWeightedTotal / boldnessWeight), 0, 100)
          : defaultUserSettings.creativeMode.boldness,
      surpriseMeRate:
        surpriseMeWeight > 0 ? clampNumber(surpriseMePositive / surpriseMeWeight, 0, 1) : 0,
      breakDesignRulesRate:
        breakRulesWeight > 0 ? clampNumber(breakRulesPositive / breakRulesWeight, 0, 1) : 0,
      preferredSectionTypes: [...sectionWeights.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 8)
        .map(([sectionType]) => sectionType),
      lastSignalAt,
      lastEvaluatedAt: new Date(nowMs).toISOString(),
      recommended: {},
    },
    sampleCount,
    confidence
  );

  const passesConfidence = confidence >= ADAPTIVE_PROFILE_MIN_CONFIDENCE;
  const passesRecency =
    recentPositiveSignalWeight >= ADAPTIVE_PROFILE_MIN_RECENT_POSITIVE_WEIGHT && !stale;
  const passesDiversity =
    uniqueProjectCount >= ADAPTIVE_PROFILE_MIN_UNIQUE_PROJECTS ||
    (uniqueProjectCount >= 1 &&
      sampleCount >= ADAPTIVE_PROFILE_SINGLE_PROJECT_ESCAPE_HATCH_SAMPLES &&
      recentPositiveSignalWeight >= ADAPTIVE_PROFILE_SINGLE_PROJECT_ESCAPE_HATCH_WEIGHT);
  const eligible = passesConfidence && passesRecency && passesDiversity;

  profile.guardrails = {
    minConfidence: ADAPTIVE_PROFILE_MIN_CONFIDENCE,
    minRecentPositiveSignalWeight: ADAPTIVE_PROFILE_MIN_RECENT_POSITIVE_WEIGHT,
    minUniqueProjects: ADAPTIVE_PROFILE_MIN_UNIQUE_PROJECTS,
    recentSignalWindowDays: ADAPTIVE_PROFILE_RECENT_SIGNAL_WINDOW_DAYS,
    decayHalfLifeDays: ADAPTIVE_PROFILE_DECAY_HALF_LIFE_DAYS,
    passesConfidence,
    passesRecency,
    passesDiversity,
    eligible,
  };

  profile.recommended = {
    designStyle: pickRecommendedValue(DESIGN_STYLE_VALUES, designStyleScores),
    structurePreference: pickRecommendedValue(STRUCTURE_VALUES, structureScores),
    contentDensity: pickRecommendedValue(CONTENT_DENSITY_VALUES, contentDensityScores),
    creativityLevel: boldnessWeight >= 3 ? profile.boldnessAverage : undefined,
    surpriseMe:
      surpriseMeWeight >= 3
        ? profile.surpriseMeRate >= 0.65
          ? true
          : profile.surpriseMeRate <= 0.35
          ? false
          : undefined
        : undefined,
    breakDesignRules:
      breakRulesWeight >= 3
        ? profile.breakDesignRulesRate >= 0.65
          ? true
          : profile.breakDesignRulesRate <= 0.35
          ? false
          : undefined
        : undefined,
  };

  try {
    await client
      .from("ai_learning_profiles")
      .upsert(
        {
          user_id: userId,
          profile_json: profile,
          sample_count: profile.sampleCount,
          confidence: profile.confidence,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
  } catch {}

  return profile;
}

export async function recordAdaptiveGenerationRun(
  input: RecordAdaptiveGenerationRunInput,
  options?: { admin?: boolean }
): Promise<string | null> {
  const client = getLearningClient(options);

  try {
    const runId = crypto.randomUUID();
    const now = new Date().toISOString();
    const preferenceSnapshot = normalizePreferenceSnapshot(
      input.preferenceSnapshot ?? snapshotAdaptivePreferencesFromBrief(input.brief)
    );

    const { error } = await client.from("ai_generation_runs").insert({
      id: runId,
      user_id: input.userId,
      project_id: input.projectId ?? null,
      kind: input.kind,
      brief_fingerprint: fingerprintBrief(input.brief),
      model: process.env.SITEZY_SPARK_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      adaptive_enabled: input.adaptiveEnabled,
      preference_snapshot_json: preferenceSnapshot,
      applied_overrides_json: input.appliedOverrides ?? {},
      profile_snapshot_json: input.profile ?? null,
      summary_json: {
        ...input.summary,
        adaptivePolicyVersion: ADAPTIVE_POLICY_VERSION,
        adaptiveProfileConfidence: input.profile?.confidence ?? null,
        adaptiveProfileEligible: input.profile?.guardrails.eligible ?? false,
        adaptiveOverrideCount: Object.keys(input.appliedOverrides ?? {}).length,
      },
      created_at: now,
      updated_at: now,
    });

    if (error) {
      if (isLearningSchemaMissing(error)) {
        return null;
      }
      return null;
    }

    return runId;
  } catch {
    return null;
  }
}

export async function recordAdaptiveLearningEvent(
  input: RecordAdaptiveLearningEventInput,
  options?: { admin?: boolean }
): Promise<void> {
  const client = getLearningClient(options);
  const preferenceSnapshot = normalizePreferenceSnapshot(
    input.preferenceSnapshot ?? (input.brief ? snapshotAdaptivePreferencesFromBrief(input.brief) : null)
  );

  if (!preferenceSnapshot) {
    return;
  }

  try {
    const now = new Date().toISOString();
    const { error } = await client.from("ai_learning_events").insert({
      id: crypto.randomUUID(),
      user_id: input.userId,
      project_id: input.projectId ?? null,
      generation_run_id: input.generationRunId ?? null,
      event_type: input.eventType,
      preference_snapshot_json: preferenceSnapshot,
      metadata_json: input.metadata ?? {},
      created_at: now,
      updated_at: now,
    });

    if (error) {
      if (isLearningSchemaMissing(error)) {
        return;
      }
      return;
    }

    await rebuildAdaptiveLearningProfile(input.userId, options);
  } catch {}
}

async function hasRecentExplicitFeedback(
  input: {
    userId: string;
    eventType: AdaptiveLearningEventType;
    generationRunId?: string | null;
    projectId?: string | null;
    source?: string | null;
  },
  options?: { admin?: boolean }
): Promise<boolean> {
  const client = getLearningClient(options);
  let query = client
    .from("ai_learning_events")
    .select("id, generation_run_id, project_id, metadata_json, created_at")
    .eq("user_id", input.userId)
    .eq("event_type", input.eventType)
    .order("created_at", { ascending: false })
    .limit(10);

  if (input.generationRunId) {
    query = query.eq("generation_run_id", input.generationRunId);
  } else if (input.projectId) {
    query = query.eq("project_id", input.projectId);
  }

  const { data, error } = await query;
  if (error) {
    if (isLearningSchemaMissing(error)) {
      return false;
    }
    return false;
  }

  const nowMs = Date.now();
  const source = input.source?.trim() || null;

  return ((data ?? []) as AdaptiveLearningFeedbackRow[]).some((row) => {
    const createdAtMs = Date.parse(row.created_at);
    if (!Number.isFinite(createdAtMs)) return false;
    if (nowMs - createdAtMs > ADAPTIVE_FEEDBACK_DEDUPLICATION_WINDOW_MS) {
      return false;
    }
    if (source) {
      const rowSource =
        typeof row.metadata_json?.source === "string" ? row.metadata_json.source.trim() : null;
      if (rowSource !== source) {
        return false;
      }
    }
    return true;
  });
}

export async function submitAdaptiveFeedback(
  input: SubmitAdaptiveFeedbackInput,
  options?: { admin?: boolean }
): Promise<AdaptiveGenerationProfile> {
  const latestRun = await readLatestAdaptiveGenerationRun(input.userId, {
    admin: options?.admin,
    projectId: input.projectId ?? null,
  });

  const eventType: AdaptiveLearningEventType =
    input.tone === "positive" ? "explicit_positive" : "explicit_negative";

  const hasDuplicate = await hasRecentExplicitFeedback(
    {
      userId: input.userId,
      eventType,
      generationRunId: latestRun?.id ?? null,
      projectId: input.projectId ?? latestRun?.projectId ?? null,
      source: input.source ?? null,
    },
    options
  );

  if (hasDuplicate) {
    return readAdaptiveLearningProfile(input.userId, options);
  }

  await recordAdaptiveLearningEvent(
    {
      userId: input.userId,
      projectId: input.projectId ?? latestRun?.projectId ?? null,
      generationRunId: latestRun?.id ?? null,
      eventType,
      brief: input.brief,
      preferenceSnapshot: latestRun?.preferenceSnapshot ?? null,
      metadata: {
        ...(input.metadata ?? {}),
        source: input.source?.trim() || null,
        latestRunId: latestRun?.id ?? null,
        latestRunKind: latestRun?.kind ?? null,
        latestRunAt: latestRun?.createdAt ?? null,
      },
    },
    options
  );

  return readAdaptiveLearningProfile(input.userId, options);
}

export async function resetAdaptiveLearningProfile(
  userId: string,
  options?: { admin?: boolean }
): Promise<AdaptiveGenerationProfile> {
  const client = getLearningClient(options);

  try {
    const deleteEvents = await client
      .from("ai_learning_events")
      .delete()
      .eq("user_id", userId);
    if (deleteEvents.error && !isLearningSchemaMissing(deleteEvents.error)) {
      return emptyAdaptiveProfile(userId);
    }

    const deleteRuns = await client
      .from("ai_generation_runs")
      .delete()
      .eq("user_id", userId);
    if (deleteRuns.error && !isLearningSchemaMissing(deleteRuns.error)) {
      return emptyAdaptiveProfile(userId);
    }

    const deleteProfiles = await client
      .from("ai_learning_profiles")
      .delete()
      .eq("user_id", userId);
    if (deleteProfiles.error && !isLearningSchemaMissing(deleteProfiles.error)) {
      return emptyAdaptiveProfile(userId);
    }
  } catch {
    return emptyAdaptiveProfile(userId);
  }

  return emptyAdaptiveProfile(userId);
}

export async function resolveAdaptiveGenerationState(
  brief: SiteBrief,
  context?: AdaptiveGenerationContext
): Promise<AdaptiveGenerationState> {
  const userId = context?.userId?.trim();
  if (!userId) {
    return {
      settings: null,
      profile: null,
      adaptedBrief: brief,
      appliedOverrides: null,
    };
  }

  try {
    const settings =
      context?.settings ?? (await readUserSettings(userId, { admin: context?.admin }));

    if (!settings.ai.adaptiveGenerationEnabled || isAdaptiveGenerationGloballyDisabled()) {
      return {
        settings,
        profile: null,
        adaptedBrief: brief,
        appliedOverrides: null,
      };
    }

    const profile = await readAdaptiveLearningProfile(userId, { admin: context?.admin });
    if (!canApplyAdaptiveProfile(profile, { adaptiveGenerationEnabled: settings.ai.adaptiveGenerationEnabled })) {
      return {
        settings,
        profile,
        adaptedBrief: brief,
        appliedOverrides: null,
      };
    }

    const appliedOverrides: AdaptiveGenerationOverrides = {};
    const nextBrief: SiteBrief = { ...brief };

    if (
      profile.recommended.designStyle &&
      shouldOverrideStringPreference(brief.generationDesignStyle, settings.ai.designStyle)
    ) {
      nextBrief.generationDesignStyle = profile.recommended.designStyle;
      appliedOverrides.designStyle = profile.recommended.designStyle;
    }

    if (
      profile.recommended.structurePreference &&
      (!brief.generationStructurePreference ||
        brief.generationStructurePreference === settings.ai.structurePreference)
    ) {
      nextBrief.generationStructurePreference = profile.recommended.structurePreference;
      appliedOverrides.structurePreference = profile.recommended.structurePreference;
    }

    if (
      profile.recommended.contentDensity &&
      (!brief.generationContentDensity ||
        brief.generationContentDensity === settings.ai.contentDensity)
    ) {
      nextBrief.generationContentDensity = profile.recommended.contentDensity;
      appliedOverrides.contentDensity = profile.recommended.contentDensity;
    }

    if (
      typeof profile.recommended.creativityLevel === "number" &&
      (brief.generationCreativityLevel == null ||
        brief.generationCreativityLevel === settings.creativeMode.boldness)
    ) {
      nextBrief.generationCreativityLevel = profile.recommended.creativityLevel;
      appliedOverrides.creativityLevel = profile.recommended.creativityLevel;
    }

    const baseCreativeMode = brief.creativeMode ?? settings.creativeMode;
    let creativeModeChanged = false;
    const nextCreativeMode = { ...baseCreativeMode };

    if (
      typeof profile.recommended.surpriseMe === "boolean" &&
      baseCreativeMode.surpriseMe === settings.creativeMode.surpriseMe
    ) {
      nextCreativeMode.surpriseMe = profile.recommended.surpriseMe;
      appliedOverrides.surpriseMe = profile.recommended.surpriseMe;
      creativeModeChanged = true;
    }

    if (
      typeof profile.recommended.breakDesignRules === "boolean" &&
      baseCreativeMode.breakDesignRules === settings.creativeMode.breakDesignRules
    ) {
      nextCreativeMode.breakDesignRules = profile.recommended.breakDesignRules;
      appliedOverrides.breakDesignRules = profile.recommended.breakDesignRules;
      creativeModeChanged = true;
    }

    if (creativeModeChanged) {
      nextBrief.creativeMode = nextCreativeMode;
    }

    const hasOverrides = Object.keys(appliedOverrides).length > 0;
    return {
      settings,
      profile,
      adaptedBrief: hasOverrides ? nextBrief : brief,
      appliedOverrides: hasOverrides ? appliedOverrides : null,
    };
  } catch {
    return {
      settings: context?.settings ?? null,
      profile: null,
      adaptedBrief: brief,
      appliedOverrides: null,
    };
  }
}
