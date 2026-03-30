"use client";
import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { uid, extractNavbarHtml } from "@/lib/utils";
import { streamGeneratePage } from "@/lib/utils/generateStream";
import {
  API_AUTH_001, API_BILLING_001, API_GENERATE_001, API_RATE_LIMIT_001,
  API_RESPONSE_001, API_RESPONSE_002, API_TIMEOUT_001, API_UNKNOWN_001,
  SAVE_PROJECT_001, createAppError, logAppError, normalizeError, type ErrorCode,
} from "@/lib/errors";
import {
  X, Zap, ChevronRight, ChevronLeft, Check, Sparkles, Upload,
  Palette, Code2, Utensils, Coffee, ShoppingBag, Activity,
  Home, Briefcase, User, Lightbulb, Calendar, BookOpen, Gem, MapPin,
  type LucideIcon,
} from "lucide-react";
import { GeneratingScreen } from "./GeneratingScreen";
import { SitezyBadge, SitezyButton, SitezyCard } from "@/components/ui/sitezy";
import type { SiteBrief, SiteBlueprint, ProjectPage, PageSection, SmartBrief } from "@/types";

// ── Constants (unchanged) ─────────────────────────────────────────────────────

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
  { label: "Professional", color: "#4550F0" },
  { label: "Playful",      color: "#F5A623" },
  { label: "Minimal",      color: "#9EA4B0" },
  { label: "Bold",         color: "#E5484D" },
  { label: "Luxurious",    color: "#D97706" },
  { label: "Friendly",     color: "#1DB87C" },
  { label: "Edgy",         color: "#8B5CF6" },
  { label: "Warm",         color: "#F97316" },
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
  { value:"minimal",       label:"Minimal",       desc:"Color and typography focused, few images" },
  { value:"illustrations", label:"Illustrations", desc:"Abstract shapes and graphic elements" },
  { value:"none",          label:"No Images",     desc:"Pure text and color design" },
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
          if (a < 100) continue;
          const r = Math.round(data[i] / 28) * 28;
          const g = Math.round(data[i + 1] / 28) * 28;
          const b = Math.round(data[i + 2] / 28) * 28;
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          if (brightness < 18 || brightness > 238) continue;
          const hex = "#" + [r, g, b].map(v => Math.min(255, v).toString(16).padStart(2, "0")).join("");
          colorMap.set(hex, (colorMap.get(hex) ?? 0) + 1);
        }
        const sorted = [...colorMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([hex]) => hex);
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
  return "";
}

// ── Error helpers (unchanged) ─────────────────────────────────────────────────

interface Props { onClose: () => void; }

const SMART_DEFAULTS: SmartBrief = {
  logoUrl: "", offeringsType: "", offeringsText: "", stylePreference: "",
  contactDetails: { phone: "", email: "", address: "", hours: "" },
};

type JsonErrorPayload = { error?: string; requestId?: string | null; code?: string; };

function describeRequestTarget(input: RequestInfo): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if ("url" in input && typeof input.url === "string") return input.url;
  return "request";
}

function resolveApiErrorCode(status: number, code?: string): ErrorCode {
  if (code) return code as ErrorCode;
  switch (status) {
    case 401: return API_AUTH_001;
    case 402: return API_BILLING_001;
    case 429: return API_RATE_LIMIT_001;
    case 504: return API_TIMEOUT_001;
    default:  return API_UNKNOWN_001;
  }
}

function extractRequestId(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  if ("metadata" in error) {
    const metadata = (error as { metadata?: Record<string, unknown> }).metadata;
    const requestId = metadata?.requestId;
    if (typeof requestId === "string" && requestId.trim()) return requestId;
  }
  if ("requestId" in error) {
    const requestId = (error as { requestId?: unknown }).requestId;
    if (typeof requestId === "string" && requestId.trim()) return requestId;
  }
  return null;
}

function normalizeClientError(error: unknown, fallbackCode: ErrorCode, metadata?: Record<string, unknown>) {
  const requestId = extractRequestId(error);
  const normalized = normalizeError(error, fallbackCode, { ...metadata, ...(requestId ? { requestId } : {}) });
  return { appError: normalized, apiError: { message: normalized.userMessage, requestId, code: normalized.code } };
}

