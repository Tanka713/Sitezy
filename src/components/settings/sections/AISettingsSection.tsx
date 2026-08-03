"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Layers3,
  Loader2,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import type {
  AIContentDensity,
  AIDesignStyle,
  AIStructurePreference,
  UserSettings,
} from "@/types";
import {
  SelfLearningBrainPanel,
  type SelfLearningProfile,
} from "@/components/ai-learning/SelfLearningBrainPanel";
import { defaultUserSettings } from "@/lib/settings";
import { SitezyBadge } from "@/components/ui/sitezy";
import {
  SettingsActionRow,
  SettingsField,
  SettingsGroup,
  SettingsPrimaryAction,
  SettingsResetRow,
  SettingsRow,
  SettingsSecondaryAction,
  SettingsSegmented,
  SettingsStack,
  SettingsStatus,
  SettingsToggle,
} from "../ui";
import { useSettingsSectionAutosave } from "../useSettingsSectionAutosave";

type AdaptiveProfileState = "paused" | "empty" | "warming" | "active";

interface AdaptiveLearningProfileResponse {
  adaptiveGenerationEnabled: boolean;
  state: AdaptiveProfileState;
  stateReason: string;
  globalKillSwitchEnabled: boolean;
  profile: {
    policyVersion: string;
    sampleCount: number;
    confidence: number;
    positiveSignalWeight: number;
    negativeSignalWeight: number;
    recentPositiveSignalWeight: number;
    uniqueProjectCount: number;
    stale: boolean;
    recommended: {
      designStyle?: AIDesignStyle;
      structurePreference?: AIStructurePreference;
      contentDensity?: AIContentDensity;
      creativityLevel?: number;
      surpriseMe?: boolean;
      breakDesignRules?: boolean;
    };
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
  };
  diagnostics: {
    latestPublishEvaluation: {
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
    } | null;
    recentEvents: Array<{
      id: string;
      eventType:
        | "project_published"
        | "site_regenerated"
        | "section_regenerated"
        | "explicit_positive"
        | "explicit_negative"
        | "section_edited"
        | "section_deleted"
        | "section_reordered";
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
    }>;
    recentGenerationRuns: Array<{
      id: string;
      kind: "blueprint" | "page" | "section";
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
    }>;
  };
}

const DESIGN_STYLE_LABELS: Record<AIDesignStyle, string> = {
  "ai-pick": "AI Pick",
  minimal: "Minimal",
  luxury: "Luxury",
  playful: "Playful",
  brutalist: "Brutalist",
  editorial: "Editorial",
  futuristic: "Futuristic",
  organic: "Organic",
  "neo-retro": "Neo-retro",
  corporate: "Corporate",
  artisan: "Artisan",
  geometric: "Geometric",
  "dark-modern": "Dark modern",
};

const STRUCTURE_LABELS: Record<AIStructurePreference, string> = {
  clean: "Clean",
  "grid-heavy": "Grid-heavy",
  asymmetric: "Asymmetric",
};

const CONTENT_DENSITY_LABELS: Record<AIContentDensity, string> = {
  short: "Short",
  balanced: "Balanced",
  detailed: "Detailed",
};

function formatAdaptiveTimestamp(
  value: string | null,
  options?: { includeTime?: boolean }
): string | null {
  if (!value) return null;

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(options?.includeTime
      ? {
          hour: "numeric",
          minute: "2-digit",
        }
      : {
          year: "numeric",
        }),
  }).format(parsed);
}

function formatAdaptivePercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "n/a";
  return `${Math.round(value * 100)}%`;
}

function formatAdaptiveSignalWeight(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 10) / 10;
  const prefix = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  return `${prefix}${Math.abs(rounded).toFixed(Math.abs(rounded) >= 10 ? 0 : 1)}`;
}

function formatSectionLabel(value: string): string {
  return value
    .split(/[-_\s]+/)
    .map((segment) => {
      const trimmed = segment.trim();
      return trimmed ? trimmed[0].toUpperCase() + trimmed.slice(1) : "";
    })
    .join(" ")
    .trim();
}

