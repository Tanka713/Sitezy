"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { BLOCK_LIBRARY, BLOCK_CATS } from "@/lib/blocks/library";
import { buildBlockHtml, buildInlineHtml, buildIconHtml } from "@/lib/blocks/factory";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/utils";
import { ICONS } from "@/lib/utils/iconLibrary";
import {
  Bot, SlidersHorizontal, LayoutGrid, Send, Loader2,
  X, Wand2, ImageIcon, Link, Layers, ChevronDown, ChevronUp, Sparkles, Search,
} from "lucide-react";
import { EditPanel } from "./EditPanel";
import type { Project, AIChatMessage, PageSection } from "@/types";

interface Props { project: Project; }

export function RightSidebar({ project }: Props) {
  const rightPanelTab = useAppStore((s) => s.editor.rightPanelTab);
  const selectedNode  = useAppStore((s) => s.editor.selectedNode);
  const setRightPanel = useAppStore((s) => s.setRightPanel);

  // Stable iframe ref via MutationObserver
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    function find() {
      const el = document.querySelector('iframe[data-sitezy-preview-frame="editor"]') as HTMLIFrameElement | null;
      if (el) iframeRef.current = el;
    }
    find();
    const obs = new MutationObserver(find);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  // Auto-switch to style when element selected (but not if user is intentionally on Elements panel)
  useEffect(() => {
    if (selectedNode && rightPanelTab === "ai") setRightPanel("style");
  }, [selectedNode]); // eslint-disable-line

  const tabs = [
    { key: "style"  as const, icon: <Layers size={11}/>,     label: "Style"    },
    { key: "blocks" as const, icon: <LayoutGrid size={11}/>, label: "Elements" },
    { key: "ai"     as const, icon: <Bot size={11}/>,        label: "AI"       },
  ];

  return (
    <aside className="editor-sidebar flex h-full w-[292px] flex-shrink-0 flex-col border-l border-white/[0.07]">
      <div className="border-b border-white/[0.06] px-3 py-3.5 flex-shrink-0">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/28">Inspector</p>
            <p className="mt-1 text-[11px] text-white/46">{selectedNode ? "Element selected" : "Canvas ready"}</p>
          </div>
          <span className="editor-chip rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em]">
            {rightPanelTab}
          </span>
        </div>
        <div className="editor-tablist flex items-center gap-1 rounded-[20px] p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setRightPanel(t.key)}
            data-active={rightPanelTab === t.key}
            className="editor-tab flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl px-2 text-[10.5px] font-semibold transition-all"
          >
            {t.icon} {t.label}
          </button>
        ))}
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {rightPanelTab === "style"      && <EditPanel iframeRef={iframeRef as React.RefObject<HTMLIFrameElement>} onClose={() => setRightPanel("ai")} project={project} />}
        {rightPanelTab === "ai"         && <AIPanel project={project} />}
        {rightPanelTab === "properties" && <PropsPanel project={project} />}
        {rightPanelTab === "blocks"     && <BlocksPanel project={project} />}
      </div>
    </aside>
  );
}

