"use client";
import { useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/utils";
import {
  X, Zap, ChevronRight, ChevronLeft, Check, Sparkles, Upload,
  Palette, Code2, Utensils, Coffee, ShoppingBag, Activity,
  Home, Briefcase, User, Lightbulb, Calendar, BookOpen, Gem, MapPin,
  type LucideIcon,
} from "lucide-react";
import { GeneratingScreen } from "./GeneratingScreen";
import type { SiteBrief, SiteBlueprint, ProjectPage, PageSection, SmartBrief } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const INDUSTRIES: { label: string; Icon: LucideIcon }[] = [
  { label: "Creative Agency",    Icon: Palette },
  { label: "SaaS & Tech",        Icon: Code2 },
  { label: "Restaurant",         Icon: Utensils },
  { label: "Cafe & Coffee",      Icon: Coffee },
  { label: "Online Store",       Icon: ShoppingBag },
  { label: "Health & Fitness",   Icon: Activity },
  { label: "Real Estate",        Icon: Home },
  { label: "Portfolio",          Icon: Briefcase },
  { label: "Personal Brand",     Icon: User },
  { label: "Consulting",         Icon: Lightbulb },
  { label: "Events",             Icon: Calendar },
  { label: "Education",          Icon: BookOpen },
  { label: "Beauty & Lifestyle", Icon: Gem },
  { label: "Local Business",     Icon: MapPin },
];

const TONES: { label: string; color: string }[] = [
  { label: "Professional", color: "#3b82f6" },
  { label: "Playful",      color: "#f59e0b" },
  { label: "Minimal",      color: "#9ca3af" },
  { label: "Bold",         color: "#ef4444" },
  { label: "Luxurious",    color: "#d97706" },
  { label: "Friendly",     color: "#10b981" },
  { label: "Edgy",         color: "#8b5cf6" },
  { label: "Warm",         color: "#f97316" },
];

const COMMON_PAGES = [
  "Home","About","Services","Pricing","Contact",
  "Portfolio","Blog","FAQ","Team","Testimonials",
  "Menu","Booking","Case Studies","Events",
];

const COLOR_PRESETS = [
  { label:"AI Pick",    value:"",          colors:[] },
  { label:"Midnight",   value:"deep navy blues and electric blue accents, dark sophisticated palette", colors:["#0f172a","#1e3a5f","#3b82f6","#f8fafc"] },
  { label:"Forest",     value:"deep greens, earthy browns, warm cream backgrounds", colors:["#14532d","#2d6a4f","#d4a373","#fefae0"] },
  { label:"Crimson",    value:"bold reds, charcoal grays, clean white", colors:["#7f1d1d","#dc2626","#374151","#ffffff"] },
  { label:"Sunset",     value:"warm oranges, coral pinks, golden yellows", colors:["#c2410c","#f97316","#fbbf24","#fff7ed"] },
  { label:"Lavender",   value:"soft purples, mauve pinks, off-white backgrounds", colors:["#4c1d95","#7c3aed","#c4b5fd","#faf5ff"] },
  { label:"Mono",       value:"pure black and white with gray accents, stark contrast", colors:["#000000","#171717","#737373","#ffffff"] },
  { label:"Ocean",      value:"deep teals, seafoam greens, sandy beige", colors:["#0f4c5c","#14b8a6","#99f6e4","#f0fdfa"] },
  { label:"Copper",     value:"warm copper metallics, deep charcoal, cream whites", colors:["#431407","#b45309","#d97706","#fef3c7"] },
  { label:"Neon",       value:"vibrant neons on dark backgrounds, cyberpunk energy", colors:["#000000","#22d3ee","#a855f7","#f0fdf4"] },
  { label:"Rose Gold",  value:"blush pinks, rose golds, champagne tones", colors:["#881337","#f43f5e","#fda4af","#fff1f2"] },
  { label:"Sage",       value:"muted sage greens, warm stone grays, natural linen", colors:["#14532d","#6b7280","#9ca3af","#f5f5f0"] },
];

const IMAGE_STYLES = [
  { value:"photos",        label:"Real Photos",   desc:"Unsplash photography matched to your industry" },
  { value:"minimal",       label:"Minimal",        desc:"Color and typography focused, few images" },
  { value:"illustrations", label:"Illustrations",  desc:"Abstract shapes and graphic elements" },
  { value:"none",          label:"No Images",      desc:"Pure text and color design" },
];

const OFFERINGS_TYPES = [
  { value:"services",  label:"Services",  desc:"What you offer clients",    placeholder:"e.g.\nBrand Strategy – Full identity & positioning\nWeb Design – Custom sites from $3,500\nSEO – Monthly retainer packages" },
  { value:"products",  label:"Products",  desc:"Physical or digital items", placeholder:"e.g.\nHandmade Candles – Soy wax, 8oz / 16oz\nGift Sets – Holiday collection from $45\nSubscription Box – Monthly curated scents" },
  { value:"menu",      label:"Menu",      desc:"Food, drinks, dishes",      placeholder:"e.g.\nAvocado Toast – Sourdough, poached egg, chili – $14\nFlat White – Double espresso, steamed milk – $5\nAcai Bowl – Granola, fresh fruit, honey – $12" },
  { value:"portfolio", label:"Portfolio", desc:"Past work & projects",      placeholder:"e.g.\nNike Campaign – Brand identity & digital\nRiver House – Restaurant rebrand\nTerraform App – Product UI/UX design" },
  { value:"courses",   label:"Courses",   desc:"Programs & education",      placeholder:"e.g.\nFoundations of UX – 6-week cohort, $499\nFreelance Accelerator – Self-paced, $199\n1:1 Coaching – Monthly from $350/mo" },
];

function getOfferingsPlaceholder(type: string): string {
  return OFFERINGS_TYPES.find(o => o.value === type)?.placeholder ?? "List your main offerings, one per line...";
}

function extractColorsFromImage(dataUrl: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 60;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve([]);
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        const colorMap = new Map<string, number>();
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 100) continue; // skip near-transparent
          const r = Math.round(data[i] / 28) * 28;
          const g = Math.round(data[i + 1] / 28) * 28;
          const b = Math.round(data[i + 2] / 28) * 28;
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          if (brightness < 18 || brightness > 238) continue; // skip near-black/white
          const hex = "#" + [r, g, b].map(v => Math.min(255, v).toString(16).padStart(2, "0")).join("");
          colorMap.set(hex, (colorMap.get(hex) ?? 0) + 1);
        }
        const sorted = [...colorMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([hex]) => hex);
        resolve(sorted);
      } catch { resolve([]); }
    };
    img.onerror = () => resolve([]);
    img.src = dataUrl;
  });
}

