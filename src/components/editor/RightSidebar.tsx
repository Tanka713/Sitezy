"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/utils";
import {
  Bot, SlidersHorizontal, LayoutGrid, Send, Loader2,
  RefreshCw, Check, X, GripVertical, Plus, Link,
  Upload, Wand2, Palette, Type, Eye, EyeOff, Trash2,
  ChevronDown, ChevronUp, ImageIcon, AlertCircle,
} from "lucide-react";
import type { Project, AIChatMessage, PageSection, SiteBlueprint } from "@/types";

const BLOCK_LIBRARY = [
  { type:"navbar",       label:"Navbar",       cat:"nav",        icon:"≡" },
  { type:"hero",         label:"Hero",          cat:"layout",     icon:"⬛" },
  { type:"features",     label:"Features",      cat:"content",    icon:"⊞" },
  { type:"stats",        label:"Stats",         cat:"content",    icon:"▤" },
  { type:"logo-cloud",   label:"Logo Cloud",    cat:"content",    icon:"◈" },
  { type:"testimonials", label:"Testimonials",  cat:"content",    icon:"❝" },
  { type:"gallery",      label:"Gallery",       cat:"media",      icon:"⊟" },
  { type:"pricing",      label:"Pricing",       cat:"conversion", icon:"$" },
  { type:"team",         label:"Team",          cat:"content",    icon:"⊕" },
  { type:"faq",          label:"FAQ",           cat:"content",    icon:"?" },
  { type:"cta",          label:"CTA",           cat:"conversion", icon:"→" },
  { type:"contact",      label:"Contact",       cat:"conversion", icon:"✉" },
  { type:"footer",       label:"Footer",        cat:"nav",        icon:"⊟" },
  { type:"timeline",     label:"Timeline",      cat:"content",    icon:"⊸" },
  { type:"menu-section", label:"Menu",          cat:"content",    icon:"≡" },
  { type:"booking",      label:"Booking",       cat:"conversion", icon:"⊡" },
  { type:"blog-preview", label:"Blog",          cat:"content",    icon:"✎" },
  { type:"case-studies", label:"Case Studies",  cat:"content",    icon:"◉" },
  { type:"newsletter",   label:"Newsletter",    cat:"conversion", icon:"✉" },
  { type:"video",        label:"Video",         cat:"media",      icon:"▶" },
];
const BLOCK_CATS = ["layout","nav","content","media","conversion"];

const GOOGLE_FONTS = [
  "Inter","Plus Jakarta Sans","DM Sans","Outfit","Sora","Nunito",
  "Playfair Display","Cormorant Garamond","Libre Baskerville","Lora",
  "Space Grotesk","Manrope","Albert Sans","Epilogue","Cabinet Grotesk",
  "Fraunces","Unbounded","Big Shoulders Display","Anton","Bebas Neue",
];

interface Props { project: Project; }

export function RightSidebar({ project }: Props) {
  const rightPanelTab = useAppStore((s) => s.editor.rightPanelTab);
  const setRightPanel = useAppStore((s) => s.setRightPanel);

  const tabs = [
    { key:"ai"         as const, icon:<Bot size={12}/>,              label:"AI" },
    { key:"properties" as const, icon:<SlidersHorizontal size={12}/>, label:"Props" },
    { key:"blocks"     as const, icon:<LayoutGrid size={12}/>,       label:"Blocks" },
  ];

  return (
    <aside className="w-[300px] border-l border-white/[0.06] flex flex-col bg-[#0a0a0c] flex-shrink-0">
      <div className="flex border-b border-white/[0.06] flex-shrink-0">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setRightPanel(tab.key)}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-[11px] font-medium transition-colors ${rightPanelTab === tab.key ? "text-white border-b-2 border-brand-500" : "text-white/30 hover:text-white/60 border-b-2 border-transparent"}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {rightPanelTab === "ai"         && <AIPanel project={project} />}
        {rightPanelTab === "properties" && <PropertiesPanel project={project} />}
        {rightPanelTab === "blocks"     && <BlocksPanel project={project} />}
      </div>
    </aside>
  );
}