// ── AI Panel ──────────────────────────────────────────────────────────────────
function AIPanel({ project }: Props) {
  const selectedPageId   = useAppStore((s) => s.editor.selectedPageId);
  const aiChats          = useAppStore((s) => s.aiChats);
  const aiDraftPrompt    = useAppStore((s) => s.aiDraftPrompt);
  const addChatMessage   = useAppStore((s) => s.addChatMessage);
  const setAiDraftPrompt = useAppStore((s) => s.setAiDraftPrompt);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const clearChat        = useAppStore((s) => s.clearChat);
  const setApiError      = useAppStore((s) => s.setApiError);

  const pages    = project?.pages ?? [];
  const page     = pages.find((p) => p.id === selectedPageId) ?? null;
  const msgs: AIChatMessage[] = aiChats[currentProjectId ?? ""] ?? [];

  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => {
    if (!aiDraftPrompt) return;
    setAiDraftPrompt(null);
    send(aiDraftPrompt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiDraftPrompt]);

  const suggestions = page
    ? [`Improve ${page.name} copy`, "Make it more premium", "Stronger CTA", "Bolder headings", "Layout improvements"]
    : ["Improve hero copy", "Make it minimal", "Add a CTA", "Better tagline"];

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setInput(""); setLoading(true);
    const uid1 = uid();
    addChatMessage(currentProjectId ?? "", { id: uid1, role: "user", content: text, timestamp: Date.now(), pageId: selectedPageId ?? undefined });
    const aid = uid(); let full = "";
    try {
      const res = await fetch("/api/assist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: text, context: { projectName: project.name, blueprint: project.blueprint, pageName: page?.name, pageHtml: page?.html?.slice(0, 2000), siteType: project.brief?.siteType } }),
      });
      if (!res.ok) throw new Error("Failed");
      addChatMessage(currentProjectId ?? "", { id: aid, role: "assistant", content: "▌", timestamp: Date.now() });
      const reader = res.body?.getReader(); const dec = new TextDecoder();
      if (!reader) throw new Error();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(l.slice(6)) as { type: string; chunk?: string; error?: string; requestId?: string; code?: string };
            if (d.type === "chunk") { full += d.chunk; addChatMessage(currentProjectId ?? "", { id: aid, role: "assistant", content: full, timestamp: Date.now() }); }
            if (d.type === "error") {
              if (d.requestId || d.code) setApiError({ message: d.error ?? "AI error", requestId: d.requestId ?? null, code: d.code ?? "ERR_API" });
              addChatMessage(currentProjectId ?? "", { id: aid, role: "assistant", content: `⚠️ ${d.error ?? "Something went wrong"}`, timestamp: Date.now() });
            }
          } catch {}
        }
      }
    } catch (err) {
      addChatMessage(currentProjectId ?? "", { id: uid(), role: "assistant", content: `⚠️ ${err instanceof Error ? err.message : "Unknown error"}`, timestamp: Date.now() });
    } finally { setLoading(false); }
  }

  const deduped = msgs.reduce<AIChatMessage[]>((acc, m) => {
    const i = acc.findIndex((x) => x.id === m.id);
    if (i >= 0) { acc[i] = m; return acc; }
    return [...acc, m];
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="editor-scroll flex-1 overflow-auto p-3.5 space-y-2.5 min-h-0">
        {deduped.length === 0 ? (
          <div className="editor-panel-soft py-6 px-4 text-center space-y-3 rounded-[24px]">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(45,212,191,0.16),rgba(251,191,36,0.08))]">
              <Sparkles size={16} className="text-white/68"/>
            </div>
            <p className="text-[11px] text-white/42">{page ? `AI for ${page.name}` : "Ask about your site"}</p>
            <div className="space-y-1.5 text-left">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="block w-full rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5 text-left text-[11px] text-white/44 transition-all hover:border-white/[0.1] hover:bg-white/[0.05] hover:text-white/82">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <button onClick={() => clearChat(currentProjectId ?? "")}
              className="editor-action-btn ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] text-white/48">
              <X size={9}/> Clear
            </button>
            {deduped.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] px-3.5 py-2.5 text-[12px] leading-relaxed rounded-[22px] ${
                  m.role === "user"
                    ? "border border-teal-300/20 bg-[linear-gradient(180deg,rgba(45,212,191,0.24),rgba(13,148,136,0.16))] text-white rounded-br-md"
                    : "border border-white/[0.06] bg-white/[0.04] text-white/66 rounded-bl-md"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-[22px] rounded-bl-md border border-white/[0.06] bg-white/[0.04] px-3 py-2">
                  <Loader2 size={12} className="animate-spin text-teal-200"/>
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </>
        )}
      </div>
      <div className="border-t border-white/[0.05] p-3.5 flex-shrink-0">
        <div className="editor-panel-soft flex items-end gap-2 rounded-[22px] p-2">
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask AI to improve your site…" rows={2}
            className="editor-input flex-1 resize-none rounded-2xl px-3 py-2 text-[12px] text-white/80 focus:outline-none"/>
          <button onClick={() => send(input)} disabled={!input.trim() || loading}
            className="editor-action-btn-primary flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl disabled:opacity-25">
            {loading ? <Loader2 size={13} className="animate-spin"/> : <Send size={13}/>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Properties Panel ──────────────────────────────────────────────────────────
function PropsPanel({ project }: Props) {
  const selectedPageId = useAppStore((s) => s.editor.selectedPageId);
  const setPageContent = useAppStore((s) => s.setPageContent);
  const addGenLog      = useAppStore((s) => s.addGenLog);

  const page = (project?.pages ?? []).find((p) => p.id === selectedPageId) ?? null;
  const [open,    setOpen]    = useState<string | null>(null);
  const [applying,setApplying]= useState<string | null>(null);
  const [texts,   setTexts]   = useState<Record<string,string>>({});
  const [imgs,    setImgs]    = useState<Record<string,string>>({});

  useEffect(() => { setOpen(null); setTexts({}); setImgs({}); }, [selectedPageId]);

  async function applyEdit(secId: string, secType: string, instr: string) {
    if (!page || !project.blueprint || !instr.trim()) return;
    setApplying(secId);
    try {
      const res = await fetch("/api/assist", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: `Edit only the "${secType}" section. ${instr}. Return the complete updated page HTML.`, context: { projectName: project.name, blueprint: project.blueprint, pageName: page.name, pageHtml: page.html } }) });
      if (!res.ok) throw new Error();
      const r = res.body?.getReader(); const d = new TextDecoder(); if (!r) throw new Error();
      let buf = "", full = "";
      while (true) { const { done, value } = await r.read(); if (done) break; buf += d.decode(value, { stream: true }); const ls = buf.split("\n"); buf = ls.pop() ?? ""; for (const l of ls) { if (!l.startsWith("data: ")) continue; try { const x = JSON.parse(l.slice(6)); if (x.type === "chunk") full += x.chunk; } catch {} } }
      if (full.includes("<") && full.length > 100) { setPageContent(page.id, full, page.sections); addGenLog(`✅ ${secType} updated`, "success"); }
    } catch { addGenLog(`❌ Edit failed`, "error"); }
    finally { setApplying(null); }
  }

  async function applyImg(secId: string, secType: string, url: string) {
    if (!url.trim() || !page) return;
    const key = secId + "-img"; setApplying(key);
    try {
      const res = await fetch("/api/assist", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: `Replace the main image in "${secType}" with: ${url}. Return the complete updated page HTML.`, context: { projectName: project.name, blueprint: project.blueprint, pageName: page.name, pageHtml: page.html } }) });
      if (!res.ok) throw new Error();
      const r = res.body?.getReader(); const d = new TextDecoder(); if (!r) throw new Error();
      let buf = "", full = "";
      while (true) { const { done, value } = await r.read(); if (done) break; buf += d.decode(value, { stream: true }); const ls = buf.split("\n"); buf = ls.pop() ?? ""; for (const l of ls) { if (!l.startsWith("data: ")) continue; try { const x = JSON.parse(l.slice(6)); if (x.type === "chunk") full += x.chunk; } catch {} } }
      if (full.includes("<") && full.length > 100) setPageContent(page.id, full, page.sections);
    } catch {}
    finally { setApplying(null); }
  }

  if (!page) return (
    <div className="flex items-center justify-center h-full text-[11px] text-white/18 px-4 text-center">
      Select a page to edit sections.
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-4 py-3 border-b border-white/[0.05] flex-shrink-0 bg-white/[0.02]">
        <p className="text-[11px] font-medium text-white/40">{page.name}</p>
        <p className="text-[10px] text-white/18 mt-0.5">{page.sections.length} sections</p>
      </div>
      <div className="editor-scroll p-3 space-y-2">
        {page.sections.map((sec) => (
          <div key={sec.id} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <button onClick={() => setOpen(open === sec.id ? null : sec.id)}
              className="w-full flex items-center gap-2 px-3.5 py-3 text-left hover:bg-white/[0.04] transition-colors">
              <span className="text-[11px] text-white/50 font-medium flex-1 truncate">{sec.name || sec.type}</span>
              {open === sec.id ? <ChevronUp size={11} className="text-white/18 flex-shrink-0"/> : <ChevronDown size={11} className="text-white/18 flex-shrink-0"/>}
            </button>
            {open === sec.id && (
              <div className="border-t border-white/[0.04] p-3 space-y-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[9px] font-bold text-white/16 uppercase tracking-widest mb-1.5">
                    <Wand2 size={9}/> AI Edit
                  </label>
                  <div className="flex gap-1.5">
                    <input value={texts[sec.id]??""} onChange={(e)=>setTexts((u)=>({...u,[sec.id]:e.target.value}))}
                      onKeyDown={(e)=>{if(e.key==="Enter")applyEdit(sec.id,sec.type||sec.name,texts[sec.id]??"");}}
                      placeholder={`e.g. "make headline bolder"`}
                      className="flex-1 bg-black/18 border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-[11px] text-white/70 placeholder-white/14 focus:outline-none focus:border-indigo-500/25 min-w-0"/>
                    <button onClick={()=>applyEdit(sec.id,sec.type||sec.name,texts[sec.id]??"")}
                      disabled={!texts[sec.id]?.trim()||applying===sec.id}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-25 text-white text-[11px] font-medium rounded-lg transition-colors whitespace-nowrap">
                      {applying===sec.id?<Loader2 size={10} className="animate-spin inline"/>:"Apply"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[9px] font-bold text-white/16 uppercase tracking-widest mb-1.5">
                    <ImageIcon size={9}/> Image
                  </label>
                  <div className="flex gap-1.5">
                    <div className="flex-1 flex items-center gap-1.5 bg-black/18 border border-white/[0.07] rounded-lg px-2.5 py-1.5 min-w-0">
                      <Link size={9} className="text-white/18 flex-shrink-0"/>
                      <input value={imgs[sec.id]??""} onChange={(e)=>setImgs((u)=>({...u,[sec.id]:e.target.value}))}
                        placeholder="Paste image URL…"
                        className="editor-plain-input flex-1 bg-transparent text-[11px] text-white/70 placeholder-white/14 focus:outline-none min-w-0"/>
                    </div>
                    <button onClick={()=>applyImg(sec.id,sec.type,imgs[sec.id]??"")}
                      disabled={!imgs[sec.id]?.trim()||applying===sec.id+"-img"}
                      className="px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.07] text-white/45 hover:text-white text-[11px] rounded-lg disabled:opacity-25 transition-colors whitespace-nowrap">
                      {applying===sec.id+"-img"?<Loader2 size={10} className="animate-spin inline"/>:"Apply"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Blocks Panel ──────────────────────────────────────────────────────────────
function BlocksPanel({ project }: Props) {
  const [cat,    setCat]    = useState("all");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string|null>(null);
  const [aiStatus, setAiStatus] = useState<{ msg: string; type: "loading"|"success"|"error" } | null>(null);
  const [useAI,  setUseAI]  = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const insertBlock   = useAppStore((s) => s.insertBlock);
  const selectSection = useAppStore((s) => s.selectSection);
  const setPageContent= useAppStore((s) => s.setPageContent);
  const addGenLog     = useAppStore((s) => s.addGenLog);
  const selectedPageId= useAppStore((s) => s.editor.selectedPageId);
  const selectedSectionId = useAppStore((s) => s.editor.selectedSectionId);
  const selectedNode = useAppStore((s) => s.editor.selectedNode);
  const page = (project?.pages ?? []).find((p) => p.id === selectedPageId) ?? null;
  const selectedSection = page?.sections.find((sec) => sec.id === selectedSectionId) ?? null;

  const dragBlockId    = useRef<string | null>(null);
  const dragOverlayRef = useRef<HTMLDivElement | null>(null);
  const dropLineRef    = useRef<HTMLDivElement | null>(null);
  const categoryTabs = useMemo(
    () => BLOCK_CATS.filter((entry, index, all) => all.findIndex((item) => item.key === entry.key) === index),
    []
  );

  function blockScore(block: typeof BLOCK_LIBRARY[number]) {
    let score = 0;

    if (!selectedNode && !selectedSectionId) {
      if (block.placement === "section") score += 3;
      if (block.placement === "top" || block.placement === "bottom") score += 1;
    }

    if (selectedSectionId) {
      if (block.placement === "inline") score += 3;
      if (block.placement === "section") score += 1;
    }

    if (selectedNode?.isText || selectedNode?.isBtn) {
      if (block.placement === "inline") score += 4;
      if (["heading", "paragraph", "button", "button-outline", "badge", "blockquote", "divider"].includes(block.id)) score += 3;
    }

    if (selectedNode?.isImg || selectedNode?.isVideo || selectedNode?.isIframe) {
      if (block.cat === "media") score += 4;
      if (block.placement === "inline") score += 2;
    }

    if (selectedNode?.isInput || selectedNode?.tag === "form") {
      if (block.cat === "form") score += 5;
      if (block.placement === "inline") score += 2;
      if (block.placement === "section") score -= 1;
    }

    if (selectedNode && (block.placement === "top" || block.placement === "bottom")) score -= 1;
    return score;
  }

  function placementText(block: typeof BLOCK_LIBRARY[number]) {
    if (block.placement === "top") return "Top of page";
    if (block.placement === "bottom") return "Bottom of page";
    if (block.placement === "section") return selectedSection?.name ? `After ${selectedSection.name}` : "Next section";
    if (selectedNode?.isInput || selectedNode?.tag === "form") return "Current form";
    if (selectedNode?.label) return `Near ${selectedNode.label}`;
    if (selectedSection?.name) return `Inside ${selectedSection.name}`;
    return "Current page";
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return BLOCK_LIBRARY
      .filter((block) => cat === "all" || block.cat === cat)
      .filter((block) => {
        if (!query) return true;
        return (
          block.label.toLowerCase().includes(query) ||
          block.preview.toLowerCase().includes(query) ||
          block.id.toLowerCase().includes(query)
        );
      })
      .map((block) => ({ block, score: blockScore(block) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.block.label.localeCompare(b.block.label);
      });
  }, [cat, search, selectedNode, selectedSectionId, selectedSection?.name]);

  function getIframe() {
    return document.querySelector('iframe[data-sitezy-preview-frame="editor"]') as HTMLIFrameElement | null;
  }

  function getSections(iframe: HTMLIFrameElement): HTMLElement[] {
    const doc = iframe.contentDocument;
    if (!doc) return [];
    return Array.from(doc.body.children).filter(
      (el) => !["SCRIPT","STYLE","NOSCRIPT"].includes(el.tagName)
    ) as HTMLElement[];
  }

  // Show an overlay that detects section boundaries (for "section" placement blocks).
  // Calls onDrop(afterSectionId) where null = before first / before footer.
  function showSectionOverlay(onDrop: (afterSectionId: string | null) => void) {
    const iframe = getIframe();
    if (!iframe) { onDrop(null); return; }
    const r = iframe.getBoundingClientRect();

    const line = document.createElement("div");
    line.style.cssText = `position:fixed;left:${r.left}px;width:${r.width}px;height:3px;background:#4f7eff;border-radius:2px;z-index:100000;display:none;pointer-events:none;box-shadow:0 0 8px rgba(79,126,255,.55);`;
    document.body.appendChild(line);
    dropLineRef.current = line;

    let afterSectionId: string | null = null;

    const overlay = document.createElement("div");
    overlay.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:99999;background:transparent;border:2px dashed rgba(79,126,255,.4);box-sizing:border-box;pointer-events:all;`;

    overlay.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      const sections = getSections(iframe);
      if (!sections.length) { afterSectionId = null; line.style.display = "none"; return; }
      const mouseY = e.clientY;
      let placed = false;
      for (let i = 0; i < sections.length; i++) {
        const sr = sections[i].getBoundingClientRect();
        const midY = r.top + (sr.top + sr.bottom) / 2;
        if (mouseY < midY) {
          afterSectionId = i > 0 ? (sections[i-1].getAttribute("data-sz-section-id") ?? null) : null;
          line.style.top = `${r.top + sr.top}px`;
          line.style.display = "";
          placed = true;
          break;
        }
      }
      if (!placed) {
        const last = sections[sections.length-1];
        afterSectionId = last.getAttribute("data-sz-section-id") ?? null;
        line.style.top = `${r.top + last.getBoundingClientRect().bottom}px`;
        line.style.display = "";
      }
    });
    overlay.addEventListener("dragleave", () => { line.style.display = "none"; });
    overlay.addEventListener("drop", (e) => { e.preventDefault(); onDrop(afterSectionId); hideDropOverlay(); });
    document.body.appendChild(overlay);
    dragOverlayRef.current = overlay;
  }

  // Show an overlay that highlights the hovered section (for "inline" placement blocks).
  // Calls onDrop(sectionId) with the section the mouse was over.
  function showInlineOverlay(onDrop: (sectionId: string | null) => void) {
    const iframe = getIframe();
    if (!iframe) { onDrop(null); return; }
    const r = iframe.getBoundingClientRect();

    const highlight = document.createElement("div");
    highlight.style.cssText = `position:fixed;background:rgba(79,126,255,.10);border:2px solid rgba(79,126,255,.5);border-radius:4px;z-index:100000;pointer-events:none;display:none;transition:top .08s,height .08s;`;
    document.body.appendChild(highlight);
    dropLineRef.current = highlight;

    let hoveredSectionId: string | null = null;

    const overlay = document.createElement("div");
    overlay.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:99999;background:transparent;border:2px dashed rgba(79,126,255,.4);box-sizing:border-box;pointer-events:all;`;

    overlay.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      const sections = getSections(iframe);
      const mouseY = e.clientY;
      for (const sec of sections) {
        const sr = sec.getBoundingClientRect();
        if (mouseY >= r.top + sr.top && mouseY <= r.top + sr.bottom) {
          hoveredSectionId = sec.getAttribute("data-sz-section-id") ?? null;
          highlight.style.left = `${r.left}px`;
          highlight.style.top = `${r.top + sr.top}px`;
          highlight.style.width = `${r.width}px`;
          highlight.style.height = `${sr.height}px`;
          highlight.style.display = "";
          return;
        }
      }
      hoveredSectionId = null;
      highlight.style.display = "none";
    });
    overlay.addEventListener("dragleave", () => { highlight.style.display = "none"; });
    overlay.addEventListener("drop", (e) => { e.preventDefault(); onDrop(hoveredSectionId); hideDropOverlay(); });
    document.body.appendChild(overlay);
    dragOverlayRef.current = overlay;
  }

  // Simple overlay for top/bottom blocks — any drop calls onDrop(null).
  function showSimpleOverlay(onDrop: () => void) {
    const iframe = getIframe();
    if (!iframe) { onDrop(); return; }
    const r = iframe.getBoundingClientRect();
    const overlay = document.createElement("div");
    overlay.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:99999;background:rgba(79,126,255,.06);border:2px dashed rgba(79,126,255,.4);box-sizing:border-box;pointer-events:all;`;
    overlay.addEventListener("dragover", (e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"; });
    overlay.addEventListener("drop", (e) => { e.preventDefault(); onDrop(); hideDropOverlay(); });
    document.body.appendChild(overlay);
    dragOverlayRef.current = overlay;
  }

  function hideDropOverlay() {
    dropLineRef.current?.remove();
    dropLineRef.current = null;
    dragOverlayRef.current?.remove();
    dragOverlayRef.current = null;
  }

  function sendToIframe(type: string, html: string, sectionId?: string | null, extra?: Record<string, unknown>) {
    const iframe = getIframe();
    if (!iframe?.contentWindow) {
      insertBlock((extra?.blockId as string) ?? "");
      return;
    }
    iframe.contentWindow.postMessage({ target: "sitezy-iframe", type, html, sectionId: sectionId ?? null, ...(extra ?? {}) }, "*");
  }

  function addIcon(icon: typeof ICONS[number], targetId?: string | null) {
    const html = buildIconHtml(icon.name, icon.paths, project);
    sendToIframe("insert-smart", html, targetId ?? selectedSectionId ?? selectedNode?.sectionId ?? null, {
      blockId: "icon-" + icon.id,
      placement: "inline",
      nodeId: selectedNode?.nodeId ?? null,
    });
  }

  async function add(block: typeof BLOCK_LIBRARY[0], targetId?: string | null) {
    if (adding) return;
    setAdding(block.id);
    if (!useAI) {
      const html = block.placement === "inline"
        ? buildInlineHtml(block.id, project, page)
        : buildBlockHtml(block.id, project);

      if (targetId === undefined) {
        sendToIframe("insert-smart", html, selectedSectionId ?? selectedNode?.sectionId ?? null, {
          blockId: block.id,
          placement: block.placement,
          nodeId: selectedNode?.nodeId ?? null,
        });
      } else {
        switch (block.placement) {
          case "top":
            sendToIframe("insert-top", html, null, { blockId: block.id });
            break;
          case "bottom":
            sendToIframe("insert-bottom", html, null, { blockId: block.id });
            break;
          case "inline":
            sendToIframe("insert-in-section", html, targetId ?? null, { blockId: block.id });
            break;
          case "section":
          default:
            sendToIframe("insert-after-section", html, targetId ?? null, { blockId: block.id });
            break;
        }
      }
      addGenLog(`✅ ${block.label} added`, "success");
      setAdding(null);
      return;
    }
    if (!page) { setAdding(null); setAiStatus({ msg: "No page selected.", type: "error" }); setTimeout(() => setAiStatus(null), 3000); return; }
    if (!project.blueprint) { setAdding(null); setAiStatus({ msg: "Project blueprint missing — regenerate the site first.", type: "error" }); setTimeout(() => setAiStatus(null), 4000); return; }
    setAiStatus({ msg: `Generating ${block.label}…`, type: "loading" });
    addGenLog(`🤖 Generating ${block.label}…`, "progress");
    try {
      // ── Determine insertion context ──────────────────────────────────────────
      const existingSections = page.sections.map((s) => s.name);
      let previousSectionName: string | null = null;
      let nextSectionName: string | null = null;
      let afterSectionId: string | null = null;
      let targetSectionId: string | null = null;

      if (block.placement === "section") {
        // targetId (from drag-drop) takes priority
        if (targetId !== undefined && targetId !== null) {
          afterSectionId = targetId;
          const afterIdx = page.sections.findIndex((s) => s.id === targetId);
          if (afterIdx >= 0) {
            previousSectionName = page.sections[afterIdx].name;
            nextSectionName = page.sections[afterIdx + 1]?.name ?? null;
          }
        } else if (selectedSectionId) {
          afterSectionId = selectedSectionId;
          const afterIdx = page.sections.findIndex((s) => s.id === selectedSectionId);
          if (afterIdx >= 0) {
            previousSectionName = page.sections[afterIdx].name;
            nextSectionName = page.sections[afterIdx + 1]?.name ?? null;
          }
        } else {
          // Default: insert before footer / last section
          const footerIdx = page.sections.findIndex((s) =>
            s.type === "footer" || s.name.toLowerCase().includes("footer")
          );
          const beforeIdx = footerIdx > 0 ? footerIdx - 1 : page.sections.length - 1;
          if (beforeIdx >= 0) {
            afterSectionId = page.sections[beforeIdx].id;
            previousSectionName = page.sections[beforeIdx].name;
            nextSectionName = page.sections[beforeIdx + 1]?.name ?? null;
          }
        }
      } else if (block.placement === "inline") {
        targetSectionId = targetId ?? selectedSectionId ?? selectedNode?.sectionId ?? null;
        if (selectedSection) {
          previousSectionName = selectedSection.name;
          const selIdx = page.sections.findIndex((s) => s.id === selectedSectionId);
          nextSectionName = selIdx >= 0 ? (page.sections[selIdx + 1]?.name ?? null) : null;
        }
      }

      // ── Call the dedicated insert-block API ──────────────────────────────────
      const res = await fetch("/api/insert-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: project.blueprint,
          brief: project.brief,
          page: { name: page.name, purpose: page.purpose || page.name },
          block: { type: block.id, label: block.label, placement: block.placement },
          context: {
            existingSections,
            previousSectionName,
            nextSectionName,
            selectedSectionName: selectedSection?.name ?? null,
            selectedNodeLabel: selectedNode?.label ?? null,
          },
        }),
      });

      if (!res.ok) {
        let errorCode: string | null = null;
        try {
          const errJson = await res.json() as { errorCode?: string; message?: string };
          errorCode = errJson.errorCode ?? null;
          throw new Error(errJson.message ?? `Server error ${res.status}${errorCode ? ` [${errorCode}]` : ""}`);
        } catch (parseErr) {
          if (parseErr instanceof SyntaxError) throw new Error(`Server error ${res.status}`);
          throw parseErr;
        }
      }

      const data = await res.json() as { html?: string };
      const newBlockHtml = data.html ?? "";

      if (!newBlockHtml || !newBlockHtml.includes("<")) {
        throw new Error("AI returned unexpected content — try again");
      }

      // ── Insert HTML into the iframe ──────────────────────────────────────────
      if (block.placement === "section") {
        sendToIframe("insert-after-section", newBlockHtml, afterSectionId, { blockId: block.id });
      } else if (block.placement === "inline") {
        sendToIframe("insert-in-section", newBlockHtml, targetSectionId, { blockId: block.id });
      } else if (block.placement === "top") {
        sendToIframe("insert-top", newBlockHtml, null, { blockId: block.id });
      } else {
        sendToIframe("insert-bottom", newBlockHtml, null, { blockId: block.id });
      }

      // ── Append to page sections in state ─────────────────────────────────────
      setPageContent(page.id, page.html, [...page.sections, { id: uid(), type: block.id, name: block.label }]);

      addGenLog(`✅ ${block.label} added`, "success");
      setAiStatus({ msg: `${block.label} added!`, type: "success" });
      setTimeout(() => setAiStatus(null), 2500);
    } catch(err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      addGenLog(`❌ ${msg}`, "error");
      setAiStatus({ msg, type: "error" });
      setTimeout(() => setAiStatus(null), 4000);
    }
    finally { setAdding(null); }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-4 border-b border-white/[0.05] flex-shrink-0 space-y-3.5 bg-white/[0.02]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-white/78">{useAI ? "AI Elements" : "Elements"}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{useAI ? "Brand-matched blocks with smarter placement" : "Context-aware inserts for the current selection"}</p>
          </div>
          <button
            onClick={() => setUseAI(!useAI)}
            data-active={useAI}
            data-size="md"
            className="editor-switch overflow-hidden"
            title={useAI ? "AI insert on" : "AI insert off"}
          >
            <span className="editor-switch-thumb" />
          </button>
        </div>

        <div className="editor-panel-soft flex items-center gap-2 rounded-[18px] px-3 py-2.5">
          <Search size={12} className="text-white/20 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search elements…"
            className="editor-plain-input w-full bg-transparent text-[11px] text-white/72 placeholder-white/16 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-white/20 hover:text-white/55 transition-colors">
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="px-4 py-3 border-b border-white/[0.05] flex gap-1.5 flex-wrap flex-shrink-0 bg-white/[0.02]">
        {categoryTabs.map((c) => (
          <button key={c.key} onClick={() => setCat(c.key)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border ${
              cat===c.key
                ? "bg-teal-400/12 text-teal-100 border-teal-300/18"
                : "text-white/32 border-white/[0.05] hover:text-white/62 hover:border-white/[0.1]"
            }`}>
            {c.label}
          </button>
        ))}
        {/* Icons tab — special, not in BLOCK_CATS */}
        <button onClick={() => setCat("icons")}
          className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border ${
            cat==="icons"
              ? "bg-teal-400/12 text-teal-100 border-teal-300/18"
              : "text-white/32 border-white/[0.05] hover:text-white/62 hover:border-white/[0.1]"
          }`}>
          Icons
        </button>
      </div>
      {/* AI status banner */}
      {aiStatus && (
        <div className={`mx-3 mt-3 mb-0 px-3 py-2.5 rounded-2xl flex items-center gap-2 text-[11px] font-medium border flex-shrink-0 ${
          aiStatus.type === "loading" ? "bg-teal-400/10 border-teal-300/22 text-teal-100" :
          aiStatus.type === "success" ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300" :
          "bg-red-500/10 border-red-500/25 text-red-300"
        }`}>
          {aiStatus.type === "loading" && <Loader2 size={11} className="animate-spin flex-shrink-0" />}
          {aiStatus.type === "success" && <span className="flex-shrink-0">✓</span>}
          {aiStatus.type === "error"   && <span className="flex-shrink-0">✕</span>}
          <span className="truncate">{aiStatus.msg}</span>
        </div>
      )}
      {/* ── Icon picker ──────────────────────────────────────────────────────── */}
      {cat === "icons" && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 pt-3 pb-1.5 flex-shrink-0">
            <div className="editor-panel-soft flex items-center gap-2 rounded-[18px] px-2.5 py-2">
              <Search size={11} className="text-white/20 flex-shrink-0" />
              <input value={iconSearch} onChange={(e) => setIconSearch(e.target.value)}
                placeholder="Search icons…"
                className="editor-plain-input w-full bg-transparent text-[11px] text-white/65 placeholder-white/16 focus:outline-none" />
              {iconSearch && <button onClick={() => setIconSearch("")} className="text-white/20 hover:text-white/55"><X size={11}/></button>}
            </div>
          </div>
          <p className="px-4 pt-1.5 pb-1 text-[9.5px] text-white/24 flex-shrink-0">
            Click or drag an icon anywhere on the canvas
          </p>
          <div className="editor-scroll flex-1 overflow-auto p-3 grid grid-cols-5 gap-1.5 content-start">
            {ICONS.filter(ic => !iconSearch || ic.name.toLowerCase().includes(iconSearch.toLowerCase()) || ic.id.includes(iconSearch.toLowerCase())).map((icon) => (
              <button
                key={icon.id}
                title={icon.name}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "copy";
                  e.dataTransfer.setData("text/plain", "icon:" + icon.id);
                  setTimeout(() => showInlineOverlay((sectionId) => addIcon(icon, sectionId)), 0);
                }}
                onDragEnd={() => hideDropOverlay()}
                onClick={() => addIcon(icon)}
                className="group flex cursor-grab flex-col items-center gap-1 rounded-xl border border-white/[0.05] bg-white/[0.02] p-2 transition-all active:cursor-grabbing hover:border-teal-300/18 hover:bg-teal-400/[0.06]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
                  className="w-5 h-5 text-white/35 group-hover:text-teal-100 transition-colors flex-shrink-0"
                  dangerouslySetInnerHTML={{ __html: icon.paths }}></svg>
                <span className="text-[8.5px] text-white/22 group-hover:text-white/45 transition-colors text-center leading-tight truncate w-full">{icon.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Blocks list ──────────────────────────────────────────────────────── */}
      {cat !== "icons" && (
      <div className="editor-scroll flex-1 overflow-auto p-4 grid grid-cols-1 gap-3 content-start">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] px-3 py-4 text-center">
            <p className="text-[11px] text-white/45">No elements found</p>
            <p className="text-[10px] text-white/20 mt-1">Try a different search or category.</p>
          </div>
        )}
        {filtered.map(({ block: b, score }) => (
          <div
            key={b.id}
            draggable
            onDragStart={(e) => {
              dragBlockId.current = b.id;
              e.dataTransfer.effectAllowed = "copy";
              e.dataTransfer.setData("text/plain", b.id);
              // Show placement-aware overlay after a tick so drag image renders first
              setTimeout(() => {
                if (b.placement === "top" || b.placement === "bottom") {
                  showSimpleOverlay(() => add({ ...b }));
                } else if (b.placement === "inline") {
                  showInlineOverlay((sectionId) => add({ ...b }, sectionId));
                } else {
                  showSectionOverlay((afterId) => add({ ...b }, afterId));
                }
              }, 0);
            }}
            onDragEnd={() => {
              hideDropOverlay();
              dragBlockId.current = null;
            }}
            onClick={() => add(b)}
            className={`group cursor-grab select-none rounded-[24px] border bg-white/[0.02] p-4 text-left transition-all active:cursor-grabbing hover:border-teal-300/18 hover:bg-teal-400/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${
              score >= 4 ? "border-teal-300/14" : "border-white/[0.05]"
            } ${adding===b.id?"opacity-35":""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="mt-0.5 text-[15px] leading-none text-white/20 transition-colors group-hover:text-teal-100">{b.icon}</span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-white/66 transition-colors group-hover:text-white/86">{b.label}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] text-white/24">{b.preview}</p>
                </div>
              </div>
              {score >= 4 && (
                <span className="flex-shrink-0 rounded-full border border-teal-300/18 bg-teal-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-teal-100">
                  Smart
                </span>
              )}
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className="text-[9px] text-white/24 truncate">{placementText(b)}</span>
              <span className="px-1.5 py-0.5 rounded-md text-[8px] font-medium uppercase tracking-[0.12em] text-white/28 bg-white/[0.04] border border-white/[0.05] flex-shrink-0">
                {b.placement}
              </span>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