function describeAdaptiveEventType(
  value:
    | "project_published"
    | "site_regenerated"
    | "section_regenerated"
    | "explicit_positive"
    | "explicit_negative"
    | "section_edited"
    | "section_deleted"
    | "section_reordered"
): string {
  switch (value) {
    case "project_published":
      return "Publish signal";
    case "site_regenerated":
      return "Full-site regenerate";
    case "section_regenerated":
      return "Section regenerate";
    case "explicit_positive":
      return "Explicit positive";
    case "explicit_negative":
      return "Explicit negative";
    case "section_edited":
      return "Section edit";
    case "section_deleted":
      return "Section deleted";
    case "section_reordered":
      return "Section reordered";
    default:
      return "Adaptive event";
  }
}

function AdaptiveMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-4)] px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{label}</div>
      <div className="mt-1 text-[13px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function GuardrailChip({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-[12px] ${
        ready
          ? "border-[rgba(49,196,141,0.22)] bg-[rgba(49,196,141,0.1)] text-[var(--success-fg)]"
          : "border-[var(--border-soft)] bg-[var(--surface-3)] text-[var(--text-secondary)]"
      }`}
    >
      {label}
    </span>
  );
}

function DiagnosticsSignalBadge({ value }: { value: number }) {
  const positive = value > 0;
  const negative = value < 0;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11.5px] font-semibold ${
        positive
          ? "border-[rgba(49,196,141,0.22)] bg-[rgba(49,196,141,0.1)] text-[var(--success-fg)]"
          : negative
          ? "border-[rgba(255,120,120,0.18)] bg-[rgba(255,120,120,0.08)] text-[rgba(255,168,168,0.96)]"
          : "border-[var(--border-soft)] bg-[var(--surface-3)] text-[var(--text-secondary)]"
      }`}
    >
      {formatAdaptiveSignalWeight(value)} signal
    </span>
  );
}

function DiagnosticsChip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "accepted" | "changed" | "added";
}) {
  const toneClass =
    tone === "accepted"
      ? "border-[rgba(49,196,141,0.2)] bg-[rgba(49,196,141,0.08)] text-[var(--success-fg)]"
      : tone === "changed"
      ? "border-[rgba(255,184,77,0.24)] bg-[rgba(255,184,77,0.08)] text-[rgba(255,212,138,0.96)]"
      : tone === "added"
      ? "border-[rgba(91,140,255,0.24)] bg-[rgba(91,140,255,0.1)] text-[var(--text-accent)]"
      : "border-[var(--border-soft)] bg-[var(--surface-4)] text-[var(--text-secondary)]";

  return (
    <span className={`rounded-full border px-3 py-1.5 text-[11.5px] ${toneClass}`}>
      {label}
    </span>
  );
}

