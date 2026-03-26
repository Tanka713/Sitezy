"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { CheckCircle2, XCircle, Loader2, Globe, Palette, Layout, Sparkles, Wand2, Zap } from "lucide-react";

const BRAND = "#6d28d9"; // purple brand
const BRAND_LIGHT = "#8b5cf6";
const BRAND_GLOW  = "rgba(109,40,217,0.25)";

const STEP_ICONS = [
  <Wand2 size={13} key="wand" />,
  <Palette size={13} key="palette" />,
  <Layout size={13} key="layout" />,
  <Sparkles size={13} key="sparkles" />,
  <Globe size={13} key="globe" />,
  <Zap size={13} key="zap" />,
];

interface Props { projectName: string; pageCount: number; }

export function GeneratingScreen({ projectName, pageCount }: Props) {
  const genStatus   = useAppStore((s) => s.generationStatus);
  const genProgress = useAppStore((s) => s.generationProgress);
  const genLog      = useAppStore((s) => s.generationLog);
  const projects    = useAppStore((s) => s.projects);
  const currentId   = useAppStore((s) => s.currentProjectId);
  const apiError    = useAppStore((s) => s.apiError);

  const project  = projects.find((p) => p.id === currentId);
  const pages    = project?.pages ?? [];
  const isDone   = genStatus === "done";
  const isError  = genStatus === "error";

  const [previewPage, setPreviewPage] = useState(0);
  const [tick, setTick] = useState(0);
  const [entered, setEntered] = useState(false);

  const successCount = genLog.filter((l) => l.type === "success").length;
  const totalSteps   = pageCount + 1;
  const pct = isDone ? 100 : Math.min(97, Math.round((successCount / Math.max(totalSteps, 1)) * 100));
  const errorMsg = genLog.filter((l) => l.type === "error").slice(-1)[0]?.msg?.replace(/^❌\s*/, "") ?? "";

  useEffect(() => { const t = setTimeout(() => setEntered(true), 60); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (isDone) return;
    const id = setInterval(() => setTick((t) => t + 1), 50);
    return () => clearInterval(id);
  }, [isDone]);
  useEffect(() => {
    if (pages.length === 0 || isDone) return;
    const id = setInterval(() => setPreviewPage((p) => (p + 1) % Math.max(pages.length, 1)), 3500);
    return () => clearInterval(id);
  }, [pages.length, isDone]);
  useEffect(() => {
    const done = pages.findIndex((p) => p.status === "done");
    if (done >= 0) setPreviewPage(done);
  }, [successCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentPage = pages[previewPage];

  return (
    <div
      className="fixed inset-0 z-50 flex overflow-hidden"
      style={{
        background: "linear-gradient(160deg,#05050a 0%,#08060f 50%,#05050a 100%)",
        opacity: entered ? 1 : 0,
        transition: "opacity 0.5s ease",
      }}
    >
      {/* ── Subtle animated noise texture ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.015 }}
        aria-hidden="true">
        <svg width="100%" height="100%">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
            <feColorMatrix type="saturate" values="0"/>
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)"/>
        </svg>
      </div>

      {/* ── Glow orbs ── */}
      <div className="absolute pointer-events-none"
        style={{
          width: 700, height: 700, borderRadius: "50%",
          background: `radial-gradient(circle,${BRAND_GLOW},transparent 65%)`,
          left: `${25 + Math.sin(tick * 0.012) * 8}%`,
          top: `${15 + Math.cos(tick * 0.009) * 7}%`,
          transform: "translate(-50%,-50%)",
          transition: "none",
        }}/>
      <div className="absolute pointer-events-none"
        style={{
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle,rgba(59,130,246,0.12),transparent 65%)",
          right: `${8 + Math.cos(tick * 0.015) * 6}%`,
          bottom: `${12 + Math.sin(tick * 0.011) * 5}%`,
          transform: "translate(50%,50%)",
          transition: "none",
        }}/>

      {/* ══════════════════════════════════════════════════════════
           LEFT — live browser preview
         ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col p-8 pr-4 relative z-10 min-w-0">

        {/* Logo row */}
        <div className="flex items-center gap-3 mb-8 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-[14px] shadow-lg"
            style={{ background: `linear-gradient(135deg,${BRAND},${BRAND_LIGHT})`, color: "#fff", boxShadow: `0 0 20px ${BRAND_GLOW}` }}>
            S
          </div>
          <span className="font-bold text-[15px] tracking-tight text-white/80">Sitezy</span>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-widest"
            style={{ background: `${BRAND}20`, color: BRAND_LIGHT, border: `1px solid ${BRAND}35` }}>
            Beta
          </span>
          <div className="flex-1"/>
          {!isDone && !isError && (
            <div className="flex items-center gap-2 text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>
              <Loader2 size={12} className="animate-spin" style={{ color: BRAND_LIGHT }}/>
              Building your site…
            </div>
          )}
          {isDone && (
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#4ade80" }}>
              <CheckCircle2 size={12}/> Ready
            </div>
          )}
        </div>

        {/* Browser mockup */}
        <div className="flex-1 flex flex-col min-h-0 rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }}>

          {/* Chrome bar */}
          <div className="flex-shrink-0 h-10 flex items-center gap-3 px-4"
            style={{ background: "rgba(255,255,255,0.035)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex gap-1.5">
              {["#ef4444","#f59e0b","#22c55e"].map((c) => (
                <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c, opacity: 0.55 }}/>
              ))}
            </div>
            {/* URL pill */}
            <div className="flex items-center gap-2 px-3 h-6 rounded-full flex-1 max-w-[260px]"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-500"
                style={{ background: isDone ? "#22c55e" : BRAND_LIGHT, opacity: 0.8 }}/>
              <span className="text-[10px] font-mono truncate" style={{ color: "rgba(255,255,255,0.28)" }}>
                {isDone
                  ? `${projectName.toLowerCase().replace(/\s+/g, "-")}.com`
                  : currentPage ? `/${currentPage.slug || currentPage.name.toLowerCase()}` : "generating…"}
              </span>
            </div>
            {/* Page tabs */}
            <div className="flex gap-1 ml-auto">
              {pages.slice(0, 5).map((p, i) => (
                <button key={p.id} onClick={() => setPreviewPage(i)}
                  className="text-[9px] px-2.5 h-5 rounded-full transition-all"
                  style={{
                    background: previewPage === i ? `${BRAND}25` : "rgba(255,255,255,0.04)",
                    color: previewPage === i ? BRAND_LIGHT : "rgba(255,255,255,0.25)",
                    border: `1px solid ${previewPage === i ? BRAND + "45" : "transparent"}`,
                  }}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Page canvas */}
          <div className="flex-1 min-h-0 relative overflow-hidden"
            style={{ background: "#0a0a12" }}>

            {/* Scan line */}
            {!isDone && !isError && (
              <div className="absolute left-0 right-0 h-px pointer-events-none z-10"
                style={{
                  top: `${(tick * 1.2) % 100}%`,
                  background: `linear-gradient(90deg,transparent,${BRAND_LIGHT}50,transparent)`,
                  boxShadow: `0 0 8px ${BRAND_LIGHT}30`,
                  transition: "none",
                }}/>
            )}

            {currentPage?.html ? (
              <iframe
                key={currentPage.id}
                srcDoc={buildMinimalPreview(currentPage.html)}
                className="w-full h-full border-none block"
                style={{
                  pointerEvents: "none",
                  filter: currentPage.status === "generating" ? "brightness(0.65) blur(0.5px)" : "none",
                  transition: "filter 0.6s ease",
                  transform: "scale(0.75)",
                  transformOrigin: "top left",
                  width: "133.33%",
                  height: "133.33%",
                }}
                sandbox="allow-scripts"
              />
            ) : (
              /* Wireframe skeleton */
              <div className="p-5 space-y-3 h-full overflow-hidden">
                {[
                  { h: 44,  label: "navbar" },
                  { h: 190, label: "hero" },
                  { h: 64,  label: "logo cloud" },
                  { h: 155, label: "features" },
                  { h: 120, label: "testimonials" },
                  { h: 90,  label: "cta" },
                  { h: 70,  label: "footer" },
                ].map((s, i) => (
                  <div key={s.label}
                    style={{
                      height: s.h,
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.04)",
                      borderRadius: 10,
                      position: "relative",
                      overflow: "hidden",
                    }}>
                    <div style={{ position: "absolute", top: 8, left: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: BRAND_LIGHT, opacity: 0.3 }}/>
                      <span style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.12em", color: BRAND_LIGHT, opacity: 0.25 }}>{s.label}</span>
                    </div>
                    {/* Skeleton bars */}
                    <div style={{ position: "absolute", bottom: 10, left: 12, right: 12 }}>
                      {Array.from({ length: Math.max(1, Math.floor(s.h / 28)) }).map((_, j) => (
                        <div key={j} style={{
                          height: 5, borderRadius: 3, marginTop: 5,
                          background: "rgba(255,255,255,0.045)",
                          width: `${52 + Math.sin(j * 2.8 + i * 1.3) * 32}%`,
                        }}/>
                      ))}
                    </div>
                    {/* Shimmer */}
                    <div style={{
                      position: "absolute", inset: 0,
                      background: `linear-gradient(90deg,transparent ${((tick * 1.5) % 160) - 40}%,rgba(255,255,255,0.03) ${((tick * 1.5) % 160)}%,transparent ${((tick * 1.5) % 160) + 40}%)`,
                      transition: "none",
                    }}/>
                  </div>
                ))}
              </div>
            )}

            {/* Done glow overlay */}
            {isDone && (
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 50% 40%,${BRAND}12,transparent 70%)` }}/>
            )}
          </div>
        </div>

        {/* Page dots */}
        {pages.length > 1 && (
          <div className="flex items-center gap-2 mt-4 justify-center flex-shrink-0">
            {pages.map((p, i) => (
              <button key={p.id} onClick={() => setPreviewPage(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: previewPage === i ? 22 : p.status === "done" ? 10 : 7,
                  height: 5,
                  background: p.status === "done"
                    ? (previewPage === i ? BRAND_LIGHT : `${BRAND}90`)
                    : p.status === "generating" ? `${BRAND_LIGHT}55`
                    : "rgba(255,255,255,0.1)",
                }}/>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
           RIGHT — status panel
         ══════════════════════════════════════════════════════════ */}
      <div className="w-[340px] flex flex-col p-8 flex-shrink-0 relative z-10"
        style={{ borderLeft: "1px solid rgba(255,255,255,0.04)" }}>

        {/* Project header */}
        <div className="mb-8">
          {/* Status badge */}
          <div className="mb-4">
            {!isDone && !isError && (
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold px-3 py-1.5 rounded-full"
                style={{ background: `${BRAND}15`, color: BRAND_LIGHT, border: `1px solid ${BRAND}30` }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: BRAND_LIGHT }}/>
                Building
              </span>
            )}
            {isDone && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full"
                style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)" }}>
                <CheckCircle2 size={11}/> Complete
              </span>
            )}
            {isError && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full"
                style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                <XCircle size={11}/> Failed
              </span>
            )}
          </div>

          <h1 className="text-[28px] font-black tracking-tight leading-tight text-white mb-2">
            {projectName}
          </h1>
          {!isDone && !isError && genProgress && (
            <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
              {genProgress}
            </p>
          )}
          {isDone && (
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              Your website is ready to edit.
            </p>
          )}
        </div>

        {/* Progress bar */}
        {!isError && (
          <div className="mb-7">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full relative overflow-hidden transition-all duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  background: isDone
                    ? "linear-gradient(90deg,#22c55e,#4ade80)"
                    : `linear-gradient(90deg,${BRAND},${BRAND_LIGHT})`,
                  boxShadow: isDone
                    ? "0 0 12px rgba(34,197,94,0.5)"
                    : `0 0 12px ${BRAND_GLOW}`,
                }}>
                {!isDone && (
                  <div className="absolute inset-0 animate-shimmer"
                    style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)", backgroundSize: "200% 100%" }}/>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                {isDone ? "All pages generated" : `${pct}%`}
              </span>
              <span className="text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.15)" }}>
                {successCount} / {totalSteps}
              </span>
            </div>
          </div>
        )}

        {/* Step list */}
        <div className="space-y-0.5 mb-6">
          <StepRow
            label="Site blueprint"
            done={successCount >= 1}
            active={!isError && successCount === 0}
            icon={STEP_ICONS[0]}
          />
          {pages.map((p, i) => (
            <StepRow
              key={p.id}
              label={p.name}
              done={p.status === "done"}
              active={p.status === "generating"}
              error={p.status === "error"}
              icon={STEP_ICONS[(i + 1) % STEP_ICONS.length]}
            />
          ))}
        </div>

        {/* Error panel */}
        {isError && (
          <div className="rounded-xl overflow-hidden mb-5" style={{ border: "1px solid rgba(239,68,68,0.18)" }}>
            <div className="px-4 py-3.5" style={{ background: "rgba(239,68,68,0.06)" }}>
              <p className="text-[12px] font-semibold mb-1" style={{ color: "#f87171" }}>Generation failed</p>
              <p className="text-[11px] leading-relaxed" style={{ color: "rgba(248,113,113,0.55)" }}>
                {apiError?.code === "ERR_BILLING"
                  ? "API credits exhausted. Please top up your balance and try again."
                  : errorMsg || "Check your API key and try again."}
              </p>
            </div>
            {(apiError?.requestId || apiError?.code) && (
              <div className="flex items-center justify-between px-4 py-2.5"
                style={{ background: "rgba(239,68,68,0.02)", borderTop: "1px solid rgba(239,68,68,0.08)" }}>
                <code className="text-[10px] font-mono truncate" style={{ color: "rgba(248,113,113,0.35)" }}>
                  {apiError?.requestId ?? apiError?.code}
                </code>
                <CopyButton text={apiError?.requestId ?? apiError?.code ?? ""} />
              </div>
            )}
          </div>
        )}

        {/* Build log */}
        <div className="flex-1 min-h-0 flex flex-col rounded-xl overflow-hidden"
          style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-2 px-3.5 py-2.5 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            {!isDone && !isError && (
              <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: BRAND_LIGHT }}/>
            )}
            <span className="text-[9px] uppercase tracking-[0.14em] font-bold" style={{ color: "rgba(255,255,255,0.15)" }}>
              Activity
            </span>
          </div>
          <div className="flex-1 overflow-auto p-3.5 space-y-1.5 font-mono text-[10px]">
            {[...genLog].reverse().slice(0, 18).map((e) => (
              <div key={e.id}
                style={{
                  color: e.type === "error"   ? "rgba(248,113,113,0.7)"
                       : e.type === "success" ? "rgba(74,222,128,0.7)"
                       : e.type === "progress" ? "rgba(255,255,255,0.38)"
                       : "rgba(255,255,255,0.18)",
                  lineHeight: 1.5,
                }}>
                {e.msg}
              </div>
            ))}
            {genLog.length === 0 && (
              <span style={{ color: "rgba(255,255,255,0.15)" }}>Starting…</span>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 1.8s linear infinite;
        }
      `}</style>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function StepRow({
  label, done, active, error, icon,
}: {
  label: string;
  done: boolean;
  active: boolean;
  error?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.035)" }}>
      {/* Icon / state indicator */}
      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-400"
        style={{
          background: done  ? "rgba(34,197,94,0.12)"
                    : error ? "rgba(239,68,68,0.1)"
                    : active ? `${BRAND}18`
                    : "rgba(255,255,255,0.04)",
          border: `1px solid ${done  ? "rgba(34,197,94,0.3)"
                              : error ? "rgba(239,68,68,0.3)"
                              : active ? `${BRAND}40`
                              : "rgba(255,255,255,0.07)"}`,
          boxShadow: active ? `0 0 8px ${BRAND_GLOW}` : "none",
          color: done  ? "#4ade80"
               : error ? "#f87171"
               : active ? BRAND_LIGHT
               : "rgba(255,255,255,0.2)",
        }}>
        {done  ? <CheckCircle2 size={11} /> :
         error ? <XCircle size={11} /> :
         active ? <Loader2 size={11} className="animate-spin" /> :
         <span style={{ opacity: 0.4 }}>{icon}</span>}
      </div>

      {/* Label */}
      <span className="text-[12px] flex-1 transition-all duration-300"
        style={{
          color: done   ? "rgba(255,255,255,0.75)"
               : error  ? "rgba(248,113,113,0.8)"
               : active ? "rgba(255,255,255,0.92)"
               : "rgba(255,255,255,0.2)",
          fontWeight: active ? 500 : 400,
        }}>
        {label}
      </span>

      {/* State tag */}
      {active && (
        <span className="text-[9px] font-medium"
          style={{ color: `${BRAND_LIGHT}80` }}>
          working…
        </span>
      )}
      {done && (
        <span className="text-[9px]" style={{ color: "rgba(74,222,128,0.45)" }}>done</span>
      )}
      {error && (
        <span className="text-[9px]" style={{ color: "rgba(248,113,113,0.5)" }}>failed</span>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })}
      className="text-[10px] px-2 py-1 rounded-lg flex-shrink-0 transition-all"
      style={{
        background: "rgba(239,68,68,0.07)",
        color: copied ? "#4ade80" : "rgba(239,68,68,0.45)",
        border: "1px solid rgba(239,68,68,0.12)",
      }}>
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
