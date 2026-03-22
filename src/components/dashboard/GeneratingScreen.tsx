"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

const C = "#f97316"; // brand orange

const STEPS = [
  { id: "brief",    label: "Reading your brief",       icon: "◈" },
  { id: "brand",    label: "Defining brand identity",  icon: "⬡" },
  { id: "layout",   label: "Planning architecture",    icon: "▣" },
  { id: "palette",  label: "Building color system",    icon: "◉" },
  { id: "generate", label: "Generating pages",         icon: "◈" },
  { id: "polish",   label: "Polishing details",        icon: "⬡" },
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

  // Track which page is currently generating for live preview
  const [previewPage, setPreviewPage] = useState<number>(0);
  const [tick, setTick] = useState(0);
  const [entered, setEntered] = useState(false);

  const successCount = genLog.filter((l) => l.type === "success").length;
  const totalSteps   = pageCount + 1;
  const pct          = isDone ? 100 : Math.min(97, Math.round((successCount / Math.max(totalSteps, 1)) * 100));

  const errorMsg = genLog.filter((l) => l.type === "error").slice(-1)[0]?.msg?.replace(/^❌\s*/, "") ?? "";

  // Entrance animation
  useEffect(() => { const t = setTimeout(() => setEntered(true), 50); return () => clearTimeout(t); }, []);

  // Tick for animations
  useEffect(() => {
    if (isDone) return;
    const id = setInterval(() => setTick(t => t + 1), 60);
    return () => clearInterval(id);
  }, [isDone]);

  // Auto-cycle preview pages
  useEffect(() => {
    if (pages.length === 0 || isDone) return;
    const id = setInterval(() => setPreviewPage(p => (p + 1) % Math.max(pages.length, 1)), 3000);
    return () => clearInterval(id);
  }, [pages.length, isDone]);

  // Show the page that just completed
  useEffect(() => {
    const done = pages.findIndex((p) => p.status === "done");
    if (done >= 0) setPreviewPage(done);
  }, [successCount]);

  const currentPage  = pages[previewPage];
  const hasAnyPage   = pages.some((p) => p.html);
  const donePagesArr = pages.filter((p) => p.status === "done");

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex"
      style={{
        background: "linear-gradient(135deg, #06060a 0%, #0a0814 50%, #06060a 100%)",
        opacity: entered ? 1 : 0,
        transition: "opacity 0.4s ease",
      }}>

      {/* ── Animated grid background ───────────────────────────────────────── */}
      <div className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `linear-gradient(${C}50 1px,transparent 1px),linear-gradient(90deg,${C}50 1px,transparent 1px)`,
          backgroundSize: "48px 48px",
          transform: `translateY(${(tick * 0.3) % 48}px)`,
          transition: "none",
        }}/>

      {/* ── Glow orbs ─────────────────────────────────────────────────────── */}
      <div className="absolute w-[600px] h-[600px] rounded-full opacity-[0.08] pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${C}, transparent 70%)`,
          left: `${30 + Math.sin(tick * 0.015) * 10}%`,
          top: `${20 + Math.cos(tick * 0.012) * 8}%`,
          transform: "translate(-50%,-50%)",
          transition: "none",
        }}/>
      <div className="absolute w-[400px] h-[400px] rounded-full opacity-[0.06] pointer-events-none"
        style={{
          background: `radial-gradient(circle, #6366f1, transparent 70%)`,
          right: `${10 + Math.cos(tick * 0.018) * 8}%`,
          bottom: `${15 + Math.sin(tick * 0.014) * 6}%`,
          transform: "translate(50%,50%)",
          transition: "none",
        }}/>

      {/* ── Left panel — live page preview ────────────────────────────────── */}
      <div className="flex-1 flex flex-col p-8 pr-0 relative z-10">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[14px] font-black"
            style={{ background: `${C}20`, color: C, border: `1px solid ${C}40` }}>✦</div>
          <span className="text-[13px] font-semibold text-white/60">Sitezy</span>
          <div className="flex-1"/>
          {!isDone && !isError && (
            <div className="flex items-center gap-2 text-[11px] text-white/30">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C }}/>
              Building…
            </div>
          )}
        </div>

        {/* Browser mockup with live page */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Browser chrome */}
          <div className="rounded-t-2xl overflow-hidden border border-white/[0.1] border-b-0 flex-shrink-0"
            style={{ background: "#111118" }}>
            <div className="h-9 flex items-center gap-3 px-4 border-b border-white/[0.06]">
              <div className="flex gap-1.5">
                {["#ef4444","#f59e0b","#22c55e"].map((c) => (
                  <div key={c} style={{ width:10, height:10, borderRadius:"50%", background:c, opacity:0.7 }}/>
                ))}
              </div>
              {/* URL bar */}
              <div className="flex-1 max-w-xs h-5 rounded-full flex items-center px-3 gap-2"
                style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isDone ? "#22c55e" : C, opacity: 0.8 }}/>
                <span className="text-[10px] text-white/30 font-mono truncate">
                  {isDone
                    ? `${projectName.toLowerCase().replace(/\s+/g,"-")}.com`
                    : currentPage ? `/${currentPage.slug||currentPage.name.toLowerCase()}` : "generating…"}
                </span>
              </div>
              {/* Page tabs */}
              <div className="flex gap-1 ml-auto">
                {pages.slice(0,5).map((p, i) => (
                  <button key={p.id} onClick={() => setPreviewPage(i)}
                    className="text-[9px] px-2 py-0.5 rounded transition-all"
                    style={{
                      background: previewPage===i ? `${C}20` : "rgba(255,255,255,0.04)",
                      color: previewPage===i ? C : "rgba(255,255,255,0.3)",
                      border: `1px solid ${previewPage===i ? C+"40" : "transparent"}`,
                    }}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Page content area */}
          <div className="flex-1 min-h-0 rounded-b-2xl overflow-hidden border border-white/[0.1] border-t-0 relative"
            style={{ background: "#0d0d14" }}>

            {/* Scan line when generating */}
            {!isDone && !isError && (
              <div className="absolute left-0 right-0 h-px pointer-events-none z-10"
                style={{
                  top: `${(tick * 1.5) % 100}%`,
                  background: `linear-gradient(90deg,transparent,${C}60,transparent)`,
                  boxShadow: `0 0 12px ${C}40`,
                  transition: "none",
                }}/>
            )}

            {/* Live iframe preview if page has HTML */}
            {currentPage?.html ? (
              <iframe
                key={currentPage.id}
                srcDoc={buildMinimalPreview(currentPage.html)}
                className="w-full h-full border-none block"
                style={{
                  pointerEvents: "none",
                  filter: currentPage.status === "generating" ? "brightness(0.7)" : "none",
                  transition: "filter 0.5s",
                  transform: `scale(0.75)`,
                  transformOrigin: "top left",
                  width: "133.33%",
                  height: "133.33%",
                }}
                sandbox="allow-scripts"
              />
            ) : (
              /* Wireframe skeleton */
              <div className="p-4 space-y-3 overflow-hidden h-full">
                {[
                  { h: 48,  label: "navbar",       delay: 0 },
                  { h: 200, label: "hero",          delay: 0.1 },
                  { h: 72,  label: "logo cloud",    delay: 0.2 },
                  { h: 160, label: "features",      delay: 0.3 },
                  { h: 130, label: "testimonials",  delay: 0.4 },
                  { h: 100, label: "cta",           delay: 0.5 },
                  { h: 80,  label: "footer",        delay: 0.6 },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg relative overflow-hidden"
                    style={{
                      height: s.h,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      animationDelay: `${s.delay}s`,
                    }}>
                    <div className="absolute top-2 left-3 flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full" style={{ background: C, opacity: 0.4 }}/>
                      <span className="text-[8px] uppercase tracking-widest" style={{ color: C, opacity: 0.35 }}>{s.label}</span>
                    </div>
                    {/* Skeleton lines */}
                    <div className="absolute inset-x-3 bottom-3 space-y-1.5">
                      {Array.from({ length: Math.max(1, Math.floor(s.h / 30)) }).map((_, j) => (
                        <div key={j} className="h-1.5 rounded-full"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            width: `${55 + Math.sin(j * 3.7) * 35}%`,
                          }}/>
                      ))}
                    </div>
                    {/* Shimmer */}
                    <div className="absolute inset-0"
                      style={{
                        background: `linear-gradient(90deg,transparent ${((tick*2)%140)-30}%,rgba(255,255,255,0.04) ${((tick*2)%140)}%,transparent ${((tick*2)%140)+30}%)`,
                        transition: "none",
                      }}/>
                  </div>
                ))}
              </div>
            )}

            {/* Done overlay */}
            {isDone && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ background: `radial-gradient(circle at 50% 50%, ${C}18, transparent 70%)` }}>
              </div>
            )}
          </div>
        </div>

        {/* Page progress dots */}
        <div className="flex items-center gap-2 mt-4 justify-center">
          {pages.map((p, i) => (
            <button key={p.id} onClick={() => setPreviewPage(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: previewPage===i ? 20 : p.status==="done" ? 12 : 8,
                height: 6,
                background: p.status==="done" ? C
                  : p.status==="generating" ? `${C}60`
                  : "rgba(255,255,255,0.12)",
              }}/>
          ))}
        </div>
      </div>

      {/* ── Right panel — status ────────────────────────────────────────────── */}
      <div className="w-[360px] flex flex-col p-8 relative z-10 flex-shrink-0" style={{ borderLeft: "1px solid rgba(255,255,255,0.05)" }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-black"
            style={{ background: `${C}18`, color: C, border: `1px solid ${C}30` }}>✦</div>
          <span className="text-[12px] font-semibold tracking-tight" style={{ color: "rgba(255,255,255,0.35)" }}>Sitezy</span>
        </div>

        {/* Project title + status badge */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            {!isDone && !isError && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: `${C}15`, color: C, border: `1px solid ${C}30` }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C }}/>
                Building
              </span>
            )}
            {isDone && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }}>
                <span>✓</span> Complete
              </span>
            )}
            {isError && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                <span>✕</span> Failed
              </span>
            )}
          </div>
          <h1 className="text-[26px] font-black text-white leading-tight tracking-tight">
            {projectName}
          </h1>
          {!isDone && !isError && genProgress && (
            <p className="text-[12px] mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
              {genProgress}
            </p>
          )}
        </div>

        {/* Progress bar */}
        {!isError && (
          <div className="mb-7">
            <div className="h-[3px] rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full relative overflow-hidden transition-all duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  background: isDone
                    ? "linear-gradient(90deg,#22c55e,#4ade80)"
                    : `linear-gradient(90deg,${C}cc,${C})`,
                  boxShadow: isDone ? "0 0 10px rgba(34,197,94,0.5)" : `0 0 10px ${C}50`,
                }}>
                {!isDone && (
                  <div className="absolute inset-0"
                    style={{
                      background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.3) 50%,transparent 100%)",
                      animation: "shimmer 1.5s infinite",
                    }}/>
                )}
              </div>
            </div>
            <div className="flex justify-between text-[10px]">
              <span style={{ color: "rgba(255,255,255,0.2)" }}>{isDone ? "All pages ready" : `${pct}% complete`}</span>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>{successCount} / {totalSteps}</span>
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-1 mb-6">
          <Step label="Site blueprint" done={successCount >= 1} active={!isError && successCount === 0} color={C} />
          {pages.map((p) => (
            <Step key={p.id} label={p.name} done={p.status === "done"} active={p.status === "generating"} error={p.status === "error"} color={C} />
          ))}
        </div>

        {/* Error panel */}
        {isError && (
          <div className="rounded-xl overflow-hidden mb-5" style={{ border: "1px solid rgba(239,68,68,0.2)" }}>
            <div className="px-4 py-3.5" style={{ background: "rgba(239,68,68,0.07)" }}>
              <p className="text-[12px] font-semibold mb-1" style={{ color: "#f87171" }}>Generation failed</p>
              <p className="text-[11px] leading-relaxed" style={{ color: "rgba(239,100,100,0.65)" }}>
                {apiError?.code === "ERR_BILLING"
                  ? "API credit balance is too low. Please upgrade or add credits to continue."
                  : errorMsg || "Check your API key and try again"}
              </p>
            </div>
            {(apiError?.requestId || apiError?.code) && (
              <div className="flex items-center justify-between gap-2 px-4 py-2.5" style={{ background: "rgba(239,68,68,0.03)", borderTop: "1px solid rgba(239,68,68,0.1)" }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[9px] font-bold tracking-widest uppercase flex-shrink-0" style={{ color: "rgba(239,68,68,0.35)" }}>Ref</span>
                  <code className="text-[10px] font-mono truncate" style={{ color: "rgba(239,100,100,0.45)" }}>{apiError?.requestId ?? apiError?.code}</code>
                </div>
                <CopyButton text={apiError?.requestId ?? apiError?.code ?? ""} />
              </div>
            )}
          </div>
        )}

        {/* Build log */}
        <div className="flex-1 min-h-0 rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.045)" }}>
          <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            {!isDone && !isError && <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: C }}/>}
            <span className="text-[9px] uppercase tracking-[0.12em] font-semibold" style={{ color: "rgba(255,255,255,0.18)" }}>Build log</span>
          </div>
          <div className="p-3 space-y-1.5 overflow-auto max-h-[160px] font-mono text-[10px]">
            {[...genLog].reverse().slice(0, 15).map((e) => (
              <div key={e.id} style={{
                color: e.type==="error" ? "rgba(248,113,113,0.75)"
                  : e.type==="success" ? "rgba(74,222,128,0.75)"
                  : e.type==="progress" ? "rgba(255,255,255,0.4)"
                  : "rgba(255,255,255,0.2)"
              }}>{e.msg}</div>
            ))}
            {genLog.length === 0 && <span style={{ color: "rgba(255,255,255,0.18)" }}>Starting…</span>}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer { from{transform:translateX(-100%)} to{transform:translateX(200%)} }
      `}</style>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
      className="text-[10px] px-2 py-1 rounded-lg flex-shrink-0 transition-all"
      style={{ background: "rgba(239,68,68,0.08)", color: copied ? "#4ade80" : "rgba(239,68,68,0.5)", border: "1px solid rgba(239,68,68,0.15)" }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Step({ label, done, active, error, color }: {
  label: string; done: boolean; active: boolean; error?: boolean; color: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      {/* Status dot */}
      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500"
        style={{
          background: done ? "rgba(34,197,94,0.15)" : error ? "rgba(239,68,68,0.12)" : active ? `${color}15` : "rgba(255,255,255,0.04)",
          border: `1.5px solid ${done ? "rgba(34,197,94,0.4)" : error ? "rgba(239,68,68,0.35)" : active ? `${color}45` : "rgba(255,255,255,0.08)"}`,
          boxShadow: active ? `0 0 6px ${color}30` : "none",
        }}>
        {done && <span style={{ fontSize: 8, color: "#4ade80" }}>✓</span>}
        {error && <span style={{ fontSize: 8, color: "#f87171" }}>✕</span>}
        {active && <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "block", animation: "pulse 1s infinite" }}/>}
      </div>
      {/* Label */}
      <span className="text-[12px] flex-1 transition-all duration-300"
        style={{
          color: done ? "rgba(255,255,255,0.7)" : error ? "rgba(248,113,113,0.8)" : active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.22)",
          fontWeight: active ? 500 : 400,
          letterSpacing: "-0.01em",
        }}>
        {label}
      </span>
      {/* State label */}
      {active && (
        <span className="text-[9px] font-mono" style={{ color: `${color}70`, animation: "pulse 1.5s infinite" }}>
          working…
        </span>
      )}
      {done && <span className="text-[9px]" style={{ color: "rgba(74,222,128,0.5)" }}>done</span>}
      {error && <span className="text-[9px]" style={{ color: "rgba(248,113,113,0.5)" }}>failed</span>}
    </div>
  );
}

// Build a minimal preview of page HTML that loads instantly
function buildMinimalPreview(html: string): string {
  return `<!DOCTYPE html><html><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{overflow:hidden;pointer-events:none;background:#fff}
  img{max-width:100%;height:auto}
</style>
</head><body>${html}</body></html>`;
}
