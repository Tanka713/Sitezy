"use client";
import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/utils";
import { X, Zap, ChevronRight, ChevronLeft, Loader2, Check, Palette, ImageIcon } from "lucide-react";
import { GeneratingScreen } from "./GeneratingScreen";
import type { SiteBrief, SiteBlueprint, ProjectPage, PageSection } from "@/types";

const SITE_TYPES = [
  "Agency","Restaurant","Cafe","Gym","Personal Brand","Portfolio",
  "SaaS Startup","Event","Consultancy","Real Estate",
  "Creative Studio","Ecommerce","Board Game Cafe","Local Business",
];
const TONES = ["Professional","Playful","Minimal","Bold","Luxurious","Friendly","Edgy","Warm"];
const COMMON_PAGES = [
  "Home","About","Services","Pricing","Contact",
  "Portfolio","Blog","FAQ","Team","Testimonials",
  "Menu","Booking","Case Studies","Events",
];
const COLOR_PRESETS = [
  { label:"AI Choose",  value:"",          colors:[] },
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
  { value:"photos",        label:"Real Photos",    desc:"Unsplash photography matched to your industry", icon:"🖼️" },
  { value:"minimal",       label:"Minimal",         desc:"Mostly color and typography, few images", icon:"◻️" },
  { value:"illustrations", label:"Illustrations",   desc:"Abstract shapes and graphic elements", icon:"🎨" },
  { value:"none",          label:"No Images",       desc:"Pure text and color design", icon:"✦" },
];

interface Props { onClose: () => void; }

