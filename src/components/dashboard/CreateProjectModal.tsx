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
    clearGenLog();
    setStep(2);

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

    const project = await createProject(fullBrief);
    projectIdRef.current = project.id;

    try {
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

  // ── Step 2 ──────────────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <>
        <GeneratingScreen projectName={brief.siteName || "Your Website"} pageCount={brief.pages.length} />
        {genStatus === "error" && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex gap-3">
            <button onClick={() => setStep(1)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.08] border border-white/[0.15] text-white text-[13px] rounded-xl hover:bg-white/[0.12] transition-colors backdrop-blur-sm">
              <ChevronLeft size={14} /> Go back
            </button>
            <button onClick={handleGenerate}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-[13px] rounded-xl transition-colors shadow-lg shadow-brand-500/30">
              <Zap size={14} /> Retry
            </button>
          </div>
        )}
      </>
    );
  }

  // ── Step 1 ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-[640px] max-h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-black/70 border border-white/[0.07] animate-fade-in"
        style={{ background: "radial-gradient(ellipse 80% 40% at 50% 0%, #130f1f 0%, #0a0a0e 55%)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <div className="w-6 h-6 rounded-md bg-brand-500/25 flex items-center justify-center flex-shrink-0">
                <Zap size={12} className="text-brand-400" />
              </div>
              <h2 className="font-semibold text-[15px] text-white">New Project</h2>
            </div>
            <p className="text-[11px] text-white/25 ml-8.5 pl-[34px]">Fill in the brief — AI does the rest</p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Mode toggle */}
            <div className="flex items-center p-[3px] rounded-lg bg-white/[0.05] border border-white/[0.07]">
              <button onClick={() => setGeneratorMode("quick")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-all duration-150 ${
                  generatorMode === "quick" ? "bg-white/[0.08] text-white" : "text-white/30 hover:text-white/55"
                }`}>
                <Zap size={9} className={generatorMode === "quick" ? "text-brand-400" : "opacity-50"} />
                Quick
              </button>
              <button onClick={() => setGeneratorMode("smart")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-all duration-150 ${
                  generatorMode === "smart" ? "bg-brand-500/25 text-brand-300" : "text-white/30 hover:text-white/55"
                }`}>
                <Sparkles size={9} />
                Smart
              </button>
            </div>

            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-5 border-b border-white/[0.06]">
          {(["content","design"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`py-2.5 px-1 mr-5 text-[12px] font-medium capitalize border-b-2 -mb-px transition-all ${
                activeTab === tab ? "text-white border-brand-500" : "text-white/30 border-transparent hover:text-white/55"
              }`}>
              {tab === "content" ? "Content" : "Design & Style"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-auto flex-1 px-5 py-5">
          {activeTab === "content" ? (
            <div className="space-y-7">

              {/* Core */}
              <div className="space-y-3">
                <input
                  value={brief.siteName}
                  onChange={e => setBrief({...brief, siteName: e.target.value})}
                  placeholder="Project name…"
                  className="w-full bg-transparent text-[22px] font-semibold text-white placeholder-white/15 focus:outline-none border-b border-white/[0.06] pb-3 focus:border-brand-500/30 transition-colors"
                />
                <textarea
                  value={brief.description}
                  onChange={e => setBrief({...brief, description: e.target.value})}
                  placeholder="Describe your website — what it's for, who it's for, what makes it unique…"
                  rows={3}
                  className="w-full bg-transparent text-[13.5px] text-white/80 placeholder-white/20 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <Separator />

              {/* Industry */}
              <Section label="Industry">
                <div className="grid grid-cols-4 gap-1.5">
                  {INDUSTRIES.map(({ label, Icon }) => {
                    const active = brief.siteType === label;
                    return (
                      <button key={label}
                        onClick={() => setBrief(b => ({...b, siteType: b.siteType === label ? "" : label}))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all duration-150 ${
                          active
                            ? "bg-brand-500/12 border-brand-500/40 text-white"
                            : "bg-white/[0.025] border-white/[0.07] text-white/45 hover:border-white/[0.18] hover:text-white/75 hover:bg-white/[0.04]"
                        }`}>
                        <Icon size={11} className={`flex-shrink-0 ${active ? "text-brand-400" : "text-white/30"}`} />
                        <span className="text-[11px] font-medium leading-snug">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </Section>

              <Separator />

              {/* Tone */}
              <Section label="Tone & Voice">
                <div className="flex flex-wrap gap-1.5">
                  {TONES.map(({ label, color }) => {
                    const active = brief.tone === label;
                    return (
                      <button key={label}
                        onClick={() => setBrief({...brief, tone: label})}
                        style={active ? { borderColor: color + "55", backgroundColor: color + "14" } : {}}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium border transition-all duration-150 ${
                          active ? "text-white" : "bg-white/[0.025] border-white/[0.08] text-white/35 hover:border-white/20 hover:text-white/65"
                        }`}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color, opacity: active ? 1 : 0.4 }} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </Section>

              <Separator />

              {/* Pages */}
              <Section label="Pages to include">
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {COMMON_PAGES.map(page => {
                    const active = brief.pages.includes(page);
                    return (
                      <button key={page} onClick={() => togglePage(page)}
                        className={`px-3 py-1.5 rounded-lg text-[11.5px] font-medium border transition-all duration-150 ${
                          active
                            ? "bg-brand-500/12 border-brand-500/35 text-brand-300"
                            : "bg-white/[0.025] border-white/[0.07] text-white/35 hover:border-white/[0.18] hover:text-white/65"
                        }`}>
                        {page}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <input value={customPage} onChange={e => setCustomPage(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addCustomPage()}
                    placeholder="Add custom page…" className={`${IC} text-[12px] py-2`} />
                  <button onClick={addCustomPage} disabled={!customPage.trim()}
                    className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white text-[12px] rounded-xl disabled:opacity-30 transition-colors whitespace-nowrap">
                    + Add
                  </button>
                </div>
                {brief.pages.filter(p => !COMMON_PAGES.includes(p)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {brief.pages.filter(p => !COMMON_PAGES.includes(p)).map(p => (
                      <span key={p} className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                        {p}
                        <button onClick={() => togglePage(p)} className="hover:text-white ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </Section>

              <Separator />

              {/* Optional extras */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LBL}>Features (optional)</label>
                  <input value={brief.features} onChange={e => setBrief({...brief, features: e.target.value})}
                    placeholder="Booking, menu, pricing…" className={IC} />
                </div>
                <div>
                  <label className={LBL}>Target Audience (optional)</label>
                  <input value={brief.targetAudience} onChange={e => setBrief({...brief, targetAudience: e.target.value})}
                    placeholder="Small business owners…" className={IC} />
                </div>
              </div>

              {/* Smart Details */}
              {generatorMode === "smart" && (
                <>
                  <Separator />
                  <div className="rounded-2xl border border-brand-500/20 overflow-hidden"
                    style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.06) 0%, rgba(109,40,217,0.02) 100%)" }}>
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-brand-500/10">
                      <Sparkles size={11} className="text-brand-400" />
                      <span className="text-[10.5px] font-bold tracking-widest uppercase text-brand-400/90">Smart Details</span>
                      <span className="ml-auto text-[10px] text-white/20">Enriches generation context</span>
                    </div>
                    <div className="p-4 space-y-5">

                      {/* Logo */}
                      <div>
                        <label className={LBL}>Logo (optional)</label>
                        <input ref={logoInputRef} type="file" accept=".png,.jpg,.jpeg,.svg,.webp" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }} />
                        {smartBrief.logoUrl ? (
                          <div className="flex items-center gap-3 p-3 bg-white/[0.04] border border-white/[0.08] rounded-xl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={smartBrief.logoUrl} alt="Logo" className="w-9 h-9 object-contain rounded-lg bg-white/5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] text-white/55">Logo ready</p>
                              <p className="text-[10px] text-white/20 mt-0.5">Referenced during generation</p>
                            </div>
                            <button onClick={() => { setSmartBrief(s => ({...s, logoUrl: ""})); if (logoInputRef.current) logoInputRef.current.value = ""; }}
                              className="text-white/20 hover:text-white/60 transition-colors p-1"><X size={12} /></button>
                          </div>
                        ) : (
                          <button onClick={() => logoInputRef.current?.click()}
                            onDragOver={e => { e.preventDefault(); setLogoDragging(true); }}
                            onDragLeave={() => setLogoDragging(false)}
                            onDrop={e => { e.preventDefault(); setLogoDragging(false); const f = e.dataTransfer.files[0]; if (f) handleLogoFile(f); }}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 border border-dashed rounded-xl transition-all duration-150 ${
                              logoDragging ? "border-brand-500/50 bg-brand-500/[0.08]" : "border-white/[0.10] hover:border-brand-500/30 hover:bg-brand-500/[0.04]"
                            }`}>
                            <Upload size={14} className="text-white/20 flex-shrink-0" />
                            <div className="text-left">
                              <p className="text-[12px] text-white/45">Click or drag to upload logo</p>
                              <p className="text-[10px] text-white/20 mt-0.5">PNG · JPG · SVG · WebP</p>
                            </div>
                          </button>
                        )}
                      </div>

                      {/* Offerings */}
                      <div>
                        <label className={LBL}>What do you offer?</label>
                        <div className="grid grid-cols-5 gap-1.5 mb-3">
                          {OFFERINGS_TYPES.map(ot => {
                            const active = smartBrief.offeringsType === ot.value;
                            return (
                              <button key={ot.value}
                                onClick={() => setSmartBrief(s => ({
                                  ...s,
                                  offeringsType: s.offeringsType === ot.value ? "" : ot.value,
                                  offeringsText: s.offeringsType === ot.value ? "" : s.offeringsText,
                                }))}
                                className={`p-2 rounded-xl border text-center transition-all ${
                                  active ? "border-brand-500/40 bg-brand-500/10 text-brand-300" : "border-white/[0.07] text-white/35 hover:border-white/15 hover:text-white/60"
                                }`}>
                                <div className="text-[11px] font-medium">{ot.label}</div>
                                <div className="text-[9px] text-white/20 mt-0.5 leading-tight">{ot.desc}</div>
                              </button>
                            );
                          })}
                        </div>
                        {smartBrief.offeringsType && (
                          <textarea value={smartBrief.offeringsText}
                            onChange={e => setSmartBrief(s => ({...s, offeringsText: e.target.value}))}
                            placeholder={getOfferingsPlaceholder(smartBrief.offeringsType!)}
                            rows={4} className={`${IC} resize-none leading-relaxed`} />
                        )}
                      </div>

                      {/* Contact */}
                      <div>
                        <label className={LBL}>Contact Details (optional)</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input value={smartBrief.contactDetails?.phone} onChange={e => patchSmartContact("phone", e.target.value)} placeholder="Phone" className={IC} />
                          <input value={smartBrief.contactDetails?.email} onChange={e => patchSmartContact("email", e.target.value)} placeholder="Email" className={IC} />
                          <input value={smartBrief.contactDetails?.address} onChange={e => patchSmartContact("address", e.target.value)} placeholder="Address" className={`${IC} col-span-2`} />
                          <input value={smartBrief.contactDetails?.hours} onChange={e => patchSmartContact("hours", e.target.value)} placeholder='Hours — e.g. "Mon–Fri 9am–6pm"' className={`${IC} col-span-2`} />
                        </div>
                      </div>

                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-7">

              {/* Color */}
              <Section label="Color Palette">
                <p className="text-[11px] text-white/25 mb-3">Pick a mood or let AI choose based on your industry.</p>
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {COLOR_PRESETS.map((preset, idx) => (
                    <button key={preset.label} onClick={() => pickColorPreset(idx)}
                      className={`relative p-3 rounded-xl border text-left transition-all duration-150 ${
                        colorPreset === idx ? "border-brand-500/45 bg-brand-500/[0.07]" : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.15]"
                      }`}>
                      {colorPreset === idx && (
                        <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-brand-500 flex items-center justify-center">
                          <Check size={8} className="text-white" />
                        </span>
                      )}
                      <div className="flex gap-1 mb-2">
                        {(preset.colors.length > 0 ? preset.colors : ["#7c3aed","#2563eb","#10b981","#f59e0b"]).map((c,i) => (
                          <div key={i} className="w-3.5 h-3.5 rounded-full border border-black/20 flex-shrink-0"
                            style={{ background: c, opacity: preset.colors.length === 0 ? 0.28 : 1 }} />
                        ))}
                      </div>
                      <span className="text-[11px] font-medium text-white/55">{preset.label}</span>
                    </button>
                  ))}
                </div>
                <input value={colorPreset === 0 ? (brief.colorPreference ?? "") : ""}
                  onChange={e => { setColorPreset(0); setBrief({...brief, colorPreference: e.target.value, colorPalette: []}); }}
                  placeholder='Custom: "warm terracotta with sage green accents"' className={IC} />
              </Section>

              <Separator />

              {/* Image style */}
              <Section label="Image Style">
                <div className="grid grid-cols-2 gap-1.5">
                  {IMAGE_STYLES.map(style => (
                    <button key={style.value} onClick={() => setBrief({...brief, imageStyle: style.value as SiteBrief["imageStyle"]})}
                      className={`p-3 rounded-xl border text-left transition-all duration-150 ${
                        brief.imageStyle === style.value ? "border-brand-500/45 bg-brand-500/[0.07]" : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.15]"
                      }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-medium text-white/75">{style.label}</span>
                        {brief.imageStyle === style.value && <Check size={9} className="text-brand-400 ml-auto" />}
                      </div>
                      <p className="text-[10.5px] text-white/28 leading-snug">{style.desc}</p>
                    </button>
                  ))}
                </div>
              </Section>

              <Separator />

              {/* Design direction */}
              <Section label="Design Direction (optional)">
                <input value={smartBrief.stylePreference ?? ""}
                  onChange={e => setSmartBrief(s => ({...s, stylePreference: e.target.value}))}
                  placeholder='e.g. "editorial magazine feel" or "warm like Kinfolk"'
                  className={IC} />
              </Section>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-white/20">
            <span>{brief.pages.length} page{brief.pages.length !== 1 ? "s" : ""}</span>
            {brief.siteType && <><span className="text-white/10">·</span><span>{brief.siteType}</span></>}
            {activeTone && (
              <>
                <span className="text-white/10">·</span>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: activeTone.color + "99" }} />
                <span>{brief.tone}</span>
              </>
            )}
            {colorPreset > 0 && <><span className="text-white/10">·</span><span className="text-brand-500/50">{COLOR_PRESETS[colorPreset].label}</span></>}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab(activeTab === "content" ? "design" : "content")}
              className="px-3 py-2 text-[11.5px] text-white/30 hover:text-white/60 border border-white/[0.07] rounded-lg transition-colors whitespace-nowrap">
              {activeTab === "content" ? "Design →" : "← Content"}
            </button>
            <button onClick={handleGenerate} disabled={!canSubmit}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                canSubmit
                  ? "bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40"
                  : "bg-white/[0.04] text-white/18 cursor-not-allowed"
              }`}>
              {generatorMode === "smart" ? <Sparkles size={13} /> : <Zap size={13} />}
              Generate
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={LBL}>{label}</p>
      {children}
    </div>
  );
}

function Separator() {
  return <div className="border-t border-white/[0.05]" />;
}

const LBL = "block text-[10px] font-bold text-white/28 uppercase tracking-[0.11em] mb-2.5";
const IC  = "w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-white/18 focus:outline-none focus:border-brand-500/40 focus:bg-white/[0.07] transition-all";
