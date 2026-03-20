"use client";
import { useEffect, useState, useRef } from "react";
import { useAppStore } from "@/lib/store";

// ─── Web building animation phases ───────────────────────────────────────────
const PHASES = [
  { icon: "◈", label: "Analyzing brief",        detail: "Extracting brand essence and business goals" },
  { icon: "⬡", label: "Designing architecture", detail: "Planning page structure and section hierarchy" },
  { icon: "◉", label: "Building color system",  detail: "Creating typography and visual identity" },
  { icon: "▣", label: "Generating layouts",     detail: "Crafting unique responsive page templates" },
  { icon: "◈", label: "Writing content",         detail: "Producing copy for every section" },
  { icon: "⬡", label: "Adding visuals",          detail: "Sourcing imagery matched to your industry" },
  { icon: "◉", label: "Polishing details",       detail: "Refining interactions and micro-animations" },
  { icon: "▣", label: "Final checks",            detail: "Validating output and optimising markup" },
];

// Fake wireframe sections that animate in
const WIREFRAME_SECTIONS = [
  { h: 52, w: "100%", label: "navbar" },
  { h: 180, w: "100%", label: "hero" },
  { h: 80,  w: "100%", label: "logo cloud" },
  { h: 140, w: "100%", label: "features" },
  { h: 120, w: "100%", label: "testimonials" },
  { h: 100, w: "100%", label: "cta" },
  { h: 90,  w: "100%", label: "footer" },
];

const BRAND_COLOR = "#f97316";

interface Props { projectName: string; pageCount: number; }