// ─── AI Panel ─────────────────────────────────────────────────────────────────
function AIPanel({ project }: Props) {
  const selectedPageId   = useAppStore((s) => s.editor.selectedPageId);
  const aiChats          = useAppStore((s) => s.aiChats);
  const addChatMessage   = useAppStore((s) => s.addChatMessage);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const clearChat        = useAppStore((s) => s.clearChat);

  const pages    = project?.pages ?? [];
  const page     = pages.find((p) => p.id === selectedPageId) ?? null;
  const messages: AIChatMessage[] = aiChats[currentProjectId ?? ""] ?? [];

  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const suggestions = page ? [
    `Improve the ${page.name} page copy`,
    `Make the design more premium`,
    `Add a stronger call-to-action`,
    `Rewrite headings to be bolder`,
    `Suggest layout improvements`,
  ] : ["Improve the hero copy","Make it more minimal","Add a CTA section","Suggest colors","Better tagline ideas"];

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setInput("");
    setLoading(true);
    const userMsgId = uid();
    addChatMessage(currentProjectId ?? "", { id: userMsgId, role: "user", content: text, timestamp: Date.now(), pageId: selectedPageId ?? undefined });
    const asstId = uid();
    let full = "";
    try {
      const res = await fetch("/api/assist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: text, context: { projectName: project.name, blueprint: project.blueprint, pageName: page?.name, pageHtml: page?.html?.slice(0, 2000), siteType: project.brief?.siteType } }),
      });
      if (!res.ok) throw new Error("AI request failed");
      addChatMessage(currentProjectId ?? "", { id: asstId, role: "assistant", content: "▌", timestamp: Date.now() });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream");
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.type === "chunk") { full += d.chunk; addChatMessage(currentProjectId ?? "", { id: asstId, role: "assistant", content: full, timestamp: Date.now() }); }
          } catch {}
        }
      }
    } catch (err) {
      addChatMessage(currentProjectId ?? "", { id: uid(), role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Unknown"}`, timestamp: Date.now() });
    } finally { setLoading(false); }
  }

  const deduped = messages.reduce<AIChatMessage[]>((acc, msg) => {
    const idx = acc.findIndex((m) => m.id === msg.id);
    if (idx >= 0) { acc[idx] = msg; return acc; }
    return [...acc, msg];
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-3 min-h-0">
        {deduped.length === 0 ? (
          <div className="py-3 text-center">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-3">
              <Bot size={16} className="text-brand-400" />
            </div>
            <p className="text-[11px] text-white/30 mb-3">{page ? `Editing ${page.name}` : "Ask about your site"}</p>
            <div className="space-y-1.5">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="block w-full text-left px-3 py-2 text-[11px] text-brand-400/80 bg-brand-500/5 hover:bg-brand-500/10 border border-brand-500/15 rounded-lg transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <button onClick={() => clearChat(currentProjectId ?? "")} className="text-[10px] text-white/25 hover:text-white/50 flex items-center gap-1">
                <X size={9}/> Clear
              </button>
            </div>
            {deduped.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[92%] px-3 py-2 rounded-xl text-[11px] leading-relaxed whitespace-pre-wrap break-words ${msg.role === "user" ? "bg-brand-600/80 text-white" : "bg-white/[0.04] border border-white/[0.06] text-white/70"}`}>
                  {msg.content === "▌" && loading ? <span className="flex items-center gap-1 text-white/30"><Loader2 size={10} className="spin"/>…</span> : msg.content}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      {/* Quick actions */}
      {page && (
        <div className="px-3 pb-2 flex gap-1.5 flex-wrap border-t border-white/[0.04] pt-2">
          {["Rewrite copy","Improve SEO","Add CTA"].map((a) => (
            <button key={a} onClick={() => send(a + " for the " + page.name + " page")}
              className="px-2 py-1 text-[10px] text-white/35 bg-white/[0.03] border border-white/[0.06] rounded-full hover:text-white/60 hover:border-white/[0.14] transition-colors">
              {a}
            </button>
          ))}
        </div>
      )}
      {/* Input */}
      <div className="p-3 border-t border-white/[0.06] flex-shrink-0">
        {page && <div className="flex items-center gap-1.5 mb-2"><span className="text-[10px] text-white/25">Page:</span><span className="text-[10px] text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/15">{page.name}</span></div>}
        <div className="flex gap-2">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} placeholder="Ask anything… (Enter to send)" disabled={loading} rows={2}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white placeholder-white/20 focus:outline-none focus:border-brand-500/40 resize-none transition-colors" />
          <button onClick={() => send(input)} disabled={!input.trim() || loading}
            className="w-8 self-end flex items-center justify-center bg-brand-600 hover:bg-brand-500 disabled:opacity-30 text-white rounded-lg transition-colors flex-shrink-0 aspect-square">
            {loading ? <Loader2 size={12} className="spin"/> : <Send size={12}/>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Properties Panel — fully functional ─────────────────────────────────────
function PropertiesPanel({ project }: Props) {
  const selectedPageId  = useAppStore((s) => s.editor.selectedPageId);
  const renamePage      = useAppStore((s) => s.renamePage);
  const setPageContent  = useAppStore((s) => s.setPageContent);
  const addGenLog       = useAppStore((s) => s.addGenLog);
  const setGenStatus    = useAppStore((s) => s.setGenStatus);
  const updateProject   = useAppStore((s) => s.renameProject); // reuse for blueprint update hack
  const currentProjectId = useAppStore((s) => s.currentProjectId);

  const pages = project?.pages ?? [];
  const page  = pages.find((p) => p.id === selectedPageId) ?? null;
  const bp    = project?.blueprint ?? null;

  // Local editable blueprint state
  const [colors,      setColors]      = useState<Record<string,string>>(bp?.colorScheme as Record<string,string> ?? {});
  const [headingFont, setHeadingFont] = useState(bp?.typography?.headingFont ?? "");
  const [bodyFont,    setBodyFont]    = useState(bp?.typography?.bodyFont ?? "");
  const [nameVal,     setNameVal]     = useState(page?.name ?? "");
  const [nameSaved,   setNameSaved]   = useState(false);
  const [activeSection, setActiveSection] = useState<"design"|"page"|"sections">("page");
  const [regenSection, setRegenSection]   = useState<string|null>(null);
  const [applyingDesign, setApplyingDesign] = useState(false);

  useEffect(() => { setNameVal(page?.name ?? ""); }, [page?.id]);
  useEffect(() => {
    if (bp?.colorScheme) setColors(bp.colorScheme as Record<string,string>);
    if (bp?.typography?.headingFont) setHeadingFont(bp.typography.headingFont);
    if (bp?.typography?.bodyFont)    setBodyFont(bp.typography.bodyFont);
  }, [bp]);

  function saveName() {
    if (!page || !nameVal.trim() || nameVal === page.name) return;
    renamePage(page.id, nameVal.trim());
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 1500);
  }

  // Apply design changes to page HTML via AI
  async function applyDesignChanges() {
    if (!page || !bp) return;
    setApplyingDesign(true);
    addGenLog("🎨 Applying design changes…", "progress");
    const cssVars = Object.entries(colors).map(([k,v]) => `--${k}: ${v}`).join("; ");
    const fontInstruction = `Use "${headingFont}" for headings and "${bodyFont}" for body text.`;
    try {
      const res = await fetch("/api/assist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: `Update this page's CSS variables and font references. New CSS variables: ${cssVars}. ${fontInstruction} Update all :root variables and font-family references in inline styles. Return ONLY the updated full page HTML.`,
          context: { projectName: project.name, blueprint: bp, pageName: page.name, pageHtml: page.html, siteType: project.brief?.siteType },
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream");
      let buffer = "", fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try { const d = JSON.parse(line.slice(6)); if (d.type === "chunk") fullText += d.chunk; } catch {}
        }
      }
      if (fullText.includes("<") && fullText.length > 100) {
        setPageContent(page.id, fullText, page.sections);
        addGenLog("✅ Design updated", "success");
        setGenStatus("done", "Design applied!");
      }
    } catch { addGenLog("⚠️ Could not apply design changes", "error"); }
    finally { setApplyingDesign(false); }
  }

  // Regenerate a single section
  async function regenerateSection(sectionType: string, customInstruction?: string) {
    if (!page || !bp) return;
    setRegenSection(sectionType);
    addGenLog(`🔄 Regenerating ${sectionType}…`, "progress");
    try {
      const res = await fetch("/api/assist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: customInstruction
            ? `Regenerate the ${sectionType} section: ${customInstruction}. Return ONLY the complete updated page HTML.`
            : `Regenerate the ${sectionType} section with fresh content and improved design. Maintain the same overall style. Return ONLY the complete updated page HTML.`,
          context: { projectName: project.name, blueprint: bp, pageName: page.name, pageHtml: page.html, siteType: project.brief?.siteType },
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream");
      let buffer = "", fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try { const d = JSON.parse(line.slice(6)); if (d.type === "chunk") fullText += d.chunk; } catch {}
        }
      }
      if (fullText.includes("<") && fullText.length > 100) {
        setPageContent(page.id, fullText, page.sections);
        addGenLog(`✅ ${sectionType} updated`, "success");
      }
    } catch { addGenLog(`⚠️ ${sectionType} regen failed`, "error"); }
    finally { setRegenSection(null); }
  }

  if (!page && !bp) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/20 text-[12px] gap-2 p-4 text-center">
        <SlidersHorizontal size={22} className="text-white/10"/>
        Select a page to edit properties
      </div>
    );
  }

  const subtabs = [
    { key:"page"     as const, label:"Page" },
    { key:"design"   as const, label:"Design" },
    { key:"sections" as const, label:"Sections" },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sub-tabs */}
      <div className="flex border-b border-white/[0.05] flex-shrink-0">
        {subtabs.map((t) => (
          <button key={t.key} onClick={() => setActiveSection(t.key)}
            className={`flex-1 py-2 text-[11px] font-medium transition-colors ${activeSection===t.key?"text-white border-b border-brand-500":"text-white/30 hover:text-white/60"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto min-h-0">

        {/* ── PAGE TAB ── */}
        {activeSection === "page" && page && (
          <div className="p-4 space-y-4">
            <div>
              <label className={LC}>Page Name</label>
              <div className="flex gap-2">
                <input value={nameVal} onChange={e => setNameVal(e.target.value)}
                  onBlur={saveName} onKeyDown={e => e.key==="Enter" && saveName()}
                  className={`${IC} flex-1`}/>
                {nameSaved && <span className="flex items-center text-emerald-400 flex-shrink-0"><Check size={13}/></span>}
              </div>
            </div>
            <div>
              <label className={LC}>URL Slug</label>
              <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2">
                <span className="text-white/25 text-[12px]">/</span>
                <input defaultValue={page.slug} className="flex-1 bg-transparent text-[13px] text-white focus:outline-none ml-1 min-w-0"/>
              </div>
            </div>
            <div>
              <label className={LC}>Purpose</label>
              <textarea defaultValue={page.purpose} rows={2}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white/70 focus:outline-none focus:border-brand-500/40 resize-none transition-colors"/>
            </div>
            <div>
              <label className={LC}>Status</label>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                page.status==="done"?"bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                :page.status==="error"?"bg-red-500/10 text-red-400 border-red-500/20"
                :page.status==="generating"?"bg-brand-500/10 text-brand-400 border-brand-500/20"
                :"bg-white/[0.04] text-white/30 border-white/[0.08]"}`}>
                {page.status==="generating"&&<Loader2 size={9} className="spin"/>}
                {page.status}{page.html ? ` · ${(page.html.length/1000).toFixed(1)}k` : ""}
              </span>
            </div>
          </div>
        )}

        {/* ── DESIGN TAB ── */}
        {activeSection === "design" && (
          <div className="p-4 space-y-5">
            {/* Colors */}
            <div>
              <label className={LC}>Brand Colors</label>
              <div className="space-y-2">
                {Object.entries(colors).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2.5">
                    <div className="relative flex-shrink-0">
                      <input type="color" value={val}
                        onChange={e => setColors(c => ({...c, [key]: e.target.value}))}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-white/[0.1] bg-transparent"
                        style={{ padding: 2 }}/>
                    </div>
                    <span className="text-[11px] text-white/50 capitalize flex-1 min-w-0">{key}</span>
                    <input value={val} onChange={e => setColors(c => ({...c, [key]: e.target.value}))}
                      maxLength={7} className="w-[80px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-[11px] font-mono text-white/70 focus:outline-none focus:border-brand-500/40"/>
                  </div>
                ))}
              </div>
            </div>

            {/* Fonts */}
            <div>
              <label className={LC}>Typography</label>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-white/30 mb-1">Heading Font</p>
                  <select value={headingFont} onChange={e => setHeadingFont(e.target.value)}
                    className={`${IC} appearance-none text-[12px] py-2`}>
                    {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 mb-1">Body Font</p>
                  <select value={bodyFont} onChange={e => setBodyFont(e.target.value)}
                    className={`${IC} appearance-none text-[12px] py-2`}>
                    {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Apply button */}
            <button onClick={applyDesignChanges} disabled={applyingDesign || !page}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium transition-all ${!applyingDesign && page?"bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20":"bg-white/[0.05] text-white/25 cursor-not-allowed"}`}>
              {applyingDesign ? <><Loader2 size={13} className="spin"/>Applying…</> : <><Wand2 size={13}/>Apply to Page</>}
            </button>
            {!page && <p className="text-[11px] text-white/30 text-center">Select a page to apply design changes</p>}
          </div>
        )}

        {/* ── SECTIONS TAB — drag & drop ── */}
        {activeSection === "sections" && (
          <SectionsEditor page={page} project={project} regenSection={regenerateSection} />
        )}
      </div>
    </div>
  );
}

// ─── Sections Editor with drag-and-drop + image/link/AI edit ─────────────────
function SectionsEditor({
  page, project, regenSection,
}: {
  page: ReturnType<Project["pages"]["find"]>;
  project: Project;
  regenSection: (type: string, instruction?: string) => Promise<void>;
}) {
  const setPageContent  = useAppStore((s) => s.setPageContent);
  const addGenLog       = useAppStore((s) => s.addGenLog);

  const [sections, setSections]         = useState<PageSection[]>(page?.sections ?? []);
  const [dragIdx,  setDragIdx]          = useState<number|null>(null);
  const [overIdx,  setOverIdx]          = useState<number|null>(null);
  const [expanded, setExpanded]         = useState<string|null>(null);
  const [editPrompt, setEditPrompt]     = useState<Record<string,string>>({});
  const [imageUrl,   setImageUrl]       = useState<Record<string,string>>({});
  const [applying,   setApplying]       = useState<string|null>(null);

  useEffect(() => { setSections(page?.sections ?? []); }, [page?.id, page?.sections?.length]);

  if (!page) return (
    <div className="flex items-center justify-center h-full text-white/20 text-[12px] p-4 text-center">
      Select a page to manage its sections
    </div>
  );

  // ── Drag handlers ──────────────────────────────────────────────────────────
  function onDragStart(i: number) { setDragIdx(i); }
  function onDragOver(e: React.DragEvent, i: number) { e.preventDefault(); setOverIdx(i); }
  function onDrop(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setOverIdx(null); return; }
    const next = [...sections];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(i, 0, moved);
    setSections(next);
    setDragIdx(null);
    setOverIdx(null);
    // Persist reorder via AI
    applyReorder(next);
  }

  async function applyReorder(ordered: PageSection[]) {
    if (!page || !project.blueprint) return;
    addGenLog("🔀 Reordering sections…", "progress");
    const sectionOrder = ordered.map(s => s.name || s.type).join(", ");
    try {
      const res = await fetch("/api/assist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: `Reorder the sections in this page to match this exact order: ${sectionOrder}. Keep all content identical, just reorder the HTML sections. Return ONLY the complete updated page HTML.`,
          context: { projectName: project.name, blueprint: project.blueprint, pageName: page.name, pageHtml: page.html, siteType: project.brief?.siteType },
        }),
      });
      if (!res.ok) throw new Error();
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      let buf = "", full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try { const d = JSON.parse(line.slice(6)); if (d.type==="chunk") full+=d.chunk; } catch {}
        }
      }
      if (full.includes("<") && full.length > 100) {
        setPageContent(page.id, full, ordered);
        addGenLog("✅ Sections reordered", "success");
      }
    } catch { addGenLog("⚠️ Reorder failed", "error"); }
  }

  async function applyImageToSection(sectionId: string, sectionType: string, url: string) {
    if (!page || !project.blueprint || !url) return;
    setApplying(sectionId);
    addGenLog(`🖼️ Adding image to ${sectionType}…`, "progress");
    try {
      const res = await fetch("/api/assist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: `In the ${sectionType} section, replace the main image (or background image) with this URL: ${url}. Use it as an <img src="${url}"> or background-image CSS as appropriate for the section. Return ONLY the complete updated page HTML.`,
          context: { projectName: project.name, blueprint: project.blueprint, pageName: page.name, pageHtml: page.html, siteType: project.brief?.siteType },
        }),
      });
      if (!res.ok) throw new Error();
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      let buf = "", full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try { const d = JSON.parse(line.slice(6)); if (d.type==="chunk") full+=d.chunk; } catch {}
        }
      }
      if (full.includes("<")) {
        setPageContent(page.id, full, page.sections);
        addGenLog(`✅ Image added to ${sectionType}`, "success");
        setImageUrl(u => ({...u, [sectionId]: ""}));
      }
    } catch { addGenLog(`⚠️ Image add failed`, "error"); }
    finally { setApplying(null); }
  }

  async function aiEditSection(sectionId: string, sectionType: string) {
    const prompt = editPrompt[sectionId];
    if (!prompt?.trim()) return;
    await regenSection(sectionType, prompt);
    setEditPrompt(p => ({...p, [sectionId]: ""}));
  }

  return (
    <div className="p-3 space-y-1.5">
      <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold px-1 mb-2">
        Drag to reorder · {sections.length} sections
      </p>

      {sections.length === 0 && (
        <div className="text-center py-6 text-white/20 text-[12px]">No sections detected on this page</div>
      )}

      {sections.map((sec, i) => (
        <div key={sec.id}
          draggable
          onDragStart={() => onDragStart(i)}
          onDragOver={(e) => onDragOver(e, i)}
          onDrop={(e) => onDrop(e, i)}
          onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
          className={`rounded-xl border transition-all ${
            overIdx===i && dragIdx!==i
              ? "border-brand-500/50 bg-brand-500/10 scale-[1.01]"
              : dragIdx===i
              ? "opacity-50 border-white/[0.06]"
              : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]"
          }`}>
          {/* Section header */}
          <div className="flex items-center gap-2 px-3 py-2.5 cursor-grab active:cursor-grabbing">
            <GripVertical size={13} className="text-white/20 flex-shrink-0"/>
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500/50 flex-shrink-0"/>
            <span className="text-[12px] text-white/65 capitalize flex-1 font-medium truncate">
              {sec.name || sec.type}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Regen */}
              <button onClick={() => regenSection(sec.type)}
                disabled={applying===sec.id}
                title="Regenerate"
                className="w-6 h-6 flex items-center justify-center text-white/25 hover:text-brand-400 rounded transition-colors">
                <RefreshCw size={10}/>
              </button>
              {/* Expand */}
              <button onClick={() => setExpanded(expanded===sec.id ? null : sec.id)}
                className="w-6 h-6 flex items-center justify-center text-white/25 hover:text-white/60 rounded transition-colors">
                {expanded===sec.id ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
              </button>
            </div>
          </div>

          {/* Expanded controls */}
          {expanded===sec.id && (
            <div className="px-3 pb-3 space-y-3 border-t border-white/[0.05] pt-3">

              {/* AI edit instruction */}
              <div>
                <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5 block">
                  <Wand2 size={10}/> AI Edit
                </label>
                <div className="flex gap-2">
                  <input
                    value={editPrompt[sec.id] ?? ""}
                    onChange={e => setEditPrompt(p => ({...p, [sec.id]: e.target.value}))}
                    onKeyDown={e => e.key==="Enter" && aiEditSection(sec.id, sec.type)}
                    placeholder="e.g. make the heading bolder, add 3 bullet points…"
                    className="flex-1 bg-black/30 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-brand-500/40 transition-colors"/>
                  <button onClick={() => aiEditSection(sec.id, sec.type)}
                    disabled={!editPrompt[sec.id]?.trim() || applying===sec.id}
                    className="w-8 h-8 flex items-center justify-center bg-brand-600 hover:bg-brand-500 disabled:opacity-30 text-white rounded-lg transition-colors flex-shrink-0">
                    {applying===sec.id ? <Loader2 size={11} className="spin"/> : <Wand2 size={11}/>}
                  </button>
                </div>
              </div>

              {/* Image URL / upload */}
              <div>
                <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5 block">
                  <ImageIcon size={10}/> Image
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-1.5 bg-black/30 border border-white/[0.08] rounded-lg px-2.5 py-1.5">
                    <Link size={10} className="text-white/30 flex-shrink-0"/>
                    <input
                      value={imageUrl[sec.id] ?? ""}
                      onChange={e => setImageUrl(u => ({...u, [sec.id]: e.target.value}))}
                      placeholder="Paste image URL…"
                      className="flex-1 bg-transparent text-[11px] text-white placeholder-white/20 focus:outline-none min-w-0"/>
                  </div>
                  <button
                    onClick={() => applyImageToSection(sec.id, sec.type, imageUrl[sec.id] ?? "")}
                    disabled={!imageUrl[sec.id]?.trim() || applying===sec.id}
                    className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white/60 hover:text-white text-[11px] rounded-lg disabled:opacity-30 transition-colors whitespace-nowrap">
                    {applying===sec.id ? <Loader2 size={10} className="spin inline"/> : "Apply"}
                  </button>
                </div>
                {/* Unsplash quick picks */}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {["unsplash.com/?q=office","unsplash.com/?q=nature","unsplash.com/?q=tech","unsplash.com/?q=people"].map((hint) => (
                    <a key={hint} href={`https://${hint}`} target="_blank" rel="noreferrer"
                      className="text-[9px] text-white/25 hover:text-white/50 underline transition-colors">
                      {hint.split("?q=")[1]}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Blocks Panel — drag-to-canvas ────────────────────────────────────────────
function BlocksPanel({ project }: Props) {
  const [activeCat,   setActiveCat]   = useState("all");
  const [adding,      setAdding]      = useState<string|null>(null);
  const [position,    setPosition]    = useState<"before-first"|"after-last"|number>("after-last");
  const setPageContent = useAppStore((s) => s.setPageContent);
  const addGenLog      = useAppStore((s) => s.addGenLog);
  const selectedPageId = useAppStore((s) => s.editor.selectedPageId);
  const pages          = project?.pages ?? [];
  const page           = pages.find((p) => p.id === selectedPageId) ?? null;

  const filtered = activeCat==="all" ? BLOCK_LIBRARY : BLOCK_LIBRARY.filter((b) => b.cat===activeCat);

  async function handleAddBlock(blockType: string) {
    if (!page || !project.blueprint || adding) return;
    setAdding(blockType);
    addGenLog(`🧩 Adding ${blockType} to ${page.name}…`, "progress");
    const posInstr = position === "before-first"
      ? "Insert this section at the very top of the page (after the navbar if present)."
      : typeof position === "number"
      ? `Insert this section after the ${page.sections[position]?.name ?? "current"} section.`
      : "Append this section before the footer (or at the very end if no footer).";

    try {
      const res = await fetch("/api/assist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: `Add a new ${blockType} section to this page. ${posInstr} Generate high-quality content matching the site's brand and tone. Return ONLY the complete updated page HTML.`,
          context: { projectName: project.name, blueprint: project.blueprint, pageName: page.name, pageHtml: page.html, siteType: project.brief?.siteType },
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error();
      let buf = "", full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try { const d = JSON.parse(line.slice(6)); if (d.type==="chunk") full+=d.chunk; } catch {}
        }
      }
      if (full.includes("<") && full.length > 200) {
        const sections: PageSection[] = [...page.sections, { id: uid(), type: blockType, name: blockType.charAt(0).toUpperCase()+blockType.slice(1).replace(/-/g," ") }];
        setPageContent(page.id, full, sections);
        addGenLog(`✅ ${blockType} added`, "success");
      } else {
        addGenLog(`⚠️ Could not parse response`, "error");
      }
    } catch { addGenLog(`❌ Failed to add ${blockType}`, "error"); }
    finally { setAdding(null); }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Position picker */}
      {page && page.sections.length > 0 && (
        <div className="p-3 border-b border-white/[0.06] flex-shrink-0">
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-2">Insert position</p>
          <select
            value={typeof position==="number" ? `after-${position}` : position}
            onChange={e => {
              const v = e.target.value;
              if (v==="before-first" || v==="after-last") setPosition(v);
              else setPosition(parseInt(v.replace("after-","")));
            }}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white focus:outline-none appearance-none">
            <option value="before-first">⬆ At the top</option>
            {page.sections.map((s, i) => (
              <option key={s.id} value={`after-${i}`}>After · {s.name||s.type}</option>
            ))}
            <option value="after-last">⬇ At the bottom</option>
          </select>
        </div>
      )}

      {/* Category filter */}
      <div className="p-3 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex flex-wrap gap-1.5">
          {["all",...BLOCK_CATS].map((cat) => (
            <button key={cat} onClick={() => setActiveCat(cat)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium capitalize transition-colors ${activeCat===cat?"bg-brand-500/20 text-brand-300 border border-brand-500/30":"text-white/30 hover:text-white/60 bg-white/[0.03] border border-white/[0.06]"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {!page && (
        <div className="flex items-center justify-center flex-1 text-white/20 text-[12px] p-4 text-center">
          Select a page to add blocks
        </div>
      )}

      {page && (
        <div className="flex-1 overflow-auto p-3">
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((block) => (
              <button key={block.type} onClick={() => handleAddBlock(block.type)}
                disabled={!!adding}
                className="p-3 bg-white/[0.02] border border-white/[0.07] rounded-xl text-left hover:border-brand-500/35 hover:bg-brand-500/5 transition-all group disabled:opacity-40 disabled:cursor-not-allowed active:scale-95">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base leading-none text-white/30 group-hover:text-brand-400 transition-colors">{block.icon}</span>
                  {adding===block.type
                    ? <Loader2 size={9} className="spin text-brand-400"/>
                    : <span className="text-[9px] text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity">+ Add</span>}
                </div>
                <div className="text-[11px] text-white/55 group-hover:text-white/80 capitalize font-medium transition-colors">{block.label}</div>
                <div className="text-[9px] text-white/20 capitalize mt-0.5">{block.cat}</div>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-white/20 text-center mt-4">
            Blocks are AI-generated to match<br/>your brand and content style
          </p>
        </div>
      )}
    </div>
  );
}

const LC = "block text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-2";
const IC = "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-brand-500/40 transition-colors";
