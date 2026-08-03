"use client";

import { useEffect, useState } from "react";
import { AlertCircle, BrainCircuit, CheckCircle2, Loader2, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SiteBrief } from "@/types";

type SubmissionState =
  | "idle"
  | "submitting-positive"
  | "submitting-negative"
  | "positive"
  | "negative"
  | "error";

interface AdaptiveFeedbackPromptStateResponse {
  feedbackPromptState?: {
    projectId: string | null;
    latestRunId: string | null;
    latestRunKind: "blueprint" | "page" | "section" | null;
    latestRunCreatedAt: string | null;
    hasRecordedFeedback: boolean;
    shouldPrompt: boolean;
  } | null;
}

const FEEDBACK_PROMPT_SEEN_KEY_PREFIX = "sitezy:adaptive-feedback:seen";

function buildFeedbackPromptSeenKey(projectId: string, runId: string) {
  return `${FEEDBACK_PROMPT_SEEN_KEY_PREFIX}:${projectId}:${runId}`;
}

export function AdaptiveFeedbackPrompt({
  projectId,
  brief,
  className,
}: {
  projectId: string;
  brief: SiteBrief;
  className?: string;
}) {
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingPromptState, setLoadingPromptState] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  useEffect(() => {
    setSubmissionState("idle");
    setErrorMessage(null);
  }, [projectId, activeRunId]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadPromptState() {
      setLoadingPromptState(true);
      setIsVisible(false);

      try {
        const response = await fetch(`/api/ai-learning?projectId=${encodeURIComponent(projectId)}`, {
          method: "GET",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("We couldn't load the latest adaptive prompt state.");
        }

        const payload = (await response.json()) as AdaptiveFeedbackPromptStateResponse;
        const promptState = payload.feedbackPromptState ?? null;
        const latestRunId = promptState?.latestRunId?.trim() || null;

        if (cancelled) return;

        setActiveRunId(latestRunId);

        if (!promptState?.shouldPrompt || !latestRunId) {
          setIsVisible(false);
          return;
        }

        const alreadySeen =
          typeof window !== "undefined" &&
          Boolean(window.localStorage.getItem(buildFeedbackPromptSeenKey(projectId, latestRunId)));

        if (alreadySeen) {
          setIsVisible(false);
          return;
        }

        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            buildFeedbackPromptSeenKey(projectId, latestRunId),
            promptState.latestRunCreatedAt ?? new Date().toISOString()
          );
        }

        setIsVisible(true);
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }

        setActiveRunId(null);
        setIsVisible(false);
      } finally {
        if (!cancelled) {
          setLoadingPromptState(false);
        }
      }
    }

    void loadPromptState();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [projectId]);

  async function handleSubmit(tone: "positive" | "negative") {
    const nextState = tone === "positive" ? "submitting-positive" : "submitting-negative";
    setSubmissionState(nextState);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/ai-learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          tone,
          projectId,
          brief,
          source: "editor_topbar",
          metadata: {
            siteName: brief.siteName,
            pageCount: brief.pages.length,
          },
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "We couldn't save that feedback.");
      }

      setSubmissionState(tone);
    } catch (error) {
      setSubmissionState("error");
      setErrorMessage(error instanceof Error ? error.message : "We couldn't save that feedback.");
    }
  }

  if (loadingPromptState || !isVisible) {
    return null;
  }

  if (submissionState === "positive") {
    return (
      <div className={cn("hidden min-w-0 items-center gap-2 rounded-full border border-[rgba(49,196,141,0.22)] bg-[rgba(49,196,141,0.08)] px-3 py-1.5 text-[12px] text-[var(--success-fg)] 2xl:flex", className)}>
        <CheckCircle2 size={13} className="shrink-0" />
        <span className="truncate">Feedback saved. Sitezy will lean further into this direction.</span>
      </div>
    );
  }

  if (submissionState === "negative") {
    return (
      <div className={cn("hidden min-w-0 items-center gap-2 rounded-full border border-[rgba(240,173,78,0.24)] bg-[rgba(240,173,78,0.08)] px-3 py-1.5 text-[12px] text-[#ffd79c] 2xl:flex", className)}>
        <CheckCircle2 size={13} className="shrink-0" />
        <span className="truncate">Feedback saved. Sitezy will pull future defaults away from this direction.</span>
      </div>
    );
  }

  const submitting =
    submissionState === "submitting-positive" || submissionState === "submitting-negative";

  return (
    <div className={cn("hidden min-w-0 items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-3)] px-2 py-1 2xl:flex", className)}>
      <div className="flex min-w-0 items-center gap-2 px-1.5">
        {submissionState === "error" ? (
          <AlertCircle size={12} className="shrink-0 text-[#ffb7c0]" />
        ) : submitting ? (
          <Loader2 size={12} className="spin shrink-0 text-[var(--text-accent)]" />
        ) : (
          <BrainCircuit size={12} className="shrink-0 text-[var(--text-accent)]" />
        )}
        <span className="truncate text-[11.5px] text-[var(--text-secondary)]">
          {submissionState === "error"
            ? errorMessage ?? "Feedback failed. Try again."
            : "Was this AI pass on target?"}
        </span>
      </div>

      <div className="h-4 w-px bg-[var(--border-soft)]" />

      <button
        type="button"
        onClick={() => void handleSubmit("positive")}
        disabled={submitting}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-[var(--fg-muted)] transition-all hover:bg-[rgba(49,196,141,0.12)] hover:text-[var(--success-fg)] disabled:cursor-default disabled:opacity-50"
      >
        <ThumbsUp size={12} />
        On target
      </button>

      <button
        type="button"
        onClick={() => void handleSubmit("negative")}
        disabled={submitting}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-[var(--fg-muted)] transition-all hover:bg-[rgba(240,106,116,0.12)] hover:text-[#ffb7c0] disabled:cursor-default disabled:opacity-50"
      >
        <ThumbsDown size={12} />
        Off target
      </button>

      <button
        type="button"
        onClick={() => setIsVisible(false)}
        disabled={submitting}
        aria-label="Dismiss adaptive feedback prompt"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--fg-faint)] transition-all hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-50"
      >
        <X size={12} />
      </button>
    </div>
  );
}
