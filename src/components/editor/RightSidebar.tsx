"use client";
import { useState, useRef, useEffect } from "react";
import { BLOCK_LIBRARY, BLOCK_CATS } from "@/lib/blocks/library";
import { buildBlockHtml, buildInlineHtml } from "@/lib/blocks/factory";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/utils";
import {
  Bot, SlidersHorizontal, LayoutGrid, Send, Loader2,
  X, Wand2, ImageIcon, Link, Layers, ChevronDown, ChevronUp, Sparkles,
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
      const el = document.querySelector('iframe[title^="Preview"]') as HTMLIFrameElement | null;
      if (el) iframeRef.current = el;
    }
    find();
    const obs = new MutationObserver(find);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  // Auto-switch to style when element selected
  useEffect(() => {
    if (selectedNode && rightPanelTab !== "style") setRightPanel("style");
  }, [selectedNode]); // eslint-disable-line

  const tabs = [
    { key: "style"  as const, icon: <Layers size={11}/>,     label: "Style"    },
    { key: "blocks" as const, icon: <LayoutGrid size={11}/>, label: "Elements" },
  ];

  return (
    <aside className="w-[280px] border-l border-white/[0.06] flex flex-col bg-[#09090c] h-full flex-shrink-0">
      <div className="flex border-b border-white/[0.06] flex-shrink-0">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setRightPanel(t.key)}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-[10.5px] font-semibold transition-colors border-b-2 ${
              rightPanelTab === t.key
                ? "text-white border-indigo-500"
                : "text-white/20 border-transparent hover:text-white/45"
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
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
  const addChatMessage   = useAppStore((s) => s.addChatMessage);
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
      <div className="flex-1 overflow-auto p-3 space-y-2 min-h-0">
        {deduped.length === 0 ? (
          <div className="py-5 text-center space-y-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto">
              <Sparkles size={15} className="text-white/25"/>
            </div>
            <p className="text-[11px] text-white/20">{page ? `AI for ${page.name}` : "Ask about your site"}</p>
            <div className="space-y-1.5 text-left">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="block w-full text-left px-3 py-2 text-[11px] text-white/35 bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.09] rounded-lg transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <button onClick={() => clearChat(currentProjectId ?? "")}
              className="flex items-center gap-1 text-[10px] text-white/16 hover:text-white/40 ml-auto transition-colors">
              <X size={9}/> Clear
            </button>
            {deduped.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] px-3 py-2 text-[12px] leading-relaxed rounded-2xl ${
                  m.role === "user"
                    ? "bg-indigo-600/22 text-white/82 rounded-br-sm"
                    : "bg-white/[0.04] text-white/60 rounded-bl-sm border border-white/[0.05]"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl rounded-bl-sm px-3 py-2">
                  <Loader2 size={12} className="text-indigo-400 animate-spin"/>
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </>
        )}
      </div>
      <div className="border-t border-white/[0.05] p-3 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask AI to improve your site…" rows={2}
            className="flex-1 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2 text-[12px] text-white/70 placeholder-white/14 focus:outline-none focus:border-indigo-500/25 resize-none transition-colors"/>
          <button onClick={() => send(input)} disabled={!input.trim() || loading}
            className="w-8 h-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 disabled:opacity-25 rounded-xl transition-colors flex-shrink-0">
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
      <div className="px-3 py-2.5 border-b border-white/[0.05] flex-shrink-0">
        <p className="text-[11px] font-medium text-white/40">{page.name}</p>
        <p className="text-[10px] text-white/18 mt-0.5">{page.sections.length} sections</p>
      </div>
      <div className="p-2 space-y-1">
        {page.sections.map((sec) => (
          <div key={sec.id} className="rounded-xl border border-white/[0.05] bg-white/[0.015] overflow-hidden">
            <button onClick={() => setOpen(open === sec.id ? null : sec.id)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/[0.025] transition-colors">
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
                        className="flex-1 bg-transparent text-[11px] text-white/70 placeholder-white/14 focus:outline-none min-w-0"/>
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
  const [adding, setAdding] = useState<string|null>(null);
  const [useAI,  setUseAI]  = useState(false);
  const insertBlock   = useAppStore((s) => s.insertBlock);
  const selectSection = useAppStore((s) => s.selectSection);
  const setPageContent= useAppStore((s) => s.setPageContent);
  const addGenLog     = useAppStore((s) => s.addGenLog);
  const selectedPageId= useAppStore((s) => s.editor.selectedPageId);
  const page = (project?.pages ?? []).find((p) => p.id === selectedPageId) ?? null;

  const dragBlockId    = useRef<string | null>(null);
  const dragOverlayRef = useRef<HTMLDivElement | null>(null);
  const dropLineRef    = useRef<HTMLDivElement | null>(null);
  const filtered = cat === "all" ? BLOCK_LIBRARY : BLOCK_LIBRARY.filter((b) => b.cat === cat);

  function getIframe() {
    return document.querySelector('iframe[title^="Preview"]') as HTMLIFrameElement | null;
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
        const midY = (r.top + sr.top + r.top + sr.bottom) / 2;
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

  function sendToIframe(type: string, html: string, sectionId?: string | null) {
    const iframe = getIframe();
    if (!iframe?.contentWindow) {
      // Fallback: use store
      insertBlock("");
      return;
    }
    iframe.contentWindow.postMessage({ target: "sitezy-iframe", type, html, sectionId: sectionId ?? null }, "*");
  }

  async function add(block: typeof BLOCK_LIBRARY[0], targetId?: string | null) {
    if (adding) return;
    setAdding(block.id);
    if (!useAI) {
      const html = block.placement === "inline"
        ? buildInlineHtml(block.id, project)
        : buildBlockHtml(block.id, project);

      switch (block.placement) {
        case "top":
          sendToIframe("insert-top", html);
          break;
        case "bottom":
          sendToIframe("insert-bottom", html);
          break;
        case "inline":
          sendToIframe("insert-in-section", html, targetId ?? null);
          break;
        case "section":
        default:
          sendToIframe("insert-after-section", html, targetId ?? null);
          break;
      }
      addGenLog(`✅ ${block.label} added`, "success");
      setAdding(null);
      return;
    }
    if (!page || !project.blueprint) { setAdding(null); return; }
    addGenLog(`🤖 Generating ${block.label}…`, "progress");
    try {
      const res = await fetch("/api/assist", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: `Generate a new ${block.label} section. Match the brand style. Return the complete updated page HTML with it added before the footer.`, context: { projectName: project.name, blueprint: project.blueprint, pageName: page.name, pageHtml: page.html } }) });
      if (!res.ok) throw new Error();
      const r = res.body?.getReader(); const d = new TextDecoder(); if (!r) throw new Error();
      let buf = "", full = "";
      while (true) { const { done, value } = await r.read(); if (done) break; buf += d.decode(value, { stream: true }); const ls = buf.split("\n"); buf = ls.pop() ?? ""; for (const l of ls) { if (!l.startsWith("data: ")) continue; try { const x = JSON.parse(l.slice(6)); if (x.type === "chunk") full += x.chunk; } catch {} } }
      if (full.includes("<") && full.length > 200) { setPageContent(page.id, full, [...page.sections, { id: uid(), type: block.id, name: block.label }]); addGenLog(`✅ ${block.label} added`, "success"); }
    } catch { addGenLog(`❌ Failed`, "error"); }
    finally { setAdding(null); }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2.5 border-b border-white/[0.05] flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-[11px] font-semibold text-white/50">{useAI ? "AI Elements" : "Quick Elements"}</p>
          <p className="text-[9px] text-white/20 mt-0.5">{useAI ? "Styled to match brand" : "Drag onto canvas or click to insert"}</p>
        </div>
        <button onClick={() => setUseAI(!useAI)}
          className={`relative w-9 h-5 rounded-full transition-colors ${useAI?"bg-indigo-600":"bg-white/[0.07]"}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${useAI?"translate-x-[18px]":"translate-x-0.5"}`}/>
        </button>
      </div>
      <div className="px-3 py-2 border-b border-white/[0.05] flex gap-1 flex-wrap flex-shrink-0">
        {[{key:"all",label:"All"},...BLOCK_CATS].map((c) => (
          <button key={c.key} onClick={() => setCat(c.key)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border ${
              cat===c.key
                ? "bg-indigo-500/16 text-indigo-300 border-indigo-500/20"
                : "text-white/22 border-white/[0.05] hover:text-white/50 hover:border-white/[0.09]"
            }`}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-2.5 grid grid-cols-2 gap-1.5 content-start">
        {filtered.map((b) => (
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
            className={`p-2.5 rounded-xl border border-white/[0.05] bg-white/[0.015] text-left hover:border-indigo-500/22 hover:bg-indigo-500/[0.04] transition-all group cursor-grab active:cursor-grabbing select-none ${adding===b.id?"opacity-35":""}`}
          >
            <span className="text-[15px] leading-none text-white/18 group-hover:text-indigo-400 transition-colors block mb-1.5">{b.icon}</span>
            <p className="text-[11px] text-white/50 font-semibold group-hover:text-white/75 transition-colors">{b.label}</p>
            <p className="text-[9px] text-white/18 mt-0.5 line-clamp-1">{b.preview}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
