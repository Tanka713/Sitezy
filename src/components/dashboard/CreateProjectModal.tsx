"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  buildBriefFromSettings,
  buildInitialBriefSettings,
  defaultUserSettings,
  readCachedUserSettings,
} from "@/lib/settings";
import {
  API_AUTH_001, API_BILLING_001, API_GENERATE_001, API_RATE_LIMIT_001,
  API_RESPONSE_001, API_RESPONSE_002, API_TIMEOUT_001, API_UNKNOWN_001,
  createAppError, logAppError, normalizeError, type ErrorCode,
} from "@/lib/errors";
import {
  X, Zap, ChevronRight, ChevronLeft, Check, Sparkles, Upload,
  Palette, Code2, Utensils, Coffee, ShoppingBag, Activity,
  Home, Briefcase, User, Lightbulb, Calendar, BookOpen, Gem, MapPin,
  type LucideIcon,
} from "lucide-react";
import { GeneratingScreen } from "./GeneratingScreen";
import { SitezyButton } from "@/components/ui/sitezy";
import { OverlayDialog } from "@/components/ui/OverlayDialog";
import type { SiteBrief, SiteBlueprint, SmartBrief } from "@/types";

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

// Auto-derive tone from design style — replaces the manual tone picker
const DESIGN_STYLE_TO_TONE: Record<string, string> = {
  minimal:    "Minimal",
  luxury:     "Luxurious",
  playful:    "Playful",
  brutalist:  "Edgy",
  editorial:  "Professional",
  futuristic: "Bold",
};

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

