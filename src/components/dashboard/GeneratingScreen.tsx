"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { getJobGenerationEtaLabel, getTimingEtaLabel } from "@/lib/generation-eta";
import { CheckCircle2, Copy, XCircle, Loader2 } from "lucide-react";
import { SitezyButton } from "@/components/ui/sitezy";

interface Props {
  projectName: string;
  pageCount: number;
  projectId?: string | null;
  errorActions?: ReactNode;
}

export function GeneratingScreen({ projectName, pageCount, projectId = null, errorActions = null }: Props) {
  const genStatus = useAppStore((s) => s.generationStatus);
  const genProgress = useAppStore((s) => s.generationProgress);
  const generationStartedAt = useAppStore((s) => s.generationStartedAt);
  const generationEstimateMs = useAppStore((s) => s.generationEstimateMs);
  const genLog = useAppStore((s) => s.generationLog);
  const projects = useAppStore((s) => s.projects);
  const currentId = useAppStore((s) => s.currentProjectId);
  const apiError = useAppStore((s) => s.apiError);

  const activeProjectId = projectId ?? currentId;
  const project = projects.find((p) => p.id === activeProjectId);
  const isDone = genStatus === "done";
  const isError = genStatus === "error";

  // Progress is driven by the server-side generation job — the background flow
  // never emits per-page client logs, so genLog-based counting stays at 0.
  // Page statuses are the fallback when the job snapshot isn't available yet.
  const pages = project?.pages ?? [];
  const job = project?.generationJob ?? null;
  const blueprintReady = !!project?.blueprint;
  const totalPages = Math.max(job?.totalPages ?? pages.length ?? pageCount, pageCount, 1);
  const donePages = Math.min(
    job?.completedPages ?? pages.filter((p) => p.status === "done").length,
    totalPages
  );
  const totalSteps = totalPages + 1; // blueprint + each page
  const doneSteps = (blueprintReady ? 1 : 0) + donePages;
  const pct = isDone
    ? 100
    : Math.max(3, Math.min(97, Math.round((doneSteps / Math.max(totalSteps, 1)) * 100)));
  const errorMsg = genLog.filter((l) => l.type === "error").slice(-1)[0]?.msg?.replace(/^❌\s*/, "") ?? "";
  const etaLabel =
    job?.status === "queued" || job?.status === "running"
      ? getJobGenerationEtaLabel(job, Date.now())
      : getTimingEtaLabel(generationStartedAt, generationEstimateMs, Date.now());

  const isBillingError = apiError?.code === "API_BILLING_001";
  const isAuthError = apiError?.code === "API_AUTH_001";
  const isRateLimitError = apiError?.code === "API_RATE_LIMIT_001";
  const isTimeoutError = apiError?.code === "API_TIMEOUT_001";

  const statusText = isDone
    ? "Your site is ready to open in the editor."
    : isError
    ? isBillingError
      ? "API credits are exhausted. Top up and run generation again."
      : isAuthError
      ? "Authentication failed. Reconnect your provider and retry."
      : isRateLimitError
      ? "You hit a rate limit. Wait a moment and try again."
      : isTimeoutError
      ? "The request took too long. Retry generation."
      : errorMsg || apiError?.message || "Something went wrong while generating this project."
    : genProgress || "Assembling your pages and sections…";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(91,140,255,0.14), transparent 60%), linear-gradient(180deg, #05060a 0%, #08090f 100%)" }}
    >
      <div className="w-full max-w-[400px] text-center">
        {/* Brand mark */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] border border-[rgba(91,140,255,0.3)] bg-[linear-gradient(135deg,rgba(91,140,255,0.22),rgba(122,92,255,0.14))]">
          <span className="sz-wordmark text-[17px]">S</span>
        </div>

        {/* Status pill */}
        <div className="mt-6 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={
            isError
              ? { borderColor: "rgba(240,106,116,0.2)", background: "rgba(240,106,116,0.08)", color: "#ffb7c0" }
              : isDone
              ? { borderColor: "rgba(49,196,141,0.2)", background: "rgba(49,196,141,0.08)", color: "#9fe5c6" }
              : { borderColor: "rgba(107,119,255,0.22)", background: "rgba(107,119,255,0.08)", color: "var(--text-accent)" }
          }
        >
          {isError ? <XCircle size={12} /> : isDone ? <CheckCircle2 size={12} /> : <Loader2 size={12} className="spin" />}
          {isError ? "Failed" : isDone ? "Ready" : "Building"}
        </div>

        {/* Project name */}
        <h1 className="mt-4 text-[24px] font-bold tracking-[-0.03em] text-white">{projectName}</h1>

        {/* Status line */}
        <p className="mx-auto mt-2 max-w-[340px] text-[13px] leading-6 text-white/55">{statusText}</p>

        {/* Progress */}
        {!isError ? (
          <div className="mt-6">
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: isDone
                    ? "linear-gradient(90deg, #37E6B5, #22c5a0)"
                    : "linear-gradient(90deg, #6e9bff, #7a5cff)",
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-white/40">
              <span className="tabular-nums">{pct}%</span>
              {!isDone && etaLabel ? (
                <span>{etaLabel === "Wrapping up…" ? "Finishing up…" : etaLabel}</span>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Error request id + actions */}
        {isError ? (
          <div className="mt-6 space-y-4">
            {apiError?.requestId || apiError?.code ? (
              <div className="flex items-center justify-between gap-3 rounded-[14px] border border-[rgba(240,106,116,0.14)] bg-black/20 px-3.5 py-2.5">
                <code className="truncate text-[11px] text-[#ffced3]/70">{apiError?.requestId ?? apiError?.code}</code>
                <CopyButton text={apiError?.requestId ?? apiError?.code ?? ""} />
              </div>
            ) : null}
            {errorActions ? <div className="flex flex-wrap justify-center gap-3">{errorActions}</div> : null}
          </div>
        ) : null}

        {/* Background note */}
        {!isDone && !isError ? (
          <p className="mt-6 text-[11px] leading-5 text-white/30">
            Generation runs in the background — you can leave or refresh while it finishes.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <SitezyButton
      type="button"
      variant="secondary"
      size="sm"
      onClick={() =>
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
      }
    >
      <Copy size={11} />
      {copied ? "Copied" : "Copy"}
    </SitezyButton>
  );
}