async function fetchJsonWithTimeout<T>(input: RequestInfo, init: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const target = describeRequestTarget(input);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    let data: (T & JsonErrorPayload) | null = null;
    try {
      data = await response.json() as T & JsonErrorPayload;
    } catch (error) {
      if (response.ok) {
        throw createAppError({ code: API_RESPONSE_001, devMessage: `Invalid JSON response from ${target} (${response.status})`, severity: "error", metadata: { target, status: response.status }, cause: error });
      }
    }
    if (!response.ok) {
      throw createAppError({ code: resolveApiErrorCode(response.status, data?.code), devMessage: `Request to ${target} failed (${response.status}): ${data?.error ?? "unknown error"}`, severity: response.status >= 500 ? "error" : "warn", metadata: { target, status: response.status, requestId: data?.requestId ?? null } });
    }
    if (!data) {
      throw createAppError({ code: API_RESPONSE_002, devMessage: `Response from ${target} was empty`, severity: "error", metadata: { target, status: response.status } });
    }
    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw createAppError({ code: API_TIMEOUT_001, devMessage: `Request to ${target} timed out after ${timeoutMs}ms`, severity: "error", metadata: { target, timeoutMs }, cause: error });
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const [step, setStep]               = useState<1|2|3|4|5>(1);
  const [wizardStep, setWizardStep]   = useState<1|2|3|4|5>(1);
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
    setBrief(b => ({ ...b, pages: b.pages.includes(page) ? b.pages.filter(p => p !== page) : [...b.pages, page] }));
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
    setApiError(null);

    const currency = detectCurrency(brief.description, smartBrief.contactDetails?.address ?? "", smartBrief.offeringsText ?? "");
    const fullBrief: SiteBrief = {
      ...brief, generatorMode, hasLogo: generatorMode === "smart" && !!smartBrief.logoUrl,
      ...(currency && { currency }),
      ...(generatorMode === "smart" && { smartBrief: { ...smartBrief, logoUrl: undefined } }),
    };

    try {
      const project = await createProject(fullBrief);
      projectIdRef.current = project.id;

      setGenStatus("blueprint","Analyzing your brief...");
      addGenLog("🔍 Extracting brand direction and visual identity...","info");
      if (brief.colorPreference) addGenLog(`🎨 Color: ${COLOR_PRESETS[colorPreset]?.label ?? "custom"}`, "info");
      addGenLog(`🖼️ Image style: ${brief.imageStyle ?? "photos"}`, "info");
      if (generatorMode === "smart") addGenLog("✦ Smart Setup — enriched context active", "info");

      const { blueprint } = await fetchJsonWithTimeout<{ blueprint: SiteBlueprint }>(
        "/api/blueprint",
        { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ brief: fullBrief }) },
        90000
      );
      addGenLog(`✅ Blueprint — ${blueprint.layoutStyle} · ${blueprint.pages.length} pages`, "success");
      addGenLog(`🎨 ${blueprint.colorScheme.primary} · ${blueprint.typography.headingFont}`, "info");

      const pages: ProjectPage[] = blueprint.pages.map(p => ({
        id: p.id || uid(), name: p.name, slug: p.slug,
        sections: [], purpose: p.purpose, html: "", status: "pending" as const,
      }));
      setBlueprint(blueprint, pages);
      setGenStatus("pages","Generating pages...");

      let sharedNavbarHtml: string | null = null;
      let generatedPageCount = 0;

      for (let i = 0; i < blueprint.pages.length; i++) {
        const bpPage = blueprint.pages[i];
        const localPage = pages[i];
        setPageStatus(localPage.id, "generating");
        addGenLog(`📄 Generating ${bpPage.name} (${i+1}/${blueprint.pages.length})...`, "progress");
        setGenStatus("pages", `Generating ${bpPage.name} (${i+1}/${blueprint.pages.length})...`);

        let result: { html: string; sections: PageSection[] };
        try {
          result = await streamGeneratePage(
            { blueprint, page: bpPage, brief: fullBrief, navbarHtml: i > 0 ? sharedNavbarHtml : null },
            (chars) => setGenStatus("pages", `Generating ${bpPage.name} (${i+1}/${blueprint.pages.length})… ${(chars/1000).toFixed(1)}k`),
            120000
          );
        } catch (error) {
          const { appError, apiError } = normalizeClientError(error, API_GENERATE_001, { pageId: bpPage.id, pageName: bpPage.name, projectId: project.id });
          logAppError(appError);
          setApiError(apiError);
          if (appError.code === API_BILLING_001 || appError.code === API_AUTH_001) {
            addGenLog(`❌ ${appError.userMessage}`, "error");
            throw appError;
          }
          addGenLog(`⚠️ ${bpPage.name}: ${appError.userMessage}`, "error");
          setPageStatus(localPage.id, "error");
          continue;
        }
        const fixedHtml = result.html.replace(/href="\/\/([^"]*?)"/g, (_, path) => `href="/${path}"`);
        const finalHtml = (generatorMode === "smart" && smartBrief.logoUrl && fixedHtml.includes("__LOGO__"))
          ? fixedHtml.replaceAll("__LOGO__", smartBrief.logoUrl)
          : fixedHtml;
        setPageContent(localPage.id, finalHtml, result.sections);
        generatedPageCount += 1;
        addGenLog(`✅ ${bpPage.name} — ${(finalHtml.length/1000).toFixed(1)}k chars`, "success");
        if (i === 0 && !sharedNavbarHtml && finalHtml) {
          sharedNavbarHtml = extractNavbarHtml(finalHtml);
        }
      }

      if (generatedPageCount === 0) {
        throw createAppError({ code: API_GENERATE_001, devMessage: `No pages were generated for project ${project.id}`, severity: "error", metadata: { projectId: project.id, pageCount: blueprint.pages.length } });
      }

      const saved = await saveCurrentProject({ manual: true });
      if (!saved) {
        throw createAppError({ code: SAVE_PROJECT_001, devMessage: `Generated project ${project.id} failed to save after page generation`, severity: "error", metadata: { projectId: project.id } });
      }

      setGenStatus("done","Your website is ready!");
      addGenLog("🎉 All done! Opening editor...", "success");
      setTimeout(() => { onClose(); }, 1800);
    } catch (err) {
      const { appError, apiError } = normalizeClientError(err, API_GENERATE_001, { projectId: projectIdRef.current, siteName: fullBrief.siteName });
      logAppError(appError);
      setApiError(apiError);
      setGenStatus("error", `Error: ${appError.userMessage}`);
      addGenLog(`❌ ${appError.userMessage}`, "error");
    }
  }

  const canSubmit = brief.siteName.trim().length > 0 && brief.description.trim().length > 10;
  const activeTone = TONES.find(t => t.label === brief.tone);

  // ── Step 2 ────────────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <>
        <GeneratingScreen projectName={brief.siteName || "Your Website"} pageCount={brief.pages.length} />
        {genStatus === "error" && (
          <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 60, display: "flex", gap: 10 }}>
            <button onClick={() => setStep(1)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 13, fontWeight: 500, borderRadius: 10, cursor: "pointer" }}>
              <ChevronLeft size={14} /> Go back
            </button>
            <button onClick={handleGenerate}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "#4550F0", border: "none", color: "#fff", fontSize: 13, fontWeight: 500, borderRadius: 10, cursor: "pointer" }}>
              <Zap size={14} /> Retry
            </button>
          </div>
        )}
      </>
    );
  }

  // ── Wizard steps ──────────────────────────────────────────────────────────
  const WIZARD_STEPS = 5;
  const ws = wizardStep;

  function nextWizard() {
    if (ws < WIZARD_STEPS) setWizardStep((ws + 1) as typeof wizardStep);
    else handleGenerate();
  }
  function prevWizard() {
    if (ws > 1) setWizardStep((ws - 1) as typeof wizardStep);
  }

  const wizardCanNext =
    ws === 1 ? brief.siteName.trim().length > 0 && brief.description.trim().length > 5
    : ws === 2 ? true
    : ws === 3 ? true
    : ws === 4 ? brief.pages.length > 0
    : true;

  const STEP_QUESTIONS = [
    "What's the project called?",
    "What kind of site is it?",
    "What's the tone and palette?",
    "Which pages do you need?",
    "How should it look and feel?",
  ];

  // ── Step 1 ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[rgba(3,4,8,0.86)] p-4 backdrop-blur-2xl">
      <div className="animate-scale-in relative flex w-full max-w-[760px] flex-col overflow-hidden rounded-[28px] border border-white/[0.07] bg-[rgba(9,11,18,0.99)] shadow-[0_48px_120px_rgba(0,0,0,0.6)] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.05] px-6 py-4">
          <div className="flex items-center gap-3">
            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: WIZARD_STEPS }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => i < ws && setWizardStep((i + 1) as typeof wizardStep)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i + 1 === ws ? "w-5 bg-[rgba(162,172,255,0.9)]"
                    : i + 1 < ws ? "w-1.5 bg-[rgba(129,140,255,0.5)] cursor-pointer"
                    : "w-1.5 bg-white/[0.1]"
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] text-white/30">{ws} of {WIZARD_STEPS}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-full border border-white/[0.07] bg-white/[0.03] p-0.5">
              <button onClick={() => setGeneratorMode("quick")} className={`flex h-6 items-center gap-1 rounded-full px-2.5 text-[10px] font-semibold transition-all ${generatorMode === "quick" ? "bg-[rgba(107,119,255,0.2)] text-white" : "text-white/36 hover:text-white/60"}`}>
                <Zap size={9} /> Quick
              </button>
              <button onClick={() => setGeneratorMode("smart")} className={`flex h-6 items-center gap-1 rounded-full px-2.5 text-[10px] font-semibold transition-all ${generatorMode === "smart" ? "bg-[rgba(107,119,255,0.2)] text-white" : "text-white/36 hover:text-white/60"}`}>
                <Sparkles size={9} /> Smart
              </button>
            </div>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.07] text-white/30 transition-all hover:bg-white/[0.06] hover:text-white">
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-[400px] flex-col px-8 py-8">
          {/* Question */}
          <h2 className="mb-8 text-[28px] font-semibold leading-tight tracking-[-0.04em] text-white">
            {STEP_QUESTIONS[ws - 1]}
          </h2>

          {/* Step content */}
          <div className="flex-1">

            {/* Step 1: Name + description */}
            {ws === 1 && (
              <div className="space-y-3">
                <input
                  autoFocus
                  value={brief.siteName}
                  onChange={e => setBrief({...brief, siteName: e.target.value})}
                  onKeyDown={e => e.key === "Enter" && wizardCanNext && nextWizard()}
                  placeholder="e.g. Bloom Coffee, TechLaunch, My Portfolio…"
                  style={{ ...inputBase, fontSize: 15, fontWeight: 600 }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(129,140,255,0.45)"; e.target.style.background = "rgba(107,119,255,0.06)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
                />
                <textarea
                  value={brief.description}
                  onChange={e => setBrief({...brief, description: e.target.value})}
                  placeholder="Describe who it's for, what it does, and what makes it special…"
                  rows={4}
                  style={{ ...inputBase, resize: "none", lineHeight: 1.7, fontSize: 14, paddingTop: 14, paddingBottom: 14 }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(129,140,255,0.45)"; e.target.style.background = "rgba(107,119,255,0.06)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
                />
              </div>
            )}

            {/* Step 2: Industry */}
            {ws === 2 && (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {INDUSTRIES.map(({ label, Icon }) => {
                  const active = brief.siteType === label;
                  return (
                    <button key={label} onClick={() => setBrief(b => ({...b, siteType: b.siteType === label ? "" : label}))}
                      className="flex flex-col items-center gap-2 rounded-[14px] border px-3 py-4 text-center transition-all"
                      style={{ border: `1px solid ${active ? "rgba(129,140,255,0.35)" : "rgba(255,255,255,0.07)"}`, background: active ? "rgba(107,119,255,0.14)" : "rgba(255,255,255,0.03)" }}>
                      <Icon size={16} style={{ color: active ? "rgba(162,172,255,1)" : "rgba(255,255,255,0.35)" }} />
                      <span style={{ fontSize: 11, fontWeight: 500, color: active ? "white" : "rgba(255,255,255,0.45)", lineHeight: 1.3 }}>{label}</span>
                    </button>
                  );
                })}
                <button onClick={() => setBrief(b => ({...b, siteType: ""}))}
                  className="flex flex-col items-center gap-2 rounded-[14px] border px-3 py-4 text-center transition-all"
                  style={{ border: `1px solid ${!brief.siteType ? "rgba(129,140,255,0.35)" : "rgba(255,255,255,0.07)"}`, background: !brief.siteType ? "rgba(107,119,255,0.14)" : "rgba(255,255,255,0.03)" }}>
                  <Sparkles size={16} style={{ color: !brief.siteType ? "rgba(162,172,255,1)" : "rgba(255,255,255,0.35)" }} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: !brief.siteType ? "white" : "rgba(255,255,255,0.45)", lineHeight: 1.3 }}>AI decides</span>
                </button>
              </div>
            )}

            {/* Step 3: Tone + color */}
            {ws === 3 && (
              <div className="space-y-7">
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/28">Tone</p>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map(({ label, color }) => {
                      const active = brief.tone === label;
                      return (
                        <button key={label} onClick={() => setBrief({...brief, tone: label})}
                          className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-all"
                          style={{ border: `1px solid ${active ? color + "66" : "rgba(255,255,255,0.07)"}`, background: active ? color + "20" : "rgba(255,255,255,0.03)", color: active ? "white" : "rgba(255,255,255,0.5)" }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, opacity: active ? 1 : 0.55, flexShrink: 0 }} />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/28">Color palette</p>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((preset, idx) => (
                      <button key={preset.label} onClick={() => pickColorPreset(idx)}
                        className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] transition-all"
                        style={{ border: `1px solid ${colorPreset === idx ? "rgba(129,140,255,0.35)" : "rgba(255,255,255,0.07)"}`, background: colorPreset === idx ? "rgba(107,119,255,0.14)" : "rgba(255,255,255,0.03)", color: colorPreset === idx ? "white" : "rgba(255,255,255,0.45)" }}>
                        <div className="flex gap-1">
                          {(preset.colors.length > 0 ? preset.colors.slice(0, 3) : ["#9BA4FF","#6B77FF","#4550F0"]).map((c, i) => (
                            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: preset.colors.length === 0 ? 0.4 : 1 }} />
                          ))}
                        </div>
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Pages */}
            {ws === 4 && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {COMMON_PAGES.map(page => {
                    const active = brief.pages.includes(page);
                    return (
                      <button key={page} onClick={() => togglePage(page)}
                        className="rounded-full px-4 py-2 text-[13px] font-medium transition-all"
                        style={{ border: `1px solid ${active ? "rgba(129,140,255,0.35)" : "rgba(255,255,255,0.07)"}`, background: active ? "rgba(107,119,255,0.14)" : "rgba(255,255,255,0.03)", color: active ? "white" : "rgba(255,255,255,0.45)" }}>
                        {active && <span style={{ marginRight: 5, color: "rgba(162,172,255,0.8)", fontSize: 10 }}>✓</span>}{page}
                      </button>
                    );
                  })}
                </div>
                {brief.pages.filter(p => !COMMON_PAGES.includes(p)).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {brief.pages.filter(p => !COMMON_PAGES.includes(p)).map(p => (
                      <span key={p} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px]" style={{ background: "rgba(107,119,255,0.14)", border: "1px solid rgba(129,140,255,0.25)", color: "rgba(162,172,255,1)" }}>
                        {p}
                        <button onClick={() => togglePage(p)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", lineHeight: 1, padding: 0, fontSize: 14 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input value={customPage} onChange={e => setCustomPage(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addCustomPage()}
                    placeholder="Add a custom page…" style={{ ...inputBase, fontSize: 13 }} />
                  <button onClick={addCustomPage} disabled={!customPage.trim()}
                    style={{ padding: "0 18px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, fontSize: 12, color: "rgba(255,255,255,0.6)", cursor: "pointer", opacity: customPage.trim() ? 1 : 0.4, whiteSpace: "nowrap" }}>
                    + Add
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Look & feel */}
            {ws === 5 && (
              <div className="space-y-7">
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/28">Image style</p>
                  <div className="grid grid-cols-4 gap-2">
                    {IMAGE_STYLES.map(style => (
                      <button key={style.value} onClick={() => setBrief({...brief, imageStyle: style.value as SiteBrief["imageStyle"]})}
                        className="rounded-[14px] px-3 py-4 text-center transition-all"
                        style={{ border: `1px solid ${brief.imageStyle === style.value ? "rgba(129,140,255,0.35)" : "rgba(255,255,255,0.07)"}`, background: brief.imageStyle === style.value ? "rgba(107,119,255,0.14)" : "rgba(255,255,255,0.03)" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: brief.imageStyle === style.value ? "white" : "rgba(255,255,255,0.45)" }}>{style.label}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 3, lineHeight: 1.4 }}>{style.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/28">Design direction (optional)</p>
                  <input value={smartBrief.stylePreference ?? ""}
                    onChange={e => setSmartBrief(s => ({...s, stylePreference: e.target.value}))}
                    placeholder='"editorial magazine feel" or "warm like Kinfolk"'
                    style={inputBase}
                    onFocus={(e) => { e.target.style.borderColor = "rgba(129,140,255,0.45)"; e.target.style.background = "rgba(107,119,255,0.06)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
                  />
                </div>

                {generatorMode === "smart" && (
                  <div className="rounded-[16px] border border-[rgba(129,140,255,0.18)] bg-[rgba(107,119,255,0.06)] p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles size={12} style={{ color: "rgba(162,172,255,0.8)" }} />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(162,172,255,0.8)]">Smart context</span>
                    </div>
                    <input ref={logoInputRef} type="file" accept=".png,.jpg,.jpeg,.svg,.webp" style={{ display: "none" }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }} />
                    {smartBrief.logoUrl ? (
                      <div className="flex items-center gap-3 rounded-[12px] border border-white/[0.07] bg-white/[0.03] p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={smartBrief.logoUrl} alt="Logo" style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 8, flexShrink: 0 }} />
                        <p className="flex-1 text-[12px] text-white/60">Logo attached</p>
                        <button onClick={() => { setSmartBrief(s => ({...s, logoUrl: ""})); if (logoInputRef.current) logoInputRef.current.value = ""; }} className="text-white/30 hover:text-white"><X size={13} /></button>
                      </div>
                    ) : (
                      <button onClick={() => logoInputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setLogoDragging(true); }}
                        onDragLeave={() => setLogoDragging(false)}
                        onDrop={e => { e.preventDefault(); setLogoDragging(false); const f = e.dataTransfer.files[0]; if (f) handleLogoFile(f); }}
                        className="flex w-full items-center gap-3 rounded-[12px] border border-dashed px-4 py-3 text-left transition-all"
                        style={{ borderColor: logoDragging ? "rgba(129,140,255,0.5)" : "rgba(255,255,255,0.1)", background: logoDragging ? "rgba(107,119,255,0.08)" : "transparent" }}>
                        <Upload size={13} style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
                        <span className="text-[12px] text-white/40">Upload your logo (optional)</span>
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input value={smartBrief.contactDetails?.email} onChange={e => patchSmartContact("email", e.target.value)} placeholder="Email" style={{ ...inputBase, fontSize: 13 }} />
                      <input value={smartBrief.contactDetails?.phone} onChange={e => patchSmartContact("phone", e.target.value)} placeholder="Phone" style={{ ...inputBase, fontSize: 13 }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t border-white/[0.05] px-8 py-5">
          <button
            onClick={prevWizard}
            className={`flex items-center gap-2 text-[13px] font-medium text-white/40 transition-all hover:text-white/70 ${ws === 1 ? "invisible" : ""}`}
          >
            <ChevronLeft size={15} /> Back
          </button>

          {/* Live summary chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {brief.siteName && <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/50">{brief.siteName}</span>}
            {brief.siteType && <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/50">{brief.siteType}</span>}
            {brief.tone !== "Professional" && <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/50">{brief.tone}</span>}
            {brief.pages.length > 0 && <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/50">{brief.pages.length} pages</span>}
          </div>

          <SitezyButton
            variant="primary"
            onClick={nextWizard}
            disabled={!wizardCanNext}
          >
            {ws === WIZARD_STEPS ? (
              <>{generatorMode === "smart" ? <Sparkles size={14} /> : <Zap size={14} />} Generate</>
            ) : (
              <>Continue <ChevronRight size={14} /></>
            )}
          </SitezyButton>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.26)" }}>{label}</p>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 12%, rgba(255,255,255,0.08) 88%, transparent 100%)" }} />;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="text-[11px] text-white/30">{label}</span>
      <span className="text-[12px] font-medium text-white/70">{value}</span>
    </div>
  );
}

const inputBase: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  padding: "0 16px",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--text-primary)",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.18s, box-shadow 0.18s, background 0.18s",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
};