const DESIGN_STYLES = [
  { value:"minimal",    label:"Minimal",    desc:"Clean Swiss design, whitespace-driven", emoji:"○" },
  { value:"luxury",     label:"Luxury",     desc:"Dark elegance, serif headings, gold accents", emoji:"◆" },
  { value:"playful",    label:"Playful",    desc:"Bold colors, rounded shapes, bouncy energy", emoji:"●" },
  { value:"brutalist",  label:"Brutalist",  desc:"Raw borders, monospace, high contrast", emoji:"■" },
  { value:"editorial",  label:"Editorial",  desc:"Magazine layout, strong typography, columns", emoji:"▧" },
  { value:"futuristic", label:"Futuristic", desc:"Dark sci-fi, neon glows, glassmorphism", emoji:"◇" },
] as const;

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
  const openProject        = useAppStore((s) => s.openProject);
  const syncProjectFromServer = useAppStore((s) => s.syncProjectFromServer);
  const setGenStatus       = useAppStore((s) => s.setGenStatus);
  const addGenLog          = useAppStore((s) => s.addGenLog);
  const clearGenLog        = useAppStore((s) => s.clearGenLog);
  const setApiError        = useAppStore((s) => s.setApiError);
  const genStatus          = useAppStore((s) => s.generationStatus);
  const dialogTitleId = useId();

  const [step, setStep]               = useState<1|2>(1);
  const [wizardStep, setWizardStep]   = useState<1|2|3>(1);
  const [colorPreset, setColorPreset] = useState(0);
  const [customPage, setCustomPage]   = useState("");
  const [generatorMode, setGeneratorMode] = useState<"quick"|"smart">("quick");
  const [smartBrief, setSmartBrief]   = useState<SmartBrief>(SMART_DEFAULTS);
  const [logoDragging, setLogoDragging] = useState(false);
  const [showCustomColor, setShowCustomColor] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [brief, setBrief] = useState<SiteBrief>({
    siteName: "", description: "", siteType: "", tone: "Professional",
    pages: initialBriefSettings.pages,
    features: "",
    targetAudience: "",
    colorPreference: initialBriefSettings.colorPreference,
    colorPalette: initialBriefSettings.colorPalette,
    imageStyle: "photos",
    generationDesignStyle: initialBriefSettings.generationDesignStyle,
    generationCreativityLevel: initialBriefSettings.generationCreativityLevel,
    generationStructurePreference: initialBriefSettings.generationStructurePreference,
    generationContentDensity: initialBriefSettings.generationContentDensity,
    defaultTypographyStyle: initialBriefSettings.defaultTypographyStyle,
    defaultLayoutSpacing: initialBriefSettings.defaultLayoutSpacing,
    defaultNavigationStyle: initialBriefSettings.defaultNavigationStyle,
    creativeMode: initialBriefSettings.creativeMode,
  });

  const projectIdRef = useRef<string|null>(null);
  const progressRef = useRef("");
  const completionHandledRef = useRef(false);

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
    setShowCustomColor(false);
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

  async function runQueuedGeneration(fullBrief: SiteBrief) {
    if (!projectIdRef.current) {
      const project = await createProject(fullBrief, { open: false });
      projectIdRef.current = project.id;
    }

    completionHandledRef.current = false;
    progressRef.current = "";
    const projectId = projectIdRef.current;
    if (!projectId) {
      throw createAppError({
        code: API_RESPONSE_002,
        devMessage: "Queued generation could not resolve a draft project id",
        severity: "error",
      });
    }

    const { job } = await fetchJsonWithTimeout<{ job: { progressMessage?: string | null } }>(
      `/api/projects/${projectId}/generation`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: fullBrief }),
      },
      60000
    );

    const progressMessage = job.progressMessage?.trim() || "Queued for background generation...";
    progressRef.current = progressMessage;
    setGenStatus("blueprint", progressMessage);
    addGenLog("🟡 Background generation started. You can refresh, leave, or sign out while it keeps running.", "info");

    try {
      await openProject(projectId);
      await syncProjectFromServer(projectId, { preserveEditor: true, preserveHistory: true });
    } catch (error) {
      const { appError } = normalizeClientError(error, API_GENERATE_001, {
        projectId,
        action: "postEnqueueProjectSync",
      });
      logAppError(appError);
    }

    onClose();
  }

  useEffect(() => {
    if (step !== 2 || !projectIdRef.current) return;

    let cancelled = false;

    const sync = async () => {
      const projectId = projectIdRef.current;
      if (!projectId || cancelled) return;

      try {
        await syncProjectFromServer(projectId, { preserveEditor: true, preserveHistory: true });
        if (cancelled) return;

        const currentProject = useAppStore.getState().projects.find((project) => project.id === projectId);
        if (!currentProject) return;

        const progressMessage = currentProject.generationJob?.progressMessage?.trim()
          || (currentProject.status === "generating" && currentProject.pages.length === 0
            ? "Queued for background generation..."
            : "");

        if (progressMessage && progressMessage !== progressRef.current) {
          progressRef.current = progressMessage;
          setGenStatus(currentProject.blueprint ? "pages" : "blueprint", progressMessage);
        }

        if (currentProject.status === "ready" && !completionHandledRef.current) {
          completionHandledRef.current = true;
          setGenStatus("done", "Your website is ready!");
          addGenLog("🎉 Background generation finished. Opening editor...", "success");
          window.setTimeout(() => {
            onClose();
          }, 1200);
          return;
        }

        if (currentProject.status === "error" && !completionHandledRef.current) {
          completionHandledRef.current = true;
          const failureMessage = currentProject.generationJob?.lastError || "Generation failed.";
          setGenStatus("error", failureMessage);
          addGenLog(`❌ ${failureMessage}`, "error");
        }
      } catch (error) {
        const { appError, apiError } = normalizeClientError(error, API_GENERATE_001, {
          projectId: projectIdRef.current,
          action: "syncQueuedGeneration",
        });
        logAppError(appError);
        setApiError(apiError);
      }
    };

    void sync();
    const interval = window.setInterval(() => {
      void sync();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [addGenLog, onClose, setApiError, setGenStatus, step, syncProjectFromServer]);

  async function handleGenerate() {
    if (genStatus !== "idle") return;
    if (!brief.siteName.trim() || !brief.description.trim()) return;
    setApiError(null);
    clearGenLog();
    setStep(2);
    setApiError(null);

    const currency = detectCurrency(brief.description, smartBrief.contactDetails?.address ?? "", smartBrief.offeringsText ?? "");
    const baseBrief: SiteBrief = {
      ...brief, generatorMode, hasLogo: generatorMode === "smart" && !!smartBrief.logoUrl,
      ...(currency && { currency }),
      ...(generatorMode === "smart" && { smartBrief }),
    };
    const fullBrief = buildBriefFromSettings(baseBrief, readCachedUserSettings() ?? defaultUserSettings);

    try {
      progressRef.current = "Queued for background generation...";
      completionHandledRef.current = false;
      setGenStatus("blueprint", "Queued for background generation...");
      addGenLog("🔍 Extracting brand direction and visual identity...","info");
      if (brief.colorPreference) addGenLog(`🎨 Color: ${COLOR_PRESETS[colorPreset]?.label ?? "custom"}`, "info");
      addGenLog(`🖼️ Image style: ${brief.imageStyle ?? "photos"}`, "info");
      if (generatorMode === "smart") addGenLog("✦ Smart Setup — enriched context active", "info");
      await runQueuedGeneration(fullBrief);
    } catch (err) {
      const { appError, apiError } = normalizeClientError(err, API_GENERATE_001, { projectId: projectIdRef.current, siteName: fullBrief.siteName });
      logAppError(appError);
      setApiError(apiError);
      setGenStatus("error", `Error: ${appError.userMessage}`);
      addGenLog(`❌ ${appError.userMessage}`, "error");
    }
  }

  // ── Step 2 ────────────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <GeneratingScreen
        projectName={brief.siteName || "Your Website"}
        pageCount={brief.pages.length}
        errorActions={
          genStatus === "error" ? (
            <>
              <SitezyButton
                variant="secondary"
                size="lg"
                onClick={() => {
                  setGenStatus("idle", "");
                  setStep(1);
                }}
              >
                <ChevronLeft size={14} />
                Back to brief
              </SitezyButton>
              <SitezyButton variant="primary" size="lg" onClick={() => void handleGenerate()}>
                <Zap size={14} />
                Retry generation
              </SitezyButton>
            </>
          ) : null
        }
      />
    );
  }

  // ── Wizard steps ──────────────────────────────────────────────────────────
  const WIZARD_STEPS = 3;
  const ws = wizardStep;

  function nextWizard() {
    if (ws < WIZARD_STEPS) setWizardStep((ws + 1) as typeof wizardStep);
    else void handleGenerate();
  }
  function prevWizard() {
    if (ws > 1) setWizardStep((ws - 1) as typeof wizardStep);
  }

  const wizardCanNext =
    ws === 1 ? brief.siteName.trim().length > 0 && brief.description.trim().length > 5
    : ws === 2 ? brief.pages.length > 0
    : true;

  const STEP_META = [
    {
      eyebrow: "Brief",
      title: "Start with the core brief",
      body: "Choose how guided you want the generation to be, then describe the site and pick a type.",
    },
    {
      eyebrow: "Style",
      title: "Shape the visual direction",
      body: "Pick a design language, palette, and page set before generation starts.",
    },
    {
      eyebrow: "Details",
      title: "Add the finishing context",
      body: "Set image direction and optional guidance so the first pass lands closer to the mark.",
    },
  ];
  const activeStep = STEP_META[ws - 1];

  // ── Step 1 ────────────────────────────────────────────────────────────────
  return (
    <OverlayDialog
      open
      onClose={onClose}
      titleId={dialogTitleId}
      containerClassName="overflow-y-auto p-4"
      panelClassName="animate-scale-in sz-modal-shell relative my-auto flex w-full max-w-[860px] flex-col overflow-hidden rounded-[28px]"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-6 py-4">
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
                    : "w-1.5 bg-[var(--border-softer)]"
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] text-[var(--fg-faint)]">{ws} of {WIZARD_STEPS}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-soft)] text-[var(--fg-faint)] transition-all hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]">
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex max-h-[calc(100vh-220px)] min-h-[360px] flex-col overflow-y-auto px-8 py-6">
          <div className="mb-6 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--fg-faint)]">
              {activeStep.eyebrow}
            </p>
            <h2 id={dialogTitleId} className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-[var(--text-primary)]">
              {activeStep.title}
            </h2>
            <p className="max-w-[640px] text-[14px] leading-7 text-[var(--text-secondary)]">
              {activeStep.body}
            </p>
          </div>

          {/* Step content */}
          <div className="flex-1">

            {/* Step 1: Brief */}
            {ws === 1 && (
              <div className="space-y-6">
                <div>
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Generation mode</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      {
                        key: "quick" as const,
                        title: "Quick",
                        body: "Minimal setup. Best when you want to move fast and refine inside the editor.",
                        icon: <Zap size={16} />,
                      },
                      {
                        key: "smart" as const,
                        title: "Smart",
                        body: "Adds logo and contact context so the first pass feels more tailored.",
                        icon: <Sparkles size={16} />,
                      },
                    ].map((mode) => {
                      const active = generatorMode === mode.key;
                      return (
                        <button
                          key={mode.key}
                          type="button"
                          onClick={() => setGeneratorMode(mode.key)}
                          className="rounded-[20px] border p-4 text-left transition-all"
                          style={{
                            border: `1px solid ${active ? "rgba(129,140,255,0.35)" : "var(--border-soft)"}`,
                            background: active ? "rgba(107,119,255,0.12)" : "var(--surface-3)",
                          }}
                        >
                          <div className="flex items-center gap-2 text-[var(--text-primary)]">
                            {mode.icon}
                            <span className="text-[15px] font-semibold tracking-[-0.03em]">{mode.title}</span>
                          </div>
                          <p className="mt-2 text-[12px] leading-6 text-[var(--fg-muted)]">{mode.body}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <input
                    autoFocus
                    value={brief.siteName}
                    onChange={e => setBrief({...brief, siteName: e.target.value})}
                    onKeyDown={e => e.key === "Enter" && wizardCanNext && nextWizard()}
                    placeholder="e.g. Bloom Coffee, TechLaunch, My Portfolio…"
                    style={{ ...inputBase, fontSize: 15, fontWeight: 600 }}
                    onFocus={(e) => { e.target.style.borderColor = "rgba(129,140,255,0.45)"; e.target.style.background = "rgba(107,119,255,0.06)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--border-softer)"; e.target.style.background = "var(--surface-4)"; }}
                  />
                  <textarea
                    value={brief.description}
                    onChange={e => setBrief({...brief, description: e.target.value})}
                    placeholder="Describe who it's for, what it does, and what makes it special…"
                    rows={4}
                    style={{ ...inputBase, resize: "none", lineHeight: 1.7, fontSize: 14, paddingTop: 14, paddingBottom: 14 }}
                    onFocus={(e) => { e.target.style.borderColor = "rgba(129,140,255,0.45)"; e.target.style.background = "rgba(107,119,255,0.06)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--border-softer)"; e.target.style.background = "var(--surface-4)"; }}
                  />
                </div>

                <div>
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Site type</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {INDUSTRIES.map(({ label, Icon }) => {
                      const active = brief.siteType === label;
                      return (
                        <button key={label} onClick={() => setBrief(b => ({...b, siteType: b.siteType === label ? "" : label}))}
                          className="flex flex-col items-center gap-2 rounded-[14px] border px-3 py-4 text-center transition-all"
                          style={{ border: `1px solid ${active ? "rgba(129,140,255,0.35)" : "var(--border-soft)"}`, background: active ? "rgba(107,119,255,0.14)" : "var(--surface-3)" }}>
                          <Icon size={16} style={{ color: active ? "rgba(162,172,255,1)" : "var(--fg-muted)" }} />
                          <span style={{ fontSize: 11, fontWeight: 500, color: active ? "var(--text-primary)" : "var(--fg-soft)", lineHeight: 1.3 }}>{label}</span>
                        </button>
                      );
                    })}
                    <button onClick={() => setBrief(b => ({...b, siteType: ""}))}
                      className="flex flex-col items-center gap-2 rounded-[14px] border px-3 py-4 text-center transition-all"
                      style={{ border: `1px solid ${!brief.siteType ? "rgba(129,140,255,0.35)" : "var(--border-soft)"}`, background: !brief.siteType ? "rgba(107,119,255,0.14)" : "var(--surface-3)" }}>
                      <Sparkles size={16} style={{ color: !brief.siteType ? "rgba(162,172,255,1)" : "var(--fg-muted)" }} />
                      <span style={{ fontSize: 11, fontWeight: 500, color: !brief.siteType ? "var(--text-primary)" : "var(--fg-soft)", lineHeight: 1.3 }}>AI decides</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Style */}
            {ws === 2 && (
              <div className="space-y-6">
                <div>
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Design style</p>
                  <div className="flex flex-wrap gap-2">
                    {DESIGN_STYLES.map(style => {
                      const isActive = brief.generationDesignStyle === style.value;
                      return (
                        <button key={style.value} onClick={() => setBrief({...brief, generationDesignStyle: style.value as SiteBrief["generationDesignStyle"], tone: DESIGN_STYLE_TO_TONE[style.value] ?? "Professional"})}
                          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] transition-all"
                          style={{ border: `1px solid ${isActive ? "rgba(129,140,255,0.35)" : "var(--border-soft)"}`, background: isActive ? "rgba(107,119,255,0.14)" : "var(--surface-3)", color: isActive ? "var(--text-primary)" : "var(--fg-soft)" }}>
                          <span style={{ fontSize: 11, opacity: isActive ? 1 : 0.4 }}>{style.emoji}</span>
                          {style.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Color palette</p>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((preset, idx) => (
                      <button key={preset.label} onClick={() => pickColorPreset(idx)}
                        className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] transition-all"
                        style={{ border: `1px solid ${colorPreset === idx ? "rgba(129,140,255,0.35)" : "var(--border-soft)"}`, background: colorPreset === idx ? "rgba(107,119,255,0.14)" : "var(--surface-3)", color: colorPreset === idx ? "var(--text-primary)" : "var(--fg-soft)" }}>
                        <div className="flex gap-1">
                          {(preset.colors.length > 0 ? preset.colors.slice(0, 3) : ["#9BA4FF","#6B77FF","#4550F0"]).map((c, i) => (
                            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: preset.colors.length === 0 ? 0.4 : 1 }} />
                          ))}
                        </div>
                        {preset.label}
                      </button>
                    ))}
                    {/* Settings default palette — show if user has custom colors configured that differ from hard-coded default */}
                    {initialBriefSettings.colorPalette.length > 0 && initialBriefSettings.colorPalette[0] !== "#6b77ff" && (
                      <button onClick={() => { setColorPreset(-2); setBrief(b => ({...b, colorPalette: initialBriefSettings.colorPalette, colorPreference: "user default palette from settings"})); }}
                        className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] transition-all"
                        style={{ border: `1px solid ${colorPreset === -2 ? "rgba(129,140,255,0.35)" : "var(--border-soft)"}`, background: colorPreset === -2 ? "rgba(107,119,255,0.14)" : "var(--surface-3)", color: colorPreset === -2 ? "var(--text-primary)" : "var(--fg-soft)" }}>
                        <div className="flex gap-1">
                          {initialBriefSettings.colorPalette.slice(0, 3).map((c, i) => (
                            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                          ))}
                        </div>
                        My Default
                      </button>
                    )}
                    {/* Custom color input */}
                    <button onClick={() => { setColorPreset(-1); setShowCustomColor(true); }}
                      className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] transition-all"
                      style={{ border: `1px solid ${colorPreset === -1 ? "rgba(129,140,255,0.35)" : "var(--border-soft)"}`, background: colorPreset === -1 ? "rgba(107,119,255,0.14)" : "var(--surface-3)", color: colorPreset === -1 ? "var(--text-primary)" : "var(--fg-soft)" }}>
                      <Palette size={10} style={{ opacity: 0.6 }} />
                      Custom
                    </button>
                  </div>
                  {/* Custom color inputs */}
                  {showCustomColor && colorPreset === -1 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {(brief.colorPalette ?? []).map((hex, i) => (
                        <div key={i} className="flex items-center gap-1.5 rounded-full border border-[var(--border-soft)] bg-[var(--surface-3)] py-1 pl-1.5 pr-2.5">
                          <input
                            type="color"
                            value={hex}
                            onChange={e => {
                              const next = [...(brief.colorPalette ?? [])];
                              next[i] = e.target.value;
                              setBrief(b => ({...b, colorPalette: next, colorPreference: next.join(", ")}));
                            }}
                            className="h-5 w-5 cursor-pointer rounded-full border-0 bg-transparent p-0"
                            style={{ appearance: "none", WebkitAppearance: "none" }}
                          />
                          <span className="font-mono text-[10px] text-[var(--fg-muted)]">{hex}</span>
                          <button onClick={() => {
                            const next = (brief.colorPalette ?? []).filter((_, j) => j !== i);
                            setBrief(b => ({...b, colorPalette: next, colorPreference: next.join(", ")}));
                          }} className="ml-0.5 text-[var(--fg-subtle)] hover:text-[var(--text-primary)]"><X size={10} /></button>
                        </div>
                      ))}
                      {(brief.colorPalette ?? []).length < 6 && (
                        <button onClick={() => {
                          const next = [...(brief.colorPalette ?? []), "#6b77ff"];
                          setBrief(b => ({...b, colorPalette: next, colorPreference: next.join(", ")}));
                        }}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-[var(--border-softer)] text-[var(--fg-subtle)] transition-all hover:border-[rgba(129,140,255,0.3)] hover:text-[var(--fg-soft)]">
                          <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Pages</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_PAGES.map(page => {
                    const active = brief.pages.includes(page);
                    return (
                      <button key={page} onClick={() => togglePage(page)}
                        className="rounded-full px-4 py-2 text-[13px] font-medium transition-all"
                        style={{ border: `1px solid ${active ? "rgba(129,140,255,0.35)" : "var(--border-soft)"}`, background: active ? "rgba(107,119,255,0.14)" : "var(--surface-3)", color: active ? "var(--text-primary)" : "var(--fg-soft)" }}>
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
                    style={{ padding: "0 18px", background: "var(--surface-4)", border: "1px solid var(--border-softer)", borderRadius: 14, fontSize: 12, color: "var(--fg-soft)", cursor: "pointer", opacity: customPage.trim() ? 1 : 0.4, whiteSpace: "nowrap" }}>
                    + Add
                  </button>
                </div>
                </div>
              </div>
            )}

            {/* Step 3: Details */}
            {ws === 3 && (
              <div className="space-y-5">
                <div>
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Image style</p>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {IMAGE_STYLES.map(style => (
                      <button key={style.value} onClick={() => setBrief({...brief, imageStyle: style.value as SiteBrief["imageStyle"]})}
                        className="rounded-[14px] px-3 py-3 text-center transition-all"
                        style={{ border: `1px solid ${brief.imageStyle === style.value ? "rgba(129,140,255,0.35)" : "var(--border-soft)"}`, background: brief.imageStyle === style.value ? "rgba(107,119,255,0.14)" : "var(--surface-3)" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: brief.imageStyle === style.value ? "var(--text-primary)" : "var(--fg-soft)" }}>{style.label}</div>
                        <div style={{ fontSize: 9, color: "var(--fg-subtle)", marginTop: 2, lineHeight: 1.4 }}>{style.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Design direction <span className="normal-case tracking-normal font-normal text-[var(--fg-subtle)]">(optional)</span></p>
                  <input value={smartBrief.stylePreference ?? ""}
                    onChange={e => setSmartBrief(s => ({...s, stylePreference: e.target.value}))}
                    placeholder='"editorial magazine feel" or "warm like Kinfolk"'
                    style={inputBase}
                    onFocus={(e) => { e.target.style.borderColor = "rgba(129,140,255,0.45)"; e.target.style.background = "rgba(107,119,255,0.06)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--border-softer)"; e.target.style.background = "var(--surface-4)"; }}
                  />
                </div>

                {generatorMode === "smart" && (
                  <div className="rounded-[14px] border border-[rgba(129,140,255,0.18)] bg-[rgba(107,119,255,0.06)] p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles size={11} style={{ color: "rgba(162,172,255,0.8)" }} />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(162,172,255,0.8)]">Smart context</span>
                    </div>
                    <input ref={logoInputRef} type="file" accept=".png,.jpg,.jpeg,.svg,.webp" style={{ display: "none" }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }} />
                    {smartBrief.logoUrl ? (
                      <div className="flex items-center gap-2.5 rounded-[10px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-3 py-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={smartBrief.logoUrl} alt="Logo" style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 6, flexShrink: 0 }} />
                        <p className="flex-1 text-[11px] text-[var(--fg-soft)]">Logo attached</p>
                        <button onClick={() => { setSmartBrief(s => ({...s, logoUrl: ""})); if (logoInputRef.current) logoInputRef.current.value = ""; }} className="text-[var(--fg-faint)] hover:text-[var(--text-primary)]"><X size={12} /></button>
                      </div>
                    ) : (
                      <button onClick={() => logoInputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setLogoDragging(true); }}
                        onDragLeave={() => setLogoDragging(false)}
                        onDrop={e => { e.preventDefault(); setLogoDragging(false); const f = e.dataTransfer.files[0]; if (f) handleLogoFile(f); }}
                        className="flex w-full items-center gap-2.5 rounded-[10px] border border-dashed px-3 py-2.5 text-left transition-all"
                        style={{ borderColor: logoDragging ? "rgba(129,140,255,0.5)" : "var(--border-softer)", background: logoDragging ? "rgba(107,119,255,0.08)" : "transparent" }}>
                        <Upload size={12} style={{ color: "var(--fg-faint)", flexShrink: 0 }} />
                        <span className="text-[11px] text-[var(--fg-muted)]">Upload your logo (optional)</span>
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input value={smartBrief.contactDetails?.email} onChange={e => patchSmartContact("email", e.target.value)} placeholder="Email" style={{ ...inputBase, fontSize: 12, padding: "10px 14px" }} />
                      <input value={smartBrief.contactDetails?.phone} onChange={e => patchSmartContact("phone", e.target.value)} placeholder="Phone" style={{ ...inputBase, fontSize: 12, padding: "10px 14px" }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-8 py-5">
          <button
            onClick={prevWizard}
            className={`flex items-center gap-2 text-[13px] font-medium text-[var(--fg-muted)] transition-all hover:text-[var(--text-primary)] ${ws === 1 ? "invisible" : ""}`}
          >
            <ChevronLeft size={15} /> Back
          </button>

          {/* Live summary chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-[var(--surface-4)] px-2.5 py-1 text-[10px] text-[var(--fg-muted)]">
              {generatorMode === "smart" ? "Smart" : "Quick"}
            </span>
            {brief.siteName && <span className="rounded-full bg-[var(--surface-4)] px-2.5 py-1 text-[10px] text-[var(--fg-muted)]">{brief.siteName}</span>}
            {brief.siteType && <span className="rounded-full bg-[var(--surface-4)] px-2.5 py-1 text-[10px] text-[var(--fg-muted)]">{brief.siteType}</span>}
            {brief.generationDesignStyle && brief.generationDesignStyle !== "minimal" && <span className="rounded-full bg-[var(--surface-4)] px-2.5 py-1 text-[10px] text-[var(--fg-muted)]">{DESIGN_STYLES.find(s => s.value === brief.generationDesignStyle)?.label ?? brief.generationDesignStyle}</span>}
            {brief.pages.length > 0 && <span className="rounded-full bg-[var(--surface-4)] px-2.5 py-1 text-[10px] text-[var(--fg-muted)]">{brief.pages.length} pages</span>}
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
    </OverlayDialog>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>{label}</p>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "linear-gradient(90deg, transparent 0%, var(--border-softer) 12%, var(--border-softer) 88%, transparent 100%)" }} />;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border-soft)] py-2.5 last:border-0">
      <span className="text-[11px] text-[var(--fg-faint)]">{label}</span>
      <span className="text-[12px] font-medium text-[var(--fg-soft)]">{value}</span>
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
  background: "var(--surface-4)",
  border: "1px solid var(--border-softer)",
  borderRadius: 16,
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.18s, box-shadow 0.18s, background 0.18s",
  boxShadow: "var(--shadow-soft-inset)",
};
  const initialBriefSettings = buildInitialBriefSettings(readCachedUserSettings() ?? defaultUserSettings);
