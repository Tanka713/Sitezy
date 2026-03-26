"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useAppStore } from "@/lib/store";
import {
  CheckCircle2,
  Copy,
  Globe,
  Layout,
  Loader2,
  Palette,
  Sparkles,
  Wand2,
  XCircle,
  Zap,
} from "lucide-react";

const ACCENT = "#54d5c8";

const STEP_ICONS: ReactNode[] = [
  <Wand2 key="wand" size={13} />,
  <Palette key="palette" size={13} />,
  <Layout key="layout" size={13} />,
  <Sparkles key="sparkles" size={13} />,
  <Globe key="globe" size={13} />,
  <Zap key="zap" size={13} />,
];

interface Props {
  projectName: string;
  pageCount: number;
}

export function GeneratingScreen({ projectName, pageCount }: Props) {
  const genStatus = useAppStore((state) => state.generationStatus);
  const genProgress = useAppStore((state) => state.generationProgress);
  const genLog = useAppStore((state) => state.generationLog);
  const projects = useAppStore((state) => state.projects);
  const currentId = useAppStore((state) => state.currentProjectId);
  const apiError = useAppStore((state) => state.apiError);

  const project = projects.find((item) => item.id === currentId);
  const pages = project?.pages ?? [];
  const isDone = genStatus === "done";
  const isError = genStatus === "error";

  const [previewPage, setPreviewPage] = useState(0);
  const [tick, setTick] = useState(0);
  const [entered, setEntered] = useState(false);

  const successCount = genLog.filter((entry) => entry.type === "success").length;
  const totalSteps = pageCount + 1;
  const pct = isDone ? 100 : Math.min(97, Math.round((successCount / Math.max(totalSteps, 1)) * 100));
  const readyPages = pages.filter((page) => page.status === "done").length;
  const failedPages = pages.filter((page) => page.status === "error").length;
  const errorMsg =
    genLog
      .filter((entry) => entry.type === "error")
      .slice(-1)[0]
      ?.msg?.replace(/^❌\s*/, "") ?? "";

  useEffect(() => {
    const timeoutId = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (isDone) return;
    const intervalId = setInterval(() => setTick((value) => value + 1), 50);
    return () => clearInterval(intervalId);
  }, [isDone]);

  useEffect(() => {
    if (pages.length === 0 || isDone) return;
    const intervalId = setInterval(() => {
      setPreviewPage((value) => (value + 1) % Math.max(pages.length, 1));
    }, 3500);
    return () => clearInterval(intervalId);
  }, [pages.length, isDone]);

  useEffect(() => {
    const doneIndex = pages.findIndex((page) => page.status === "done");
    if (doneIndex >= 0) setPreviewPage(doneIndex);
  }, [successCount, pages]);

  const currentPage = pages[previewPage];
  const projectSlug = projectName.toLowerCase().trim().replace(/\s+/g, "-") || "site";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#050d14] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(84,213,200,0.12),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(130,184,255,0.12),transparent_25%),linear-gradient(180deg,#07111a_0%,#040a10_48%,#03080d_100%)]" />
        <div
          className="absolute left-[10%] top-[-12rem] h-[28rem] w-[28rem] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle,rgba(84,213,200,0.18),rgba(84,213,200,0)_70%)" }}
        />
        <div
          className="absolute right-[-8rem] top-[12%] h-[24rem] w-[24rem] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle,rgba(130,184,255,0.16),rgba(130,184,255,0)_72%)" }}
        />
        <div
          className="absolute bottom-[-10rem] left-[42%] h-[22rem] w-[30rem] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle,rgba(245,184,75,0.1),rgba(245,184,75,0)_72%)" }}
        />
        <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,0.28)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:78px_78px]" />
      </div>

      <div
        className={`relative z-10 flex h-full flex-col transition-all duration-700 lg:flex-row ${
          entered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-5 lg:pr-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/12 bg-[linear-gradient(135deg,rgba(84,213,200,0.28),rgba(245,184,75,0.2))] text-base font-semibold text-white shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
                S
              </div>
              <div>
                <p className="text-sm font-semibold tracking-[-0.03em] text-white">Sitezy Generator</p>
                <p className="mt-1 text-[0.65rem] uppercase tracking-[0.26em] text-slate-300/40">
                  Live build session
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusPill isDone={isDone} isError={isError} />
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] text-slate-200/60">
                {readyPages}/{Math.max(pageCount, 1)} pages ready
              </div>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,28,40,0.96),rgba(8,15,24,0.98))] shadow-[0_32px_90px_rgba(0,0,0,0.3)]">
              <div className="border-b border-white/8 px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-[32rem]">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-slate-200/60">
                      <Sparkles size={11} className="text-[#54d5c8]" />
                      Generator canvas
                    </div>
                    <h1 className="mt-4 text-[clamp(1.9rem,4vw,3.3rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-white">
                      {projectName}
                    </h1>
                    <p className="mt-3 max-w-[30rem] text-sm leading-7 text-slate-300/60">
                      {isDone
                        ? "The site structure is complete and the editor will open automatically."
                        : isError
                          ? "Generation stopped before the site finished. The existing pages remain available."
                          : genProgress || "Building page structure, layout rhythm, and the first complete draft."}
                    </p>
                  </div>

                  <div className="min-w-[220px] rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-slate-300/38">
                      <span>Completion</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="relative h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${pct}%`,
                          background: isDone
                            ? "linear-gradient(90deg,#22c55e,#4ade80)"
                            : "linear-gradient(90deg,#54d5c8,#82b8ff,#f5b84b)",
                          boxShadow: isDone
                            ? "0 0 18px rgba(74,222,128,0.32)"
                            : "0 0 22px rgba(84,213,200,0.25)",
                        }}
                      >
                        {!isDone && !isError && (
                          <div className="absolute inset-0 animate-generator-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.26),transparent)] [background-size:200%_100%]" />
                        )}
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: "Blueprint", value: successCount > 0 ? "Done" : "Pending" },
                        { label: "Ready", value: String(readyPages) },
                        { label: "Failed", value: String(failedPages) },
                      ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-slate-300/34">
                            {item.label}
                          </p>
                          <p className="mt-2 text-sm font-medium text-white/82">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {pages.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {pages.slice(0, 6).map((page, index) => {
                      const active = previewPage === index;
                      return (
                        <button
                          key={page.id}
                          onClick={() => setPreviewPage(index)}
                          className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                            active
                              ? "border-[#54d5c840] bg-[#54d5c814] text-white"
                              : "border-white/10 bg-white/[0.03] text-slate-300/56 hover:text-white/82"
                          }`}
                        >
                          {page.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid min-h-0 flex-1 gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:p-5">
                <div className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#07111a]/92">
                  <div className="flex h-11 items-center gap-3 border-b border-white/8 px-4">
                    <div className="flex gap-1.5">
                      {["#f87171", "#fbbf24", "#4ade80"].map((color) => (
                        <div key={color} className="h-2.5 w-2.5 rounded-full" style={{ background: color, opacity: 0.74 }} />
                      ))}
                    </div>
                    <div className="flex h-7 flex-1 items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ background: isDone ? "#4ade80" : ACCENT, opacity: 0.85 }}
                      />
                      <span className="truncate text-[10px] font-mono text-slate-300/38">
                        {isDone
                          ? `${projectSlug}.sitezy.app`
                          : currentPage
                            ? `/${currentPage.slug || currentPage.name.toLowerCase()}`
                            : "assembling-preview"}
                      </span>
                    </div>
                  </div>

                  <div className="relative min-h-0 flex-1 overflow-hidden bg-[#03090f]">
                    {!isDone && !isError && (
                      <div
                        className="pointer-events-none absolute left-0 right-0 z-10 h-px"
                        style={{
                          top: `${(tick * 1.2) % 100}%`,
                          background: "linear-gradient(90deg,transparent,rgba(84,213,200,0.72),transparent)",
                          boxShadow: "0 0 14px rgba(84,213,200,0.2)",
                        }}
                      />
                    )}

                    {currentPage?.html ? (
                      <iframe
                        key={currentPage.id}
                        srcDoc={buildMinimalPreview(currentPage.html)}
                        className="block h-full w-full border-none"
                        sandbox="allow-scripts"
                        style={{
                          pointerEvents: "none",
                          filter: currentPage.status === "generating" ? "brightness(0.72) blur(0.45px)" : "none",
                          transform: "scale(0.76)",
                          transformOrigin: "top left",
                          width: "131.6%",
                          height: "131.6%",
                          transition: "filter 0.6s ease",
                        }}
                      />
                    ) : (
                      <div className="h-full overflow-hidden p-4">
                        <div className="h-full space-y-3 rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(14,26,38,0.96),rgba(9,17,27,0.96))] p-4">
                          {[
                            { label: "hero", height: 150 },
                            { label: "content", height: 86 },
                            { label: "feature grid", height: 126 },
                            { label: "testimonial", height: 88 },
                            { label: "cta", height: 72 },
                          ].map((section, index) => (
                            <div
                              key={section.label}
                              className="relative overflow-hidden rounded-[18px] border border-white/8 bg-white/[0.03]"
                              style={{ height: section.height }}
                            >
                              <div className="absolute left-4 top-3 flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-[#54d5c8]/50" />
                                <span className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-slate-300/26">
                                  {section.label}
                                </span>
                              </div>
                              <div className="absolute inset-x-4 bottom-4 space-y-2">
                                {Array.from({ length: Math.max(2, Math.floor(section.height / 34)) }).map((_, line) => (
                                  <div
                                    key={`${section.label}-${line}`}
                                    className="h-1.5 rounded-full bg-white/[0.06]"
                                    style={{ width: `${56 + Math.sin(index * 1.5 + line * 2.1) * 26}%` }}
                                  />
                                ))}
                              </div>
                              <div
                                className="absolute inset-0 animate-generator-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)] [background-size:200%_100%]"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isDone && (
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_36%,rgba(84,213,200,0.12),transparent_72%)]" />
                    )}
                  </div>
                </div>

                <div className="flex min-h-0 flex-col gap-4">
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-slate-300/38">
                      Active page
                    </p>
                    <p className="mt-4 text-[1.35rem] font-semibold tracking-[-0.04em] text-white">
                      {currentPage?.name || "Preparing first page"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300/56">
                      {currentPage?.status === "done"
                        ? "Page HTML and sections are ready."
                        : currentPage?.status === "generating"
                          ? "The current layout draft is being assembled."
                          : currentPage?.status === "error"
                            ? "This page hit an error during generation."
                            : "Waiting for the generator queue to reach this page."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <MiniChip label={`${pages.length || pageCount} total`} />
                      <MiniChip label={`${readyPages} ready`} tone="accent" />
                      {failedPages > 0 && <MiniChip label={`${failedPages} failed`} tone="warm" />}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-slate-300/38">
                      Build notes
                    </p>
                    <div className="mt-4 space-y-3">
                      {[
                        "Blueprint first, then page generation one by one.",
                        "Pages that complete become visible here immediately.",
                        "Existing successful pages are preserved if a later step fails.",
                      ].map((line) => (
                        <div key={line} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-slate-300/60">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>

                  {pages.length > 1 && (
                    <div className="flex items-center justify-center gap-2 rounded-[28px] border border-white/10 bg-white/[0.03] px-4 py-4">
                      {pages.map((page, index) => (
                        <button
                          key={page.id}
                          onClick={() => setPreviewPage(index)}
                          className="rounded-full transition-all duration-300"
                          style={{
                            width: previewPage === index ? 24 : page.status === "done" ? 10 : 7,
                            height: 6,
                            background:
                              page.status === "done"
                                ? previewPage === index
                                  ? ACCENT
                                  : "rgba(84,213,200,0.62)"
                                : page.status === "generating"
                                  ? "rgba(130,184,255,0.52)"
                                  : "rgba(255,255,255,0.12)",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <aside className="flex min-h-0 flex-col rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,28,0.96),rgba(6,12,19,0.98))] p-4 shadow-[0_28px_84px_rgba(0,0,0,0.24)] sm:p-5">
              <div>
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-slate-300/38">
                  Status
                </p>
                <h2 className="mt-4 text-[1.7rem] font-semibold leading-[0.98] tracking-[-0.05em] text-white">
                  {isDone ? "Website ready." : isError ? "Generation paused." : "Building your site."}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-300/58">
                  {isDone
                    ? "The editor opens automatically once the final state is saved."
                    : isError
                      ? "Review the error details below, then retry the generation from the modal."
                      : genProgress || "The generator is moving through the blueprint and page queue."}
                </p>
              </div>

              {!isError && (
                <div className="mt-5 rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-slate-300/38">
                      Progress
                    </p>
                    <p className="text-sm font-medium text-white/82">
                      {successCount} / {totalSteps}
                    </p>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${pct}%`,
                        background: isDone
                          ? "linear-gradient(90deg,#22c55e,#4ade80)"
                          : "linear-gradient(90deg,#54d5c8,#82b8ff)",
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-slate-300/38">
                  Build queue
                </p>
                <div className="mt-4 space-y-1">
                  <StepRow
                    label="Site blueprint"
                    done={successCount >= 1}
                    active={!isError && successCount === 0}
                    icon={STEP_ICONS[0]}
                  />
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

              {isError && (
                <div className="mt-5 overflow-hidden rounded-[26px] border border-rose-400/20 bg-[linear-gradient(180deg,rgba(127,29,29,0.18),rgba(68,10,10,0.14))]">
                  <div className="px-4 py-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-rose-300/74">
                      Generation failed
                    </p>
                    <p className="mt-3 text-sm leading-7 text-rose-100/72">
                      {apiError?.code === "ERR_BILLING"
                        ? "API credits are exhausted. Top up the balance and run the generator again."
                        : errorMsg || "Check the API credentials or generation request and try again."}
                    </p>
                  </div>
                  {(apiError?.requestId || apiError?.code) && (
                    <div className="flex items-center justify-between gap-3 border-t border-rose-400/12 bg-black/10 px-4 py-3">
                      <code className="min-w-0 flex-1 truncate text-[10px] font-mono text-rose-200/48">
                        {apiError?.requestId ?? apiError?.code}
                      </code>
                      <CopyButton text={apiError?.requestId ?? apiError?.code ?? ""} />
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[#07111a]/84">
                <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
                  {!isDone && !isError && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#54d5c8]" />}
                  <p className="text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-slate-300/34">
                    Activity log
                  </p>
                </div>
                <div className="flex-1 overflow-auto px-4 py-4 font-mono text-[10px] leading-6">
                  {[...genLog].reverse().slice(0, 20).map((entry) => (
                    <div
                      key={entry.id}
                      className="border-b border-white/[0.04] py-1 last:border-b-0"
                      style={{
                        color:
                          entry.type === "error"
                            ? "rgba(251,113,133,0.82)"
                            : entry.type === "success"
                              ? "rgba(74,222,128,0.82)"
                              : entry.type === "progress"
                                ? "rgba(226,232,240,0.58)"
                                : "rgba(148,163,184,0.42)",
                      }}
                    >
                      {entry.msg}
                    </div>
                  ))}
                  {genLog.length === 0 && <span className="text-slate-300/28">Starting build session…</span>}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes generator-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-generator-shimmer {
          animation: generator-shimmer 1.8s linear infinite;
        }
      `}</style>
    </div>
  );
}

function StatusPill({ isDone, isError }: { isDone: boolean; isError: boolean }) {
  if (isDone) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-[11px] font-medium text-emerald-300">
        <CheckCircle2 size={13} />
        Complete
      </span>
    );
  }

  if (isError) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-[11px] font-medium text-rose-300">
        <XCircle size={13} />
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#54d5c833] bg-[#54d5c814] px-4 py-2 text-[11px] font-medium text-[#54d5c8]">
      <Loader2 size={13} className="animate-spin" />
      Building
    </span>
  );
}

function MiniChip({ label, tone = "default" }: { label: string; tone?: "default" | "accent" | "warm" }) {
  const toneClass =
    tone === "accent"
      ? "border-[#54d5c833] bg-[#54d5c814] text-[#54d5c8]"
      : tone === "warm"
        ? "border-amber-400/18 bg-amber-400/10 text-amber-200"
        : "border-white/10 bg-white/[0.04] text-slate-200/64";

  return <span className={`rounded-full border px-3 py-1.5 text-[11px] ${toneClass}`}>{label}</span>;
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
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-white/[0.05] py-3 last:border-b-0">
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl border transition-all duration-300"
        style={{
          background: done
            ? "rgba(74,222,128,0.12)"
            : error
              ? "rgba(251,113,133,0.12)"
              : active
                ? "rgba(84,213,200,0.12)"
                : "rgba(255,255,255,0.04)",
          borderColor: done
            ? "rgba(74,222,128,0.28)"
            : error
              ? "rgba(251,113,133,0.24)"
              : active
                ? "rgba(84,213,200,0.24)"
                : "rgba(255,255,255,0.08)",
          color: done
            ? "#4ade80"
            : error
              ? "#fb7185"
              : active
                ? ACCENT
                : "rgba(255,255,255,0.24)",
          boxShadow: active ? "0 0 18px rgba(84,213,200,0.15)" : "none",
        }}
      >
        {done ? (
          <CheckCircle2 size={13} />
        ) : error ? (
          <XCircle size={13} />
        ) : active ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <span className="opacity-70">{icon}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm"
          style={{
            color: done
              ? "rgba(255,255,255,0.84)"
              : error
                ? "rgba(254,205,211,0.92)"
                : active
                  ? "rgba(255,255,255,0.92)"
                  : "rgba(226,232,240,0.48)",
          }}
        >
          {label}
        </p>
      </div>

      <span
        className="text-[10px] font-medium uppercase tracking-[0.16em]"
        style={{
          color: done
            ? "rgba(74,222,128,0.62)"
            : error
              ? "rgba(251,113,133,0.64)"
              : active
                ? "rgba(84,213,200,0.74)"
                : "rgba(148,163,184,0.34)",
        }}
      >
        {done ? "Done" : error ? "Error" : active ? "Live" : "Queued"}
      </span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/14 bg-rose-300/10 px-3 py-1.5 text-[10px] font-medium text-rose-100/72 transition-colors hover:bg-rose-300/14"
    >
      <Copy size={11} />
      {copied ? "Copied" : "Copy"}
    </button>
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