export function AISettingsSection({
  value,
  onSave,
  experimental,
}: {
  value: UserSettings["ai"];
  onSave: (patch: Partial<UserSettings>) => Promise<void>;
  experimental?: UserSettings["experimental"];
}) {
  const { draft, status, setDraft } = useSettingsSectionAutosave({
    sectionKey: "ai",
    value,
    onSave,
    errorMessage: "We couldn't save your AI defaults.",
  });
  const canReset =
    draft.designStyle !== defaultUserSettings.ai.designStyle ||
    draft.structurePreference !== defaultUserSettings.ai.structurePreference ||
    draft.contentDensity !== defaultUserSettings.ai.contentDensity ||
    draft.adaptiveGenerationEnabled !== defaultUserSettings.ai.adaptiveGenerationEnabled;
  const [adaptiveProfile, setAdaptiveProfile] = useState<AdaptiveLearningProfileResponse | null>(null);
  const [adaptiveProfileLoading, setAdaptiveProfileLoading] = useState(true);
  const [adaptiveProfileRefreshing, setAdaptiveProfileRefreshing] = useState(false);
  const [adaptiveProfileResetting, setAdaptiveProfileResetting] = useState(false);
  const [adaptiveProfileError, setAdaptiveProfileError] = useState<string | null>(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  const loadAdaptiveProfile = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") {
      setAdaptiveProfileLoading(true);
    } else {
      setAdaptiveProfileRefreshing(true);
    }
    setAdaptiveProfileError(null);

    try {
      const response = await fetch("/api/ai-learning", {
        method: "GET",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as AdaptiveLearningProfileResponse & {
        error?: string;
      };

      if (!response.ok || !payload.profile || !payload.state) {
        throw new Error(payload.error || "We couldn't load your adaptive profile.");
      }

      setAdaptiveProfile(payload);
    } catch (error) {
      setAdaptiveProfileError(
        error instanceof Error ? error.message : "We couldn't load your adaptive profile."
      );
    } finally {
      setAdaptiveProfileLoading(false);
      setAdaptiveProfileRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAdaptiveProfile();
  }, [loadAdaptiveProfile]);

  const recommendationLabels = useMemo(() => {
    if (!adaptiveProfile?.profile) return [];

    const labels: string[] = [];
    const { recommended } = adaptiveProfile.profile;
    if (recommended.designStyle) {
      labels.push(`Style: ${DESIGN_STYLE_LABELS[recommended.designStyle] ?? recommended.designStyle}`);
    }
    if (recommended.structurePreference) {
      labels.push(
        `Structure: ${
          STRUCTURE_LABELS[recommended.structurePreference] ?? recommended.structurePreference
        }`
      );
    }
    if (recommended.contentDensity) {
      labels.push(
        `Content: ${CONTENT_DENSITY_LABELS[recommended.contentDensity] ?? recommended.contentDensity}`
      );
    }
    if (typeof recommended.creativityLevel === "number") {
      labels.push(`Boldness: ${recommended.creativityLevel}`);
    }
    if (typeof recommended.surpriseMe === "boolean") {
      labels.push(recommended.surpriseMe ? "Surprise me: On" : "Surprise me: Off");
    }
    if (typeof recommended.breakDesignRules === "boolean") {
      labels.push(recommended.breakDesignRules ? "Break rules: On" : "Break rules: Off");
    }

    return labels;
  }, [adaptiveProfile]);

  const adaptiveProfileMeta = useMemo(() => {
    const state: AdaptiveProfileState = !draft.adaptiveGenerationEnabled
      ? "paused"
      : adaptiveProfile?.state === "paused" && !adaptiveProfile?.globalKillSwitchEnabled
      ? "empty"
      : adaptiveProfile?.state ?? "empty";
    const stateReason =
      !draft.adaptiveGenerationEnabled
        ? "Adaptive generation is turned off in your AI settings."
        : adaptiveProfile?.stateReason ??
          "Publishes and regeneration choices will start building a profile here.";
    switch (state) {
      case "paused":
        return {
          title: "Adaptive profile is paused",
          body: stateReason,
          toneClass: "bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)]",
          badge: "Paused",
        };
      case "active":
        return {
          title: "Adaptive profile is shaping defaults",
          body: stateReason,
          toneClass: "bg-[rgba(49,196,141,0.14)] text-[var(--success-fg)]",
          badge: "Active",
        };
      case "warming":
        return {
          title: "Adaptive profile is warming up",
          body: stateReason,
          toneClass: "bg-[rgba(107,119,255,0.14)] text-[var(--text-accent)]",
          badge: "Warming up",
        };
      default:
        return {
          title: "No learning signals yet",
          body: stateReason,
          toneClass: "bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)]",
          badge: "Empty",
        };
    }
  }, [
    adaptiveProfile?.globalKillSwitchEnabled,
    adaptiveProfile?.state,
    adaptiveProfile?.stateReason,
    draft.adaptiveGenerationEnabled,
  ]);

  const diagnosticsSummary = useMemo(() => {
    const diagnostics = adaptiveProfile?.diagnostics;
    if (!diagnostics) {
      return "Diagnostics will appear after Sitezy records a few generations, publishes, or feedback signals.";
    }

    if (diagnostics.latestPublishEvaluation) {
      if (
        diagnostics.latestPublishEvaluation.baselineSectionCount != null &&
        diagnostics.latestPublishEvaluation.baselineSectionCount > 0
      ) {
        const structural = formatAdaptivePercent(
          diagnostics.latestPublishEvaluation.structuralRetentionRatio
        );
        return `Latest publish kept ${structural} of generated structure and contributed ${formatAdaptiveSignalWeight(
          diagnostics.latestPublishEvaluation.signalWeight
        )} signal.`;
      }

      return `Latest publish contributed ${formatAdaptiveSignalWeight(
        diagnostics.latestPublishEvaluation.signalWeight
      )} signal, but there were no comparable baselines yet.`;
    }

    if (diagnostics.recentEvents.length > 0 || diagnostics.recentGenerationRuns.length > 0) {
      return `${diagnostics.recentEvents.length} recent signal${
        diagnostics.recentEvents.length === 1 ? "" : "s"
      } and ${diagnostics.recentGenerationRuns.length} baseline${
        diagnostics.recentGenerationRuns.length === 1 ? "" : "s"
      } are ready to inspect.`;
    }

    return "Diagnostics will appear after Sitezy records a few generations, publishes, or feedback signals.";
  }, [adaptiveProfile?.diagnostics]);

  async function handleResetAdaptiveProfile() {
    if (adaptiveProfileResetting || !adaptiveProfile?.profile.sampleCount) return;
    const confirmed = window.confirm(
      "Reset adaptive learning history for your account? This clears recorded learning signals and learned recommendations, but keeps your saved AI defaults."
    );
    if (!confirmed) return;

    setAdaptiveProfileResetting(true);
    setAdaptiveProfileError(null);
    try {
      const response = await fetch("/api/ai-learning", {
        method: "DELETE",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as AdaptiveLearningProfileResponse & {
        error?: string;
      };

      if (!response.ok || !payload.profile || !payload.state) {
        throw new Error(payload.error || "We couldn't reset adaptive learning.");
      }

      setAdaptiveProfile(payload);
    } catch (error) {
      setAdaptiveProfileError(
        error instanceof Error ? error.message : "We couldn't reset adaptive learning."
      );
    } finally {
      setAdaptiveProfileResetting(false);
    }
  }

  const lastSignalLabel = formatAdaptiveTimestamp(adaptiveProfile?.profile.lastSignalAt ?? null);
  const lastEvaluatedLabel = formatAdaptiveTimestamp(adaptiveProfile?.profile.lastEvaluatedAt ?? null);
  const diagnostics = adaptiveProfile?.diagnostics ?? null;
  const latestPublishEvaluation = diagnostics?.latestPublishEvaluation ?? null;
  const profileBusy = adaptiveProfileLoading || adaptiveProfileRefreshing || adaptiveProfileResetting;

  return (
    <SettingsStack>
      {status ? <SettingsStatus tone={status.tone}>{status.message}</SettingsStatus> : null}

      {/* Self-learning AI brain panel — shown only when experimental flag is enabled */}
      {experimental?.selfLearningGenerator ? (
        <SettingsGroup
          title="Self-learning AI"
          body="Your personal taste profile — Sitezy learns from every publish and regeneration."
        >
          <SelfLearningBrainPanel
            data={adaptiveProfile as unknown as SelfLearningProfile | null}
            loading={adaptiveProfileLoading}
          />
        </SettingsGroup>
      ) : null}

      <SettingsGroup title="Generation">
        <div className="space-y-4">
          <SettingsRow
            title="Adaptive generation"
            body="Let Sitezy quietly learn from publishes and regeneration choices, then bias future generations when your brief is still sitting on defaults."
            action={
              <SettingsToggle
                checked={draft.adaptiveGenerationEnabled}
                onChange={(adaptiveGenerationEnabled) =>
                  setDraft((current) => ({ ...current, adaptiveGenerationEnabled }))
                }
              />
            }
          />

          <SettingsField label="Style">
            <SettingsSegmented
              value={draft.designStyle}
              onChange={(designStyle) => setDraft((current) => ({ ...current, designStyle }))}
              options={[
                { value: "ai-pick", label: "AI Pick" },
                { value: "minimal", label: "Minimal" },
                { value: "luxury", label: "Luxury" },
                { value: "playful", label: "Playful" },
                { value: "brutalist", label: "Brutalist" },
                { value: "editorial", label: "Editorial" },
                { value: "futuristic", label: "Futuristic" },
              ]}
            />
          </SettingsField>

          <SettingsField label="Structure">
            <SettingsSegmented
              value={draft.structurePreference}
              onChange={(structurePreference) => setDraft((current) => ({ ...current, structurePreference }))}
              options={[
                { value: "clean", label: "Clean" },
                { value: "grid-heavy", label: "Grid-heavy" },
                { value: "asymmetric", label: "Asymmetric" },
              ]}
            />
          </SettingsField>

          <SettingsField label="Content">
            <SettingsSegmented
              value={draft.contentDensity}
              onChange={(contentDensity) => setDraft((current) => ({ ...current, contentDensity }))}
              options={[
                { value: "short", label: "Short" },
                { value: "balanced", label: "Balanced" },
                { value: "detailed", label: "Detailed" },
              ]}
            />
          </SettingsField>
        </div>
      </SettingsGroup>

      <SettingsGroup
        title="Adaptive profile"
        body="Review what Sitezy has picked up from publishes and regenerations, then clear it any time if you want a fresh learning curve."
      >
        <div className="space-y-4">
          {adaptiveProfileError ? (
            <SettingsStatus tone="error">{adaptiveProfileError}</SettingsStatus>
          ) : null}

          <SettingsRow
            title={adaptiveProfileMeta.title}
            body={adaptiveProfileMeta.body}
            stacked
            action={
              <SitezyBadge className={`gap-1.5 ${adaptiveProfileMeta.toneClass}`}>
                {profileBusy ? <Loader2 size={12} className="spin" /> : <BrainCircuit size={12} />}
                {adaptiveProfileMeta.badge}
              </SitezyBadge>
            }
          >
            {adaptiveProfileLoading ? (
              <div className="flex items-center gap-2 text-[12.5px] text-[var(--text-secondary)]">
                <Loader2 size={14} className="spin" />
                Loading learned preferences…
              </div>
            ) : adaptiveProfile ? (
              <div className="space-y-4">
                <div className="grid gap-2 md:grid-cols-4">
                  <AdaptiveMetric
                    label="Signals"
                    value={`${adaptiveProfile.profile.sampleCount}`}
                  />
                  <AdaptiveMetric
                    label="Confidence"
                    value={`${Math.round(adaptiveProfile.profile.confidence * 100)}%`}
                  />
                  <AdaptiveMetric
                    label="Projects"
                    value={`${adaptiveProfile.profile.uniqueProjectCount}`}
                  />
                  <AdaptiveMetric
                    label="Last signal"
                    value={lastSignalLabel ?? "Not yet"}
                  />
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <AdaptiveMetric
                    label="Recent weight"
                    value={adaptiveProfile.profile.recentPositiveSignalWeight.toFixed(1)}
                  />
                  <AdaptiveMetric
                    label="Policy"
                    value={adaptiveProfile.profile.policyVersion}
                  />
                  <AdaptiveMetric
                    label="Last eval"
                    value={lastEvaluatedLabel ?? "Not yet"}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                    Guardrails
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <GuardrailChip
                      label={`Confidence ≥ ${Math.round(adaptiveProfile.profile.guardrails.minConfidence * 100)}%`}
                      ready={adaptiveProfile.profile.guardrails.passesConfidence}
                    />
                    <GuardrailChip
                      label={`Recent weight ≥ ${adaptiveProfile.profile.guardrails.minRecentPositiveSignalWeight}`}
                      ready={adaptiveProfile.profile.guardrails.passesRecency}
                    />
                    <GuardrailChip
                      label={`${adaptiveProfile.profile.guardrails.minUniqueProjects}+ projects`}
                      ready={adaptiveProfile.profile.guardrails.passesDiversity}
                    />
                    <GuardrailChip
                      label={
                        adaptiveProfile.globalKillSwitchEnabled
                          ? "Global kill switch on"
                          : adaptiveProfile.profile.stale
                          ? "Profile stale"
                          : "Fresh enough"
                      }
                      ready={!adaptiveProfile.globalKillSwitchEnabled && !adaptiveProfile.profile.stale}
                    />
                  </div>
                </div>

                {recommendationLabels.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                      Current recommendations
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {recommendationLabels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-4)] px-3 py-1.5 text-[12px] text-[var(--text-primary)]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[12.5px] leading-[1.65] text-[var(--text-secondary)]">
                    Sitezy has not locked onto any stable recommendations yet. Keep publishing or regenerating work you like and this will start filling in.
                  </p>
                )}

                {adaptiveProfile.profile.preferredSectionTypes.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                      Preferred sections
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {adaptiveProfile.profile.preferredSectionTypes.slice(0, 6).map((sectionType) => (
                        <span
                          key={sectionType}
                          className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-3)] px-3 py-1.5 text-[12px] text-[var(--text-secondary)]"
                        >
                          {formatSectionLabel(sectionType)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </SettingsRow>

          <SettingsRow
            title="Diagnostics"
            body="Inspect the latest publish-retention math, recent adaptive signals, and the baselines Sitezy can currently compare against."
            stacked
          >
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setDiagnosticsOpen((current) => !current)}
                disabled={adaptiveProfileLoading}
                className="flex w-full items-center justify-between gap-4 rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-4)] px-4 py-3 text-left transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-5)] disabled:cursor-default disabled:opacity-60"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px] border border-[rgba(91,140,255,0.16)] bg-[rgba(91,140,255,0.08)] text-[var(--text-accent)]">
                    <Activity size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                      Adaptive signal console
                    </p>
                    <p className="mt-1 text-[12px] leading-[1.6] text-[var(--text-secondary)]">
                      {diagnosticsSummary}
                    </p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2 text-[var(--text-tertiary)]">
                  {diagnostics?.recentEvents.length ? (
                    <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-3)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                      {diagnostics.recentEvents.length} signals
                    </span>
                  ) : null}
                  {diagnosticsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {diagnosticsOpen ? (
                adaptiveProfileLoading ? (
                  <div className="flex items-center gap-2 text-[12.5px] text-[var(--text-secondary)]">
                    <Loader2 size={14} className="spin" />
                    Loading diagnostics…
                  </div>
                ) : diagnostics ? (
                  <div className="space-y-4">
                    {latestPublishEvaluation ? (
                      <div className="rounded-[16px] border border-[rgba(91,140,255,0.18)] bg-[linear-gradient(180deg,rgba(91,140,255,0.09)_0%,rgba(15,18,24,0.38)_100%)] p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                              Latest publish acceptance
                            </p>
                            <p className="mt-2 text-[13.5px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                              Sitezy compared the live project against its newest generated baselines before scoring this publish.
                            </p>
                            <p className="mt-1 text-[12px] leading-[1.6] text-[var(--text-secondary)]">
                              {formatAdaptiveTimestamp(latestPublishEvaluation.createdAt, {
                                includeTime: true,
                              }) ?? "Recently"}
                              {latestPublishEvaluation.comparedRunIds.length > 0
                                ? ` · ${latestPublishEvaluation.comparedRunIds.length} baseline run${
                                    latestPublishEvaluation.comparedRunIds.length === 1 ? "" : "s"
                                  } compared`
                                : ""}
                            </p>
                          </div>
                          <DiagnosticsSignalBadge value={latestPublishEvaluation.signalWeight} />
                        </div>

                        {latestPublishEvaluation.baselineSectionCount != null &&
                        latestPublishEvaluation.baselineSectionCount > 0 ? (
                          <>
                            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                              <AdaptiveMetric
                                label="Structure"
                                value={`${
                                  latestPublishEvaluation.structurallyRetainedSectionCount ?? 0
                                }/${latestPublishEvaluation.baselineSectionCount ?? 0} · ${formatAdaptivePercent(
                                  latestPublishEvaluation.structuralRetentionRatio
                                )}`}
                              />
                              <AdaptiveMetric
                                label="Exact content"
                                value={`${
                                  latestPublishEvaluation.contentRetainedSectionCount ?? 0
                                }/${latestPublishEvaluation.comparableContentSectionCount ?? 0} · ${formatAdaptivePercent(
                                  latestPublishEvaluation.contentRetentionRatio
                                )}`}
                              />
                              <AdaptiveMetric
                                label="Page coverage"
                                value={`${
                                  latestPublishEvaluation.comparedPageCount ?? 0
                                }/${latestPublishEvaluation.baselinePageCount ?? 0} · ${formatAdaptivePercent(
                                  latestPublishEvaluation.pageCoverageRatio
                                )}`}
                              />
                              <AdaptiveMetric
                                label="Added sections"
                                value={`${latestPublishEvaluation.addedSectionCount ?? 0}`}
                              />
                              <AdaptiveMetric
                                label="Multiplier"
                                value={`${latestPublishEvaluation.signalWeightMultiplier.toFixed(2)}x`}
                              />
                            </div>

                            <div className="mt-4 space-y-3">
                              {latestPublishEvaluation.acceptedSectionTypes.length > 0 ? (
                                <div className="space-y-2">
                                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                                    Accepted sections
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {latestPublishEvaluation.acceptedSectionTypes.slice(0, 6).map((sectionType) => (
                                      <DiagnosticsChip
                                        key={`accepted-${sectionType}`}
                                        label={formatSectionLabel(sectionType)}
                                        tone="accepted"
                                      />
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              {latestPublishEvaluation.changedSectionTypes.length > 0 ? (
                                <div className="space-y-2">
                                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                                    Changed sections
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {latestPublishEvaluation.changedSectionTypes.slice(0, 6).map((sectionType) => (
                                      <DiagnosticsChip
                                        key={`changed-${sectionType}`}
                                        label={formatSectionLabel(sectionType)}
                                        tone="changed"
                                      />
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              {latestPublishEvaluation.addedSectionTypes.length > 0 ? (
                                <div className="space-y-2">
                                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                                    Added sections
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {latestPublishEvaluation.addedSectionTypes.slice(0, 6).map((sectionType) => (
                                      <DiagnosticsChip
                                        key={`added-${sectionType}`}
                                        label={formatSectionLabel(sectionType)}
                                        tone="added"
                                      />
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </>
                        ) : (
                          <div className="mt-4 rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-4)] px-4 py-3 text-[12.5px] leading-[1.65] text-[var(--text-secondary)]">
                            This publish still counted as a positive signal, but there were no page or section baselines on record yet, so Sitezy could not score retention.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-4)] px-4 py-3 text-[12.5px] leading-[1.65] text-[var(--text-secondary)]">
                        No publish acceptance snapshot yet. Once a project is published after generation, Sitezy will show the retention math here.
                      </div>
                    )}

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                      <div className="rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-4)] p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[var(--border-soft)] bg-[var(--surface-3)] text-[var(--text-secondary)]">
                            <Activity size={14} />
                          </div>
                          <div>
                            <p className="text-[12.5px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                              Recent signals
                            </p>
                            <p className="text-[11.5px] text-[var(--text-secondary)]">
                              What the learner has counted most recently.
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2.5">
                          {diagnostics.recentEvents.length > 0 ? (
                            diagnostics.recentEvents.map((event) => (
                              <div
                                key={event.id}
                                className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-3.5 py-3"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="text-[12.5px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                                      {describeAdaptiveEventType(event.eventType)}
                                    </p>
                                    <p className="mt-1 text-[12px] leading-[1.6] text-[var(--text-secondary)]">
                                      {event.summary}
                                    </p>
                                    <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                                      {formatAdaptiveTimestamp(event.createdAt, {
                                        includeTime: true,
                                      }) ?? "Recently"}
                                      {event.pageName ? ` · ${event.pageName}` : ""}
                                      {event.sectionName ? ` · ${event.sectionName}` : ""}
                                    </p>
                                  </div>
                                  <DiagnosticsSignalBadge value={event.signalWeight} />
                                </div>

                                {event.acceptedSectionTypes.length > 0 ||
                                event.changedSectionTypes.length > 0 ||
                                event.addedSectionTypes.length > 0 ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {event.acceptedSectionTypes.slice(0, 3).map((sectionType) => (
                                      <DiagnosticsChip
                                        key={`${event.id}-accepted-${sectionType}`}
                                        label={formatSectionLabel(sectionType)}
                                        tone="accepted"
                                      />
                                    ))}
                                    {event.changedSectionTypes.slice(0, 2).map((sectionType) => (
                                      <DiagnosticsChip
                                        key={`${event.id}-changed-${sectionType}`}
                                        label={formatSectionLabel(sectionType)}
                                        tone="changed"
                                      />
                                    ))}
                                    {event.addedSectionTypes.slice(0, 2).map((sectionType) => (
                                      <DiagnosticsChip
                                        key={`${event.id}-added-${sectionType}`}
                                        label={formatSectionLabel(sectionType)}
                                        tone="added"
                                      />
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ))
                          ) : (
                            <p className="text-[12.5px] leading-[1.65] text-[var(--text-secondary)]">
                              No recent adaptive signals yet.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-4)] p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[var(--border-soft)] bg-[var(--surface-3)] text-[var(--text-secondary)]">
                            <Layers3 size={14} />
                          </div>
                          <div>
                            <p className="text-[12.5px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                              Recent baselines
                            </p>
                            <p className="text-[11.5px] text-[var(--text-secondary)]">
                              The newest generated page and section snapshots available for comparison.
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2.5">
                          {diagnostics.recentGenerationRuns.length > 0 ? (
                            diagnostics.recentGenerationRuns.map((run) => (
                              <div
                                key={run.id}
                                className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-3.5 py-3"
                              >
                                <div className="flex flex-col gap-3">
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                      <p className="text-[12.5px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                                        {run.title}
                                      </p>
                                      <p className="mt-1 text-[12px] leading-[1.6] text-[var(--text-secondary)]">
                                        {run.detail}
                                      </p>
                                      <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                                        {formatAdaptiveTimestamp(run.createdAt, {
                                          includeTime: true,
                                        }) ?? "Recently"}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <DiagnosticsChip
                                        label={run.adaptiveEnabled ? "Adaptive on" : "Adaptive off"}
                                      />
                                      {run.adaptiveProfileEligible ? (
                                        <DiagnosticsChip label="Eligible profile" tone="accepted" />
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    {typeof run.adaptiveProfileConfidence === "number" ? (
                                      <DiagnosticsChip
                                        label={`Confidence ${Math.round(run.adaptiveProfileConfidence * 100)}%`}
                                      />
                                    ) : null}
                                    {run.adaptiveOverrideCount > 0 ? (
                                      <DiagnosticsChip
                                        label={`${run.adaptiveOverrideCount} override${
                                          run.adaptiveOverrideCount === 1 ? "" : "s"
                                        }`}
                                      />
                                    ) : null}
                                    {run.sectionCount != null ? (
                                      <DiagnosticsChip
                                        label={`${run.sectionCount} section${
                                          run.sectionCount === 1 ? "" : "s"
                                        }`}
                                      />
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-[12.5px] leading-[1.65] text-[var(--text-secondary)]">
                              No comparable baselines yet. Generate a page or regenerate a section and Sitezy will start listing them here.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[12.5px] leading-[1.65] text-[var(--text-secondary)]">
                    Diagnostics are unavailable right now.
                  </p>
                )
              ) : null}
            </div>
          </SettingsRow>

          <SettingsActionRow>
            <SettingsPrimaryAction
              type="button"
              onClick={() => void loadAdaptiveProfile("refresh")}
              disabled={profileBusy}
            >
              {adaptiveProfileRefreshing ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
              Refresh profile
            </SettingsPrimaryAction>
            <SettingsSecondaryAction
              type="button"
              onClick={() => void handleResetAdaptiveProfile()}
              disabled={profileBusy || !adaptiveProfile?.profile.sampleCount}
            >
              {adaptiveProfileResetting ? <Loader2 size={14} className="spin" /> : <RotateCcw size={14} />}
              Reset learning history
            </SettingsSecondaryAction>
          </SettingsActionRow>
        </div>
      </SettingsGroup>

      <SettingsResetRow
        onReset={() =>
          setDraft((current) => ({
            ...current,
            designStyle: defaultUserSettings.ai.designStyle,
            structurePreference: defaultUserSettings.ai.structurePreference,
            contentDensity: defaultUserSettings.ai.contentDensity,
            adaptiveGenerationEnabled: defaultUserSettings.ai.adaptiveGenerationEnabled,
          }))
        }
        disabled={!canReset}
      />
    </SettingsStack>
  );
}
