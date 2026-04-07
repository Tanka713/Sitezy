"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Layers3,
  MonitorSmartphone,
  Sparkles,
  Wand2,
  Zap,
  Paintbrush,
  Code2,
} from "lucide-react";
import { SitezyButton } from "@/components/ui/sitezy";
import { UserAvatarMenu } from "@/components/ui/UserAvatarMenu";
import type { UserAccountProfile } from "@/types";

/* ─────────────────────────────────────────────
   Utility: useInView – fires once when element enters viewport
───────────────────────────────────────────── */
function useInView(threshold = 0.08) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Already in view on mount?
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * (1 - threshold / 2)) {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/* ─────────────────────────────────────────────
   Utility: useCountUp
───────────────────────────────────────────── */
function useCountUp(target: number, duration = 1600, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf: number;
    const begin = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - begin) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setValue(Math.floor(ease * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return value;
}

/* ─────────────────────────────────────────────
   Reveal wrapper
───────────────────────────────────────────── */
function Reveal({
  children, delay = 0, className = "", direction = "up",
}: {
  children: React.ReactNode; delay?: number; className?: string;
  direction?: "up" | "left" | "right" | "none";
}) {
  const { ref, inView } = useInView(0.08);
  const tx = { up: "translateY(28px)", left: "translateX(-28px)", right: "translateX(28px)", none: "none" };
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "none" : tx[direction],
        transition: `opacity 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Marquee
───────────────────────────────────────────── */
const marqueeItems = [
  "AI-powered generation", "Visual canvas editor", "Section intelligence",
  "Responsive controls", "Export-ready HTML", "Multi-page sites",
  "Layer management", "Media library", "One connected system",
];

function Marquee() {
  const items = [...marqueeItems, ...marqueeItems];
  return (
    <div className="relative overflow-x-clip py-[18px] border-y border-white/[0.05]"
      style={{ maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)" }}>
      <div className="flex w-max animate-marquee gap-12">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-3 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.2em] text-white/24">
            <span className="h-[3px] w-[3px] rounded-full bg-[var(--accent-default)] opacity-70" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Stat counter card
───────────────────────────────────────────── */
function StatCard({ value, suffix, label, delay, started }: {
  value: number; suffix: string; label: string; delay: number; started: boolean;
}) {
  const count = useCountUp(value, 1400, started);
  return (
    <div
      className="group relative overflow-hidden rounded-[26px] border border-white/[0.07] bg-[linear-gradient(160deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-7 transition-all duration-500 hover:border-white/[0.13] hover:bg-[linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))]"
      style={{
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        opacity: started ? 1 : 0,
        transform: started ? "none" : "translateY(20px)",
        transition: `opacity 0.6s ${delay}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(91,140,255,0.12),transparent_65%)] transition-all duration-700 group-hover:scale-[1.6]" />
      <p className="relative text-[52px] font-bold leading-none tracking-[-0.065em] text-white">
        {count}<span className="text-[#8faeff]">{suffix}</span>
      </p>
      <p className="mt-3.5 text-[13px] font-medium text-white/44 tracking-[-0.01em]">{label}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Feature pill
───────────────────────────────────────────── */
function FeaturePill({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.04] px-4 py-2 text-[12px] font-medium text-white/65 transition-all duration-300 hover:border-white/[0.18] hover:text-white/90">
      <Icon size={12} className="text-[var(--accent-default)]" />
      {label}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Story step scroll hook
───────────────────────────────────────────── */
const storySteps = [
  {
    id: "brief", index: "01", title: "Describe your idea",
    body: "Write a direction, a tone, and a business goal. Sitezy turns a rough brief into a usable system.",
    eyebrow: "Prompt",
  },
  {
    id: "generate", index: "02", title: "Watch it generate",
    body: "Structure, hierarchy, and full sections appear in sequence — the site forms in front of you instead of a loader.",
    eyebrow: "Generation",
  },
  {
    id: "edit", index: "03", title: "Edit like a pro",
    body: "Refine visually on the canvas with layers, styles, and responsive controls that feel like a design tool.",
    eyebrow: "Editor",
  },
] as const;

function useStoryStep(totalSteps: number) {
  const ref = useRef<HTMLElement | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    function onScroll() {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = Math.max(rect.height - window.innerHeight, 1);
      const progressed = Math.min(Math.max(-rect.top / scrollable, 0), 0.9999);
      setActiveStep(Math.min(totalSteps - 1, Math.floor(progressed * totalSteps)));
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [totalSteps]);

  return { ref, activeStep };
}

/* ─────────────────────────────────────────────
   Bento card
───────────────────────────────────────────── */
function BentoCard({
  title, body, className = "", children, accent,
}: {
  title: string; body: string; className?: string; children?: React.ReactNode; accent?: string;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-[linear-gradient(160deg,rgba(20,26,42,0.92),rgba(11,15,23,0.97))] p-8 transition-all duration-500 hover:border-white/[0.13] ${className}`}
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}>
      {accent && <div className="absolute inset-x-0 top-0 h-[1px]" style={{ background: accent }} />}
      <div className="relative z-10 flex h-full flex-col gap-6">
        <div className="space-y-3">
          <h3 className="text-[20px] font-bold leading-[1.15] tracking-[-0.045em]">{title}</h3>
          <p className="text-[14px] leading-[1.8] text-white/52 tracking-[-0.005em]">{body}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main export
───────────────────────────────────────────── */
export function LandingPage({
  initialAccount = null,
  inviteOnlyBeta = false,
  supportEmail = "support@sitezy.app",
}: {
  initialAccount?: UserAccountProfile | null;
  inviteOnlyBeta?: boolean;
  supportEmail?: string;
}) {
  const { ref: storyRef, activeStep } = useStoryStep(storySteps.length);
  const isLoggedIn = Boolean(initialAccount);

  return (
    <div className="sitezy-marketing-shell min-h-screen text-[var(--text-primary)]">
      {/* Dot grid background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.038) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 100% 65% at 50% 0%, black 20%, transparent 100%)",
        }}
      />

      <TopNav initialAccount={initialAccount} inviteOnlyBeta={inviteOnlyBeta} />

      <main className="relative z-10">
        {/* ① Hero */}
        <HeroScene isLoggedIn={isLoggedIn} inviteOnlyBeta={inviteOnlyBeta} />

        {/* ② Marquee */}
        <Marquee />

        {/* ③ Stats */}
        <StatsScene />

        {/* ⑤ How it works – sticky scroll, each step = 120vh of scroll */}
        <section
          ref={storyRef as React.Ref<HTMLElement>}
          id="how-it-works"
          style={{ height: `${storySteps.length * 120 + 100}vh` }}
          className="relative"
        >
          <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
            {/* Header row */}
            <div className="sz-grid-shell mb-10 flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/30">How it works</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {/* Content: steps left, visual right */}
            <div className="sz-grid-shell grid h-[70vh] grid-cols-1 items-center gap-10 lg:grid-cols-2">
              {/* Steps */}
              <div className="flex flex-col gap-8">
                {storySteps.map((step, index) => {
                  const active = activeStep === index;
                  return (
                    <div key={step.id} className="relative pl-10">
                      <div
                        className="absolute left-0 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-500"
                        style={{
                          borderColor: active ? "rgba(107,119,255,0.8)" : "rgba(255,255,255,0.12)",
                          background: active ? "rgba(107,119,255,0.18)" : "transparent",
                          boxShadow: active ? "0 0 0 6px rgba(107,119,255,0.07),0 0 16px rgba(107,119,255,0.18)" : "none",
                        }}
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent-default)] transition-all duration-500"
                          style={{ opacity: active ? 1 : 0 }} />
                      </div>
                      {index < storySteps.length - 1 && (
                        <div className="absolute left-[9px] top-7 h-full w-px bg-gradient-to-b from-white/10 to-transparent" />
                      )}
                      <div className="space-y-2.5 transition-all duration-500"
                        style={{ opacity: active ? 1 : 0.22, transform: active ? "none" : "translateX(8px)" }}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/22">{step.index}</p>
                        <h3 className="text-[clamp(1.7rem,3.5vw,3rem)] font-bold leading-[1.02] tracking-[-0.055em]">{step.title}</h3>
                        <p className="max-w-[420px] text-[15px] leading-[1.85] text-white/50 tracking-[-0.01em]">{step.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Visual panel – hidden on very small screens */}
              <div className="hidden h-full min-h-[400px] lg:block">
                <StoryVisual activeStep={activeStep} />
              </div>
            </div>

            {/* Progress dots */}
            <div className="sz-grid-shell mt-8 flex justify-center gap-2">
              {storySteps.map((_, i) => (
                <div key={i} className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: activeStep === i ? "24px" : "6px",
                    background: activeStep === i ? "var(--accent-default)" : "rgba(255,255,255,0.16)",
                  }} />
              ))}
            </div>
          </div>
        </section>

        {/* ⑥ Bento grid */}
        <BentoGrid />

        {/* ⑦ Editor showcase */}
        <EditorShowcase />

        {/* ⑧ Every site is unique */}
        <StatementSection text="Every site is unique." />

        {/* ⑨ Outcomes */}
        <OutcomeScene />

        {/* ⑫ Final CTA */}
        <FinalScene isLoggedIn={isLoggedIn} />
        <SiteFooter inviteOnlyBeta={inviteOnlyBeta} supportEmail={supportEmail} />
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Top nav
───────────────────────────────────────────── */
function TopNav({
  initialAccount,
  inviteOnlyBeta,
}: {
  initialAccount?: UserAccountProfile | null;
  inviteOnlyBeta?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-all duration-400"
      style={{
        background: scrolled ? "rgba(7,9,13,0.88)" : "transparent",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
      }}
    >
      <div className="sz-grid-shell flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center">
          <span className="sz-wordmark">Sitezy</span>
        </Link>
        <div className="flex items-center gap-2">
          {initialAccount ? (
            <>
              <Link href="/app">
                <SitezyButton variant="secondary" size="sm">
                  Open workspace
                </SitezyButton>
              </Link>
              <UserAvatarMenu initialAccount={initialAccount} showStudioShortcut={false} />
            </>
          ) : (
            <>
              <Link href="/login"><SitezyButton variant="ghost" size="sm">Log in</SitezyButton></Link>
              <Link href="/signup">
                <SitezyButton variant="primary" size="sm">
                  {inviteOnlyBeta ? "Join beta" : "Start free"} <ArrowRight size={12} />
                </SitezyButton>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────
   Hero
───────────────────────────────────────────── */
function HeroScene({ isLoggedIn, inviteOnlyBeta }: { isLoggedIn: boolean; inviteOnlyBeta?: boolean }) {
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden pt-20">
      {/* Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[700px] w-[700px] -translate-x-1/2 -translate-y-[40%] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(91,140,255,0.18), transparent 65%)",
            animation: "orb-pulse 8s ease-in-out infinite",
          }} />
        <div className="absolute left-[12%] top-[30%] h-[400px] w-[400px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(122,92,255,0.1), transparent 60%)",
            animation: "orb-pulse 11s ease-in-out infinite 3s",
          }} />
        <div className="absolute right-[8%] top-[15%] h-[320px] w-[320px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(55,208,166,0.07), transparent 60%)",
            animation: "orb-pulse 9s ease-in-out infinite 1.5s",
          }} />
        {/* Subtle horizontal light bar */}
        <div className="absolute left-0 right-0 top-[20%] h-px opacity-30"
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(91,140,255,0.5) 30%, rgba(122,92,255,0.5) 70%, transparent 100%)" }} />
      </div>

      <div className="sz-grid-shell relative z-10 py-16 text-center">
        <Reveal>
          <div className="sz-hero-badge mx-auto mb-7">
            <Zap size={11} className="fill-current opacity-90" />
            {inviteOnlyBeta ? "Invite-only beta" : "AI-powered web builder"}
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mx-auto max-w-[860px] text-[clamp(3rem,8vw,7rem)] font-bold leading-[0.9] tracking-[-0.07em]">
            Build the site you<br />
            <span className="bg-gradient-to-r from-[#e8eeff] via-[#b4c6ff] to-[#8b7fff] bg-clip-text text-transparent">
              actually imagined.
            </span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mx-auto mt-8 max-w-[500px] text-[clamp(1rem,2vw,1.125rem)] leading-[1.85] text-white/55 tracking-[-0.01em]">
            From one clear idea to a fully editable website — prompt to polished canvas in one continuous flow.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {isLoggedIn ? (
              <Link href="/app">
                <SitezyButton variant="primary" size="lg">
                  Open workspace <ArrowRight size={14} />
                </SitezyButton>
              </Link>
            ) : (
              <Link href="/signup">
                <SitezyButton variant="primary" size="lg">
                  {inviteOnlyBeta ? "Join private beta" : "Start building free"} <ArrowRight size={14} />
                </SitezyButton>
              </Link>
            )}
            <a href="#how-it-works">
              <SitezyButton variant="secondary" size="lg">
                See how it works <ChevronDown size={14} />
              </SitezyButton>
            </a>
          </div>
          <p className="mt-4 text-center text-[12px] text-white/28 tracking-[0.01em]">
            No credit card required · Export your site anytime
          </p>
        </Reveal>

        <Reveal delay={320}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {[
              { icon: Zap, label: "Instant generation" },
              { icon: Paintbrush, label: "Visual editor" },
              { icon: MonitorSmartphone, label: "Responsive" },
              { icon: Code2, label: "Export-ready" },
            ].map((p) => <FeaturePill key={p.label} icon={p.icon} label={p.label} />)}
          </div>
        </Reveal>

        {/* App mockup */}
        <Reveal delay={400} className="mt-16">
          <div className="relative mx-auto max-w-[860px]">
            <div className="absolute -inset-px rounded-[32px] bg-gradient-to-b from-white/8 to-transparent" />
            <div className="relative overflow-hidden rounded-[32px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(16,20,30,0.94),rgba(9,12,18,0.98))] shadow-[0_48px_120px_rgba(0,0,0,0.5)]">
              <HeroAppMockup />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function SiteFooter({
  inviteOnlyBeta,
  supportEmail,
}: {
  inviteOnlyBeta?: boolean;
  supportEmail: string;
}) {
  return (
    <footer className="border-t border-white/[0.05]">
      <div className="sz-grid-shell flex flex-col gap-5 py-10 text-[13px] text-white/38 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="sz-wordmark text-white/80">Sitezy</p>
          <p className="mt-1.5 text-[12px] font-medium tracking-[-0.005em]">
            {inviteOnlyBeta ? `Private beta · Access managed through ${supportEmail}.` : "AI website builder. Generate, edit, and export."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-5 text-[12px] font-medium text-white/46">
          <Link href="/privacy" className="transition-colors duration-200 hover:text-white/80">Privacy</Link>
          <Link href="/terms" className="transition-colors duration-200 hover:text-white/80">Terms</Link>
          <Link href="/support" className="transition-colors duration-200 hover:text-white/80">Support</Link>
        </div>
      </div>
    </footer>
  );
}

function HeroAppMockup() {
  return (
    <div>
      <div className="flex h-11 items-center justify-between border-b border-white/[0.06] px-5">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((d) => <div key={d} className="h-2.5 w-2.5 rounded-full bg-white/12" />)}
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/28">
          <div className="h-1.5 w-1.5 rounded-full bg-green-400/60 animate-pulse" />
          sitezy.app — My Project
        </div>
        <div className="flex gap-2">
          {[0, 1].map((d) => <div key={d} className="h-6 w-14 rounded-lg border border-white/[0.07] bg-white/[0.04]" />)}
          <div className="h-6 w-18 rounded-lg bg-[rgba(107,119,255,0.22)] border border-[rgba(107,119,255,0.3)]" />
        </div>
      </div>
      <div className="grid h-[380px] grid-cols-[180px_1fr_180px]">
        {/* Left */}
        <div className="border-r border-white/[0.05] bg-black/10 p-3">
          <div className="space-y-1">
            {["Pages", "Layers", "Media", "Styles"].map((item, i) => (
              <div key={item} className={`rounded-xl px-3 py-2 text-[11px] ${i === 1 ? "bg-[rgba(107,119,255,0.16)] text-white" : "text-white/34"}`}>{item}</div>
            ))}
          </div>
          <div className="mt-5 space-y-1">
            {["Hero", "→ Headline", "→ CTA", "Features", "Footer"].map((item, i) => (
              <div key={item} className={`rounded-xl px-3 py-2 text-[10px] ${i === 2 ? "bg-[rgba(107,119,255,0.1)] text-[var(--text-accent)]" : "text-white/26"}`}
                style={{ paddingLeft: item.startsWith("→") ? "18px" : undefined }}>
                {item}
              </div>
            ))}
          </div>
        </div>
        {/* Canvas */}
        <div className="relative bg-[#0a0d14] p-5">
          <div className="h-full rounded-[18px] bg-[#f8f9fb] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
            <div className="h-7 w-24 rounded-full bg-[#dde4fb]" />
            <div className="mt-4 h-16 w-3/4 rounded-[18px] bg-[#cad5ff]" />
            <div className="mt-3 space-y-2">
              <div className="h-2.5 w-full rounded-full bg-[#d8deeb]" />
              <div className="h-2.5 w-4/5 rounded-full bg-[#d8deeb]" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 rounded-[14px] bg-white shadow-[0_10px_24px_rgba(10,14,22,0.07)]" />
              ))}
            </div>
          </div>
          {/* Selection */}
          <div className="absolute left-9 top-14 h-[76px] w-[44%] rounded-[20px] border-2 border-[#5e6bff] shadow-[0_0_0_4px_rgba(94,107,255,0.1)]" />
        </div>
        {/* Right */}
        <div className="border-l border-white/[0.05] bg-black/10 p-3">
          <div className="mb-3 flex items-center gap-2 text-white/44">
            <Sparkles size={11} />
            <span className="text-[10px] uppercase tracking-[0.16em]">Styles</span>
          </div>
          <div className="space-y-2.5">
            {["Typography", "Spacing", "Color", "Shadow"].map((item) => (
              <div key={item} className="space-y-1">
                <div className="text-[9px] text-white/26">{item}</div>
                <div className="h-7 rounded-[10px] border border-white/[0.05] bg-white/[0.04]" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-[12px] border border-[rgba(107,119,255,0.28)] bg-[rgba(107,119,255,0.08)] p-2.5">
            <Wand2 size={11} className="text-[var(--text-accent)]" />
            <span className="text-[10px] text-[var(--text-accent)]">AI refine…</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Stats
───────────────────────────────────────────── */
function StatsScene() {
  const { ref, inView } = useInView(0.1);
  const stats = [
    { value: 10, suffix: "s", label: "Average time to first page" },
    { value: 100, suffix: "+", label: "Block types in the library" },
    { value: 3, suffix: "x", label: "Faster than coding from scratch" },
    { value: 99, suffix: "%", label: "Responsive on all screens" },
  ];
  return (
    <section ref={ref} className="py-16">
      <div className="sz-grid-shell grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <StatCard key={s.label} value={s.value} suffix={s.suffix} label={s.label} delay={i * 70} started={inView} />
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Statement section (large bold text)
───────────────────────────────────────────── */
function StatementSection({ text }: { text: string }) {
  const { ref, inView } = useInView(0.1);
  return (
    <section className="py-20">
      <div
        ref={ref}
        className="sz-grid-shell"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "none" : "translateY(40px)",
          transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <p
          className="text-[clamp(3rem,9vw,9rem)] font-bold leading-[0.88] tracking-[-0.08em]"
          style={{ background: "linear-gradient(160deg, #ffffff 0%, rgba(180,198,255,0.7) 50%, rgba(255,255,255,0.12) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
        >
          {text}
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Bento feature grid
───────────────────────────────────────────── */
function BentoGrid() {
  return (
    <section className="pb-16">
      <div className="sz-grid-shell space-y-6">
        <Reveal className="mx-auto max-w-[640px] text-center space-y-5">
          <div className="sz-hero-badge mx-auto">
            <Sparkles size={11} className="opacity-80" />
            Core product
          </div>
          <h2 className="text-[clamp(2rem,4.5vw,3.4rem)] font-bold leading-[1.04] tracking-[-0.055em]">
            One connected environment.
          </h2>
          <p className="text-[15px] leading-[1.85] text-white/38 tracking-[-0.01em]">
            Generation, editing, and structure stay in the same system — no switching between disconnected tools.
          </p>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Reveal className="lg:col-span-2" delay={0}>
            <BentoCard
              title="Site maps, pages, sections, and styling land together."
              body="A working, multi-page site with a real editable hierarchy from the first pass — not a vague mockup."
              className="min-h-[240px]"
              accent="linear-gradient(90deg,rgba(107,119,255,0.7),rgba(55,208,166,0.3),transparent)"
            >
              <div className="flex flex-wrap gap-2">
                {["Pages", "Sections", "Hierarchy", "Styles", "Export"].map((tag) => (
                  <span key={tag} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] text-white/38">{tag}</span>
                ))}
              </div>
            </BentoCard>
          </Reveal>

          <Reveal delay={60}>
            <BentoCard
              title="Section intelligence"
              body="Regenerate and restyle individual sections without touching the rest of the page."
              className="min-h-[240px]"
              accent="linear-gradient(90deg,rgba(200,107,255,0.5),transparent)"
            >
              <div className="flex items-center gap-3 rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-3">
                <Sparkles size={13} className="text-[var(--text-accent)]" />
                <span className="text-[12px] text-white/44">Regenerate this section…</span>
              </div>
            </BentoCard>
          </Reveal>

          <Reveal delay={80}>
            <BentoCard
              title="Responsive control"
              body="Desktop, tablet, and mobile overrides live inside the same editor."
              className="min-h-[220px]"
              accent="linear-gradient(90deg,rgba(55,208,166,0.5),transparent)"
            >
              <div className="flex gap-2">
                {["Desktop", "Tablet", "Mobile"].map((bp, i) => (
                  <div key={bp} className={`flex-1 rounded-xl border py-2 text-center text-[11px] ${i === 0 ? "border-[rgba(107,119,255,0.4)] bg-[rgba(107,119,255,0.1)] text-white" : "border-white/[0.06] text-white/30"}`}>{bp}</div>
                ))}
              </div>
            </BentoCard>
          </Reveal>

          <Reveal delay={120} className="md:col-span-2">
            <BentoCard
              title="Asset-ready workflow — logos, media, embeds, reusable blocks."
              body="Everything belongs to the project, not a scattered upload flow. The library grows as you build."
              className="min-h-[220px]"
              accent="linear-gradient(90deg,rgba(107,119,255,0.3),rgba(200,107,255,0.3),transparent)"
            >
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-[12px] border border-white/[0.06] bg-white/[0.04]" style={{ opacity: 1 - i * 0.1 }} />
                ))}
              </div>
            </BentoCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Editor showcase
───────────────────────────────────────────── */
function EditorShowcase() {
  return (
    <section className="pb-20">
      <div className="sz-grid-shell grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal direction="left" className="flex flex-col justify-between gap-8 rounded-[24px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(20,26,40,0.9),rgba(12,16,24,0.96))] p-8">
          <div className="space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/24">Creative control</p>
            <h3 className="text-[clamp(1.7rem,3vw,2.5rem)] font-bold leading-[1.06] tracking-[-0.055em]">
              Canvas, sections, styles — one editing rhythm.
            </h3>
            <p className="text-[14px] leading-[1.85] text-white/38 tracking-[-0.005em]">
              The product feels like one composition environment. No separate app modes.
            </p>
          </div>
          <div className="space-y-2">
            {[
              { icon: Sparkles, text: "Section regeneration with prompt control" },
              { icon: Layers3, text: "Visual editing + layered structure" },
              { icon: MonitorSmartphone, text: "Responsive overrides without losing desktop" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[10px] bg-[rgba(91,140,255,0.14)]">
                  <Icon size={12} className="text-[#aab4ff]" />
                </div>
                <span className="text-[13px] font-medium text-white/50 tracking-[-0.01em]">{text}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal direction="right" className="relative overflow-hidden rounded-[24px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(16,20,32,0.94),rgba(10,13,20,0.98))] p-6 min-h-[420px]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(107,119,255,0.08),transparent_50%)]" />
          <div className="relative">
            <div className="mb-4 flex items-center gap-2 text-white/40">
              <Wand2 size={12} />
              <span className="text-[10px] uppercase tracking-[0.18em]">AI section actions</span>
            </div>
            <div className="space-y-2 mb-5">
              {[
                { label: "Regenerate section", active: true },
                { label: "Same layout, new copy", active: false },
                { label: "More bold & dramatic", active: false },
                { label: "Simplify the message", active: false },
              ].map(({ label, active }) => (
                <div key={label} className={`flex items-center gap-3 rounded-[14px] px-4 py-3 text-[13px] transition-all ${active ? "bg-[rgba(107,119,255,0.16)] text-white border border-[rgba(107,119,255,0.28)]" : "border border-white/[0.05] bg-white/[0.03] text-white/36"}`}>
                  {active && <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent-default)]" />}
                  {label}
                </div>
              ))}
            </div>
            <div className="rounded-[18px] border border-white/[0.06] bg-[#f7f8fb] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.16)]">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[14px] bg-white p-4 shadow-[0_10px_20px_rgba(10,14,22,0.07)]">
                  <div className="h-2.5 w-10 rounded-full bg-[#d0d8f4]" />
                  <div className="mt-3 h-14 rounded-[12px] bg-[#e6ebfb]" />
                  <div className="mt-3 h-2 w-full rounded-full bg-[#d8dfea]" />
                </div>
                <div className="space-y-2 rounded-[14px] border border-[#dfe5f1] bg-[#eef2fb] p-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={`h-8 rounded-[10px] ${i === 2 ? "bg-[#c8d4ff]" : "bg-[#dde4f9]"}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Outcome
───────────────────────────────────────────── */
const outcomeSites = [
  { name: "Studio launch", palette: "from-[#0f1728] via-[#18223f] to-[#2f4f90]", accent: "rgba(94,120,255,0.35)" },
  { name: "Restaurant brand", palette: "from-[#1a140f] via-[#3a241c] to-[#8a4b2f]", accent: "rgba(200,100,60,0.35)" },
  { name: "Product company", palette: "from-[#08171a] via-[#143c45] to-[#1fb6aa]", accent: "rgba(31,182,170,0.35)" },
] as const;

function OutcomeScene() {
  return (
    <section className="pb-20">
      <div className="sz-grid-shell">
        <Reveal className="mb-10 space-y-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/26">Outcome</p>
          <h2 className="text-[clamp(2rem,5vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.065em]">
            One system.<br />Distinct results.
          </h2>
          <p className="max-w-[440px] text-[15px] leading-[1.85] text-white/38 tracking-[-0.01em]">
            Sitezy gives you a stronger starting point and leaves room for genuinely different outcomes.
          </p>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-3">
          {outcomeSites.map((site, index) => (
            <Reveal key={site.name} delay={index * 100}>
              <div className="group overflow-hidden rounded-[22px] border border-white/[0.07] transition-all duration-500 hover:border-white/[0.16] hover:-translate-y-2 hover:shadow-[0_28px_70px_rgba(0,0,0,0.4)]">
                <div className={`h-[260px] bg-gradient-to-br ${site.palette} p-4`}
                  style={{ boxShadow: `inset 0 -30px 60px ${site.accent}` }}>
                  <div className="h-full rounded-[16px] border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                    <div className="h-7 w-18 rounded-full bg-white/15" />
                    <div className="mt-4 h-16 rounded-[14px] bg-white/14" />
                    <div className="mt-3 space-y-2">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="h-8 rounded-[12px] bg-white/12" style={{ opacity: 1 - i * 0.22 }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-[rgba(14,18,26,0.97)] px-5 py-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/26">Variation {index + 1}</p>
                  <p className="mt-1 text-[15px] font-semibold tracking-[-0.02em]">{site.name}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Final CTA
───────────────────────────────────────────── */
function FinalScene({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="pb-20 pt-4">
      <div className="sz-grid-shell">
        <Reveal>
          <div className="relative overflow-hidden rounded-[40px]">
            {/* Outer border glow */}
            <div className="absolute -inset-px rounded-[40px] bg-gradient-to-br from-[rgba(91,140,255,0.35)] via-[rgba(122,92,255,0.2)] to-transparent" />
            <div className="relative overflow-hidden rounded-[40px] bg-[linear-gradient(160deg,rgba(12,15,26,0.99),rgba(7,9,16,0.99))]">
              {/* Atmospheric depth */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/3 top-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/3 rounded-full"
                  style={{ background: "radial-gradient(circle, rgba(91,140,255,0.16), transparent 60%)", filter: "blur(40px)" }} />
                <div className="absolute right-1/4 bottom-0 h-[400px] w-[400px] translate-x-1/2 translate-y-1/3 rounded-full"
                  style={{ background: "radial-gradient(circle, rgba(122,92,255,0.12), transparent 60%)", filter: "blur(40px)" }} />
                {/* Grid pattern overlay */}
                <div className="absolute inset-0 opacity-[0.025]"
                  style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                  }} />
              </div>
              <div className="relative mx-auto max-w-[800px] px-8 py-16 text-center md:px-14 md:py-24">
                <div className="sz-hero-badge mx-auto mb-8">
                  <Zap size={11} className="fill-current opacity-90" />
                  Get started
                </div>
                <h2 className="text-[clamp(2.6rem,7vw,6rem)] font-bold leading-[0.9] tracking-[-0.07em]">
                  Build the site<br />
                  <span className="bg-gradient-to-r from-[#e8eeff] via-[#b4c6ff] to-[#9a8fff] bg-clip-text text-transparent">
                    you imagined.
                  </span>
                </h2>
                <p className="mx-auto mt-7 max-w-[440px] text-[16px] leading-[1.8] text-white/40 tracking-[-0.01em]">
                  From one clear idea to a fully editable website in one connected system.
                </p>
                <div className="mt-10 flex flex-wrap justify-center gap-3">
                  {isLoggedIn ? (
                    <>
                      <Link href="/app">
                        <SitezyButton variant="primary" size="lg">
                          Open workspace <ArrowRight size={15} />
                        </SitezyButton>
                      </Link>
                      <Link href="/settings">
                        <SitezyButton variant="secondary" size="lg">Settings</SitezyButton>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href="/signup">
                        <SitezyButton variant="primary" size="lg">Join private beta<ArrowRight size={15} /></SitezyButton>
                      </Link>
                      <Link href="/login">
                        <SitezyButton variant="secondary" size="lg">Log in</SitezyButton>
                      </Link>
                    </>
                  )}
                </div>
                <p className="mt-5 text-[12px] font-medium text-white/20 tracking-[0.02em]">No credit card required · Export anytime</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Story visual panel
───────────────────────────────────────────── */
function StoryVisual({ activeStep }: { activeStep: number }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(19,24,35,0.94),rgba(10,13,19,0.98))] shadow-[0_32px_90px_rgba(0,0,0,0.4)]">
      {/* Titlebar */}
      <div className="absolute inset-x-0 top-0 z-10 flex h-11 items-center gap-3 border-b border-white/[0.06] bg-black/20 px-4">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((d) => <span key={d} className="h-2.5 w-2.5 rounded-full bg-white/12" />)}
        </div>
        <div className="rounded-full border border-white/[0.07] bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/26">
          {storySteps[activeStep].eyebrow}
        </div>
      </div>
      {/* Cross-fade panels */}
      {[<StoryVisualPrompt key="p" />, <StoryVisualGenerate key="g" />, <StoryVisualEdit key="e" />].map((el, i) => (
        <div key={i} className="absolute inset-0 pt-11"
          style={{ opacity: activeStep === i ? 1 : 0, transition: "opacity 0.45s cubic-bezier(0.16,1,0.3,1)", pointerEvents: activeStep === i ? "auto" : "none" }}>
          {el}
        </div>
      ))}
    </div>
  );
}

function StoryVisualPrompt() {
  return (
    <div className="p-5 h-full">
      <div className="grid h-full grid-cols-[0.38fr_0.62fr] gap-4">
        <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-4">
          <p className="text-[9px] uppercase tracking-[0.22em] text-white/26">Brief</p>
          <div className="mt-3 rounded-[16px] border border-white/[0.06] bg-[#09121b] p-4">
            <p className="text-[11px] leading-7 text-white/58">
              Create a luxury real estate site with a magazine feel, premium editorial typography, and a clear path to contact.
            </p>
          </div>
        </div>
        <div className="rounded-[22px] border border-white/[0.06] bg-[#f7f8fb] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#e8edfc] px-3 py-1 text-[10px] font-semibold text-[#3040a0]">Brief ready</span>
          <div className="mt-4 grid gap-2 grid-cols-2">
            {["Pages", "Tone", "Palette", "Audience"].map((item) => (
              <div key={item} className="rounded-[14px] bg-white p-3 shadow-[0_6px_16px_rgba(12,16,22,0.06)]">
                <div className="h-2 w-10 rounded-full bg-[#d0d8f4]" />
                <div className="mt-2.5 h-7 rounded-[10px] bg-[#edf1fb]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StoryVisualGenerate() {
  return (
    <div className="p-5 h-full">
      <div className="grid h-full grid-cols-[0.3fr_0.7fr] gap-4">
        <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-3">
          <p className="text-[9px] uppercase tracking-[0.22em] text-white/26">Sections</p>
          <div className="mt-3 space-y-1.5">
            {["Header", "Hero", "Grid", "CTA", "Footer"].map((item, index) => (
              <div key={item} className={`rounded-[12px] px-3 py-2 text-[11px] flex items-center gap-2 ${index < 3 ? "bg-[rgba(107,119,255,0.16)] text-white" : "bg-white/[0.03] text-white/34"}`}>
                {index < 3 && <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent-default)]" />}
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[22px] border border-white/[0.06] bg-[#f7f8fb] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
          <div className="space-y-3">
            <div className="h-7 w-18 rounded-full bg-[#dbe3fb]" />
            <div className="h-20 rounded-[18px] bg-[#cad5ff]" />
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 rounded-[16px] bg-white shadow-[0_10px_24px_rgba(10,14,22,0.07)]"
                  style={{ animation: `fade-in 500ms ${i * 130}ms both` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StoryVisualEdit() {
  return (
    <div className="p-5 h-full">
      <div className="grid h-full grid-cols-[0.26fr_0.5fr_0.24fr] gap-3">
        <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-3">
          <p className="text-[9px] uppercase tracking-[0.22em] text-white/26">Layers</p>
          <div className="mt-3 space-y-1.5">
            {["Navbar", "Hero", "Title", "CTA", "Footer"].map((item, index) => (
              <div key={item} className={`rounded-[12px] px-3 py-2 text-[11px] ${index === 2 ? "bg-[rgba(107,119,255,0.16)] text-white" : "bg-white/[0.03] text-white/32"}`}>{item}</div>
            ))}
          </div>
        </div>
        <div className="rounded-[22px] border border-white/[0.06] bg-[#f7f8fb] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
          <div className="relative h-full rounded-[18px] bg-white p-4 shadow-[0_12px_24px_rgba(10,14,22,0.06)]">
            <div className="h-6 w-16 rounded-full bg-[#dbe2fb]" />
            <div className="mt-4 h-14 w-3/4 rounded-[16px] bg-[#cad5ff]" />
            <div className="mt-3 h-2.5 w-full rounded-full bg-[#d9deeb]" />
            <div className="mt-2 h-2.5 w-2/3 rounded-full bg-[#d9deeb]" />
            <div className="absolute inset-3 rounded-[18px] border-2 border-[#5e6bff] shadow-[0_0_0_4px_rgba(94,107,255,0.1)]" />
          </div>
        </div>
        <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-3">
          <p className="text-[9px] uppercase tracking-[0.22em] text-white/26">Styles</p>
          <div className="mt-3 space-y-2">
            {["Type", "Space", "Color", "Anim"].map((item) => (
              <div key={item} className="rounded-[12px] bg-white/[0.04] p-2.5">
                <div className="h-2 w-12 rounded-full bg-white/12" />
                <div className="mt-2 h-7 rounded-[10px] bg-white/[0.05]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
