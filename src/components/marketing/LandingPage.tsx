"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  Globe2,
  Layers3,
  MousePointerSquareDashed,
  PanelsTopLeft,
  Play,
  ShieldCheck,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";

const COLORS = {
  base: "#061019",
  baseSoft: "#0b1824",
  panel: "#101d2a",
  panelStrong: "#132232",
  card: "#162536",
  border: "rgba(157, 189, 214, 0.16)",
  borderStrong: "rgba(157, 189, 214, 0.22)",
  text: "#f5f8fb",
  muted: "rgba(216, 226, 236, 0.72)",
  dim: "rgba(216, 226, 236, 0.44)",
  teal: "#54d5c8",
  tealSoft: "#8fe4db",
  sky: "#82b8ff",
  amber: "#f5b84b",
  cream: "#f0e1cf",
};

function useReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.14 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return {
    ref,
    style: {
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(32px)",
      transition: `opacity 820ms ease ${delay}ms, transform 820ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    } as CSSProperties,
  };
}

const steps = [
  {
    num: "01",
    title: "Brief the AI",
    body: "Describe the business, tone, and pages. Sitezy builds a real multi-page site with structure, hierarchy, and content already in place.",
    pages: ["Home", "Properties", "About", "Contact"],
    label: "Project brief",
    title2: "Luxury real estate studio",
    desc: "Editorial tone, premium layout, image-led sections, and a clear contact flow.",
  },
  {
    num: "02",
    title: "Edit visually",
    body: "Refine typography, spacing, media, and layout on the canvas. Every adjustment is applied live.",
    pages: ["Header", "Hero", "Title", "CTA Button", "Features"],
    label: "Visual editor",
    title2: "Editing hero section",
    desc: "Select, refine, and ship the page without leaving the workspace.",
  },
  {
    num: "03",
    title: "Export and ship",
    body: "Download clean HTML and CSS when the site is ready. No lock-in, no proprietary runtime.",
    pages: ["index.html", "properties.html", "about.html", "contact.html"],
    label: "Export ready",
    title2: "Project packaged",
    desc: "Four pages, clean assets, and the full site ready to hand off.",
  },
];

const features = [
  {
    icon: Wand2,
    title: "AI generation",
    body: "Generate real multi-page websites from one brief, with content and hierarchy that already make sense.",
  },
  {
    icon: MousePointerSquareDashed,
    title: "Live canvas editing",
    body: "Shape the layout visually, select any layer, and refine the page without breaking the structure.",
  },
  {
    icon: Layers3,
    title: "Connected page system",
    body: "Pages, files, and editor state stay coordinated across the project instead of drifting apart.",
  },
  {
    icon: Download,
    title: "Clean export",
    body: "Export portable HTML and CSS so the final site stays yours after the design phase ends.",
  },
];

const pricing = [
  {
    name: "Starter",
    price: "$19",
    subtext: "For freelancers shipping client sites faster.",
    cta: "Start free",
    href: "/signup",
    featured: false,
    points: [
      "AI website generation",
      "Multi-page projects",
      "Visual editing + code access",
      "ZIP export",
    ],
  },
  {
    name: "Pro",
    price: "$49",
    subtext: "For agencies building multiple brands.",
    cta: "Create account",
    href: "/signup",
    featured: true,
    points: [
      "Unlimited active projects",
      "Reusable brand-ready blocks",
      "Priority generation queue",
      "Advanced export workflow",
    ],
  },
  {
    name: "Studio",
    price: "$149",
    subtext: "For teams selling websites as a service.",
    cta: "Talk to sales",
    href: "/login",
    featured: false,
    points: [
      "Collaboration workspace",
      "Premium onboarding",
      "Dedicated support",
      "White-glove rollout",
    ],
  },
];

const faqs = [
  {
    q: "What makes Sitezy different from a template builder?",
    a: "Sitezy starts from your brief and generates original page structure instead of forcing you into a theme. You still get full visual editing and clean export at the end.",
  },
  {
    q: "Can I use the visual editor and still export clean code?",
    a: "Yes. The editor, page management, and export all operate on the same project model, so visual changes stay aligned with what you export.",
  },
  {
    q: "Is this for client work or internal teams?",
    a: "Both. Freelancers use it to speed up delivery and teams use it to move from brief to finished site without stitching multiple tools together.",
  },
  {
    q: "Do I need to know how to code?",
    a: "No. The product is designed for visual workflows first, with code access available whenever you want finer control.",
  },
];

const heroSignals = [
  "AI briefing",
  "Live canvas edits",
  "Multi-page structure",
  "Clean export",
];

const marqueeItems = [
  "Brand input",
  "Page system",
  "Content hierarchy",
  "Live editing",
  "Responsive layout",
  "Export package",
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/14 bg-[linear-gradient(135deg,rgba(84,213,200,0.32),rgba(245,184,75,0.18))] text-sm font-semibold text-white shadow-[0_14px_34px_rgba(6,16,25,0.4)]">
        S
      </div>
      <div className="leading-none">
        <p className="text-[0.95rem] font-semibold tracking-[-0.02em] text-white">Sitezy</p>
        <p className="mt-1 text-[0.65rem] uppercase tracking-[0.28em] text-slate-300/42">
          Studio
        </p>
      </div>
    </div>
  );
}

function StepCard({ step, visible }: { step: (typeof steps)[number]; visible: boolean }) {
  const accent = step.num === "01" ? COLORS.teal : step.num === "02" ? COLORS.sky : COLORS.amber;

  return (
    <div
      className={`absolute inset-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-6 scale-[0.985] opacity-0"
      }`}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,29,42,0.96),rgba(10,18,29,0.98))] shadow-[0_34px_90px_rgba(0,0,0,0.42)]">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-white/18" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/12" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
          </div>
          <div
            className="rounded-full border px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.22em]"
            style={{
              borderColor: `${accent}33`,
              background: `${accent}18`,
              color: accent,
            }}
          >
            {step.label}
          </div>
        </div>

        <div className="grid flex-1 lg:grid-cols-[178px_minmax(0,1fr)]">
          <aside className="border-b border-white/8 bg-white/[0.02] px-4 py-5 lg:border-b-0 lg:border-r lg:py-6">
            <p className="mb-4 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-slate-300/44">
              {step.num === "03" ? "Files" : step.num === "02" ? "Layers" : "Pages"}
            </p>
            <div className="space-y-2">
              {step.pages.map((item, index) => {
                const active = index === 0;
                return (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
                    style={{
                      background: active ? `${accent}18` : "transparent",
                      border: `1px solid ${active ? `${accent}22` : "transparent"}`,
                    }}
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: active ? accent : "rgba(255,255,255,0.14)" }}
                    />
                    <span className="truncate text-sm" style={{ color: active ? COLORS.text : COLORS.dim }}>
                      {item}
                    </span>
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="relative overflow-hidden p-4 sm:p-5 lg:p-6">
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at top right, ${accent}18, transparent 32%)`,
              }}
            />

            {step.num === "01" && (
              <div className="relative grid h-full gap-4 lg:grid-cols-[1.04fr_0.96fr]">
                <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5">
                  <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-200/60">
                    Brief
                  </div>
                  <h3 className="mt-4 text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
                    {step.title2}
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-300/68">{step.desc}</p>
                  <div className="mt-6 grid gap-3 text-sm text-slate-200/78">
                    {[
                      ["Business", "Luxury real estate studio"],
                      ["Tone", "Editorial, confident, premium"],
                      ["Must-have", "Gallery, listings, inquiry page"],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-white/8 bg-[#09121a]/90 px-4 py-3"
                      >
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-300/40">
                          {label}
                        </p>
                        <p className="mt-2 text-sm text-slate-100/84">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-[#0a141d]/92 p-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-2xl"
                      style={{ background: `${accent}18` }}
                    >
                      <Sparkles size={16} style={{ color: accent }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Generation queue</p>
                      <p className="text-xs text-slate-300/52">Structured pages are being assembled.</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {[
                      ["Home page", 100],
                      ["Properties page", 100],
                      ["Contact page", 74],
                      ["About page", 26],
                    ].map(([label, percent]) => {
                      const value = Number(percent);
                      return (
                        <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-slate-100/82">{label}</span>
                            <span className="text-xs font-medium text-slate-300/48">
                              {value === 100 ? "Ready" : `${value}%`}
                            </span>
                          </div>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${value}%`, background: accent }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {step.num === "02" && (
              <div className="relative grid h-full gap-4 lg:grid-cols-[1fr_228px]">
                <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#09131b]">
                  <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:30px_30px]" />
                  <div className="absolute inset-x-5 top-5 bottom-5 rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(20,34,48,0.96),rgba(12,22,33,0.96))]">
                    <div className="flex h-12 items-center justify-between border-b border-white/8 px-6">
                      <div className="h-2 w-14 rounded-full bg-white/16" />
                      <div className="flex gap-2">
                        <div className="h-2 w-10 rounded-full bg-white/10" />
                        <div className="h-2 w-10 rounded-full bg-white/10" />
                        <div className="h-2 w-10 rounded-full bg-white/10" />
                      </div>
                    </div>
                    <div className="relative h-[calc(100%-3rem)] px-8 py-8">
                      <div className="max-w-[16rem]">
                        <div className="h-3 w-32 rounded-full bg-white/16" />
                        <div className="mt-4 h-11 w-64 rounded-[20px] bg-white/22" />
                        <div className="mt-4 h-2.5 w-52 rounded-full bg-white/12" />
                        <div className="mt-3 h-2.5 w-44 rounded-full bg-white/10" />
                        <div className="mt-6 flex gap-3">
                          <div
                            className="h-11 w-28 rounded-[16px]"
                            style={{ background: `linear-gradient(135deg, ${accent}, ${COLORS.teal})` }}
                          />
                          <div className="h-11 w-28 rounded-[16px] border border-white/10 bg-white/[0.03]" />
                        </div>
                      </div>

                      <div className="absolute inset-x-8 top-6 bottom-8 rounded-[22px] border-2 border-dashed" style={{ borderColor: `${accent}a8` }} />
                      <div
                        className="absolute left-10 top-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-white shadow-[0_10px_22px_rgba(0,0,0,0.22)]"
                        style={{ background: accent }}
                      >
                        <MousePointerSquareDashed size={12} />
                        Hero Section
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-[#0c151f]/92 p-4">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-300/40">
                    Inspector
                  </p>
                  <div className="mt-4 space-y-3">
                    {[
                      { label: "Element", value: "Hero Section", active: true },
                      { label: "Font", value: "Canela Display", active: false },
                      { label: "Size", value: "72px", active: false },
                      { label: "Weight", value: "700", active: false },
                      { label: "Padding", value: "88px 56px", active: false },
                    ].map(({ label, value, active }) => (
                      <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-300/40">
                          {label}
                        </p>
                        <p
                          className="mt-2 text-sm font-medium"
                          style={{ color: active ? accent : COLORS.text }}
                        >
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div
                    className="mt-4 rounded-2xl border px-4 py-3 text-center text-sm font-semibold text-white"
                    style={{ borderColor: `${accent}38`, background: `${accent}22` }}
                  >
                    Apply changes
                  </div>
                </div>
              </div>
            )}

            {step.num === "03" && (
              <div className="relative grid h-full gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-2xl"
                      style={{ background: `${accent}18` }}
                    >
                      <Download size={16} style={{ color: accent }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Production package</p>
                      <p className="text-xs text-slate-300/52">Everything is ready for handoff.</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      "sitezy-luxury-realestate.zip",
                      "assets/",
                      "styles/",
                      "readme-handoff.txt",
                    ].map((file, index) => (
                      <div
                        key={file}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-[#09121a]/94 px-4 py-3"
                      >
                        <span className="truncate font-mono text-[0.82rem] text-slate-100/80">{file}</span>
                        <span className="text-xs text-slate-300/44">{index === 0 ? "2.1 MB" : "Ready"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ["4", "Pages"],
                      ["0", "Dependencies"],
                      ["100%", "Portable"],
                    ].map(([value, label]) => (
                      <div
                        key={label}
                        className="rounded-[22px] border border-white/10 bg-[#0c151f]/92 px-4 py-4"
                      >
                        <p className="text-2xl font-semibold tracking-[-0.04em] text-white">{value}</p>
                        <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-300/44">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-[#0c151f]/92 p-5">
                    <p className="text-sm font-semibold text-white">Delivery ready</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300/66">
                      Export the full site package, or hand the project off with the exact page structure and assets already attached.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {["ZIP export", "HTML/CSS", "Asset bundle"].map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-200/72"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [heroIn, setHeroIn] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [walkStep, setWalkStep] = useState(0);
  const [walkProg, setWalkProg] = useState(0);

  const walkRef = useRef<HTMLDivElement>(null);
  const revealHero = useReveal(0);
  const revealShowcase = useReveal(0);
  const revealFeatures = useReveal(0);
  const revealPricing = useReveal(0);
  const revealFaq = useReveal(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setHeroIn(true), 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const updateWalkthrough = () => {
      const node = walkRef.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      const total = Math.max(1, node.offsetHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / total));

      setWalkProg(progress);
      setWalkStep(Math.min(steps.length - 1, Math.floor(progress * steps.length)));
    };

    window.addEventListener("scroll", updateWalkthrough, { passive: true });
    window.addEventListener("resize", updateWalkthrough);
    updateWalkthrough();

    return () => {
      window.removeEventListener("scroll", updateWalkthrough);
      window.removeEventListener("resize", updateWalkthrough);
    };
  }, []);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden text-white"
      style={{
        background: `
          radial-gradient(circle at 18% 16%, rgba(84, 213, 200, 0.12), transparent 28%),
          radial-gradient(circle at 80% 12%, rgba(130, 184, 255, 0.14), transparent 24%),
          radial-gradient(circle at 52% 86%, rgba(245, 184, 75, 0.12), transparent 26%),
          linear-gradient(180deg, ${COLORS.base} 0%, ${COLORS.baseSoft} 52%, #060e15 100%)
        `,
      }}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="marketing-glow absolute left-1/2 top-[-18rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(84,213,200,0.22),rgba(84,213,200,0)_68%)] blur-3xl" />
        <div className="marketing-glow-delayed absolute right-[-10rem] top-[16rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(130,184,255,0.2),rgba(130,184,255,0)_70%)] blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.32)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:84px_84px]" />
      </div>

      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between rounded-full border border-white/10 bg-[#08131dcc]/90 px-4 shadow-[0_24px_50px_rgba(0,0,0,0.22)] backdrop-blur-2xl sm:px-5">
            <Link href="/" aria-label="Sitezy home">
              <Logo />
            </Link>

            <nav className="hidden items-center gap-7 text-sm text-slate-300/62 md:flex">
              {[
                ["#how-it-works", "How it works"],
                ["#features", "Features"],
                ["#pricing", "Pricing"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="transition-colors duration-200 hover:text-white"
                >
                  {label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="hidden h-10 items-center rounded-full border border-transparent px-4 text-sm text-slate-300/68 transition-colors hover:border-white/10 hover:text-white sm:inline-flex"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-10 items-center rounded-full border border-[#f5b84b33] bg-[linear-gradient(135deg,rgba(245,184,75,0.3),rgba(245,184,75,0.18))] px-4 text-sm font-medium text-white shadow-[0_14px_28px_rgba(245,184,75,0.18)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1440px] gap-12 px-4 pb-18 pt-32 sm:px-6 lg:grid-cols-[0.96fr_1.04fr] lg:px-8 lg:pb-24 lg:pt-36">
          <div className="relative z-10 max-w-[40rem]">
            <div
              className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-slate-200/64 transition-all duration-700 ${
                heroIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <Sparkles size={13} className="text-[#54d5c8]" />
              AI website builder
            </div>

            <h1 className="mt-7 text-[clamp(3.8rem,10vw,8.4rem)] font-[800] leading-[0.86] tracking-[-0.065em]">
              {[
                ["Design the", COLORS.text],
                ["premium site", COLORS.cream],
                ["before you code.", COLORS.text],
              ].map(([line, color], index) => (
                <span key={line} className="block overflow-hidden">
                  <span
                    className="block transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{
                      color,
                      opacity: heroIn ? 1 : 0,
                      transform: heroIn ? "translateY(0)" : "translateY(108%)",
                      transitionDelay: `${index * 80}ms`,
                    }}
                  >
                    {line}
                  </span>
                </span>
              ))}
            </h1>

            <p
              className={`mt-7 max-w-[34rem] text-base leading-8 text-slate-200/68 transition-all duration-700 sm:text-lg ${
                heroIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
              style={{ transitionDelay: "260ms" }}
            >
              Go from brief to polished, exportable website with the same sense of rhythm, motion,
              and product confidence you expect from a premium launch experience.
            </p>

            <div
              className={`mt-8 flex flex-wrap gap-3 transition-all duration-700 ${
                heroIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
              style={{ transitionDelay: "360ms" }}
            >
              <Link
                href="/signup"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-[#54d5c833] bg-[linear-gradient(135deg,rgba(84,213,200,0.28),rgba(84,213,200,0.16))] px-6 text-sm font-medium text-white shadow-[0_20px_34px_rgba(84,213,200,0.18)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                Start building
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/studio"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-6 text-sm font-medium text-slate-100/82 transition-colors duration-200 hover:bg-white/[0.06]"
              >
                View demo
                <Play size={14} />
              </Link>
            </div>

            <div
              className={`mt-9 flex flex-wrap gap-3 transition-all duration-700 ${
                heroIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
              style={{ transitionDelay: "440ms" }}
            >
              {heroSignals.map((signal) => (
                <div
                  key={signal}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-200/70"
                >
                  <Check size={13} className="text-[#54d5c8]" />
                  {signal}
                </div>
              ))}
            </div>
          </div>

          <div
            className={`relative min-h-[34rem] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] lg:min-h-[42rem] ${
              heroIn ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
            style={{ transitionDelay: "180ms" }}
          >
            <div className="absolute inset-0 rounded-[34px] border border-white/12 bg-[linear-gradient(180deg,rgba(15,27,39,0.94),rgba(8,15,24,0.96))] shadow-[0_40px_120px_rgba(0,0,0,0.36)]" />
            <div className="absolute inset-x-5 top-5 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[0.72rem] font-medium text-slate-200/72">
                <div className="h-2.5 w-2.5 rounded-full bg-[#54d5c8]" />
                Live generation
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[0.72rem] text-slate-200/62">
                <ShieldCheck size={13} className="text-[#f5b84b]" />
                Export ready
              </div>
            </div>

            <div className="absolute inset-x-5 bottom-5 top-20 overflow-hidden rounded-[28px] border border-white/10 bg-[#08121b]/94">
              <div className="grid h-full lg:grid-cols-[208px_minmax(0,1fr)]">
                <aside className="border-b border-white/8 bg-white/[0.025] px-4 py-5 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-slate-300/42">
                    Pages
                  </p>
                  <div className="mt-4 space-y-2">
                    {["Home", "Properties", "About", "Contact"].map((page, index) => (
                      <div
                        key={page}
                        className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
                        style={{
                          border: `1px solid ${index === 0 ? "rgba(84,213,200,0.22)" : "transparent"}`,
                          background: index === 0 ? "rgba(84,213,200,0.12)" : "transparent",
                        }}
                      >
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            background: index === 0 ? COLORS.teal : "rgba(255,255,255,0.12)",
                          }}
                        />
                        <span className="text-sm text-slate-100/82">{page}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 space-y-3">
                    {[
                      ["Primary", COLORS.teal],
                      ["Highlight", COLORS.amber],
                      ["Surface", COLORS.sky],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
                      >
                        <span className="text-xs uppercase tracking-[0.18em] text-slate-300/48">
                          {label}
                        </span>
                        <div className="h-5 w-5 rounded-full border border-black/20" style={{ background: value }} />
                      </div>
                    ))}
                  </div>
                </aside>

                <div className="relative overflow-hidden p-4 sm:p-5 lg:p-6">
                  <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:28px_28px]" />
                  <div className="absolute inset-4 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,34,50,0.96),rgba(10,19,29,0.96))] sm:inset-5 lg:inset-6">
                    <div className="flex h-12 items-center justify-between border-b border-white/8 px-5">
                      <div className="flex gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-white/16" />
                        <div className="h-2.5 w-2.5 rounded-full bg-white/12" />
                        <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#54d5c824] bg-[#54d5c814] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#54d5c8]">
                        Active canvas
                      </div>
                    </div>

                    <div className="relative px-5 py-6 sm:px-8 sm:py-8">
                      <div className="max-w-[18rem]">
                        <div className="h-2.5 w-20 rounded-full bg-white/14" />
                        <div className="mt-5 h-14 w-[18rem] max-w-full rounded-[22px] bg-white/20" />
                        <div className="mt-4 h-2.5 w-48 rounded-full bg-white/12" />
                        <div className="mt-3 h-2.5 w-40 rounded-full bg-white/10" />
                        <div className="mt-7 flex flex-wrap gap-3">
                          <div className="h-11 w-28 rounded-[16px] bg-[linear-gradient(135deg,#54d5c8,#82b8ff)] shadow-[0_12px_28px_rgba(84,213,200,0.2)]" />
                          <div className="h-11 w-28 rounded-[16px] border border-white/10 bg-white/[0.04]" />
                        </div>
                      </div>

                      <div className="absolute inset-x-5 top-5 bottom-5 rounded-[24px] border-2 border-dashed border-[#54d5c8a8]" />
                      <div className="absolute left-8 top-2 inline-flex items-center gap-2 rounded-full bg-[#54d5c8] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#07111a] shadow-[0_12px_24px_rgba(84,213,200,0.22)]">
                        <MousePointerSquareDashed size={12} />
                        Hero Section
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-8 right-7 hidden rounded-[22px] border border-white/10 bg-[#0d1823]/94 p-4 shadow-[0_24px_50px_rgba(0,0,0,0.28)] sm:block marketing-orbit">
                    <p className="text-sm font-semibold text-white">AI guidance</p>
                    <p className="mt-2 max-w-[12rem] text-xs leading-5 text-slate-300/56">
                      Increase contrast on the hero CTA and tighten spacing before the features grid.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute right-4 top-28 hidden w-52 rounded-[24px] border border-white/10 bg-[#0c1822]/94 p-4 shadow-[0_24px_50px_rgba(0,0,0,0.28)] lg:block marketing-orbit-alt">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-300/42">Brand memory</span>
                <Sparkles size={14} className="text-[#f5b84b]" />
              </div>
              <p className="mt-3 text-sm font-medium text-white">Modern Mediterranean restaurant</p>
              <p className="mt-2 text-xs leading-5 text-slate-300/56">
                Warm editorial palette, reservation-first flow, elegant typography.
              </p>
            </div>

            <div className="absolute bottom-7 left-4 hidden w-56 rounded-[24px] border border-white/10 bg-[#0d1823]/94 p-4 shadow-[0_24px_50px_rgba(0,0,0,0.28)] lg:block marketing-orbit">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-300/42">Delivery</span>
                <div className="h-2.5 w-2.5 rounded-full bg-[#54d5c8]" />
              </div>
              <div className="mt-3 space-y-2">
                {["HTML", "CSS", "Assets"].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-slate-100/80">
                    <span>{item}</span>
                    <Check size={13} className="text-[#54d5c8]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/8 bg-white/[0.02] py-4">
          <div className="overflow-hidden">
            <div className="marketing-marquee-track flex min-w-max items-center gap-3 px-4 text-sm text-slate-200/62">
              {[...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2"
                >
                  <div className="h-2 w-2 rounded-full bg-[#f5b84b]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div ref={revealHero.ref} style={revealHero.style}>
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,30,42,0.96),rgba(11,20,30,0.96))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.3)] lg:col-span-8 lg:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-300/42">
                      Product showcase
                    </p>
                    <h2 className="mt-4 max-w-[12ch] text-[clamp(2.4rem,5vw,4.8rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-white">
                      One workspace. Every page connected.
                    </h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200/64">
                    Brief once, refine anywhere
                  </div>
                </div>

                <div className="mt-8 grid gap-4 lg:grid-cols-[1.14fr_0.86fr]">
                  <div className="rounded-[26px] border border-white/10 bg-[#08131b] p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-300/40">Project system</span>
                      <PanelsTopLeft size={15} className="text-[#54d5c8]" />
                    </div>
                    <div className="mt-5 grid gap-3">
                      {[
                        ["Homepage", "Hero, story, CTA flow"],
                        ["Properties", "Listing grid, filters, inquiry CTA"],
                        ["About", "Team, positioning, social proof"],
                        ["Contact", "Form, map, booking details"],
                      ].map(([title, body], index) => (
                        <div
                          key={title}
                          className="flex items-start gap-4 rounded-[22px] border border-white/8 px-4 py-4"
                          style={{
                            background: index === 0 ? "rgba(84,213,200,0.12)" : "rgba(255,255,255,0.03)",
                          }}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06] text-sm font-semibold text-white">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{title}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-300/58">{body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-300/40">Brand controls</p>
                      <div className="mt-5 space-y-3">
                        {[
                          ["Typography", "Editorial serif + clean UI sans"],
                          ["Accent", "Warm amber with cool glass surfaces"],
                          ["Mood", "High-end, spacious, image-driven"],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-300/40">
                              {label}
                            </p>
                            <p className="mt-2 text-sm text-slate-100/82">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[26px] border border-white/10 bg-[#0b1722]/94 p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-300/40">Shipping confidence</p>
                      <div className="mt-5 grid grid-cols-3 gap-3">
                        {[
                          ["4", "Pages"],
                          ["1", "Workspace"],
                          ["0", "Lock-in"],
                        ].map(([value, label]) => (
                          <div
                            key={label}
                            className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-4 text-center"
                          >
                            <p className="text-2xl font-semibold tracking-[-0.04em] text-white">{value}</p>
                            <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-300/42">
                              {label}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 lg:col-span-4">
                <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,35,50,0.96),rgba(10,18,27,0.96))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.3)]">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-300/42">
                    Brand trust
                  </p>
                  <h3 className="mt-4 text-[1.9rem] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
                    Move from idea to launch without losing the design thread.
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-slate-300/62">
                    Keep the same product rhythm from first prompt to final export instead of rebuilding the site in another tool.
                  </p>
                </div>

                <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#0a141d]/94 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center justify-between">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-300/42">
                      Live status
                    </p>
                    <Globe2 size={16} className="text-[#82b8ff]" />
                  </div>
                  <div className="mt-6 space-y-4">
                    {[
                      ["Structure generated", COLORS.teal],
                      ["Canvas refined", COLORS.sky],
                      ["Export package ready", COLORS.amber],
                    ].map(([label, color]) => (
                      <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                        <span className="text-sm text-slate-100/80">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" ref={walkRef} style={{ height: `${steps.length * 78}vh` }}>
          <div className="sticky top-0 flex h-screen items-center">
            <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
              <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-300/42">
                    How it works
                  </p>
                  <h2 className="mt-5 text-[clamp(2.7rem,6vw,5.8rem)] font-semibold leading-[0.92] tracking-[-0.055em] text-white">
                    From brief
                    <br />
                    to shipped site.
                  </h2>
                  <p className="mt-6 max-w-[28rem] text-sm leading-7 text-slate-300/64 sm:text-base">
                    The flow stays the same throughout: generate the structure, refine it visually, then export cleanly once the project is done.
                  </p>

                  <div className="mt-10 space-y-4">
                    {steps.map((step, index) => {
                      const active = walkStep === index;
                      const past = walkStep > index;
                      const accent = step.num === "01" ? COLORS.teal : step.num === "02" ? COLORS.sky : COLORS.amber;

                      return (
                        <div
                          key={step.num}
                          className="flex gap-4 rounded-[24px] border px-4 py-4 transition-all duration-300 sm:px-5"
                          style={{
                            borderColor: active || past ? `${accent}30` : "rgba(255,255,255,0.08)",
                            background: active ? `${accent}12` : "rgba(255,255,255,0.02)",
                          }}
                        >
                          <div
                            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold"
                            style={{
                              borderColor: active || past ? `${accent}4a` : "rgba(255,255,255,0.1)",
                              color: active ? "#061019" : past ? accent : COLORS.dim,
                              background: active ? accent : "rgba(255,255,255,0.03)",
                            }}
                          >
                            {past ? <Check size={15} /> : step.num}
                          </div>
                          <div className="pt-1">
                            <p
                              className="text-base font-semibold transition-colors duration-300"
                              style={{ color: active ? COLORS.text : past ? COLORS.muted : COLORS.dim }}
                            >
                              {step.title}
                            </p>
                            <div
                              className="overflow-hidden transition-[max-height,opacity] duration-300"
                              style={{
                                maxHeight: active ? "120px" : "0px",
                                opacity: active ? 1 : 0,
                              }}
                            >
                              <p className="mt-3 max-w-[28rem] text-sm leading-6 text-slate-300/64">
                                {step.body}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-8">
                    <div className="h-1 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#54d5c8,#82b8ff,#f5b84b)] transition-[width] duration-150"
                        style={{ width: `${Math.max(8, Math.round(walkProg * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="relative min-h-[30rem] lg:min-h-[34rem]">
                  {steps.map((step, index) => (
                    <StepCard key={step.num} step={step} visible={walkStep === index} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div ref={revealShowcase.ref} style={revealShowcase.style}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-300/42">
                  Product
                </p>
                <h2 className="mt-4 text-[clamp(2.8rem,5vw,5.4rem)] font-semibold leading-[0.92] tracking-[-0.055em] text-white">
                  Everything you need.
                  <br />
                  <span className="text-slate-300/46">Nothing you do not.</span>
                </h2>
              </div>
              <p className="max-w-[24rem] text-sm leading-7 text-slate-300/62">
                Sitezy keeps the workflow narrow and deliberate so the design quality improves as you move through the project, instead of becoming more fragmented.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-12">
              {features.map(({ icon: Icon, title, body }, index) => (
                <div
                  key={title}
                  className={`group rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,29,42,0.96),rgba(9,17,27,0.96))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] transition-transform duration-300 hover:-translate-y-1 ${
                    index === 0 || index === 3 ? "lg:col-span-7" : "lg:col-span-5"
                  }`}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-white/[0.04]">
                    <Icon
                      size={22}
                      className={index % 2 === 0 ? "text-[#54d5c8]" : "text-[#f5b84b]"}
                    />
                  </div>
                  <h3 className="mt-6 text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
                    {title}
                  </h3>
                  <p className="mt-3 max-w-[32rem] text-sm leading-7 text-slate-300/62">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-[1440px] px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
          <div ref={revealPricing.ref} style={revealPricing.style}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-300/42">
                  Pricing
                </p>
                <h2 className="mt-4 text-[clamp(2.8rem,5vw,5.4rem)] font-semibold leading-[0.92] tracking-[-0.055em] text-white">
                  Simple pricing.
                  <br />
                  <span className="text-slate-300/46">Premium output.</span>
                </h2>
              </div>
              <p className="max-w-[22rem] text-sm leading-7 text-slate-300/62">
                Choose a plan based on volume and team workflow. The product surface stays the same across the tiers.
              </p>
            </div>

            <div className="mt-10 grid gap-5 xl:grid-cols-3">
              {pricing.map((tier) => (
                <div
                  key={tier.name}
                  className="rounded-[32px] border p-7 shadow-[0_28px_80px_rgba(0,0,0,0.24)]"
                  style={{
                    borderColor: tier.featured ? "rgba(84,213,200,0.26)" : "rgba(255,255,255,0.1)",
                    background: tier.featured
                      ? "linear-gradient(180deg, rgba(18,33,47,0.98), rgba(11,20,30,0.98))"
                      : "linear-gradient(180deg, rgba(16,29,42,0.96), rgba(9,17,27,0.96))",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-slate-300/42">
                        {tier.name}
                      </p>
                      <div className="mt-4 flex items-end gap-2">
                        <span className="text-[3.5rem] font-semibold leading-none tracking-[-0.07em] text-white">
                          {tier.price}
                        </span>
                        <span className="pb-2 text-sm text-slate-300/52">/mo</span>
                      </div>
                    </div>
                    {tier.featured && (
                      <span className="rounded-full border border-[#54d5c833] bg-[#54d5c814] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#54d5c8]">
                        Popular
                      </span>
                    )}
                  </div>

                  <p className="mt-5 text-sm leading-7 text-slate-300/62">{tier.subtext}</p>

                  <div className="mt-7 space-y-3">
                    {tier.points.map((point) => (
                      <div key={point} className="flex items-center gap-3 text-sm text-slate-100/76">
                        <Check size={14} className="flex-shrink-0 text-[#54d5c8]" />
                        {point}
                      </div>
                    ))}
                  </div>

                  <Link
                    href={tier.href}
                    className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full border text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5"
                    style={{
                      borderColor: tier.featured ? "rgba(84,213,200,0.28)" : "rgba(255,255,255,0.12)",
                      color: "#ffffff",
                      background: tier.featured
                        ? "linear-gradient(135deg, rgba(84,213,200,0.3), rgba(130,184,255,0.22))"
                        : "rgba(255,255,255,0.04)",
                    }}
                  >
                    {tier.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
          <div ref={revealFaq.ref} style={revealFaq.style}>
            <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-300/42">
                  FAQ
                </p>
                <h2 className="mt-4 text-[clamp(2.5rem,4.8vw,4.8rem)] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
                  Common
                  <br />
                  questions.
                </h2>
                <p className="mt-6 max-w-[24rem] text-sm leading-7 text-slate-300/62">
                  The workflow is intentionally simple, but these are the questions that usually come up before teams adopt it.
                </p>
              </div>

              <div className="space-y-3">
                {faqs.map((item, index) => {
                  const active = openFaq === index;

                  return (
                    <div
                      key={item.q}
                      className="overflow-hidden rounded-[26px] border bg-[linear-gradient(180deg,rgba(16,29,42,0.96),rgba(10,18,29,0.96))]"
                      style={{
                        borderColor: active ? "rgba(84,213,200,0.24)" : "rgba(255,255,255,0.1)",
                      }}
                    >
                      <button
                        onClick={() => setOpenFaq(active ? null : index)}
                        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"
                      >
                        <span className="text-base font-medium text-white">{item.q}</span>
                        <ChevronDown
                          size={18}
                          className={`flex-shrink-0 transition-transform duration-200 ${
                            active ? "rotate-180 text-[#54d5c8]" : "text-slate-300/46"
                          }`}
                        />
                      </button>
                      <div
                        className="overflow-hidden transition-[max-height] duration-300"
                        style={{ maxHeight: active ? "220px" : "0px" }}
                      >
                        <div className="px-5 pb-5 text-sm leading-7 text-slate-300/62 sm:px-6 sm:pb-6">
                          {item.a}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
          <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,30,42,0.96),rgba(10,18,29,0.98))] p-7 shadow-[0_32px_90px_rgba(0,0,0,0.28)] sm:p-10 lg:p-12">
            <div className="absolute inset-y-0 right-[-12rem] hidden w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(245,184,75,0.2),rgba(245,184,75,0)_66%)] blur-3xl lg:block" />
            <div className="relative grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-300/42">
                  Start building
                </p>
                <h2 className="mt-4 text-[clamp(2.8rem,6vw,6.4rem)] font-semibold leading-[0.9] tracking-[-0.06em] text-white">
                  Launch a premium
                  <br />
                  site without the
                  <br />
                  tool sprawl.
                </h2>
              </div>

              <div className="lg:pl-10">
                <p className="max-w-[32rem] text-sm leading-7 text-slate-300/66 sm:text-base">
                  Brief it, generate it, refine it, and hand it off from the same environment. The workflow stays visual, but the final result stays portable.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/signup"
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-[#54d5c833] bg-[linear-gradient(135deg,rgba(84,213,200,0.28),rgba(84,213,200,0.16))] px-6 text-sm font-medium text-white shadow-[0_20px_34px_rgba(84,213,200,0.18)] transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    Create account
                    <ArrowRight size={15} />
                  </Link>
                  <Link
                    href="/studio"
                    className="inline-flex h-12 items-center rounded-full border border-white/12 bg-white/[0.03] px-6 text-sm font-medium text-slate-100/82 transition-colors duration-200 hover:bg-white/[0.06]"
                  >
                    Open studio
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-8 text-sm text-slate-300/58 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Logo />
          <div className="flex flex-wrap gap-5">
            {[
              ["Studio", "/studio"],
              ["Log in", "/login"],
              ["Sign up", "/signup"],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="transition-colors duration-200 hover:text-white">
                {label}
              </Link>
            ))}
          </div>
          <p>© {new Date().getFullYear()} Sitezy</p>
        </div>
      </footer>

      <style>{`
        html {
          scroll-behavior: smooth;
        }

        @keyframes marketing-float {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -18px, 0); }
        }

        @keyframes marketing-drift {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(14px, -10px, 0) rotate(1.2deg); }
        }

        @keyframes marketing-glow {
          0%, 100% { transform: translate3d(-50%, 0, 0) scale(1); opacity: 0.42; }
          50% { transform: translate3d(-50%, 18px, 0) scale(1.08); opacity: 0.72; }
        }

        @keyframes marketing-glow-delayed {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.36; }
          50% { transform: translate3d(-20px, -16px, 0) scale(1.06); opacity: 0.6; }
        }

        @keyframes marketing-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }

        .marketing-orbit {
          animation: marketing-float 12s ease-in-out infinite;
        }

        .marketing-orbit-alt {
          animation: marketing-drift 15s ease-in-out infinite;
        }

        .marketing-glow {
          animation: marketing-glow 16s ease-in-out infinite;
        }

        .marketing-glow-delayed {
          animation: marketing-glow-delayed 18s ease-in-out infinite;
        }

        .marketing-marquee-track {
          animation: marketing-marquee 28s linear infinite;
          width: max-content;
        }

        @media (prefers-reduced-motion: reduce) {
          .marketing-orbit,
          .marketing-orbit-alt,
          .marketing-glow,
          .marketing-glow-delayed,
          .marketing-marquee-track {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