function detectCurrency(description: string, address: string, offeringsText: string): string {
  const text = [description, address, offeringsText].join(" ");
  if (/\bAED\b|dubai|abu dhabi|sharjah|\buae\b|united arab/i.test(text)) return "AED (د.إ)";
  if (/\bSAR\b|saudi|riyadh|jeddah|مملكة/i.test(text)) return "SAR (ر.س)";
  if (/\bKWD\b|kuwait/i.test(text)) return "KWD (د.ك)";
  if (/\bQAR\b|qatar|doha/i.test(text)) return "QAR (ر.ق)";
  if (/\bGBP\b|£|\buk\b|england|britain|london|manchester|birmingham/i.test(text)) return "GBP (£)";
  if (/\bEUR\b|€|germany|france|spain|italy|netherlands|amsterdam|paris|berlin|madrid/i.test(text)) return "EUR (€)";
  if (/\bCAD\b|canada|toronto|vancouver|montreal/i.test(text)) return "CAD ($)";
  if (/\bAUD\b|australia|sydney|melbourne|brisbane/i.test(text)) return "AUD ($)";
  if (/\bINR\b|₹|india|mumbai|delhi|bangalore|chennai/i.test(text)) return "INR (₹)";
  if (/\bJPY\b|¥|japan|tokyo|osaka/i.test(text)) return "JPY (¥)";
  if (/\bMXN\b|mexico|ciudad de mexico|monterrey/i.test(text)) return "MXN ($)";
  if (text.includes("£")) return "GBP (£)";
  if (text.includes("€")) return "EUR (€)";
  if (text.includes("₹")) return "INR (₹)";
  return ""; // let AI decide (default USD)
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { onClose: () => void; }

const SMART_DEFAULTS: SmartBrief = {
  logoUrl: "", offeringsType: "", offeringsText: "", stylePreference: "",
  contactDetails: { phone: "", email: "", address: "", hours: "" },
};

export function CreateProjectModal({ onClose }: Props) {
  const createProject      = useAppStore((s) => s.createProject);
  const setBlueprint       = useAppStore((s) => s.setBlueprint);
  const setPageContent     = useAppStore((s) => s.setPageContent);
  const setPageStatus      = useAppStore((s) => s.setPageStatus);
  const setGenStatus       = useAppStore((s) => s.setGenStatus);
  const addGenLog          = useAppStore((s) => s.addGenLog);
  const clearGenLog        = useAppStore((s) => s.clearGenLog);
  const saveCurrentProject = useAppStore((s) => s.saveCurrentProject);
  const setApiError        = useAppStore((s) => s.setApiError);
  const genStatus          = useAppStore((s) => s.generationStatus);

  const [step, setStep]           = useState<1|2>(1);
  const [activeTab, setActiveTab] = useState<"content"|"design">("content");
  const [colorPreset, setColorPreset] = useState(0);
  const [customPage, setCustomPage]   = useState("");
  const [generatorMode, setGeneratorMode] = useState<"quick"|"smart">("quick");
  const [smartBrief, setSmartBrief]   = useState<SmartBrief>(SMART_DEFAULTS);
  const [logoDragging, setLogoDragging] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [brief, setBrief] = useState<SiteBrief>({
    siteName: "", description: "", siteType: "", tone: "Professional",
    pages: ["Home","About","Services","Contact"],
    features: "", targetAudience: "", colorPreference: "", colorPalette: [], imageStyle: "photos",
  });

  const projectIdRef = useRef<string|null>(null);

  function togglePage(page: string) {
    setBrief(b => ({
      ...b,
      pages: b.pages.includes(page) ? b.pages.filter(p => p !== page) : [...b.pages, page],
    }));
  }

  function addCustomPage() {
    const name = customPage.trim();
    if (!name || brief.pages.includes(name)) return;
    setBrief(b => ({ ...b, pages: [...b.pages, name] }));
    setCustomPage("");
  }

  function pickColorPreset(idx: number) {
    setColorPreset(idx);
    const p = COLOR_PRESETS[idx];
    setBrief(b => ({ ...b, colorPreference: p.value, colorPalette: p.colors }));
  }

  function patchSmartContact(field: keyof NonNullable<SmartBrief["contactDetails"]>, value: string) {
    setSmartBrief(s => ({ ...s, contactDetails: { ...s.contactDetails, [field]: value } }));
  }

  function handleLogoFile(file: File) {
    if (!file.type.match(/image\/(png|jpeg|svg\+xml|webp)/)) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setSmartBrief(s => ({ ...s, logoUrl: dataUrl }));
      const colors = await extractColorsFromImage(dataUrl);
      if (colors.length >= 2) {
        setBrief(b => ({ ...b, colorPalette: colors, colorPreference: "extracted from logo" }));
        setColorPreset(-1);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleGenerate() {
    if (!brief.siteName.trim() || !brief.description.trim()) return;
    setApiError(null);
    clearGenLog();
    setStep(2);
    setGenStatus("normalizing", "Preparing project...");

    const currency = detectCurrency(
      brief.description,
      smartBrief.contactDetails?.address ?? "",
      smartBrief.offeringsText ?? "",
    );

    const fullBrief: SiteBrief = {
      ...brief,
      generatorMode,
      hasLogo: generatorMode === "smart" && !!smartBrief.logoUrl,
      ...(currency && { currency }),
      ...(generatorMode === "smart" && {
        // strip logoUrl from smartBrief sent to API (too large — swap post-generation instead)
        smartBrief: { ...smartBrief, logoUrl: undefined },
      }),
    };

    try {
      const project = await createProject(fullBrief);
      projectIdRef.current = project.id;
      setGenStatus("blueprint","Analyzing your brief...");
      addGenLog("🔍 Extracting brand direction and visual identity...","info");
      if (brief.colorPreference) addGenLog(`🎨 Color: ${COLOR_PRESETS[colorPreset]?.label ?? "custom"}`, "info");
      addGenLog(`🖼️ Image style: ${brief.imageStyle ?? "photos"}`, "info");
      if (generatorMode === "smart") addGenLog("✦ Smart Setup — enriched context active", "info");

      const bpRes = await fetch("/api/blueprint", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ brief: fullBrief }),
      });
      if (!bpRes.ok) {
        const e = await bpRes.json() as { error?: string; requestId?: string; code?: string };
        if (e.requestId || e.code) setApiError({ message: e.error ?? "Blueprint failed", requestId: e.requestId ?? null, code: e.code ?? "ERR_API" });
        throw new Error(e.error || "Blueprint failed");
      }
      const { blueprint }: { blueprint: SiteBlueprint } = await bpRes.json();
      addGenLog(`✅ Blueprint — ${blueprint.layoutStyle} · ${blueprint.pages.length} pages`, "success");
      addGenLog(`🎨 ${blueprint.colorScheme.primary} · ${blueprint.typography.headingFont}`, "info");

      const pages: ProjectPage[] = blueprint.pages.map(p => ({
        id: p.id || uid(), name: p.name, slug: p.slug,
        sections: [], purpose: p.purpose, html: "", status: "pending" as const,
      }));
      setBlueprint(blueprint, pages);
      setGenStatus("pages","Generating pages...");

      let sharedNavbarHtml: string | null = null;

      for (let i = 0; i < blueprint.pages.length; i++) {
        const bpPage = blueprint.pages[i];
        const localPage = pages[i];
        setPageStatus(localPage.id, "generating");
        addGenLog(`📄 Generating ${bpPage.name} (${i+1}/${blueprint.pages.length})...`, "progress");
        setGenStatus("pages", `Generating ${bpPage.name} (${i+1}/${blueprint.pages.length})...`);

        const pageRes = await fetch("/api/generate", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ blueprint, page: bpPage, brief: fullBrief, navbarHtml: i > 0 ? sharedNavbarHtml : null }),
        });
        if (!pageRes.ok) {
          const e = await pageRes.json() as { error?: string; requestId?: string; code?: string };
          setApiError({ message: e.error ?? "Page generation failed", requestId: e.requestId ?? null, code: e.code ?? "ERR_API" });
          if (e.code === "ERR_BILLING" || e.code === "ERR_AUTH") {
            addGenLog(`❌ ${e.error}`, "error");
            throw new Error(e.error ?? "API error");
          }
          addGenLog(`⚠️ ${bpPage.name}: ${e.error}`, "error");
          setPageStatus(localPage.id, "error");
          continue;
        }
        const result: { html: string; sections: PageSection[] } = await pageRes.json();
        // Fix protocol-relative hrefs like "//menu" → "/menu" generated by AI
        const fixedHtml = result.html.replace(/href="\/\/([^"]*?)"/g, (_, path) => `href="/${path}"`);
        // Swap logo placeholder with actual data URL if logo was uploaded
        const finalHtml = (generatorMode === "smart" && smartBrief.logoUrl && fixedHtml.includes("__LOGO__"))
          ? fixedHtml.replaceAll("__LOGO__", smartBrief.logoUrl)
          : fixedHtml;
        setPageContent(localPage.id, finalHtml, result.sections);
        addGenLog(`✅ ${bpPage.name} — ${(finalHtml.length/1000).toFixed(1)}k chars`, "success");

        if (i === 0 && !sharedNavbarHtml && finalHtml) {
          const navMatch = finalHtml.match(/<nav[\s\S]*?<\/nav>/i);
          const headerMatch = finalHtml.match(/<header[\s\S]*?<\/header>/i);
          sharedNavbarHtml = navMatch?.[0] ?? headerMatch?.[0] ?? null;
        }
      }

      const successfulPages = pages.filter((p) => p.status === "done" || p.html);
      if (successfulPages.length === 0) throw new Error("No pages could be generated. Please check your API key and credits.");

      const saved = await saveCurrentProject({ manual: true });
      if (!saved) throw new Error("The generated project could not be saved.");

      setGenStatus("done","Your website is ready!");
      addGenLog("🎉 All done! Opening editor...", "success");
      setTimeout(() => { onClose(); }, 1800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setGenStatus("error", `Error: ${msg}`);
      addGenLog(`❌ ${msg}`, "error");
    }
  }

  const canSubmit = brief.siteName.trim().length > 0 && brief.description.trim().length > 10;
  const activeTone = TONES.find(t => t.label === brief.tone);
  const summaryPalette = (brief.colorPalette?.length
    ? brief.colorPalette
    : (colorPreset >= 0 ? COLOR_PRESETS[colorPreset]?.colors ?? [] : [])) ?? [];
  const colorLabel = colorPreset === -1
    ? "From logo"
    : COLOR_PRESETS[colorPreset]?.label ?? (brief.colorPreference ? "Custom" : "AI Pick");

  // ── Step 2 ──────────────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <>
        <GeneratingScreen projectName={brief.siteName || "Your Website"} pageCount={brief.pages.length} />
        {genStatus === "error" && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex gap-3">
            <button onClick={() => setStep(1)}
              className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-5 py-2.5 text-[13px] text-white transition-colors hover:bg-white/[0.1] backdrop-blur-sm">
              <ChevronLeft size={14} /> Go back
            </button>
            <button onClick={handleGenerate}
              className="flex items-center gap-2 rounded-full border border-[#54d5c833] bg-[linear-gradient(135deg,rgba(84,213,200,0.28),rgba(130,184,255,0.18))] px-5 py-2.5 text-[13px] font-medium text-white shadow-[0_18px_34px_rgba(84,213,200,0.18)] transition-transform duration-200 hover:-translate-y-0.5">
              <Zap size={14} /> Retry
            </button>
          </div>
        )}
      </>
    );
  }

  // ── Step 1 ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#02080d]/84 p-4 backdrop-blur-xl lg:items-center">
      <div className="relative my-4 w-full max-w-[1320px] overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,29,42,0.98),rgba(9,17,27,0.98))] shadow-[0_40px_120px_rgba(0,0,0,0.42)] animate-fade-in lg:my-0 lg:max-h-[calc(100vh-2rem)]">
        <div className="pointer-events-none absolute left-[-8rem] top-[-7rem] h-[20rem] w-[20rem] rounded-full bg-[radial-gradient(circle,rgba(84,213,200,0.18),rgba(84,213,200,0)_70%)] blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-8rem] right-[-7rem] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(245,184,75,0.12),rgba(245,184,75,0)_72%)] blur-3xl" />

        <div className="grid min-h-0 lg:h-[calc(100vh-2rem)] lg:max-h-[860px] lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="relative flex min-h-0 flex-col">
            <div className="border-b border-white/8 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 max-w-[34rem]">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-slate-200/64">
                    <Zap size={12} className="text-[#54d5c8]" />
                    Project generator
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <h2 className="text-[1.45rem] font-semibold leading-none tracking-[-0.05em] text-white">
                      Project setup
                    </h2>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-200/52">
                      {brief.pages.length} pages
                    </span>
                  </div>
                  <p className="mt-2 max-w-[32rem] text-[13px] leading-6 text-slate-300/58">
                    Define the business, choose the visual direction, and move straight into generation.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <div className="flex items-center rounded-full border border-white/10 bg-white/[0.04] p-1">
                    <button
                      onClick={() => setGeneratorMode("quick")}
                      className={`flex h-9 items-center gap-2 rounded-full px-4 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                        generatorMode === "quick"
                          ? "bg-white/[0.08] text-white"
                          : "text-white/38 hover:text-white/62"
                      }`}
                    >
                      <Zap size={11} className={generatorMode === "quick" ? "text-[#54d5c8]" : "opacity-50"} />
                      Quick
                    </button>
                    <button
                      onClick={() => setGeneratorMode("smart")}
                      className={`flex h-9 items-center gap-2 rounded-full px-4 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                        generatorMode === "smart"
                          ? "bg-[linear-gradient(135deg,rgba(84,213,200,0.22),rgba(130,184,255,0.18))] text-white"
                          : "text-white/38 hover:text-white/62"
                      }`}
                    >
                      <Sparkles size={11} className={generatorMode === "smart" ? "text-[#f5b84b]" : "opacity-50"} />
                      Smart
                    </button>
                  </div>

                  <div className="flex items-center rounded-full border border-white/10 bg-white/[0.04] p-1">
                    {(["content","design"] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                          activeTab === tab
                            ? "border border-[#54d5c833] bg-[#54d5c814] text-[#54d5c8]"
                            : "text-white/42 hover:text-white/68"
                        }`}
                      >
                        {tab === "content" ? "Content" : "Design"}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={onClose}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/38 transition-colors hover:text-white hover:bg-white/[0.08]"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              {activeTab === "content" ? (
                <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                  <div className="grid content-start gap-4">
                    <Section label="Core Brief">
                      <div className="space-y-3">
                        <input
                          value={brief.siteName}
                          onChange={e => setBrief({...brief, siteName: e.target.value})}
                          placeholder="Project name…"
                          className="w-full border-b border-white/8 bg-transparent pb-2.5 text-[22px] font-semibold tracking-[-0.04em] text-white placeholder:text-white/16 focus:border-[#54d5c84d] focus:outline-none transition-colors"
                        />
                        <textarea
                          value={brief.description}
                          onChange={e => setBrief({...brief, description: e.target.value})}
                          placeholder="Describe your website — what it's for, who it's for, what makes it unique…"
                          rows={2}
                          className="w-full resize-none bg-transparent text-[13px] leading-6 text-white/80 placeholder:text-white/24 focus:outline-none"
                        />
                      </div>
                    </Section>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <Section label="Tone & Voice">
                        <div className="flex flex-wrap gap-2">
                          {TONES.map(({ label, color }) => {
                            const active = brief.tone === label;
                            return (
                              <button key={label}
                                onClick={() => setBrief({...brief, tone: label})}
                                style={active ? { borderColor: color + "55", backgroundColor: color + "14" } : {}}
                                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10.5px] font-medium transition-all duration-150 ${
                                  active ? "text-white" : "bg-white/[0.03] border-white/[0.1] text-white/38 hover:border-white/20 hover:text-white/68"
                                }`}>
                                <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: color, opacity: active ? 1 : 0.4 }} />
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </Section>

                      <Section label="Optional Details">
                        <div className="grid gap-3">
                          <div>
                            <label className={LBL}>Features</label>
                            <input value={brief.features} onChange={e => setBrief({...brief, features: e.target.value})}
                              placeholder="Booking, menu, pricing…" className={IC} />
                          </div>
                          <div>
                            <label className={LBL}>Audience</label>
                            <input value={brief.targetAudience} onChange={e => setBrief({...brief, targetAudience: e.target.value})}
                              placeholder="Small business owners…" className={IC} />
                          </div>
                        </div>
                      </Section>
                    </div>

                    {generatorMode === "smart" && (
                      <Section label="Smart Details">
                        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                          <div>
                            <label className={LBL}>Logo</label>
                            <input ref={logoInputRef} type="file" accept=".png,.jpg,.jpeg,.svg,.webp" className="hidden"
                              onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }} />
                            {smartBrief.logoUrl ? (
                              <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={smartBrief.logoUrl} alt="Logo" className="h-9 w-9 flex-shrink-0 rounded-lg bg-white/5 object-contain" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[12px] text-white/55">Logo ready</p>
                                  <p className="mt-0.5 text-[10px] text-white/20">Used for generation</p>
                                </div>
                                <button onClick={() => { setSmartBrief(s => ({...s, logoUrl: ""})); if (logoInputRef.current) logoInputRef.current.value = ""; }}
                                  className="p-1 text-white/20 transition-colors hover:text-white/60"><X size={12} /></button>
                              </div>
                            ) : (
                              <button onClick={() => logoInputRef.current?.click()}
                                onDragOver={e => { e.preventDefault(); setLogoDragging(true); }}
                                onDragLeave={() => setLogoDragging(false)}
                                onDrop={e => { e.preventDefault(); setLogoDragging(false); const f = e.dataTransfer.files[0]; if (f) handleLogoFile(f); }}
                                className={`w-full rounded-xl border border-dashed px-4 py-3 text-left transition-all duration-150 ${
                                  logoDragging ? "border-[#54d5c84d] bg-[#54d5c812]" : "border-white/[0.10] hover:border-[#54d5c833] hover:bg-[#54d5c80a]"
                                }`}>
                                <div className="flex items-center gap-3">
                                  <Upload size={14} className="flex-shrink-0 text-white/20" />
                                  <div>
                                    <p className="text-[12px] text-white/45">Upload logo</p>
                                    <p className="mt-0.5 text-[10px] text-white/20">PNG · JPG · SVG · WebP</p>
                                  </div>
                                </div>
                              </button>
                            )}
                          </div>

                          <div className="grid gap-3">
                            <div>
                              <label className={LBL}>Offerings</label>
                              <div className="mb-3 grid grid-cols-[repeat(auto-fit,minmax(108px,1fr))] gap-2">
                                {OFFERINGS_TYPES.map(ot => {
                                  const active = smartBrief.offeringsType === ot.value;
                                  return (
                                    <button key={ot.value}
                                      onClick={() => setSmartBrief(s => ({
                                        ...s,
                                        offeringsType: s.offeringsType === ot.value ? "" : ot.value,
                                        offeringsText: s.offeringsType === ot.value ? "" : s.offeringsText,
                                      }))}
                                      className={`min-h-[52px] rounded-xl border px-3 py-2 text-center text-[10px] font-medium leading-tight transition-all ${
                                        active ? "border-[#54d5c838] bg-[#54d5c814] text-[#54d5c8]" : "border-white/[0.07] text-white/42 hover:border-white/15 hover:text-white/60"
                                      }`}>
                                      {ot.label}
                                    </button>
                                  );
                                })}
                              </div>
                              {smartBrief.offeringsType && (
                                <textarea value={smartBrief.offeringsText}
                                  onChange={e => setSmartBrief(s => ({...s, offeringsText: e.target.value}))}
                                  placeholder={getOfferingsPlaceholder(smartBrief.offeringsType!)}
                                  rows={3} className={`${IC} resize-none leading-6`} />
                              )}
                            </div>

                            <div>
                              <label className={LBL}>Contact Details</label>
                              <div className="grid grid-cols-2 gap-2">
                                <input value={smartBrief.contactDetails?.phone} onChange={e => patchSmartContact("phone", e.target.value)} placeholder="Phone" className={IC} />
                                <input value={smartBrief.contactDetails?.email} onChange={e => patchSmartContact("email", e.target.value)} placeholder="Email" className={IC} />
                                <input value={smartBrief.contactDetails?.address} onChange={e => patchSmartContact("address", e.target.value)} placeholder="Address" className={`${IC} col-span-2`} />
                                <input value={smartBrief.contactDetails?.hours} onChange={e => patchSmartContact("hours", e.target.value)} placeholder='Hours — e.g. "Mon–Fri 9am–6pm"' className={`${IC} col-span-2`} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Section>
                    )}
                  </div>

                  <div className="grid content-start gap-4">
                    <Section label="Industry">
                      <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                        {INDUSTRIES.map(({ label, Icon }) => {
                          const active = brief.siteType === label;
                          return (
                            <button key={label}
                              onClick={() => setBrief(b => ({...b, siteType: b.siteType === label ? "" : label}))}
                              className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition-all duration-150 ${
                                active
                                  ? "border-[#54d5c840] bg-[#54d5c814] text-white"
                                  : "border-white/10 bg-white/[0.03] text-white/48 hover:border-white/16 hover:text-white/76 hover:bg-white/[0.05]"
                              }`}>
                              <div className={`flex h-7 w-7 items-center justify-center rounded-xl border ${active ? "border-[#54d5c833] bg-[#54d5c814]" : "border-white/10 bg-white/[0.03]"}`}>
                                <Icon size={11} className={`flex-shrink-0 ${active ? "text-[#54d5c8]" : "text-white/34"}`} />
                              </div>
                              <span className="text-[10.5px] font-medium leading-snug">{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </Section>

                    <Section label="Pages to Include">
                      <div className="mb-3 flex flex-wrap gap-2">
                        {COMMON_PAGES.map(page => {
                          const active = brief.pages.includes(page);
                          return (
                            <button key={page} onClick={() => togglePage(page)}
                              className={`rounded-xl border px-3 py-1.5 text-[10.5px] font-medium transition-all duration-150 ${
                                active
                                  ? "bg-[#54d5c814] border-[#54d5c838] text-[#54d5c8]"
                                  : "bg-white/[0.03] border-white/[0.1] text-white/38 hover:border-white/18 hover:text-white/66"
                              }`}>
                              {page}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <input value={customPage} onChange={e => setCustomPage(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && addCustomPage()}
                          placeholder="Add custom page…" className={`${IC} text-[12px]`} />
                        <button onClick={addCustomPage} disabled={!customPage.trim()}
                          className="whitespace-nowrap rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[12px] text-white/44 transition-colors hover:text-white disabled:opacity-30">
                          + Add
                        </button>
                      </div>
                      {brief.pages.filter(p => !COMMON_PAGES.includes(p)).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {brief.pages.filter(p => !COMMON_PAGES.includes(p)).map(p => (
                            <span key={p} className="flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] text-emerald-300">
                              {p}
                              <button onClick={() => togglePage(p)} className="ml-0.5 hover:text-white">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </Section>
                  </div>
                </div>
              ) : (
                <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <Section label="Color Palette">
                    <p className="mb-3 text-[10.5px] text-white/28">Pick a mood or let AI choose based on your industry.</p>
                    <div className="mb-3 grid grid-cols-3 gap-2">
                      {COLOR_PRESETS.map((preset, idx) => (
                        <button key={preset.label} onClick={() => pickColorPreset(idx)}
                          className={`relative rounded-2xl border p-2.5 text-left transition-all duration-150 ${
                            colorPreset === idx ? "border-[#54d5c840] bg-[#54d5c814]" : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16]"
                          }`}>
                          {colorPreset === idx && (
                            <span className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#54d5c8]">
                              <Check size={8} className="text-white" />
                            </span>
                          )}
                          <div className="mb-2 flex gap-1">
                            {(preset.colors.length > 0 ? preset.colors : ["#7c3aed","#2563eb","#10b981","#f59e0b"]).map((c,i) => (
                              <div key={i} className="h-3.5 w-3.5 flex-shrink-0 rounded-full border border-black/20"
                                style={{ background: c, opacity: preset.colors.length === 0 ? 0.28 : 1 }} />
                            ))}
                          </div>
                          <span className="text-[10px] font-medium text-white/62">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                    <input value={colorPreset === 0 ? (brief.colorPreference ?? "") : ""}
                      onChange={e => { setColorPreset(0); setBrief({...brief, colorPreference: e.target.value, colorPalette: []}); }}
                      placeholder='Custom: "warm terracotta with sage green accents"' className={IC} />
                  </Section>

                  <div className="grid content-start gap-4">
                    <Section label="Image Style">
                      <div className="grid grid-cols-2 gap-2">
                        {IMAGE_STYLES.map(style => (
                          <button key={style.value} onClick={() => setBrief({...brief, imageStyle: style.value as SiteBrief["imageStyle"]})}
                            className={`rounded-2xl border p-3 text-left transition-all duration-150 ${
                              brief.imageStyle === style.value ? "border-[#54d5c840] bg-[#54d5c814]" : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16]"
                            }`}>
                            <div className="mb-1 flex items-center gap-2">
                              <span className="text-[11px] font-medium text-white/75">{style.label}</span>
                              {brief.imageStyle === style.value && <Check size={9} className="ml-auto text-[#54d5c8]" />}
                            </div>
                            <p className="text-[10px] leading-5 text-white/28">{style.desc}</p>
                          </button>
                        ))}
                      </div>
                    </Section>

                    <Section label="Design Direction (optional)">
                      <input value={smartBrief.stylePreference ?? ""}
                        onChange={e => setSmartBrief(s => ({...s, stylePreference: e.target.value}))}
                        placeholder='e.g. "editorial magazine feel" or "warm like Kinfolk"'
                        className={IC} />
                    </Section>
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-white/8 px-5 py-3 sm:px-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-white/22">
                  <span>{brief.pages.length} page{brief.pages.length !== 1 ? "s" : ""}</span>
                  {brief.siteType && <><span className="text-white/10">·</span><span>{brief.siteType}</span></>}
                  {activeTone && (
                    <>
                      <span className="text-white/10">·</span>
                      <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: activeTone.color + "99" }} />
                      <span>{brief.tone}</span>
                    </>
                  )}
                  {colorPreset !== 0 && <><span className="text-white/10">·</span><span className="text-[#54d5c8]/68">{colorLabel}</span></>}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab(activeTab === "content" ? "design" : "content")}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] text-white/42 transition-colors hover:text-white/68 whitespace-nowrap"
                  >
                    {activeTab === "content" ? "Design →" : "← Content"}
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={!canSubmit}
                    className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-semibold transition-all duration-200 ${
                      canSubmit
                        ? "border border-[#54d5c833] bg-[linear-gradient(135deg,rgba(84,213,200,0.28),rgba(130,184,255,0.18))] text-white shadow-[0_20px_36px_rgba(84,213,200,0.18)] hover:-translate-y-0.5"
                        : "border border-white/8 bg-white/[0.04] text-white/18 cursor-not-allowed"
                    }`}
                  >
                    {generatorMode === "smart" ? <Sparkles size={13} /> : <Zap size={13} />}
                    Generate
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside className="border-t border-white/8 bg-[linear-gradient(180deg,rgba(8,15,24,0.82),rgba(6,11,18,0.9))] p-5 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:p-6">
            <div className="grid h-full content-start gap-4">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-slate-300/42">
                  Generator summary
                </p>
                <h3 className="mt-3 text-[1.45rem] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
                  {brief.siteName.trim() || "Untitled project"}
                </h3>
                <p className="mt-2 text-[12px] leading-6 text-slate-300/56">
                  {brief.description.trim() || "Describe the project and the generator will shape the site blueprint and visual direction from the same brief."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] text-slate-200/68">
                    {generatorMode === "smart" ? "Smart mode" : "Quick mode"}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] text-slate-200/68">
                    {brief.pages.length} pages
                  </span>
                  {brief.siteType && (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] text-slate-200/68">
                      {brief.siteType}
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-slate-300/42">
                  Direction
                </p>
                <div className="mt-3 space-y-2.5">
                  {[
                    ["Tone", brief.tone],
                    ["Palette", colorLabel],
                    ["Images", IMAGE_STYLES.find((style) => style.value === brief.imageStyle)?.label ?? "Real Photos"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
                      <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-slate-300/38">{label}</p>
                      <p className="mt-1.5 text-[13px] text-slate-100/80">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(84,213,200,0.06),rgba(255,255,255,0.02))] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-slate-300/42">
                    Map & palette
                  </p>
                  {generatorMode === "smart" && smartBrief.logoUrl && (
                    <span className="rounded-full border border-[#54d5c822] bg-[#54d5c812] px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-[#54d5c8]">
                      Logo linked
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {brief.pages.map((page) => (
                    <span
                      key={page}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] text-slate-200/70"
                    >
                      {page}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  {(summaryPalette.length ? summaryPalette : ["#0f172a", "#54d5c8", "#82b8ff", "#f5b84b"]).slice(0, 4).map((color, index) => (
                    <div key={`${color}-${index}`} className="flex-1 rounded-[18px] border border-white/8 p-2.5" style={{ background: color }}>
                      <span className="rounded-full bg-black/20 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/84">
                        {index + 1}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[10px] leading-5 text-slate-300/52">
                  {generatorMode === "smart"
                    ? "Smart mode uses the logo and extra business context to sharpen the build."
                    : "Quick mode keeps the brief narrow and moves straight into the first generated structure."}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4">
      <p className={LBL}>{label}</p>
      {children}
    </div>
  );
}

const LBL = "mb-2 block text-[9px] font-bold uppercase tracking-[0.16em] text-white/30";
const IC  = "w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[12px] text-white placeholder-white/22 transition-all focus:border-[#54d5c840] focus:bg-white/[0.06] focus:outline-none";