export function CreateProjectModal({ onClose }: Props) {
  const createProject  = useAppStore((s) => s.createProject);
  const setBlueprint   = useAppStore((s) => s.setBlueprint);
  const setPageContent = useAppStore((s) => s.setPageContent);
  const setPageStatus  = useAppStore((s) => s.setPageStatus);
  const setGenStatus   = useAppStore((s) => s.setGenStatus);
  const addGenLog      = useAppStore((s) => s.addGenLog);
  const clearGenLog    = useAppStore((s) => s.clearGenLog);
  const openProject    = useAppStore((s) => s.openProject);
  const genStatus      = useAppStore((s) => s.generationStatus);
  const genLog         = useAppStore((s) => s.generationLog);

  const [step, setStep]               = useState<1|2>(1);
  const [activeTab, setActiveTab]     = useState<"basic"|"design">("basic");
  const [colorPreset, setColorPreset] = useState(0);
  const [customPage, setCustomPage]   = useState("");
  const [brief, setBrief] = useState<SiteBrief>({
    siteName:"", description:"", siteType:"", tone:"Professional",
    pages:["Home","About","Services","Contact"],
    features:"", targetAudience:"", colorPreference:"", colorPalette:[], imageStyle:"photos",
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

  async function handleGenerate() {
    if (!brief.siteName.trim() || !brief.description.trim()) return;
    clearGenLog();
    setStep(2);

    const project = createProject(brief);
    projectIdRef.current = project.id;

    try {
      setGenStatus("blueprint","Analyzing your brief...");
      addGenLog("🔍 Extracting brand direction and visual identity...","info");
      if (brief.colorPreference) addGenLog(`🎨 Color: ${COLOR_PRESETS[colorPreset]?.label ?? "custom"}`, "info");
      addGenLog(`🖼️ Image style: ${brief.imageStyle ?? "photos"}`, "info");

      const bpRes = await fetch("/api/blueprint", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ brief }),
      });
      if (!bpRes.ok) {
        const e = await bpRes.json();
        throw new Error(e.detail ? `${e.error} — ${e.detail}` : e.error || "Blueprint failed");
      }
      const { blueprint }: { blueprint: SiteBlueprint } = await bpRes.json();
      addGenLog(`✅ Blueprint — ${blueprint.layoutStyle} · ${blueprint.pages.length} pages`, "success");
      addGenLog(`🎨 ${blueprint.colorScheme.primary} · ${blueprint.typography.headingFont}`, "info");

      const pages: ProjectPage[] = blueprint.pages.map(p => ({
        id: p.id || uid(),
        name: p.name,
        slug: p.slug,
        sections: [],
        purpose: p.purpose,
        html: "",
        status: "pending" as const,
      }));
      setBlueprint(blueprint, pages);
      setGenStatus("pages","Generating pages...");

      for (let i = 0; i < blueprint.pages.length; i++) {
        const bpPage = blueprint.pages[i];
        const localPage = pages[i];
        setPageStatus(localPage.id, "generating");
        addGenLog(`📄 Generating ${bpPage.name} (${i+1}/${blueprint.pages.length})...`, "progress");
        setGenStatus("pages", `Generating ${bpPage.name} (${i+1}/${blueprint.pages.length})...`);

        const pageRes = await fetch("/api/generate", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ blueprint, page: bpPage, brief }),
        });
        if (!pageRes.ok) {
          const e = await pageRes.json();
          addGenLog(`⚠️ ${bpPage.name}: ${e.error}`, "error");
          setPageStatus(localPage.id, "error");
          continue;
        }
        const result: { html:string; sections:PageSection[] } = await pageRes.json();
        setPageContent(localPage.id, result.html, result.sections);
        addGenLog(`✅ ${bpPage.name} — ${(result.html.length/1000).toFixed(1)}k chars`, "success");
      }

      setGenStatus("done","Your website is ready!");
      addGenLog("🎉 All done! Opening editor...", "success");
      setTimeout(() => {
        if (projectIdRef.current) openProject(projectIdRef.current);
        onClose();
      }, 1800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setGenStatus("error", `Error: ${msg}`);
      addGenLog(`❌ ${msg}`, "error");
    }
  }

  const canSubmit = brief.siteName.trim().length > 0 && brief.description.trim().length > 10;

  // ── Rendering ──────────────────────────────────────────────────────────────

  // Step 2: full-screen generation animation
  if (step === 2) {
    return (
      <>
        <GeneratingScreen
          projectName={brief.siteName || "Your Website"}
          pageCount={brief.pages.length}
        />
        {/* Back/retry overlay if error */}
        {genStatus === "error" && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.08] border border-white/[0.15] text-white text-[13px] rounded-xl hover:bg-white/[0.12] transition-colors backdrop-blur-sm"
            >
              <ChevronLeft size={14} /> Go back
            </button>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-[13px] rounded-xl transition-colors shadow-lg shadow-brand-500/30"
            >
              <Zap size={14} /> Retry
            </button>
          </div>
        )}
      </>
    );
  }

  // Step 1: brief form
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0e0e12] border border-white/[0.08] rounded-2xl w-full max-w-[640px] max-h-[92vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center">
              <Zap size={14} className="text-brand-400" />
            </div>
            <h2 className="font-semibold text-[15px]">New Project</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors">
            <X size={15}/>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-white/[0.06]">
          {([["basic","Content"],["design","Design & Style"]] as const).map(([key,label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex-1 py-2.5 text-[13px] font-medium transition-colors ${activeTab===key?"text-white border-b-2 border-brand-500":"text-white/40 hover:text-white/70 border-b-2 border-transparent"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Form body */}
        <div className="overflow-auto flex-1 p-6 space-y-5">
          {activeTab === "basic" ? (
            <>
              <Field label="Site Name *">
                <input value={brief.siteName} onChange={e => setBrief({...brief, siteName:e.target.value})}
                  placeholder="Luminary Studio" className={IC}/>
              </Field>

              <Field label="Describe your website *">
                <textarea value={brief.description} onChange={e => setBrief({...brief, description:e.target.value})}
                  placeholder="A premium creative agency specializing in brand identity and digital strategy..."
                  rows={4} className={`${IC} resize-none`}/>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Site Type">
                  <select value={brief.siteType} onChange={e => setBrief({...brief, siteType:e.target.value})} className={`${IC} appearance-none`}>
                    <option value="">Auto-detect</option>
                    {SITE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Tone">
                  <select value={brief.tone} onChange={e => setBrief({...brief, tone:e.target.value})} className={`${IC} appearance-none`}>
                    {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Pages to include">
                <div className="flex flex-wrap gap-2 mb-2">
                  {COMMON_PAGES.map(page => (
                    <button key={page} onClick={() => togglePage(page)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${brief.pages.includes(page)?"bg-brand-500/20 border-brand-500/40 text-brand-300":"bg-white/[0.03] border-white/[0.07] text-white/40 hover:border-white/[0.15]"}`}>
                      {page}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={customPage} onChange={e => setCustomPage(e.target.value)}
                    onKeyDown={e => e.key==="Enter" && addCustomPage()}
                    placeholder="Add custom page..." className={`${IC} py-2 text-[12px]`}/>
                  <button onClick={addCustomPage} disabled={!customPage.trim()}
                    className="px-3 py-2 bg-white/[0.05] border border-white/[0.1] text-white/50 hover:text-white text-[12px] rounded-xl disabled:opacity-30 transition-colors whitespace-nowrap">
                    + Add
                  </button>
                </div>
                {brief.pages.filter(p => !COMMON_PAGES.includes(p)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {brief.pages.filter(p => !COMMON_PAGES.includes(p)).map(p => (
                      <span key={p} className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                        {p}
                        <button onClick={() => togglePage(p)} className="hover:text-white ml-0.5 leading-none">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>

              <Field label="Special Features (optional)">
                <input value={brief.features} onChange={e => setBrief({...brief, features:e.target.value})}
                  placeholder="Online booking, menu, testimonials, pricing table..." className={IC}/>
              </Field>

              <Field label="Target Audience (optional)">
                <input value={brief.targetAudience} onChange={e => setBrief({...brief, targetAudience:e.target.value})}
                  placeholder="Small business owners, creative professionals..." className={IC}/>
              </Field>
            </>
          ) : (
            <>
              {/* Color palette */}
              <Field label={<span className="flex items-center gap-1.5"><Palette size={11}/>Color Palette <span className="text-white/25">(optional)</span></span>}>
                <p className="text-[11px] text-white/30 mb-3">Choose a mood palette or let AI pick based on your business type.</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {COLOR_PRESETS.map((preset, idx) => (
                    <button key={preset.label} onClick={() => pickColorPreset(idx)}
                      className={`relative p-3 rounded-xl border text-left transition-all ${colorPreset===idx?"border-brand-500/60 bg-brand-500/10":"border-white/[0.07] bg-white/[0.02] hover:border-white/[0.15]"}`}>
                      {colorPreset===idx && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center">
                          <Check size={9} className="text-white"/>
                        </span>
                      )}
                      <div className="flex gap-1 mb-2">
                        {(preset.colors.length>0?preset.colors:["#7c3aed","#2563eb","#10b981","#f59e0b"]).map((c,i) => (
                          <div key={i} className="w-4 h-4 rounded-full border border-black/20 flex-shrink-0"
                            style={{background:c, opacity:preset.colors.length===0?0.35:1}}/>
                        ))}
                      </div>
                      <span className="text-[11px] font-medium text-white/70">{preset.label}</span>
                    </button>
                  ))}
                </div>
                <input
                  value={colorPreset===0 ? (brief.colorPreference ?? "") : ""}
                  onChange={e => { setColorPreset(0); setBrief({...brief, colorPreference:e.target.value, colorPalette:[]}); }}
                  placeholder='Custom: e.g. "warm terracotta with sage green accents"'
                  className={IC}/>
              </Field>

              {/* Image style */}
              <Field label={<span className="flex items-center gap-1.5"><ImageIcon size={11}/>Image Style</span>}>
                <div className="grid grid-cols-2 gap-2">
                  {IMAGE_STYLES.map(style => (
                    <button key={style.value} onClick={() => setBrief({...brief, imageStyle:style.value as SiteBrief["imageStyle"]})}
                      className={`p-3 rounded-xl border text-left transition-all ${brief.imageStyle===style.value?"border-brand-500/60 bg-brand-500/10":"border-white/[0.07] bg-white/[0.02] hover:border-white/[0.15]"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm leading-none">{style.icon}</span>
                        <span className="text-[12px] font-medium text-white/80">{style.label}</span>
                        {brief.imageStyle===style.value && <Check size={10} className="text-brand-400 ml-auto"/>}
                      </div>
                      <p className="text-[11px] text-white/30 leading-snug">{style.desc}</p>
                    </button>
                  ))}
                </div>
              </Field>

              {/* Design direction */}
              <Field label="Design Direction (optional)">
                <input
                  placeholder='e.g. "editorial magazine feel" or "bold startup landing page"'
                  className={IC}/>
              </Field>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-white/25 text-[12px] whitespace-nowrap">
              {brief.pages.length} page{brief.pages.length!==1?"s":""}
            </span>
            {colorPreset>0 && (
              <span className="text-[11px] text-brand-400/70 truncate">{COLOR_PRESETS[colorPreset].label}</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setActiveTab(activeTab==="basic"?"design":"basic")}
              className="px-3 py-2 text-[12px] text-white/40 hover:text-white/70 border border-white/[0.07] rounded-lg transition-colors whitespace-nowrap">
              {activeTab==="basic"?"Design →":"← Content"}
            </button>
            <button onClick={handleGenerate} disabled={!canSubmit}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-medium transition-all ${canSubmit?"bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20":"bg-white/[0.05] text-white/20 cursor-not-allowed"}`}>
              <Zap size={14}/>Generate<ChevronRight size={14}/>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-2">{label}</label>
      {children}
    </div>
  );
}

const IC = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-colors";
