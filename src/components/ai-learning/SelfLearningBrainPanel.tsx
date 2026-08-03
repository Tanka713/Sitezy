"use client";

import { useMemo } from "react";
import { BrainCircuit, Sparkles, Zap, Activity, Database, TrendingUp } from "lucide-react";
import type { AIContentDensity, AIDesignStyle, AIStructurePreference } from "@/types";

// ─── Types (mirrors AdaptiveLearningProfileResponse from AISettingsSection) ───

export type AdaptiveProfileState = "paused" | "empty" | "warming" | "active";

export interface KnowledgeBaseStats {
  totalExamples: number;
  examplesForIndustry: number;
  industryPatternConfidence: number | null;
  industryPatternExtractedAt: string | null;
}

export interface SelfLearningProfile {
  state: AdaptiveProfileState;
  stateReason: string;
  globalKillSwitchEnabled: boolean;
  knowledgeBase?: KnowledgeBaseStats | null;
  profile: {
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
  };
}

// ─── Label Maps ──────────────────────────────────────────────────────────────

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
  "dark-modern": "Dark Modern",
};

const STRUCTURE_LABELS: Record<AIStructurePreference, string> = {
  clean: "Clean",
  "grid-heavy": "Grid-heavy",
  asymmetric: "Asymmetric",
};

const DENSITY_LABELS: Record<AIContentDensity, string> = {
  short: "Short & punchy",
  balanced: "Balanced",
  detailed: "Detailed",
};

function formatSectionType(raw: string): string {
  return raw
    .split(/[_\-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// ─── Confidence Ring ─────────────────────────────────────────────────────────

function ConfidenceRing({
  confidence,
  state,
}: {
  confidence: number;
  state: AdaptiveProfileState;
}) {
  const radius = 36;
  const stroke = 4;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const pct = Math.min(1, Math.max(0, confidence));
  const offset = circumference - pct * circumference;

  const trackColor = "rgba(255,255,255,0.06)";
  const fillColor =
    state === "active"
      ? "#31c48d"
      : state === "warming"
      ? "#6b77ff"
      : "rgba(255,255,255,0.15)";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 88, height: 88 }}>
      {/* Glow behind ring when active */}
      {(state === "active" || state === "warming") && (
        <div
          className="pointer-events-none absolute inset-0 rounded-full opacity-30 blur-xl"
          style={{
            background:
              state === "active"
                ? "radial-gradient(circle, rgba(49,196,141,0.6) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(107,119,255,0.6) 0%, transparent 70%)",
          }}
        />
      )}

      <svg width={88} height={88} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx={44}
          cy={44}
          r={normalizedRadius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={44}
          cy={44}
          r={normalizedRadius}
          fill="none"
          stroke={fillColor}
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {state === "active" ? (
          <>
            <span className="text-[18px] font-bold leading-none tracking-[-0.04em] text-[var(--success-fg)]">
              {Math.round(pct * 100)}%
            </span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--success-fg)] opacity-70">
              conf.
            </span>
          </>
        ) : state === "warming" ? (
          <>
            <span className="text-[18px] font-bold leading-none tracking-[-0.04em] text-[var(--text-accent)]">
              {Math.round(pct * 100)}%
            </span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--text-accent)] opacity-70">
              conf.
            </span>
          </>
        ) : (
          <BrainCircuit size={22} className="text-[var(--text-tertiary)]" strokeWidth={1.5} />
        )}
      </div>
    </div>
  );
}

// ─── Taste Preference Bar ────────────────────────────────────────────────────

function TasteBar({
  label,
  value,
  empty = false,
}: {
  label: string;
  value: string;
  empty?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[68px] flex-shrink-0 text-[11px] text-[var(--text-tertiary)]">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {empty ? (
          <div className="h-[3px] flex-1 rounded-full bg-[rgba(255,255,255,0.06)]" />
        ) : (
          <div className="h-[3px] flex-1 rounded-full bg-[rgba(107,119,255,0.15)]">
            <div
              className="h-full rounded-full bg-[var(--text-accent)]"
              style={{ width: "100%", opacity: 0.85 }}
            />
          </div>
        )}
        <span
          className={`text-[12px] font-medium tracking-[-0.01em] ${
            empty ? "text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"
          }`}
        >
          {empty ? "—" : value}
        </span>
      </div>
    </div>
  );
}

// ─── Section Type Chip ───────────────────────────────────────────────────────

function SectionChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[rgba(107,119,255,0.22)] bg-[rgba(107,119,255,0.08)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-accent)]">
      {label}
    </span>
  );
}

// ─── Pulse Dot ───────────────────────────────────────────────────────────────

function PulseDot({ active }: { active: boolean }) {
  if (!active) return <div className="h-2 w-2 rounded-full bg-[rgba(255,255,255,0.15)]" />;
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success-fg)] opacity-50" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success-fg)]" />
    </span>
  );
}

// ─── State Config ─────────────────────────────────────────────────────────────

function resolveStateConfig(state: AdaptiveProfileState, stateReason: string) {
  switch (state) {
    case "active":
      return {
        headline: "Your AI taste profile is active",
        sub: stateReason,
        accentClass: "text-[var(--success-fg)]",
        bgClass: "bg-[rgba(49,196,141,0.06)]",
        borderClass: "border-[rgba(49,196,141,0.18)]",
        badgeLabel: "Active",
        badgeClass: "bg-[rgba(49,196,141,0.15)] text-[var(--success-fg)]",
      };
    case "warming":
      return {
        headline: "Your AI taste profile is warming up",
        sub: stateReason,
        accentClass: "text-[var(--text-accent)]",
        bgClass: "bg-[rgba(107,119,255,0.05)]",
        borderClass: "border-[rgba(107,119,255,0.18)]",
        badgeLabel: "Learning",
        badgeClass: "bg-[rgba(107,119,255,0.15)] text-[var(--text-accent)]",
      };
    case "paused":
      return {
        headline: "Self-learning is paused",
        sub: "Enable adaptive generation in AI Settings to let Sitezy start learning your taste.",
        accentClass: "text-[var(--text-secondary)]",
        bgClass: "bg-[rgba(255,255,255,0.02)]",
        borderClass: "border-[var(--border-soft)]",
        badgeLabel: "Paused",
        badgeClass: "bg-[rgba(255,255,255,0.07)] text-[var(--text-tertiary)]",
      };
    default:
      return {
        headline: "No learning signals yet",
        sub: "Publish a site or regenerate a section to start building your taste profile.",
        accentClass: "text-[var(--text-secondary)]",
        bgClass: "bg-[rgba(255,255,255,0.02)]",
        borderClass: "border-[var(--border-soft)]",
        badgeLabel: "Empty",
        badgeClass: "bg-[rgba(255,255,255,0.07)] text-[var(--text-tertiary)]",
      };
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function SelfLearningBrainPanel({
  data,
  loading,
}: {
  data: SelfLearningProfile | null;
  loading: boolean;
}) {
  const state: AdaptiveProfileState = data?.state ?? "empty";
  const stateConfig = useMemo(
    () => resolveStateConfig(state, data?.stateReason ?? ""),
    [state, data?.stateReason]
  );

  const recommended = data?.profile.recommended ?? {};
  const preferredSections = data?.profile.preferredSectionTypes ?? [];
  const confidence = data?.profile.confidence ?? 0;
  const sampleCount = data?.profile.sampleCount ?? 0;
  const uniqueProjects = data?.profile.uniqueProjectCount ?? 0;

  const tasteSummary = useMemo(() => {
    const rows: Array<{ label: string; value: string; empty: boolean }> = [
      {
        label: "Style",
        value: recommended.designStyle ? DESIGN_STYLE_LABELS[recommended.designStyle] : "—",
        empty: !recommended.designStyle,
      },
      {
        label: "Structure",
        value: recommended.structurePreference
          ? STRUCTURE_LABELS[recommended.structurePreference]
          : "—",
        empty: !recommended.structurePreference,
      },
      {
        label: "Content",
        value: recommended.contentDensity ? DENSITY_LABELS[recommended.contentDensity] : "—",
        empty: !recommended.contentDensity,
      },
    ];
    return rows;
  }, [recommended]);

  const hasAnyTaste = tasteSummary.some((row) => !row.empty) || preferredSections.length > 0;

  return (
    <div
      className={`relative overflow-hidden rounded-[20px] border ${stateConfig.borderClass} ${stateConfig.bgClass} p-5`}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full opacity-[0.12] blur-3xl"
        style={{
          background:
            state === "active"
              ? "radial-gradient(circle, rgba(49,196,141,0.8) 0%, transparent 70%)"
              : state === "warming"
              ? "radial-gradient(circle, rgba(107,119,255,0.8) 0%, transparent 70%)"
              : "none",
        }}
      />

      {/* Header row */}
      <div className="relative flex items-start gap-4">
        {/* Ring */}
        <div className="flex-shrink-0">
          {loading ? (
            <div
              className="flex items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-3)]"
              style={{ width: 88, height: 88 }}
            >
              <BrainCircuit size={22} className="animate-pulse text-[var(--text-tertiary)]" strokeWidth={1.5} />
            </div>
          ) : (
            <ConfidenceRing confidence={confidence} state={state} />
          )}
        </div>

        {/* Title + badge */}
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${stateConfig.badgeClass}`}
            >
              <PulseDot active={state === "active"} />
              {stateConfig.badgeLabel}
            </span>
          </div>
          <h3 className="mt-2 text-[15px] font-semibold leading-snug tracking-[-0.02em] text-[var(--text-primary)]">
            {stateConfig.headline}
          </h3>
          <p className="mt-1 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
            {stateConfig.sub}
          </p>
        </div>
      </div>

      {/* Stats row */}
      {!loading && sampleCount > 0 && (
        <div className="relative mt-5 flex gap-4 border-t border-[rgba(255,255,255,0.05)] pt-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-[var(--text-tertiary)]">Signals</span>
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
              {sampleCount}
            </span>
          </div>
          <div className="h-full w-px bg-[rgba(255,255,255,0.06)]" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-[var(--text-tertiary)]">Confidence</span>
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
              {Math.round(confidence * 100)}%
            </span>
          </div>
          <div className="h-full w-px bg-[rgba(255,255,255,0.06)]" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-[var(--text-tertiary)]">Projects</span>
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
              {uniqueProjects}
            </span>
          </div>
        </div>
      )}

      {/* Taste profile */}
      {!loading && hasAnyTaste && (
        <div className="relative mt-5 space-y-3 border-t border-[rgba(255,255,255,0.05)] pt-4">
          <div className="flex items-center gap-2">
            <Sparkles size={11} className="text-[var(--text-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
              Learned taste
            </span>
          </div>
          <div className="space-y-2.5">
            {tasteSummary.map((row) => (
              <TasteBar key={row.label} label={row.label} value={row.value} empty={row.empty} />
            ))}
          </div>

          {preferredSections.length > 0 && (
            <div className="pt-1">
              <div className="mb-2 flex items-center gap-2">
                <Activity size={11} className="text-[var(--text-accent)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                  Preferred sections
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {preferredSections.slice(0, 8).map((s) => (
                  <SectionChip key={s} label={formatSectionType(s)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state guidance */}
      {!loading && !hasAnyTaste && state !== "paused" && (
        <div className="relative mt-5 flex items-start gap-3 rounded-[14px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <Zap size={13} className="mt-0.5 flex-shrink-0 text-[var(--text-accent)]" />
          <p className="text-[12.5px] leading-[1.6] text-[var(--text-secondary)]">
            Publish your first site or regenerate a section to start building your taste profile. The
            more you use Sitezy, the better it understands what you like.
          </p>
        </div>
      )}

      {/* Knowledge base stats */}
      {!loading && data?.knowledgeBase && data.knowledgeBase.totalExamples > 0 && (
        <div className="relative mt-5 space-y-3 border-t border-[rgba(255,255,255,0.05)] pt-4">
          <div className="flex items-center gap-2">
            <Database size={11} className="text-[var(--text-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
              Knowledge base
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[var(--text-tertiary)]">Your industry</span>
              <span className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                {data.knowledgeBase.examplesForIndustry}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">sites</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[var(--text-tertiary)]">Global total</span>
              <span className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                {data.knowledgeBase.totalExamples}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">examples</span>
            </div>
            {data.knowledgeBase.industryPatternConfidence !== null && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-[var(--text-tertiary)]">Pattern conf.</span>
                <span className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  {Math.round(data.knowledgeBase.industryPatternConfidence * 100)}%
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  {formatRelativeDate(data.knowledgeBase.industryPatternExtractedAt)}
                </span>
              </div>
            )}
          </div>
          {data.knowledgeBase.examplesForIndustry >= 5 && (
            <div className="flex items-center gap-1.5 rounded-[10px] bg-[rgba(107,119,255,0.06)] px-3 py-2">
              <TrendingUp size={11} className="flex-shrink-0 text-[var(--text-accent)]" />
              <span className="text-[11.5px] leading-[1.5] text-[var(--text-secondary)]">
                Industry patterns are enriching your generations
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
