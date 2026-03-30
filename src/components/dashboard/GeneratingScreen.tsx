"use client";

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
}

export function GeneratingScreen({ projectName, pageCount }: Props) {
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-[linear-gradient(180deg,#06070b_0%,#090b10_100%)]">
      <div className="absolute left-[12%] top-[8%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(107,119,255,0.18),transparent_68%)] blur-3xl" />
      <div className="absolute bottom-[6%] right-[10%] h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(48,198,160,0.12),transparent_68%)] blur-3xl" />

      <div className="relative flex min-h-screen flex-col">
        <header className="sz-topbar flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(129,140,255,0.24),rgba(107,119,255,0.1))] shadow-[0_14px_30px_rgba(65,78,255,0.22)]">
              <span className="text-[16px] font-semibold tracking-[-0.04em]">S</span>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/24">Generation</p>
              <p className="text-[16px] font-semibold tracking-[-0.03em]">{projectName}</p>
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
            <div className="max-w-[780px] space-y-5">
              <SitezyBadge>{isDone ? "Complete" : "In progress"}</SitezyBadge>
              <h1 className="text-[44px] font-semibold leading-[0.98] tracking-[-0.05em] md:text-[64px]">
                {isDone ? "Your website is ready." : "Your site is taking shape."}
              </h1>
              <p className="max-w-[620px] text-[16px] leading-8 text-[var(--text-secondary)]">
                {isDone
                  ? "The generated project is ready to open in the visual editor."
                  : genProgress || "Structure, pages, and sections are being assembled into a full editable project."}
              </p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[12px] uppercase tracking-[0.18em] text-white/24">
                  <span>Live preview</span>
                </div>
                {!isError ? (
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-[var(--text-tertiary)]">{pct}%</span>
                    <div className="h-2 w-40 overflow-hidden rounded-full bg-white/[0.08]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#7a85ff,#5a66ff)] transition-all duration-500"
                        style={{ width: `${pct}%` }}
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
            <SitezyCard className="p-6">
              <div className="space-y-5">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/24">Progress</p>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <Metric title="Completed" value={`${successCount}`} detail={`of ${totalSteps} stages`} />
                  <Metric title="Pages" value={`${pageCount}`} detail="targeted for generation" />
                  <Metric title="Status" value={isDone ? "Ready" : isError ? "Error" : "Building"} detail={isDone ? "open in editor next" : "live assembly"} />
                </div>
              </div>
            </SitezyCard>

            <SitezyCard className="p-6">
              <div className="space-y-5">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/24">Pipeline</p>
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
              <div className="border-b border-white/[0.06] px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/24">Activity</p>
              </div>
              <div className="flex-1 overflow-auto px-5 py-4">
                <div className="space-y-2 font-mono text-[11px]">
                  {[...genLog].reverse().slice(0, 18).map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-[16px] border px-3 py-2 ${
                        entry.type === "error"
                          ? "border-[rgba(240,106,116,0.12)] bg-[rgba(240,106,116,0.05)] text-[#ffced3]/85"
                          : entry.type === "success"
                          ? "border-[rgba(49,196,141,0.12)] bg-[rgba(49,196,141,0.05)] text-[#b7f1d3]/82"
                          : "border-white/[0.05] bg-white/[0.03] text-white/44"
                      }`}
                    >
                      {entry.msg}
                    </div>
                  ))}
                  {genLog.length === 0 ? <div className="text-white/20">Starting...</div> : null}
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
    <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.03] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/24">{title}</p>
      <p className="mt-3 text-[28px] font-semibold tracking-[-0.04em]">{value}</p>
      <p className="mt-2 text-[12px] text-[var(--text-tertiary)]">{detail}</p>
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
    <div className="flex items-center gap-4 rounded-[18px] border border-white/[0.05] bg-white/[0.03] px-4 py-3">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-[14px] border ${
          done
            ? "border-[rgba(49,196,141,0.22)] bg-[rgba(49,196,141,0.12)] text-[#9fe5c6]"
            : error
            ? "border-[rgba(240,106,116,0.22)] bg-[rgba(240,106,116,0.12)] text-[#ffb7c0]"
            : active
            ? "border-accent-400/24 bg-accent-500/14 text-[var(--text-accent)]"
            : "border-white/[0.07] bg-white/[0.02] text-white/26"
        }`}
      >
        {done ? <CheckCircle2 size={14} /> : error ? <XCircle size={14} /> : active ? <Loader2 size={14} className="spin" /> : icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-[var(--text-primary)]">{label}</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          {done ? "Done" : error ? "Failed" : active ? "Working" : "Queued"}
        </p>
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
