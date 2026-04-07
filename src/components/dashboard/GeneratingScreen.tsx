"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  CheckCircle2,
  Copy,
  XCircle,
  Loader2,
  Globe,
  Palette,
  Layout,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { SitezyBadge, SitezyButton, SitezyCard } from "@/components/ui/sitezy";

const STEP_ICONS = [
  <Wand2 size={14} key="wand" />,
  <Palette size={14} key="palette" />,
  <Layout size={14} key="layout" />,
  <Sparkles size={14} key="sparkles" />,
  <Globe size={14} key="globe" />,
  <Zap size={14} key="zap" />,
];

interface Props {
  projectName: string;
  pageCount: number;
  errorActions?: ReactNode;
}

export function GeneratingScreen({ projectName, pageCount, errorActions = null }: Props) {
  const genStatus = useAppStore((s) => s.generationStatus);
  const genProgress = useAppStore((s) => s.generationProgress);
  const genLog = useAppStore((s) => s.generationLog);
  const projects = useAppStore((s) => s.projects);
  const currentId = useAppStore((s) => s.currentProjectId);
  const apiError = useAppStore((s) => s.apiError);

  const project = projects.find((p) => p.id === currentId);
  const pages = project?.pages ?? [];
  const isDone = genStatus === "done";
  const isError = genStatus === "error";

  const [previewPage, setPreviewPage] = useState(0);
  const [tick, setTick] = useState(0);

  const successCount = genLog.filter((l) => l.type === "success").length;
  const totalSteps = pageCount + 1;
  const pct = isDone ? 100 : Math.min(97, Math.round((successCount / Math.max(totalSteps, 1)) * 100));
  const errorMsg = genLog.filter((l) => l.type === "error").slice(-1)[0]?.msg?.replace(/^❌\s*/, "") ?? "";

  useEffect(() => {
    if (isDone) return;
    const id = setInterval(() => setTick((value) => value + 1), 50);
    return () => clearInterval(id);
  }, [isDone]);

  useEffect(() => {
    if (pages.length === 0 || isDone) return;
    const id = setInterval(() => setPreviewPage((pageIndex) => (pageIndex + 1) % Math.max(pages.length, 1)), 3600);
    return () => clearInterval(id);
  }, [pages.length, isDone]);

  useEffect(() => {
    const doneIndex = pages.findIndex((page) => page.status === "done");
    if (doneIndex >= 0) setPreviewPage(doneIndex);
  }, [successCount, pages]);

  const currentPage = pages[previewPage];
  const isBillingError = apiError?.code === "API_BILLING_001";
  const isAuthError = apiError?.code === "API_AUTH_001";
  const isRateLimitError = apiError?.code === "API_RATE_LIMIT_001";
  const isTimeoutError = apiError?.code === "API_TIMEOUT_001";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{
      background: "radial-gradient(ellipse 70% 40% at 20% 10%, rgba(91,140,255,0.22), transparent 60%), radial-gradient(ellipse 60% 50% at 80% 90%, rgba(122,92,255,0.14), transparent 60%), linear-gradient(180deg, #05060a 0%, #08090f 100%)"
    }}>
      {/* Animated atmosphere orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-[4%] h-[500px] w-[500px] rounded-full opacity-70"
          style={{ background: "radial-gradient(circle, rgba(91,140,255,0.2), transparent 68%)", filter: "blur(40px)", animation: "orb-pulse 8s ease-in-out infinite" }} />
        <div className="absolute bottom-[4%] right-[8%] h-[380px] w-[380px] rounded-full opacity-60"
          style={{ background: "radial-gradient(circle, rgba(122,92,255,0.18), transparent 68%)", filter: "blur(40px)", animation: "orb-pulse 10s ease-in-out infinite 2s" }} />
        <div className="absolute bottom-[30%] left-[40%] h-[260px] w-[260px] rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, rgba(48,198,160,0.12), transparent 68%)", filter: "blur(30px)", animation: "orb-pulse 12s ease-in-out infinite 4s" }} />
      </div>

      <div className="relative flex min-h-screen flex-col">
        <header className="sz-topbar flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[rgba(91,140,255,0.3)] bg-[linear-gradient(135deg,rgba(91,140,255,0.22),rgba(122,92,255,0.14))] shadow-[0_0_0_1px_rgba(91,140,255,0.12),0_12px_28px_rgba(65,78,255,0.24)]">
              <span className="sz-wordmark text-[16px]">S</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/22">Generating</p>
              <p className="text-[16px] font-bold tracking-[-0.04em]">{projectName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isError ? (
              <SitezyBadge className={isDone ? "bg-[rgba(49,196,141,0.12)] text-[#9fe5c6]" : "bg-[rgba(107,119,255,0.14)] text-[var(--text-accent)]"}>
                {isDone ? <CheckCircle2 size={12} /> : <Loader2 size={12} className="spin" />}
                {isDone ? "Ready" : "Building"}
              </SitezyBadge>
            ) : (
              <SitezyBadge className="bg-[rgba(240,106,116,0.12)] text-[#ffb7c0]">
                <XCircle size={12} />
                Failed
              </SitezyBadge>
            )}
          </div>
        </header>

        <div className="grid flex-1 gap-8 px-8 pb-8 pt-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex min-h-0 flex-col gap-6">
            <div className="max-w-[780px] space-y-6">
              <SitezyBadge className={isDone ? "sz-status-success" : "sz-status-info"}>
                {isDone ? <CheckCircle2 size={11} /> : <Loader2 size={11} className="spin" />}
                {isDone ? "Complete" : "In progress"}
              </SitezyBadge>
              <h1 className="text-[clamp(2.8rem,6vw,5.5rem)] font-bold leading-[0.92] tracking-[-0.06em]">
                {isDone
                  ? <>Your website<br /><span className="bg-gradient-to-r from-[#e2f1ff] via-[#b4ceff] to-[#9aabff] bg-clip-text text-transparent">is ready.</span></>
                  : <>Your site is<br /><span className="bg-gradient-to-r from-white via-[#c4d3ff] to-[#a0aaff] bg-clip-text text-transparent">taking shape.</span></>}
              </h1>
              <p className="max-w-[560px] text-[16px] leading-[1.8] text-white/52 tracking-[-0.01em]">
                {isDone
                  ? "The generated project is ready to open in the editor."
                  : genProgress || "Structure, pages, and sections are being assembled into a full editable project."}
              </p>
              {isError && errorActions ? (
                <div className="flex flex-wrap gap-3">
                  {errorActions}
                </div>
              ) : null}
              {!isDone && !isError ? (
                <div className="inline-flex max-w-[620px] items-start gap-2 rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface-elevated)] px-4 py-3 text-[13px] leading-6 text-[var(--text-secondary)]">
                  <span className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-amber-400" />
                  <span>
                    Background generation is active. You can refresh, leave, or sign out while it keeps running.
                  </span>
                </div>
              ) : null}
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/22">
                  <div className={`h-1.5 w-1.5 rounded-full ${!isDone && !isError ? "animate-pulse bg-[#8faeff]" : isDone ? "bg-emerald-400" : "bg-[#ff7b7b]"}`} />
                  <span>Live preview</span>
                </div>
                {!isError ? (
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-bold tabular-nums text-white/48">{pct}%</span>
                    <div className="relative h-2.5 w-48 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: isDone
                            ? "linear-gradient(90deg, #37E6B5, #22c5a0)"
                            : "linear-gradient(90deg, #6e9bff, #7a5cff)",
                          boxShadow: isDone ? "0 0 10px rgba(55,230,181,0.5)" : "0 0 10px rgba(110,155,255,0.4)",
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <SitezyCard className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-0">
                <div className="flex h-14 items-center gap-3 border-b border-white/[0.06] bg-black/16 px-5">
                  <div className="flex gap-1.5">
                    {["#ef4444", "#f59e0b", "#22c55e"].map((color) => (
                      <span key={color} className="h-2.5 w-2.5 rounded-full opacity-60" style={{ background: color }} />
                    ))}
                  </div>
                  <div className="flex h-8 items-center rounded-full border border-white/[0.06] bg-white/[0.03] px-4 text-[11px] text-white/30">
                    {isDone
                      ? `${projectName.toLowerCase().replace(/\s+/g, "-")}.com`
                      : currentPage
                      ? `/${currentPage.slug || currentPage.name.toLowerCase()}`
                      : "building..."}
                  </div>
                </div>

                <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(107,119,255,0.08),transparent_24%),#0a0c12]">
                  {!isDone && !isError ? (
                    <div
                      className="absolute left-0 right-0 z-10 h-px"
                      style={{
                        top: `${(tick * 1.1) % 100}%`,
                        background: "linear-gradient(90deg,transparent,rgba(120,138,255,0.5),transparent)",
                        boxShadow: "0 0 8px rgba(120,138,255,0.24)",
                      }}
                    />
                  ) : null}

                  <div className="absolute inset-6">
                    {currentPage?.html ? (
                      <iframe
                        key={currentPage.id}
                        srcDoc={buildMinimalPreview(currentPage.html)}
                        className="block h-full w-full rounded-[24px] border-none bg-white shadow-[0_24px_54px_rgba(0,0,0,0.3)]"
                        style={{
                          pointerEvents: "none",
                          filter: currentPage.status === "generating" ? "brightness(0.72) blur(0.8px)" : "none",
                        }}
                        sandbox="allow-scripts"
                      />
                    ) : (
                      <div className="grid h-full gap-4 rounded-[24px] border border-white/[0.06] bg-[rgba(255,255,255,0.02)] p-6">
                        {[44, 180, 80, 150, 110].map((height, index) => (
                          <div key={height} className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-4">
                            <div className="h-3 w-16 rounded-full bg-white/[0.08]" />
                            <div className="mt-4 rounded-[18px] bg-white/[0.05]" style={{ height }} />
                            {index === 1 ? <div className="mt-4 h-4 w-3/4 rounded-full bg-white/[0.06]" /> : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </SitezyCard>

              {pages.length > 1 ? (
                <div className="mt-4 flex items-center justify-center gap-2">
                  {pages.map((page, index) => (
                    <button
                      key={page.id}
                      onClick={() => setPreviewPage(index)}
                      className="rounded-full transition-all"
                      style={{
                        width: previewPage === index ? 22 : 8,
                        height: 8,
                        background:
                          page.status === "done"
                            ? previewPage === index
                              ? "rgba(120,138,255,0.95)"
                              : "rgba(120,138,255,0.42)"
                            : page.status === "generating"
                            ? "rgba(120,138,255,0.32)"
                            : "rgba(255,255,255,0.12)",
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-6">
            <SitezyCard className="p-5">
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/20">Progress</p>
                <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
                  <Metric title="Completed" value={`${successCount}`} detail={`of ${totalSteps} stages`} />
                  <Metric title="Pages" value={`${pageCount}`} detail="targeted" />
                  <Metric title="Status" value={isDone ? "Ready" : isError ? "Error" : "Active"} detail={isDone ? "open in editor" : "live assembly"} />
                </div>
              </div>
            </SitezyCard>

            <SitezyCard className="p-5">
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/20">Pipeline</p>
                <div className="space-y-2">
                  <StepRow label="Site blueprint" done={successCount >= 1} active={!isError && successCount === 0} icon={STEP_ICONS[0]} />
                  {pages.map((page, index) => (
                    <StepRow
                      key={page.id}
                      label={page.name}
                      done={page.status === "done"}
                      active={page.status === "generating"}
                      error={page.status === "error"}
                      icon={STEP_ICONS[(index + 1) % STEP_ICONS.length]}
                    />
                  ))}
                </div>
              </div>
            </SitezyCard>

            {isError ? (
              <SitezyCard className="border-[rgba(240,106,116,0.16)] bg-[rgba(240,106,116,0.06)] p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#ffb7c0]">Generation failed</p>
                    <p className="mt-3 text-[14px] leading-7 text-[#ffced3]">
                      {isBillingError
                        ? "API credits are exhausted. Top up and run generation again."
                        : isAuthError
                        ? "Authentication failed. Reconnect your provider and retry."
                        : isRateLimitError
                        ? "You hit a rate limit. Wait a moment and try again."
                        : isTimeoutError
                        ? "The request took too long. Retry generation."
                        : errorMsg || apiError?.message || "Something went wrong while generating this project."}
                    </p>
                  </div>
                  {apiError?.requestId || apiError?.code ? (
                    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-[rgba(240,106,116,0.12)] bg-black/12 px-4 py-3">
                      <code className="truncate text-[11px] text-[#ffced3]/70">{apiError?.requestId ?? apiError?.code}</code>
                      <CopyButton text={apiError?.requestId ?? apiError?.code ?? ""} />
                    </div>
                  ) : null}
                </div>
              </SitezyCard>
            ) : null}

            <SitezyCard className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/20">Activity</p>
                {!isDone && !isError && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#8faeff] animate-pulse" />}
              </div>
              <div className="flex-1 overflow-auto px-4 py-3">
                <div className="space-y-1.5 font-mono text-[11px]">
                  {[...genLog].reverse().slice(0, 18).map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-[12px] border px-3 py-2 leading-[1.6] ${
                        entry.type === "error"
                          ? "border-[rgba(240,106,116,0.1)] bg-[rgba(240,106,116,0.04)] text-[#ffced3]/75"
                          : entry.type === "success"
                          ? "border-[rgba(49,196,141,0.1)] bg-[rgba(49,196,141,0.04)] text-[#b7f1d3]/70"
                          : "border-white/[0.04] bg-white/[0.02] text-white/36"
                      }`}
                    >
                      {entry.msg}
                    </div>
                  ))}
                  {genLog.length === 0 ? <div className="px-1 text-white/18 italic">Starting…</div> : null}
                </div>
              </div>
            </SitezyCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-[22px] border border-white/[0.07] px-4 py-4"
      style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/24">{title}</p>
      <p className="mt-2.5 text-[32px] font-bold tracking-[-0.05em] leading-none">{value}</p>
      <p className="mt-2 text-[11px] font-medium text-white/32 tracking-[-0.005em]">{detail}</p>
    </div>
  );
}

function StepRow({
  label,
  done,
  active,
  error,
  icon,
}: {
  label: string;
  done: boolean;
  active: boolean;
  error?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className={`flex items-center gap-3.5 rounded-[16px] border px-3.5 py-3 transition-all duration-300 ${
      done
        ? "border-[rgba(49,196,141,0.14)] bg-[rgba(49,196,141,0.05)]"
        : error
        ? "border-[rgba(240,106,116,0.14)] bg-[rgba(240,106,116,0.05)]"
        : active
        ? "border-[rgba(91,140,255,0.2)] bg-[rgba(91,140,255,0.06)]"
        : "border-white/[0.05] bg-white/[0.02]"
    }`}>
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[12px] border ${
          done
            ? "border-[rgba(49,196,141,0.25)] bg-[rgba(49,196,141,0.14)] text-[#9fe5c6]"
            : error
            ? "border-[rgba(240,106,116,0.25)] bg-[rgba(240,106,116,0.14)] text-[#ffb7c0]"
            : active
            ? "border-[rgba(91,140,255,0.28)] bg-[rgba(91,140,255,0.18)] text-[#aab4ff]"
            : "border-white/[0.07] bg-white/[0.025] text-white/24"
        }`}
      >
        {done ? <CheckCircle2 size={13} /> : error ? <XCircle size={13} /> : active ? <Loader2 size={13} className="spin" /> : icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[13px] font-semibold tracking-[-0.01em] ${done ? "text-white/80" : active ? "text-white/90" : "text-white/48"}`}>{label}</p>
      </div>
      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${
        done ? "bg-[rgba(49,196,141,0.14)] text-[#9fe5c6]"
        : error ? "bg-[rgba(240,106,116,0.14)] text-[#ffb7c0]"
        : active ? "bg-[rgba(91,140,255,0.16)] text-[#aab4ff]"
        : "bg-white/[0.04] text-white/20"
      }`}>
        {done ? "Done" : error ? "Error" : active ? "Active" : "Queue"}
      </span>
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

function buildMinimalPreview(html: string): string {
  return `<!DOCTYPE html><html><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{overflow:hidden;pointer-events:none}
  img{max-width:100%;height:auto}
</style>
</head><body>${html}</body></html>`;
}