export function GeneratingScreen({ projectName, pageCount }: Props) {
  const genStatus   = useAppStore((s) => s.generationStatus);
  const genProgress = useAppStore((s) => s.generationProgress);
  const genLog      = useAppStore((s) => s.generationLog);

  const [tick,       setTick]       = useState(0);
  const [phase,      setPhase]      = useState(0);
  const [visibleSec, setVisibleSec] = useState(0);
  const [scanLine,   setScanLine]   = useState(0);
  const animRef = useRef<number | undefined>(undefined);

  const successCount = genLog.filter((l) => l.type === "success").length;
  const totalSteps   = pageCount + 1;
  const progress     = Math.min(98, Math.round((successCount / totalSteps) * 100));
  const isDone       = genStatus === "done";
  const isError      = genStatus === "error";

  // Main animation loop
  useEffect(() => {
    if (isDone) return;
    const id = setInterval(() => setTick((t) => t + 1), 50);
    return () => clearInterval(id);
  }, [isDone]);

  // Phase cycling
  useEffect(() => {
    if (isDone || isError) return;
    const id = setInterval(() => setPhase((p) => (p + 1) % PHASES.length), 2600);
    return () => clearInterval(id);
  }, [isDone, isError]);

  // Wireframe sections reveal
  useEffect(() => {
    if (isDone || isError) return;
    const id = setInterval(() => setVisibleSec((v) => Math.min(v + 1, WIREFRAME_SECTIONS.length)), 380);
    return () => clearInterval(id);
  }, [isDone, isError]);

  // Scan line
  useEffect(() => {
    if (isDone || isError) return;
    const id = setInterval(() => setScanLine((s) => (s + 3) % 100), 30);
    return () => clearInterval(id);
  }, [isDone, isError]);

  const errorLogs = genLog.filter((l) => l.type === "error");
  const lastError = errorLogs[errorLogs.length - 1]?.msg?.replace(/^❌\s*/, "") ?? "";

  return (
    <div className="fixed inset-0 bg-[#06060a] flex items-center justify-center z-50 overflow-hidden">

      {/* ── Background grid ─────────────────────────────────── */}
      <div className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(${BRAND_COLOR}12 1px,transparent 1px),linear-gradient(90deg,${BRAND_COLOR}12 1px,transparent 1px)`,
          backgroundSize: "40px 40px",
        }} />

      {/* ── Radial glow ─────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 45%,${BRAND_COLOR}14,transparent 70%)`,
          transform: `scale(${1 + Math.sin(tick * 0.025) * 0.06})`,
          transition: "transform 0.3s",
        }} />

      {/* ── Corner decorations ──────────────────────────────── */}
      {["top-0 left-0","top-0 right-0","bottom-0 left-0","bottom-0 right-0"].map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-16 h-16 opacity-30`}
          style={{
            background: `conic-gradient(from ${i*90}deg,${BRAND_COLOR}40,transparent 90deg)`,
          }} />
      ))}

      {/* ── Main layout ─────────────────────────────────────── */}
      <div className="relative z-10 flex gap-12 items-start max-w-4xl w-full px-8">

        {/* LEFT — Animated wireframe browser */}
        <div className="flex-shrink-0 w-[300px]">
          {/* Browser chrome */}
          <div className="rounded-2xl overflow-hidden border border-white/[0.12] shadow-2xl"
            style={{ boxShadow: `0 0 60px ${BRAND_COLOR}20` }}>
            {/* Title bar */}
            <div className="h-8 bg-[#111118] border-b border-white/[0.08] flex items-center gap-2 px-3">
              <div className="flex gap-1.5">
                {["#ef4444","#f59e0b","#22c55e"].map((c) => (
                  <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.7 }} />
                ))}
              </div>
              <div className="flex-1 h-4 bg-white/[0.06] rounded-full mx-2 flex items-center px-2">
                <span className="text-[9px] text-white/25 font-mono truncate">
                  {isDone ? `${projectName.toLowerCase().replace(/\s+/g,"-")}.com` : "building…"}
                </span>
              </div>
            </div>

            {/* Page content area */}
            <div className="bg-[#0d0d12] relative overflow-hidden" style={{ height: 360 }}>
              {/* Scan line */}
              {!isDone && !isError && (
                <div className="absolute left-0 right-0 h-[1px] pointer-events-none z-20"
                  style={{
                    top: `${scanLine}%`,
                    background: `linear-gradient(90deg,transparent,${BRAND_COLOR}80,transparent)`,
                    boxShadow: `0 0 8px ${BRAND_COLOR}60`,
                  }} />
              )}

              {/* Wireframe sections */}
              <div className="p-2 space-y-1.5">
                {WIREFRAME_SECTIONS.slice(0, visibleSec).map((sec, i) => (
                  <div key={sec.label}
                    className="rounded overflow-hidden relative"
                    style={{
                      height: sec.h,
                      background: i === 0
                        ? `linear-gradient(135deg,${BRAND_COLOR}18,${BRAND_COLOR}08)`
                        : `rgba(255,255,255,0.03)`,
                      border: `1px solid ${i === 0 ? BRAND_COLOR + "30" : "rgba(255,255,255,0.06)"}`,
                      animation: "wireReveal 0.4s ease-out both",
                    }}>
                    {/* Section label */}
                    <div className="absolute top-1.5 left-2.5 flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full" style={{ background: BRAND_COLOR, opacity: 0.6 }} />
                      <span className="text-[8px] uppercase tracking-widest font-medium"
                        style={{ color: BRAND_COLOR, opacity: 0.5 }}>{sec.label}</span>
                    </div>
                    {/* Skeleton lines */}
                    <div className="absolute inset-x-4 bottom-3 space-y-1.5">
                      {Array.from({ length: Math.max(1, Math.floor(sec.h / 28)) }).map((_, j) => (
                        <div key={j} className="h-1.5 rounded-full"
                          style={{
                            background: `rgba(255,255,255,0.07)`,
                            width: `${60 + Math.sin(i * 3 + j * 7) * 30}%`,
                            animationDelay: `${j * 0.1}s`,
                          }} />
                      ))}
                    </div>
                    {/* Shimmer overlay */}
                    {!isDone && (
                      <div className="absolute inset-0"
                        style={{
                          background: `linear-gradient(90deg,transparent ${((tick*2)%120)-20}%,rgba(255,255,255,0.04) ${((tick*2)%120)}%,transparent ${((tick*2)%120)+20}%)`,
                        }} />
                    )}
                  </div>
                ))}
              </div>

              {/* Done overlay */}
              {isDone && (
                <div className="absolute inset-0 flex items-center justify-center"
                  style={{ background: `radial-gradient(circle,${BRAND_COLOR}25,${BRAND_COLOR}08)` }}>
                  <div className="text-center">
                    <div className="text-5xl mb-3" style={{ color: BRAND_COLOR }}>✦</div>
                    <p className="text-white/60 text-[11px] font-medium tracking-widest uppercase">Ready</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Page count indicators */}
          <div className="flex justify-center gap-1.5 mt-3">
            {Array.from({ length: Math.min(pageCount, 8) }).map((_, i) => (
              <div key={i} className="h-1 rounded-full transition-all duration-500"
                style={{
                  width: i < successCount ? 20 : 8,
                  background: i < successCount ? BRAND_COLOR : "rgba(255,255,255,0.15)",
                }} />
            ))}
          </div>
        </div>

        {/* RIGHT — Status and progress */}
        <div className="flex-1 min-w-0 pt-2">

          {/* Project name */}
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-widest font-medium mb-1"
              style={{ color: BRAND_COLOR + "99" }}>Building</p>
            <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">
              {projectName}
            </h1>
          </div>

          {/* Current phase */}
          {!isDone && !isError && (
            <div className="mb-6 p-4 rounded-xl border"
              style={{
                background: `${BRAND_COLOR}08`,
                borderColor: `${BRAND_COLOR}25`,
              }}>
              <div className="flex items-center gap-3 mb-1.5">
                <span className="text-xl" style={{ color: BRAND_COLOR }}>
                  {PHASES[phase].icon}
                </span>
                <span className="font-semibold text-white text-[14px]">
                  {genProgress || PHASES[phase].label}
                </span>
              </div>
              <p className="text-[12px] text-white/40 ml-9">
                {PHASES[phase].detail}
              </p>
            </div>
          )}

          {/* Error state */}
          {isError && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/25 bg-red-500/8">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-red-400 text-lg">⚠</span>
                <span className="font-semibold text-red-400 text-[14px]">Generation Failed</span>
              </div>
              <div className="bg-black/40 rounded-lg p-3 font-mono text-[11px] text-red-300/80 break-words leading-relaxed mb-3">
                {lastError || "An unexpected error occurred. Check your API key and network connection."}
              </div>
              {/* All error logs */}
              {errorLogs.length > 1 && (
                <div className="space-y-1.5">
                  {errorLogs.map((e) => (
                    <div key={e.id} className="text-[11px] font-mono text-red-400/60">
                      {e.msg.replace(/^❌\s*/, "")}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 text-[11px] text-white/25">
                Common causes: invalid API key · rate limit · network timeout
              </div>
            </div>
          )}

          {/* Done state */}
          {isDone && (
            <div className="mb-6 p-4 rounded-xl border"
              style={{ borderColor: `${BRAND_COLOR}30`, background: `${BRAND_COLOR}08` }}>
              <div className="flex items-center gap-2">
                <span style={{ color: BRAND_COLOR }} className="text-lg">✦</span>
                <span className="font-semibold text-white text-[14px]">Website Ready</span>
              </div>
              <p className="text-[12px] text-white/40 mt-1 ml-7">
                {successCount} of {totalSteps} steps completed · Opening editor…
              </p>
            </div>
          )}

          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex justify-between mb-1.5">
              <span className="text-[11px] text-white/30">
                {isDone ? "Complete" : isError ? "Stopped" : `Step ${successCount} of ${totalSteps}`}
              </span>
              <span className="text-[11px] font-mono" style={{ color: BRAND_COLOR + "cc" }}>
                {isDone ? "100" : isError ? progress : progress}%
              </span>
            </div>
            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                style={{
                  width: isDone ? "100%" : `${progress}%`,
                  background: isError
                    ? "#ef4444"
                    : `linear-gradient(90deg,${BRAND_COLOR}cc,${BRAND_COLOR})`,
                  boxShadow: isError ? "none" : `0 0 10px ${BRAND_COLOR}80`,
                }}>
                {/* Shimmer on progress bar */}
                {!isDone && !isError && (
                  <div className="absolute inset-0"
                    style={{
                      background: `linear-gradient(90deg,transparent ${(tick*3)%200-50}%,rgba(255,255,255,0.3) ${(tick*3)%200}%,transparent ${(tick*3)%200+50}%)`,
                    }} />
                )}
              </div>
            </div>
          </div>

          {/* Live log */}
          <div className="rounded-xl border border-white/[0.06] bg-black/25 overflow-hidden">
            <div className="px-3 py-2 border-b border-white/[0.05] flex items-center gap-2">
              <div className="flex gap-1">
                {!isDone && !isError && (
                  <>
                    <div className="w-1 h-1 rounded-full bg-white/30" style={{ animation: "pulse 1s infinite" }} />
                    <div className="w-1 h-1 rounded-full bg-white/30" style={{ animation: "pulse 1s infinite 0.3s" }} />
                    <div className="w-1 h-1 rounded-full bg-white/30" style={{ animation: "pulse 1s infinite 0.6s" }} />
                  </>
                )}
              </div>
              <span className="text-[10px] text-white/25 uppercase tracking-widest font-mono">Build log</span>
            </div>
            <div className="px-3 py-2.5 space-y-1.5 max-h-[160px] overflow-auto font-mono text-[11px]">
              {genLog.length === 0 ? (
                <span className="text-white/20">Initialising…</span>
              ) : (
                [...genLog].reverse().slice(0, 12).map((entry) => (
                  <div key={entry.id} className={
                    entry.type === "error"    ? "text-red-400"
                    : entry.type === "success" ? "text-emerald-400"
                    : entry.type === "progress"? "text-white/55"
                    : "text-white/30"
                  }>
                    {entry.msg}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wireReveal {
          from { opacity:0; transform:translateY(-6px) scaleY(0.8); }
          to   { opacity:1; transform:translateY(0) scaleY(1); }
        }
      `}</style>
    </div>
  );
}
