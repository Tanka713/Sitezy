"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  BLOCK_DEFINITIONS,
  compareElementCategories,
  EDITOR_INSERTION_CATEGORIES,
  ICON_DEFINITIONS,
  getElementCategoryDefinition,
  getBlockDefinition,
  renderEditorElementHtml,
  type BlockElementDefinition,
  type ElementCategoryKey,
  type IconElementDefinition,
  type InsertionCategory,
} from "@/lib/blocks/registry";
import { useAppStore } from "@/lib/store";
import {
  API_GENERATE_001,
  API_RESPONSE_001,
  API_UNKNOWN_001,
  createAppError,
  logAppError,
  normalizeError,
  type ErrorCode,
} from "@/lib/errors";
import { uid, extractNavbarHtml } from "@/lib/utils";
import {
  LayoutGrid, Send, Loader2,
  X, Wand2, ImageIcon, Link, ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";
import { EditorSwitch } from "./EditorSwitch";
import { EditPanel } from "./EditPanel";
import type { Project, AIChatMessage } from "@/types";

function getRequestId(error: unknown): string | null {
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

function buildClientApiError(error: unknown, fallbackCode: ErrorCode, metadata?: Record<string, unknown>) {
  const requestId = getRequestId(error);
  const appErr = normalizeError(error, fallbackCode, {
    ...metadata,
    ...(requestId ? { requestId } : {}),
  });

  return {
    appErr,
    apiError: {
      message: appErr.userMessage,
      requestId,
      code: appErr.code,
    },
  };
}

interface Props { project: Project; }

export function RightSidebar({ project }: Props) {
  const rightPanelTab = useAppStore((s) => s.editor.rightPanelTab);
  const selectedNode  = useAppStore((s) => s.editor.selectedNode);
  const setRightPanel = useAppStore((s) => s.setRightPanel);
  const previousSelectedNodeIdRef = useRef<string | null>(null);

  // Stable iframe ref via MutationObserver
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    function find() {
      const el = document.querySelector('iframe[data-sitezy-preview-frame="1"]') as HTMLIFrameElement | null;
      if (el) iframeRef.current = el;
    }
    find();
    const obs = new MutationObserver(find);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  // New selection can hand off to the inspector, but do not lock the user there.
  useEffect(() => {
    const nextId = selectedNode?.nodeId ?? null;
    const prevId = previousSelectedNodeIdRef.current;
    previousSelectedNodeIdRef.current = nextId;

    if (!nextId || nextId === prevId) return;
    if (rightPanelTab === "style" || rightPanelTab === "properties") return;
    setRightPanel("style");
  }, [selectedNode?.nodeId, rightPanelTab, setRightPanel]);

  const tabs = [
    { key: "style"  as const, label: "Style" },
    { key: "blocks" as const, label: "Blocks" },
    { key: "ai"     as const, label: "AI" },
  ];

  const tabMeta: Record<typeof rightPanelTab, { title: string; subtitle: string }> = {
    style: {
      title: "Inspector",
      subtitle: selectedNode ? "Style and settings for the current selection." : "Select something on the canvas to start editing.",
    },
    blocks: {
      title: "Elements",
      subtitle: "Insert layout, content, media, and interaction blocks into the current page.",
    },
    ai: {
      title: "AI assistant",
      subtitle: "Generate refinements, copy changes, and structural ideas without leaving the editor.",
    },
    properties: {
      title: "Properties",
      subtitle: "Inspect configuration and metadata for the current selection.",
    },
  };

  return (
    <aside className="sz-editor-dock flex h-full w-full flex-col overflow-hidden rounded-[26px]">
      <div className="sz-editor-dock-header flex flex-shrink-0 flex-col gap-3 px-4 pb-3 pt-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/24">{tabMeta[rightPanelTab].title}</p>
          <p className="mt-1 text-[11px] leading-5 text-[var(--text-tertiary)] whitespace-normal break-words">
            {tabMeta[rightPanelTab].subtitle}
          </p>
        </div>

        <div className="sz-editor-dock-switcher grid grid-cols-3 gap-1 rounded-[16px] p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setRightPanel(t.key)}
              className={`flex min-h-[38px] items-center justify-center rounded-[12px] px-2.5 text-center transition-all ${
                rightPanelTab === t.key
                  ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                  : "text-white/36 hover:bg-white/[0.05] hover:text-white/72"
              }`}
            >
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-4">
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; code?: string; requestId?: string | null };
        throw createAppError({
          code: (data.code as ErrorCode | undefined) ?? API_UNKNOWN_001,
          devMessage: `AI assist request failed (${res.status}): ${data.error ?? "unknown error"}`,
          userMessage: data.error,
          severity: res.status >= 500 ? "error" : "warn",
          metadata: { pageId: page?.id ?? null, pageName: page?.name ?? null, requestId: data.requestId ?? null, status: res.status },
        });
      }
      addChatMessage(currentProjectId ?? "", { id: aid, role: "assistant", content: "▌", timestamp: Date.now() });
      const reader = res.body?.getReader(); const dec = new TextDecoder();
      if (!reader) {
        throw createAppError({
          code: API_RESPONSE_001,
          devMessage: "AI assist response body was missing a stream reader",
          severity: "error",
          metadata: { pageId: page?.id ?? null, pageName: page?.name ?? null },
        });
      }
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
              if (d.requestId || d.code) setApiError({ message: d.error ?? "AI error", requestId: d.requestId ?? null, code: d.code ?? API_UNKNOWN_001 });
              addChatMessage(currentProjectId ?? "", { id: aid, role: "assistant", content: `⚠️ ${d.error ?? "Something went wrong"}`, timestamp: Date.now() });
            }
          } catch {}
        }
      }
    } catch (err) {
      const { appErr, apiError } = buildClientApiError(err, API_UNKNOWN_001, {
        pageId: page?.id ?? null,
        pageName: page?.name ?? null,
      });
      logAppError(appErr);
      setApiError(apiError);
      addChatMessage(currentProjectId ?? "", { id: uid(), role: "assistant", content: `⚠️ ${appErr.userMessage}`, timestamp: Date.now() });
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
                    ? "bg-accent-600/22 text-white/82 rounded-br-sm"
                    : "bg-white/[0.04] text-white/60 rounded-bl-sm border border-white/[0.05]"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl rounded-bl-sm px-3 py-2">
                  <Loader2 size={12} className="text-accent-400 animate-spin"/>
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
            className="flex-1 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2 text-[12px] text-white/70 placeholder-white/14 focus:outline-none focus:border-accent-500/25 resize-none transition-colors"/>
          <button onClick={() => send(input)} disabled={!input.trim() || loading}
            className="w-8 h-8 flex items-center justify-center bg-accent-600 hover:bg-accent-500 disabled:opacity-25 rounded-xl transition-colors flex-shrink-0">
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
  const setApiError    = useAppStore((s) => s.setApiError);

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
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; code?: string; requestId?: string | null };
        throw createAppError({
          code: (data.code as ErrorCode | undefined) ?? API_UNKNOWN_001,
          devMessage: `Section edit failed for ${secType} (${res.status}): ${data.error ?? "unknown error"}`,
          userMessage: data.error,
          severity: res.status >= 500 ? "error" : "warn",
          metadata: { pageId: page.id, pageName: page.name, sectionId: secId, sectionType: secType, requestId: data.requestId ?? null, status: res.status },
        });
      }
      const r = res.body?.getReader(); const d = new TextDecoder(); if (!r) {
        throw createAppError({
          code: API_RESPONSE_001,
          devMessage: `Section edit response for ${secType} had no readable stream`,
          severity: "error",
          metadata: { pageId: page.id, pageName: page.name, sectionId: secId, sectionType: secType },
        });
      }
      let buf = "", full = "";
      while (true) { const { done, value } = await r.read(); if (done) break; buf += d.decode(value, { stream: true }); const ls = buf.split("\n"); buf = ls.pop() ?? ""; for (const l of ls) { if (!l.startsWith("data: ")) continue; try { const x = JSON.parse(l.slice(6)); if (x.type === "chunk") full += x.chunk; } catch {} } }
      if (full.includes("<") && full.length > 100) { setPageContent(page.id, full, page.sections); addGenLog(`✅ ${secType} updated`, "success"); }
    } catch (error) {
      const { appErr, apiError } = buildClientApiError(error, API_UNKNOWN_001, {
        pageId: page.id,
        pageName: page.name,
        sectionId: secId,
        sectionType: secType,
      });
      logAppError(appErr);
      setApiError(apiError);
      addGenLog(`❌ ${appErr.userMessage}`, "error");
    }
    finally { setApplying(null); }
  }

  async function applyImg(secId: string, secType: string, url: string) {
    if (!url.trim() || !page) return;
    const key = secId + "-img"; setApplying(key);
    try {
      const res = await fetch("/api/assist", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: `Replace the main image in "${secType}" with: ${url}. Return the complete updated page HTML.`, context: { projectName: project.name, blueprint: project.blueprint, pageName: page.name, pageHtml: page.html } }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; code?: string; requestId?: string | null };
        throw createAppError({
          code: (data.code as ErrorCode | undefined) ?? API_UNKNOWN_001,
          devMessage: `Image replacement failed for ${secType} (${res.status}): ${data.error ?? "unknown error"}`,
          userMessage: data.error,
          severity: res.status >= 500 ? "error" : "warn",
          metadata: { pageId: page.id, pageName: page.name, sectionId: secId, sectionType: secType, requestId: data.requestId ?? null, status: res.status },
        });
      }
      const r = res.body?.getReader(); const d = new TextDecoder(); if (!r) {
        throw createAppError({
          code: API_RESPONSE_001,
          devMessage: `Image replacement response for ${secType} had no readable stream`,
          severity: "error",
          metadata: { pageId: page.id, pageName: page.name, sectionId: secId, sectionType: secType },
        });
      }
      let buf = "", full = "";
      while (true) { const { done, value } = await r.read(); if (done) break; buf += d.decode(value, { stream: true }); const ls = buf.split("\n"); buf = ls.pop() ?? ""; for (const l of ls) { if (!l.startsWith("data: ")) continue; try { const x = JSON.parse(l.slice(6)); if (x.type === "chunk") full += x.chunk; } catch {} } }
      if (full.includes("<") && full.length > 100) setPageContent(page.id, full, page.sections);
    } catch (error) {
      const { appErr, apiError } = buildClientApiError(error, API_UNKNOWN_001, {
        pageId: page.id,
        pageName: page.name,
        sectionId: secId,
        sectionType: secType,
      });
      logAppError(appErr);
      setApiError(apiError);
      addGenLog(`❌ ${appErr.userMessage}`, "error");
    }
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
                      className="flex-1 bg-black/18 border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-[11px] text-white/70 placeholder-white/14 focus:outline-none focus:border-accent-500/25 min-w-0"/>
                    <button onClick={()=>applyEdit(sec.id,sec.type||sec.name,texts[sec.id]??"")}
                      disabled={!texts[sec.id]?.trim()||applying===sec.id}
                      className="px-3 py-1.5 bg-accent-600 hover:bg-accent-500 disabled:opacity-25 text-white text-[11px] font-medium rounded-lg transition-colors whitespace-nowrap">
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
  const [cat,    setCat]    = useState<"all" | ElementCategoryKey>("all");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string|null>(null);
  const [aiStatus, setAiStatus] = useState<{ msg: string; type: "loading"|"success"|"error" } | null>(null);
  const [useAI,  setUseAI]  = useState(false);
  const insertBlock   = useAppStore((s) => s.insertBlock);
  const setPageContent= useAppStore((s) => s.setPageContent);
  const addGenLog     = useAppStore((s) => s.addGenLog);
  const setApiError   = useAppStore((s) => s.setApiError);
  const selectedPageId= useAppStore((s) => s.editor.selectedPageId);
  const selectedSectionId = useAppStore((s) => s.editor.selectedSectionId);
  const selectedNode = useAppStore((s) => s.editor.selectedNode);
  const page = (project?.pages ?? []).find((p) => p.id === selectedPageId) ?? null;
  const selectedSection = page?.sections.find((sec) => sec.id === selectedSectionId) ?? null;
  const searchQuery = search.trim().toLowerCase();

  const dragOverlayRef = useRef<HTMLDivElement | null>(null);
  const dropLineRef    = useRef<HTMLDivElement | null>(null);
  const dropHintRef    = useRef<HTMLDivElement | null>(null);
  const categoryTabs = useMemo(() => EDITOR_INSERTION_CATEGORIES, []);
  const primaryCategoryOrder = useMemo(() => ["all", "sections", "layout", "basic", "media"] as const, []);
  const secondaryCategoryOrder = useMemo(() => ["navigation", "typography", "interactive", "forms", "advanced", "icons"] as const, []);
  const primaryCategoryTabs = useMemo(
    () => primaryCategoryOrder
      .map((key) => categoryTabs.find((tab) => tab.key === key))
      .filter((tab): tab is InsertionCategory => !!tab),
    [categoryTabs, primaryCategoryOrder]
  );
  const secondaryCategoryTabs = useMemo(
    () => secondaryCategoryOrder
      .map((key) => categoryTabs.find((tab) => tab.key === key))
      .filter((tab): tab is InsertionCategory => !!tab),
    [categoryTabs, secondaryCategoryOrder]
  );

  function blockScore(block: BlockElementDefinition) {
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
      if (block.category === "media") score += 4;
      if (block.placement === "inline") score += 2;
    }

    if (selectedNode?.isInput || selectedNode?.tag === "form") {
      if (block.category === "forms") score += 5;
      if (block.placement === "inline") score += 2;
      if (block.placement === "section") score -= 1;
    }

    if (selectedNode && (block.placement === "top" || block.placement === "bottom")) score -= 1;
    return score;
  }

  function placementText(block: BlockElementDefinition) {
    if (block.placement === "top") return "Top of page";
    if (block.placement === "bottom") return "Bottom of page";
    if (block.placement === "section") return selectedSection?.name ? `After ${selectedSection.name}` : "Next section";
    if (selectedNode?.isInput || selectedNode?.tag === "form") return "Current form";
    if (selectedNode?.label) return `Near ${selectedNode.label}`;
    if (selectedSection?.name) return `Inside ${selectedSection.name}`;
    return "Current page";
  }

  const filtered = useMemo(() => {
    return BLOCK_DEFINITIONS
      .filter((block) => cat === "all" || block.category === cat)
      .filter((block) => {
        if (!searchQuery) return true;
        return (
          block.label.toLowerCase().includes(searchQuery) ||
          block.preview.toLowerCase().includes(searchQuery) ||
          block.id.toLowerCase().includes(searchQuery) ||
          block.keywords.some((keyword) => keyword.includes(searchQuery))
        );
      })
      .map((block) => ({ block, score: blockScore(block) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const categoryDelta = compareElementCategories(a.block.category, b.block.category);
        if (categoryDelta !== 0) return categoryDelta;
        return a.block.label.localeCompare(b.block.label);
      });
  }, [cat, searchQuery, selectedNode, selectedSectionId, selectedSection?.name]);

  const groupedFiltered = useMemo(() => {
    if (filtered.length === 0) return [];

    const groups = new Map<ElementCategoryKey, typeof filtered>();
    filtered.forEach((entry) => {
      const existing = groups.get(entry.block.category) ?? [];
      existing.push(entry);
      groups.set(entry.block.category, existing);
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => compareElementCategories(a, b))
      .map(([key, items]) => ({
        key,
        meta: getElementCategoryDefinition(key),
        items,
      }));
  }, [filtered]);

  function canReplaceSelectedTextWithIcon() {
    if (!selectedNode || !selectedNode.hasEditableText || selectedNode.isInput) return false;
    const text = String(selectedNode.editableText ?? selectedNode.text ?? "").trim();
    if (!text) return false;
    const compact = text.replace(/\s+/g, "");
    if (!compact) return false;
    if (!/[A-Za-z0-9]/.test(compact) && compact.length <= 8) return true;
    const decorativeChars = new Set(Array.from("★☆✦✧•◦▪▫■□◆◇◎◉○●◌⬤⬥⚡🔥💡🚀📍🎯✨⭐🌟❖❋❂❈❉❊✳✴✶✹✺✸✚➜➤➔→←↑↓"));
    return Array.from(compact).every((ch) => decorativeChars.has(ch) || ch.codePointAt(0)! > 0x1f000);
  }

  function getIframe() {
    return document.querySelector('iframe[data-sitezy-preview-frame="1"]') as HTMLIFrameElement | null;
  }

  function getSections(iframe: HTMLIFrameElement): HTMLElement[] {
    const doc = iframe.contentDocument;
    if (!doc) return [];
    return Array.from(doc.body.children).filter(
      (el) => !["SCRIPT","STYLE","NOSCRIPT"].includes(el.tagName)
    ) as HTMLElement[];
  }

  function sectionLabel(section: HTMLElement | null) {
    return section?.getAttribute("data-sz-section-name") || section?.getAttribute("data-sz-section-type") || "section";
  }

  function ensureDropHint() {
    if (dropHintRef.current) return dropHintRef.current;
    const hint = document.createElement("div");
    hint.style.cssText = [
      "position:fixed",
      "z-index:100001",
      "pointer-events:none",
      "display:none",
      "max-width:240px",
      "padding:10px 12px",
      "border-radius:14px",
      "border:1px solid rgba(255,255,255,0.08)",
      "background:linear-gradient(180deg,rgba(18,22,31,0.96),rgba(10,13,20,0.98))",
      "box-shadow:0 16px 40px rgba(0,0,0,0.28)",
      "backdrop-filter:blur(12px)",
      "color:rgba(255,255,255,0.86)",
      "font-size:11px",
      "font-weight:600",
      "line-height:1.4",
      "text-align:center",
      "transform:translate(-50%,-50%)",
    ].join(";");
    document.body.appendChild(hint);
    dropHintRef.current = hint;
    return hint;
  }

  function showDropHint(text: string, left: number, top: number) {
    const hint = ensureDropHint();
    hint.textContent = text;
    hint.style.left = `${left}px`;
    hint.style.top = `${top}px`;
    hint.style.display = "";
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
    overlay.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:99999;background:linear-gradient(180deg,rgba(79,126,255,0.04),rgba(79,126,255,0.02));border:1px dashed rgba(79,126,255,.34);border-radius:16px;box-sizing:border-box;pointer-events:all;`;

    overlay.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      const sections = getSections(iframe);
      if (!sections.length) {
        afterSectionId = null;
        line.style.display = "none";
        showDropHint("Drop to add the first section", r.left + r.width / 2, r.top + r.height / 2);
        return;
      }
      const mouseY = e.clientY;
      let placed = false;
      for (let i = 0; i < sections.length; i++) {
        const sr = sections[i].getBoundingClientRect();
        const midY = r.top + (sr.top + sr.bottom) / 2;
        if (mouseY < midY) {
          afterSectionId = i > 0 ? (sections[i-1].getAttribute("data-sz-section-id") ?? null) : null;
          line.style.top = `${r.top + sr.top}px`;
          line.style.display = "";
          showDropHint(
            i > 0 ? `Drop after ${sectionLabel(sections[i - 1])}` : "Drop at the top of the page",
            r.left + r.width / 2,
            r.top + sr.top - 20
          );
          placed = true;
          break;
        }
      }
      if (!placed) {
        const last = sections[sections.length-1];
        afterSectionId = last.getAttribute("data-sz-section-id") ?? null;
        line.style.top = `${r.top + last.getBoundingClientRect().bottom}px`;
        line.style.display = "";
        showDropHint(`Drop after ${sectionLabel(last)}`, r.left + r.width / 2, r.top + last.getBoundingClientRect().bottom + 20);
      }
    });
    overlay.addEventListener("dragleave", () => {
      line.style.display = "none";
      if (dropHintRef.current) dropHintRef.current.style.display = "none";
    });
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
    overlay.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:99999;background:linear-gradient(180deg,rgba(79,126,255,0.035),rgba(79,126,255,0.015));border:1px dashed rgba(79,126,255,.28);border-radius:16px;box-sizing:border-box;pointer-events:all;`;

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
          showDropHint(`Insert into ${sectionLabel(sec)}`, r.left + r.width / 2, r.top + sr.top + Math.min(sr.height * 0.18, 42));
          return;
        }
      }
      hoveredSectionId = null;
      highlight.style.display = "none";
      if (dropHintRef.current) dropHintRef.current.style.display = "none";
    });
    overlay.addEventListener("dragleave", () => {
      highlight.style.display = "none";
      if (dropHintRef.current) dropHintRef.current.style.display = "none";
    });
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
    overlay.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:99999;background:rgba(79,126,255,.06);border:1px dashed rgba(79,126,255,.34);border-radius:16px;box-sizing:border-box;pointer-events:all;`;
    overlay.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      showDropHint("Drop to place this block on the page", r.left + r.width / 2, r.top + r.height / 2);
    });
    overlay.addEventListener("drop", (e) => { e.preventDefault(); onDrop(); hideDropOverlay(); });
    document.body.appendChild(overlay);
    dragOverlayRef.current = overlay;
  }

  function hideDropOverlay() {
    dropLineRef.current?.remove();
    dropLineRef.current = null;
    dropHintRef.current?.remove();
    dropHintRef.current = null;
    dragOverlayRef.current?.remove();
    dragOverlayRef.current = null;
  }

  useEffect(() => () => hideDropOverlay(), []);

  function sendToIframe(type: string, html: string, sectionId?: string | null, extra?: Record<string, unknown>) {
    const iframe = getIframe();
    if (!iframe?.contentWindow) {
      const blockId = typeof extra?.blockId === "string" ? extra.blockId : null;
      if (blockId && getBlockDefinition(blockId)) insertBlock(blockId);
      return;
    }
    iframe.contentWindow.postMessage({ target: "sitezy-iframe", type, html, sectionId: sectionId ?? null, ...(extra ?? {}) }, "*");
  }

  function addIcon(icon: IconElementDefinition, targetId?: string | null) {
    const html = renderEditorElementHtml(icon.id, project, page, {
      placementHint: icon.placement,
    });
    const canReplace = targetId === undefined && canReplaceSelectedTextWithIcon();
    sendToIframe(canReplace ? "replace-text-with-icon" : "insert-smart", html, targetId ?? selectedSectionId ?? selectedNode?.sectionId ?? null, {
      blockId: icon.id,
      placement: "inline",
      nodeId: (selectedNode?.textTargetNodeId ?? selectedNode?.nodeId) ?? null,
    });
  }

  async function add(block: BlockElementDefinition, targetId?: string | null) {
    if (adding) return;
    setAdding(block.id);
    if (!useAI) {
      const html = renderEditorElementHtml(block.id, project, page, {
        placementHint: block.placement,
      });

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

      // ── Extract existing navbar HTML so AI-inserted navbars stay consistent ──
      const existingNavbarHtml = block.id.startsWith("navbar") && page.html
        ? extractNavbarHtml(page.html)
        : null;

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
            navbarHtml: existingNavbarHtml,
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({})) as { error?: string; code?: string; requestId?: string | null; message?: string; errorCode?: string };
        const errorCode = errJson.code ?? errJson.errorCode;
        throw createAppError({
          code: (errorCode as ErrorCode | undefined) ?? API_GENERATE_001,
          devMessage: `Insert block failed for ${block.id} (${res.status}): ${errJson.error ?? errJson.message ?? "unknown error"}`,
          userMessage: errJson.error ?? errJson.message,
          severity: res.status >= 500 ? "error" : "warn",
          metadata: {
            pageId: page.id,
            pageName: page.name,
            blockId: block.id,
            blockLabel: block.label,
            requestId: errJson.requestId ?? null,
            status: res.status,
          },
        });
      }

      const data = await res.json() as { html?: string };
      const newBlockHtml = data.html ?? "";

      if (!newBlockHtml || !newBlockHtml.includes("<")) {
        throw createAppError({
          code: API_RESPONSE_001,
          devMessage: `Insert block response for ${block.id} did not include valid HTML`,
          severity: "error",
          metadata: { pageId: page.id, pageName: page.name, blockId: block.id, blockLabel: block.label },
        });
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
      const { appErr, apiError } = buildClientApiError(err, API_GENERATE_001, {
        pageId: page.id,
        pageName: page.name,
        blockId: block.id,
        blockLabel: block.label,
      });
      logAppError(appErr);
      setApiError(apiError);
      addGenLog(`❌ ${appErr.userMessage}`, "error");
      setAiStatus({ msg: appErr.userMessage, type: "error" });
      setTimeout(() => setAiStatus(null), 4000);
    }
    finally { setAdding(null); }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 px-0 pb-3 pt-2">
        <div className="sz-editor-dock-switcher flex items-center gap-3 rounded-[18px] px-3 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[14px] border border-transparent px-1 transition-colors focus-within:border-white/[0.08]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={cat === "icons" ? "Search elements and icons…" : "Search elements…"}
              className="w-full appearance-none border-0 bg-transparent text-[11px] text-white/65 placeholder-white/16 outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus-visible:shadow-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-white/20 hover:text-white/55 transition-colors">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="h-8 w-px bg-white/[0.06]" />

          <div className="flex shrink-0 items-center gap-2">
            <p className="text-[10px] font-medium text-white/62">{useAI ? "AI" : "Direct"}</p>
            <EditorSwitch checked={useAI} onChange={() => setUseAI(!useAI)} title={useAI ? "AI insert on" : "AI insert off"} className="scale-[0.9]" />
          </div>
        </div>
      </div>
      <div className="sz-editor-dock-header bg-white/[0.012] px-3.5 py-2.5 flex-shrink-0">
        <div className="flex flex-wrap gap-1.5">
          {primaryCategoryTabs.map((c) => (
            <button key={c.key} onClick={() => setCat(c.key)}
              className={`rounded-full px-3 py-1.5 text-[9.5px] font-medium transition-all border text-center ${
                cat===c.key
                  ? "bg-accent-500/16 text-accent-300 border-accent-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  : "bg-white/[0.015] text-white/34 border-white/[0.05] hover:text-white/60 hover:border-white/[0.1] hover:bg-white/[0.03]"
              }`}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {secondaryCategoryTabs.map((c) => (
            <button key={c.key} onClick={() => setCat(c.key)}
              className={`rounded-full px-3 py-1.5 text-[9.5px] font-medium transition-all border text-center ${
                cat===c.key
                  ? "bg-accent-500/16 text-accent-300 border-accent-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  : "bg-white/[0.015] text-white/34 border-white/[0.05] hover:text-white/60 hover:border-white/[0.1] hover:bg-white/[0.03]"
              }`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      {/* AI status banner */}
      {aiStatus && (
        <div className={`mx-2.5 mt-2 mb-0 px-3 py-2 rounded-lg flex items-center gap-2 text-[11px] font-medium border flex-shrink-0 ${
          aiStatus.type === "loading" ? "bg-accent-500/10 border-accent-500/25 text-accent-300" :
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
          <div className="flex-1 overflow-auto p-2 grid grid-cols-5 gap-1 content-start">
            {ICON_DEFINITIONS
              .filter((icon) =>
                !searchQuery ||
                icon.label.toLowerCase().includes(searchQuery) ||
                icon.id.includes(searchQuery) ||
                icon.keywords.some((keyword) => keyword.includes(searchQuery))
              )
              .map((icon) => (
              <button
                key={icon.id}
                title={icon.label}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "copy";
                  e.dataTransfer.setData("text/plain", icon.id);
                  setTimeout(() => showInlineOverlay((sectionId) => addIcon(icon, sectionId)), 0);
                }}
                onDragEnd={() => hideDropOverlay()}
                onClick={() => addIcon(icon)}
                className="flex flex-col items-center gap-1 p-2 rounded-lg border border-white/[0.04] bg-white/[0.02] hover:bg-accent-500/[0.07] hover:border-accent-500/20 transition-all group cursor-grab active:cursor-grabbing"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
                  className="w-5 h-5 text-white/35 group-hover:text-accent-400 transition-colors flex-shrink-0"
                  dangerouslySetInnerHTML={{ __html: icon.paths }}></svg>
                <span className="text-[8.5px] text-white/22 group-hover:text-white/45 transition-colors text-center leading-tight truncate w-full">{icon.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Blocks list ──────────────────────────────────────────────────────── */}
      {cat !== "icons" && (
      <div className="flex-1 overflow-auto px-3 py-3">
        {filtered.length === 0 && (
          <div className="rounded-[22px] border border-dashed border-white/[0.06] bg-white/[0.02] px-4 py-7 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/[0.08] bg-white/[0.04] text-white/32">
              <LayoutGrid size={16} />
            </div>
            <p className="mt-4 text-[12px] font-semibold text-white/56">No matching elements</p>
            <p className="mt-1 text-[10px] leading-5 text-white/22">
              {search ? "Try a broader search or switch categories." : "This category does not have any available elements right now."}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {groupedFiltered.map((group) => (
            <div key={group.key} className="space-y-2.5">
              <div className="grid grid-cols-1 gap-2.5 content-start">
                {group.items.map(({ block: b, score }) => {
                  const categoryMeta = getElementCategoryDefinition(b.category);
                  return (
                    <div
                      key={b.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "copy";
                        e.dataTransfer.setData("text/plain", b.id);
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
                      }}
                      onClick={() => add(b)}
                      className={`p-3.5 rounded-2xl border bg-white/[0.02] text-left hover:border-accent-500/22 hover:bg-accent-500/[0.04] transition-all group cursor-grab active:cursor-grabbing select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${
                        score >= 4 ? "border-accent-500/18" : "border-white/[0.05]"
                      } ${adding===b.id?"opacity-35":""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="text-[15px] leading-none text-white/18 group-hover:text-accent-400 transition-colors mt-0.5">{b.icon}</span>
                          <div className="min-w-0">
                            <p className="text-[11px] text-white/60 font-semibold group-hover:text-white/80 transition-colors">{b.label}</p>
                            <p className="text-[10px] text-white/22 mt-0.5 line-clamp-2">{b.preview}</p>
                          </div>
                        </div>
                        {score >= 4 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-[0.14em] text-accent-300 bg-accent-500/12 border border-accent-500/18 flex-shrink-0">
                            Smart
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <span className="text-[9px] text-white/24 truncate">
                          {categoryMeta?.label ? `${categoryMeta.label} · ` : ""}
                          {placementText(b)}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-md text-[8px] font-medium uppercase tracking-[0.12em] text-white/28 bg-white/[0.04] border border-white/[0.05] flex-shrink-0">
                          {b.placement}
                        </span>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/[0.05] pt-2.5 text-[9px] text-white/18">
                        <span>Click to insert</span>
                        <span>Drag to place</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}
