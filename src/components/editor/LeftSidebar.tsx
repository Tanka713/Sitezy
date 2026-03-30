"use client";
import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import {
  duplicateSectionInPageHtml,
  getSectionContext,
  moveSectionInPageHtml,
  moveSectionToIndex,
  removeSectionFromPageHtml,
  replaceSectionInPageHtml,
} from "@/lib/editor/structure";
import {
  API_GENERATE_001,
  API_RESPONSE_001,
  createAppError,
  logAppError,
  normalizeError,
  type ErrorCode,
} from "@/lib/errors";
import {
  Plus, FileCode2,
  ChevronRight, MoreHorizontal, RefreshCw, Pencil, Copy, Trash2, X,
  AlertCircle, ArrowDown, ArrowUp, CheckCircle2, Clock, Loader2, Sparkles, GripVertical,
} from "lucide-react";
import { EditorSwitch } from "./EditorSwitch";
import { extractNavbarHtml } from "@/lib/utils";
import { streamGeneratePage } from "@/lib/utils/generateStream";
import type { PageSection, Project, ProjectPage } from "@/types";

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

export function LeftSidebar({ project }: Props) {
  const leftPanelTab      = useAppStore((s) => s.editor.leftPanelTab);
  const selectedPageId    = useAppStore((s) => s.editor.selectedPageId);
  const selectedFileId    = useAppStore((s) => s.editor.selectedFileId);
  const selectedSectionId = useAppStore((s) => s.editor.selectedSectionId);
  const setLeftPanel      = useAppStore((s) => s.setLeftPanel);
  const selectPage        = useAppStore((s) => s.selectPage);
  const selectFile        = useAppStore((s) => s.selectFile);
  const selectSection     = useAppStore((s) => s.selectSection);

  const pages = project.pages ?? [];
  const files = project.files ?? {};
  const [showAdd, setShowAdd] = useState(false);

  const tabs = [
    { key: "pages"     as const, label: "Pages" },
    { key: "navigator" as const, label: "Layers" },
    { key: "files"     as const, label: "Files" },
  ];

  const tabMeta: Record<typeof leftPanelTab, { title: string; subtitle: string }> = {
    pages: { title: "Pages", subtitle: "Manage every page in the project." },
    navigator: { title: "Layers", subtitle: "Move through the live document tree." },
    files: { title: "Files", subtitle: "Inspect exported source structure." },
    add: { title: "Add", subtitle: "Insert and organize additional content." },
  };

  return (
    <aside className="sz-editor-dock flex h-full w-full flex-col overflow-hidden rounded-[26px]">
      <div className="sz-editor-dock-header flex flex-shrink-0 flex-col gap-3 px-4 pb-3 pt-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/24">Structure</p>
          <p className="mt-1 text-[11px] leading-5 text-[var(--text-tertiary)] line-clamp-1">{tabMeta[leftPanelTab].subtitle}</p>
        </div>

        <div className="sz-editor-dock-switcher grid grid-cols-3 gap-1 rounded-[16px] p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setLeftPanel(t.key)}
              className={`flex min-h-[38px] items-center justify-center rounded-[12px] px-2.5 text-center transition-all ${
                leftPanelTab === t.key
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
        {leftPanelTab === "pages"     && <PagesPanel project={project} pages={pages} selectedPageId={selectedPageId} onSelectPage={selectPage} onAddPage={() => setShowAdd(true)} />}
        {leftPanelTab === "navigator" && <NavPanel project={project} pages={pages} selectedPageId={selectedPageId} selectedSectionId={selectedSectionId} onSelectPage={selectPage} onSelectSection={selectSection} />}
        {leftPanelTab === "files"     && <FilesPanel pages={pages} files={files} selectedFileId={selectedFileId} onSelectFile={selectFile} />}
      </div>

      {showAdd && <AddPageModal project={project} onClose={() => setShowAdd(false)} />}
    </aside>
  );
}

// ── Pages ─────────────────────────────────────────────────────────────────────
function PagesPanel({ project, pages, selectedPageId, onSelectPage, onAddPage }: {
  project: Project; pages: ProjectPage[]; selectedPageId: string | null;
  onSelectPage: (id: string|null)=>void; onAddPage: ()=>void;
}) {
  return (
    <div className="sz-editor-dock-pane flex h-full min-h-0 flex-col overflow-hidden rounded-[22px]">
      <div className="flex flex-shrink-0 items-center justify-between px-3.5 py-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/28">
          Pages <span className="text-white/14 font-normal">{pages.length}</span>
        </span>
        <button onClick={onAddPage} className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-white/28 transition-all hover:bg-white/[0.06] hover:text-white">
          <Plus size={12}/>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-1 pb-2">
        {pages.length === 0 ? (
          <div className="px-4 py-8 text-center text-[11px] text-white/18">No pages yet.</div>
        ) : (
          <div className="space-y-1 px-1.5">
            {pages.map((p) => (
              <PageRow key={p.id} page={p} project={project} isSelected={selectedPageId===p.id} onSelect={() => onSelectPage(p.id)}/>
            ))}
          </div>
        )}
        {pages.length > 0 && (
          <button onClick={onAddPage} className="mt-2 flex w-[calc(100%-12px)] items-center gap-2 rounded-[16px] border border-dashed border-white/[0.07] px-3 py-3 text-[11px] text-white/30 transition-all hover:border-white/[0.14] hover:bg-white/[0.035] hover:text-white/58">
            <Plus size={11}/> Add page
          </button>
        )}
      </div>
    </div>
  );
}

function PageRow({ page, project, isSelected, onSelect }: { page: ProjectPage; project: Project; isSelected: boolean; onSelect: ()=>void }) {
  const deletePage    = useAppStore((s) => s.deletePage);
  const duplicatePage = useAppStore((s) => s.duplicatePage);
  const renamePage    = useAppStore((s) => s.renamePage);
  const setPageContent  = useAppStore((s) => s.setPageContent);
  const setPageStatus   = useAppStore((s) => s.setPageStatus);
  const setGenStatus    = useAppStore((s) => s.setGenStatus);
  const addGenLog       = useAppStore((s) => s.addGenLog);
  const setApiError     = useAppStore((s) => s.setApiError);

  const [menu,        setMenu]        = useState(false);
  const [ren,         setRen]         = useState(false);
  const [name,        setName]        = useState(page.name);
  const [regen,       setRegen]       = useState(false);
  const [armedDelete, setArmedDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const armRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleDeletePage() {
    if (!armedDelete) {
      setArmedDelete(true);
      armRef.current = setTimeout(() => setArmedDelete(false), 2400);
      return;
    }
    if (armRef.current) clearTimeout(armRef.current);
    setArmedDelete(false);
    setMenu(false);
    deletePage(page.id);
  }

  useEffect(() => {
    if (!menu) return;
    function h(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menu]);

  function status() {
    if (regen || page.status === "generating") return <Loader2 size={10} className="text-accent-400 animate-spin"/>;
    if (page.status === "done")  return <CheckCircle2 size={10} className="text-emerald-500"/>;
    if (page.status === "error") return <AlertCircle  size={10} className="text-red-400"/>;
    return <Clock size={10} className="text-white/18"/>;
  }

  async function handleRegen() {
    if (!project.blueprint) return;
    setMenu(false); setRegen(true); setPageStatus(page.id, "generating");
    setGenStatus("pages", `Regenerating ${page.name}…`);
    // Reuse navbar from another already-generated page for consistency
    const otherPage = project.pages?.find((p) => p.html && p.id !== page.id);
    const navbarHtml = otherPage?.html ? extractNavbarHtml(otherPage.html) : null;
    try {
      const bp = { id: page.id, name: page.name, slug: page.slug, sections: page.sections.map((s) => s.type || s.name), purpose: page.purpose };
      const result = await streamGeneratePage(
        { blueprint: project.blueprint, page: bp, brief: project.brief, navbarHtml },
        (chars) => setGenStatus("pages", `Regenerating ${page.name}… ${(chars / 1000).toFixed(1)}k`),
        120_000
      );
      setPageContent(page.id, result.html, result.sections);
      setGenStatus("done", "Done!");
    } catch (error) {
      const { appErr, apiError } = buildClientApiError(error, API_GENERATE_001, {
        pageId: page.id,
        pageName: page.name,
      });
      logAppError(appErr);
      setApiError(apiError);
      setPageStatus(page.id, "error");
      addGenLog(`❌ ${appErr.userMessage}`, "error");
      setGenStatus("error", "Failed");
    }
    finally { setRegen(false); }
  }

  function commitRename() {
    if (name.trim() && name !== page.name) renamePage(page.id, name.trim());
    setRen(false);
  }

  return (
    <div className="relative group/row">
      {ren ? (
        <div className="flex items-center gap-1 px-2 py-1">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRen(false); }}
            className="flex-1 bg-white/[0.07] border border-accent-500/35 rounded-md px-2 py-1 text-[12px] text-white focus:outline-none min-w-0"/>
          <button onClick={() => setRen(false)} className="text-white/25 hover:text-white transition-colors"><X size={10}/></button>
        </div>
      ) : (
        <div onClick={onSelect} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onSelect()}
          className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-left text-[12px] transition-all cursor-pointer border ${
            isSelected
              ? "bg-accent-500/12 text-white border-accent-400/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              : "text-white/42 border-transparent hover:text-white/75 hover:bg-white/[0.035] hover:border-white/[0.06]"
          }`}>
          <span className="flex-shrink-0">{status()}</span>
          <span className="flex-1 truncate font-medium">{page.name}</span>
          <div role="button" tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setMenu(!menu); }}
            onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), setMenu(!menu))}
            className="opacity-0 group-hover/row:opacity-100 w-5 h-5 flex items-center justify-center rounded text-white/28 hover:text-white hover:bg-white/[0.09] transition-all flex-shrink-0 cursor-pointer">
            <MoreHorizontal size={11}/>
          </div>
        </div>
      )}
      {menu && (
        <div ref={menuRef} className="absolute right-2 top-8 w-40 bg-[#0f0f14] border border-white/[0.08] rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
          <MI icon={<RefreshCw size={11}/>} label="Regenerate" onClick={handleRegen} disabled={!project.blueprint}/>
          <MI icon={<Pencil size={11}/>}    label="Rename"     onClick={() => { setRen(true); setMenu(false); }}/>
          <MI icon={<Copy size={11}/>}      label="Duplicate"  onClick={() => { duplicatePage(page.id); setMenu(false); }}/>
          <div className="h-px bg-white/[0.06] my-1"/>
          <MI icon={<Trash2 size={11}/>}    label={armedDelete ? "Confirm delete?" : "Delete"} danger onClick={handleDeletePage} disabled={(project.pages?.length??0)<=1}/>
        </div>
      )}
    </div>
  );
}

function MI({ icon, label, onClick, danger, disabled }: { icon: React.ReactNode; label: string; onClick: ()=>void; danger?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-2 w-full px-3 py-2 text-[11px] transition-colors disabled:opacity-20 disabled:cursor-not-allowed ${
        danger ? "text-red-400/65 hover:bg-red-500/10 hover:text-red-400" : "text-white/50 hover:bg-white/[0.05] hover:text-white"
      }`}>
      {icon} {label}
    </button>
  );
}

type SectionRegenMode = "fresh" | "same-layout" | "bold" | "minimal";

const SECTION_REGEN_OPTIONS: Array<{
  key: SectionRegenMode;
  label: string;
  hint: string;
}> = [
  { key: "fresh", label: "Regenerate", hint: "Fresh on-brand version" },
  { key: "same-layout", label: "Same layout", hint: "Keep structure tighter" },
  { key: "bold", label: "More bold", hint: "Stronger contrast and energy" },
  { key: "minimal", label: "More minimal", hint: "Cleaner and calmer" },
];

function buildSectionRegenInstruction(mode: SectionRegenMode, prompt: string): string {
  const base =
    mode === "same-layout"
      ? "Keep the same overall layout structure and section hierarchy. Refresh the visuals and copy details without changing the layout pattern drastically."
      : mode === "bold"
      ? "Make this section more bold, expressive, high-contrast, and visually assertive while staying consistent with the site's design system."
      : mode === "minimal"
      ? "Make this section more minimal, refined, spacious, and calm while staying consistent with the site's design system."
      : "Create a fresh improved variation that feels premium, polished, and clearly on-brand.";

  const extra = prompt.trim();
  return extra ? `${base} Additional request: ${extra}` : base;
}

// ── Navigator ─────────────────────────────────────────────────────────────────
function NavPanel({ project, pages, selectedPageId, selectedSectionId, onSelectPage, onSelectSection }: {
  project: Project;
  pages: ProjectPage[]; selectedPageId: string|null; selectedSectionId: string|null;
  onSelectPage: (id: string|null)=>void; onSelectSection: (id: string|null)=>void;
}) {
  const setPageContent = useAppStore((s) => s.setPageContent);
  const addGenLog = useAppStore((s) => s.addGenLog);
  const setGenStatus = useAppStore((s) => s.setGenStatus);
  const setApiError = useAppStore((s) => s.setApiError);
  const [exp, setExp] = useState<Record<string,boolean>>(() =>
    Object.fromEntries(pages.map((p) => [p.id, true]))
  );
  const [confirmDelete, setConfirmDelete] = useState<string|null>(null);
  const [regeneratingSectionId, setRegeneratingSectionId] = useState<string | null>(null);
  const [dragSrc, setDragSrc]   = useState<{ pageId: string; sectionId: string; index: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ pageId: string; index: number } | null>(null);
  const [regenMenu, setRegenMenu] = useState<{ pageId: string; sectionId: string } | null>(null);
  const [regenMenuPos, setRegenMenuPos] = useState<{ left: number; top: number } | null>(null);
  const [regenMode, setRegenMode] = useState<SectionRegenMode>("fresh");
  const [regenPrompt, setRegenPrompt] = useState("");
  const regenMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!regenMenu) return;
    function onDown(e: MouseEvent) {
      if (regenMenuRef.current && !regenMenuRef.current.contains(e.target as Node)) {
        setRegenMenu(null);
        setRegenMenuPos(null);
      }
    }
    function closeMenu() {
      setRegenMenu(null);
      setRegenMenuPos(null);
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [regenMenu]);

  function focusSectionInFrame(sectionId: string | null) {
    if (!sectionId) return;
    const iframe = document.querySelector('iframe[data-sitezy-preview-frame="1"]') as HTMLIFrameElement | null;
    iframe?.contentWindow?.postMessage({ target: "sitezy-iframe", type: "focus-section", sectionId }, "*");
  }

  function confirmDeleteSection(sectionId: string) {
    setConfirmDelete(null);
    const page = pages.find((p) => p.id === selectedPageId);
    if (!page?.html) return;

    const removedIndex = page.sections.findIndex((section) => section.id === sectionId);
    const result = removeSectionFromPageHtml(page.html, sectionId);
    const fallbackSelection =
      result.sections[Math.min(Math.max(removedIndex, 0), Math.max(result.sections.length - 1, 0))]?.id ?? null;

    setPageContent(page.id, result.html, result.sections);
    onSelectPage(page.id);
    onSelectSection(selectedSectionId === sectionId ? fallbackSelection : selectedSectionId);
    setTimeout(() => focusSectionInFrame(fallbackSelection), 80);
  }

  function moveSection(page: ProjectPage, sectionId: string, direction: -1 | 1) {
    const result = moveSectionInPageHtml(page.html, sectionId, direction);
    if (!result.sectionId || result.html === page.html) return;

    setPageContent(page.id, result.html, result.sections);
    onSelectPage(page.id);
    onSelectSection(result.sectionId);
    setTimeout(() => focusSectionInFrame(result.sectionId), 80);
  }

  function dropSection(page: ProjectPage, toIndex: number) {
    if (!dragSrc || dragSrc.pageId !== page.id || dragSrc.index === toIndex) {
      setDragSrc(null); setDragOver(null); return;
    }
    const result = moveSectionToIndex(page.html, dragSrc.sectionId, toIndex);
    if (result.sectionId) {
      setPageContent(page.id, result.html, result.sections);
      onSelectPage(page.id);
      onSelectSection(result.sectionId);
      setTimeout(() => focusSectionInFrame(result.sectionId), 80);
    }
    setDragSrc(null); setDragOver(null);
  }

  function duplicateSection(page: ProjectPage, sectionId: string) {
    const result = duplicateSectionInPageHtml(page.html, sectionId);
    if (!result.sectionId) return;

    setPageContent(page.id, result.html, result.sections);
    onSelectPage(page.id);
    onSelectSection(result.sectionId);
    setTimeout(() => focusSectionInFrame(result.sectionId), 80);
  }

  async function handleRegenerateSection(page: ProjectPage, sectionId: string, mode: SectionRegenMode, prompt: string) {
    if (!project.blueprint || regeneratingSectionId) return;

    const context = getSectionContext(page.html, sectionId);
    if (!context) return;

    setConfirmDelete(null);
    setRegenMenu(null);
    setRegenMenuPos(null);
    setRegeneratingSectionId(sectionId);
    onSelectPage(page.id);
    onSelectSection(sectionId);
    addGenLog(`🔄 Regenerating ${context.section.name}…`, "progress");
    setGenStatus("pages", `Regenerating ${context.section.name}…`);

    try {
      const res = await fetch("/api/regenerate-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: project.blueprint,
          brief: project.brief,
          page: {
            name: page.name,
            purpose: page.purpose,
          },
          section: {
            id: context.section.id,
            type: context.section.type,
            name: context.section.name,
            html: context.sectionHtml,
            previousSectionName: context.previousSectionName,
            nextSectionName: context.nextSectionName,
          },
          instruction: buildSectionRegenInstruction(mode, prompt),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; code?: string; requestId?: string | null };
        throw createAppError({
          code: (data.code as ErrorCode | undefined) ?? API_GENERATE_001,
          devMessage: `Section regeneration failed for ${context.section.name} (${res.status}): ${data.error ?? "unknown error"}`,
          userMessage: data.error,
          severity: res.status >= 500 ? "error" : "warn",
          metadata: {
            pageId: page.id,
            pageName: page.name,
            sectionId,
            sectionName: context.section.name,
            requestId: data.requestId ?? null,
            status: res.status,
          },
        });
      }
      const result: { html: string } = await res.json();
      const replaced = replaceSectionInPageHtml(page.html, sectionId, result.html, context.section);
      if (!replaced.replacedSectionId) {
        throw createAppError({
          code: API_RESPONSE_001,
          devMessage: `Section regeneration for ${context.section.name} returned no replacement section id`,
          severity: "error",
          metadata: { pageId: page.id, pageName: page.name, sectionId, sectionName: context.section.name },
        });
      }

      setPageContent(page.id, replaced.html, replaced.sections);
      onSelectSection(replaced.replacedSectionId);
      addGenLog(`✅ ${context.section.name} regenerated`, "success");
      setGenStatus("done", `${context.section.name} regenerated`);
    } catch (error) {
      const { appErr, apiError } = buildClientApiError(error, API_GENERATE_001, {
        pageId: page.id,
        pageName: page.name,
        sectionId,
        sectionName: context.section.name,
      });
      logAppError(appErr);
      setApiError(apiError);
      addGenLog(`❌ ${appErr.userMessage}`, "error");
      setGenStatus("error", "Section regeneration failed");
    } finally {
      setRegeneratingSectionId(null);
    }
  }

  function openRegenMenu(pageId: string, sectionId: string, triggerEl: HTMLElement) {
    if (regeneratingSectionId) return;
    setConfirmDelete(null);
    setRegenMode("fresh");
    setRegenPrompt("");
    const rect = triggerEl.getBoundingClientRect();
    const menuWidth = 252;
    const menuHeight = 432;
    const gap = 12;
    const viewportPadding = 16;
    const preferredRight = rect.right + gap;
    const left = preferredRight + menuWidth <= window.innerWidth - viewportPadding
      ? preferredRight
      : Math.max(viewportPadding, rect.left - menuWidth - gap);
    const centeredTop = rect.top - menuHeight / 2 + rect.height / 2;
    const top = Math.min(
      Math.max(viewportPadding, centeredTop),
      Math.max(viewportPadding, window.innerHeight - menuHeight - viewportPadding)
    );

    setRegenMenu((current) => {
      if (current?.pageId === pageId && current?.sectionId === sectionId) {
        setRegenMenuPos(null);
        return null;
      }
      setRegenMenuPos({ left, top });
      return { pageId, sectionId };
    });
  }

  return (
    <div className="sz-editor-dock-pane flex h-full min-h-0 flex-col overflow-hidden rounded-[22px]">
      <div className="flex flex-shrink-0 items-center justify-between px-3.5 py-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/28">Layers</span>
        <span className="text-[10px] text-white/16">{pages.reduce((count, page) => count + page.sections.length, 0)} items</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 py-1.5 space-y-1">
        {pages.map((page) => {
          const open = exp[page.id] ?? true;
          return (
            <div key={page.id}>
              <button
                onClick={() => setExp((e) => ({ ...e, [page.id]: !open }))}
                className={`flex items-center w-full px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all hover:bg-white/[0.03] ${selectedPageId===page.id?"text-white/82 bg-white/[0.035]":"text-white/35"}`}>
                <ChevronRight size={11} className={`text-white/25 transition-transform flex-shrink-0 ${open?"rotate-90":""}`}/>
                <span className="flex-1 text-left truncate px-1">{page.name}</span>
                <span className="text-[9px] text-white/14 font-normal ml-1">{page.sections.length}</span>
              </button>
              {open && (
                <div className="ml-4 border-l border-white/[0.04] pl-2.5 space-y-1 mb-1">
                  {page.sections.length === 0
                    ? (
                      <div className="rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] px-3 py-3">
                        <p className="text-[10px] font-medium text-white/34">No sections yet</p>
                        <p className="mt-1 text-[9px] leading-4 text-white/18">Use the Elements panel to add the first section for this page.</p>
                      </div>
                    )
                    : page.sections.map((sec, i) => (
                      <div
                        key={sec.id}
                        className={`group/sec transition-opacity ${dragSrc?.sectionId === sec.id ? "opacity-40" : ""}`}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragSrc({ pageId: page.id, sectionId: sec.id, index: i }); }}
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver({ pageId: page.id, index: i }); }}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={(e) => { e.preventDefault(); dropSection(page, i); }}
                        onDragEnd={() => { setDragSrc(null); setDragOver(null); }}
                        style={dragOver?.pageId === page.id && dragOver.index === i && dragSrc?.sectionId !== sec.id ? { outline: "1px solid rgba(99,102,241,0.5)", borderRadius: 8 } : undefined}
                      >
                        {confirmDelete === sec.id ? (
                          /* Inline delete confirmation */
                          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-red-500/8 border border-red-500/20">
                            <Trash2 size={10} className="text-red-400 flex-shrink-0" />
                            <span className="flex-1 text-[10px] text-red-300/80 truncate">Delete "{sec.name||sec.type}"?</span>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-1.5 py-0.5 text-[10px] text-white/35 hover:text-white/70 rounded transition-colors">
                              Cancel
                            </button>
                            <button
                              onClick={() => confirmDeleteSection(sec.id)}
                              className="px-1.5 py-0.5 text-[10px] text-red-400 bg-red-500/15 hover:bg-red-500/25 rounded transition-colors font-medium">
                              Delete
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <button
                              onClick={() => {
                                onSelectSection(sec.id);
                                onSelectPage(page.id);
                                const iframe = document.querySelector('iframe[data-sitezy-preview-frame="1"]') as HTMLIFrameElement | null;
                                const target = iframe?.contentDocument?.querySelector(`[data-sz-section-id="${sec.id}"]`);
                                target?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }}
                              className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-[11px] transition-all pr-12 border ${
                                selectedSectionId===sec.id
                                  ? "bg-accent-500/10 text-white border-accent-400/14"
                                  : "text-white/32 border-transparent hover:text-white/62 hover:bg-white/[0.025] hover:border-white/[0.05]"
                              }`}>
                              <span className="flex-shrink-0 w-4 flex items-center justify-center cursor-grab active:cursor-grabbing">
                                <GripVertical size={9} className="text-white/18 group-hover/sec:text-white/36 transition-colors" />
                              </span>
                              <span className="truncate">{sec.name||sec.type}</span>
                            </button>
                            <div className={`absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-white/[0.05] bg-[#0f131c]/94 px-1 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-md transition-all ${
                              selectedSectionId === sec.id ? "opacity-100" : "pointer-events-none opacity-0 group-hover/sec:pointer-events-auto group-hover/sec:opacity-100"
                            }`}>
                              <button
                                onClick={(e) => { e.stopPropagation(); moveSection(page, sec.id, -1); }}
                                title="Move section up"
                                disabled={i === 0}
                                className="flex h-5 w-5 items-center justify-center rounded-md text-white/24 transition-colors hover:bg-white/[0.05] hover:text-white/72 disabled:cursor-not-allowed disabled:opacity-20"
                              >
                                <ArrowUp size={10} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); moveSection(page, sec.id, 1); }}
                                title="Move section down"
                                disabled={i === page.sections.length - 1}
                                className="flex h-5 w-5 items-center justify-center rounded-md text-white/24 transition-colors hover:bg-white/[0.05] hover:text-white/72 disabled:cursor-not-allowed disabled:opacity-20"
                              >
                                <ArrowDown size={10} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); duplicateSection(page, sec.id); }}
                                title="Duplicate section"
                                className="flex h-5 w-5 items-center justify-center rounded-md text-white/24 transition-colors hover:bg-white/[0.05] hover:text-white/72"
                              >
                                <Copy size={10} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); openRegenMenu(page.id, sec.id, e.currentTarget); }}
                                title="Regenerate this section"
                                disabled={!project.blueprint || regeneratingSectionId !== null}
                                className={`flex h-5 w-5 items-center justify-center rounded-md transition-all ${
                                  !project.blueprint || regeneratingSectionId !== null
                                    ? "cursor-not-allowed text-white/10"
                                    : "text-white/24 hover:bg-accent-500/10 hover:text-accent-300"
                                } ${(regeneratingSectionId === sec.id || (regenMenu?.pageId === page.id && regenMenu?.sectionId === sec.id)) ? "bg-accent-500/10 text-accent-300" : ""}`}
                              >
                                {regeneratingSectionId === sec.id ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDelete(sec.id); }}
                                title="Delete section"
                                className="flex h-5 w-5 items-center justify-center rounded-md text-white/24 transition-colors hover:bg-red-500/10 hover:text-red-400"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                            {regenMenu?.pageId === page.id && regenMenu?.sectionId === sec.id && (
                              <div
                                ref={regenMenuRef}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  left: regenMenuPos?.left ?? 0,
                                  top: regenMenuPos?.top ?? 0,
                                }}
                                className="fixed z-[120] w-[252px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(19,19,26,0.98),rgba(10,10,14,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.48)] backdrop-blur-xl"
                              >
                                <div className="border-b border-white/[0.06] bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_55%)] px-3.5 py-3">
                                  <div className="flex items-start gap-2.5">
                                    <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl border border-accent-400/20 bg-accent-500/12 text-accent-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] flex-shrink-0">
                                      <Sparkles size={13} />
                                    </span>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <p className="text-[11px] font-semibold tracking-[0.01em] text-white/90">Regenerate Section</p>
                                        <span className="rounded-full border border-accent-400/18 bg-accent-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-accent-200/85">
                                          AI
                                        </span>
                                      </div>
                                      <p className="mt-1 truncate text-[10px] text-white/34">{sec.name || sec.type}</p>
                                      <p className="mt-1 text-[9px] leading-relaxed text-white/22">
                                        Create a fresh version while keeping the page cohesive.
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-3 px-3.5 py-3.5">
                                  <div>
                                    <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/20">
                                      Direction
                                    </p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {SECTION_REGEN_OPTIONS.map((option) => (
                                        <button
                                          key={option.key}
                                          onClick={() => setRegenMode(option.key)}
                                          className={`rounded-xl border px-2.5 py-2 text-left transition-all ${
                                            regenMode === option.key
                                              ? "border-accent-400/28 bg-[linear-gradient(180deg,rgba(99,102,241,0.2),rgba(99,102,241,0.1))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                                              : "border-white/[0.06] bg-white/[0.025] text-white/48 hover:text-white/74 hover:border-white/[0.12] hover:bg-white/[0.04]"
                                          }`}
                                        >
                                          <div className="text-[10px] font-semibold leading-tight">{option.label}</div>
                                          <div className="mt-1 text-[9px] leading-tight text-white/28">{option.hint}</div>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/20">
                                        Extra Prompt
                                      </p>
                                      <span className="text-[9px] text-white/18">Optional</span>
                                    </div>
                                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-1">
                                      <textarea
                                        value={regenPrompt}
                                        onChange={(e) => setRegenPrompt(e.target.value)}
                                        placeholder="Add any extra direction, features, or tone changes…"
                                        rows={3}
                                        className="w-full resize-none rounded-[10px] bg-transparent px-2.5 py-2 text-[10.5px] leading-relaxed text-white/72 placeholder-white/18 focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
                                  <button
                                    onClick={() => { setRegenMenu(null); setRegenMenuPos(null); }}
                                    className="rounded-xl px-3 py-2 text-[10px] font-medium text-white/38 hover:bg-white/[0.05] hover:text-white/70 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => void handleRegenerateSection(page, sec.id, regenMode, regenPrompt)}
                                    disabled={regeneratingSectionId !== null}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[linear-gradient(180deg,rgba(99,102,241,0.95),rgba(79,70,229,0.95))] px-3 py-2 text-[10px] font-semibold text-white shadow-[0_10px_24px_rgba(79,70,229,0.28)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                  >
                                    <Sparkles size={11} />
                                    Regenerate
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Files ─────────────────────────────────────────────────────────────────────
function FilesPanel({ pages, files, selectedFileId, onSelectFile }: {
  pages: ProjectPage[]; files: Record<string,{id:string;name:string;type:string}>;
  selectedFileId: string|null; onSelectFile: (id:string|null)=>void;
}) {
  const css = Object.values(files).filter((f) => f.type === "css");
  return (
    <div className="sz-editor-dock-pane flex h-full min-h-0 flex-col overflow-hidden rounded-[22px]">
      <div className="flex flex-shrink-0 items-center justify-between px-3.5 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/28">Files</p>
        <span className="text-[10px] text-white/16">{pages.length + css.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 py-1.5 space-y-1">
        <div className="px-2 py-1 text-[9px] font-bold text-white/14 uppercase tracking-widest">Pages</div>
        {pages.map((p) => {
          const slug = p.slug || p.name.toLowerCase().replace(/\s+/g,"-");
          return (
            <button key={p.id} onClick={() => onSelectFile(p.id)}
              className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-[11px] transition-all ${
                selectedFileId===p.id ? "bg-accent-500/10 text-accent-300" : "text-white/38 hover:text-white/65 hover:bg-white/[0.035]"
              }`}>
              <FileCode2 size={11} className="flex-shrink-0 text-accent-400/50"/>
              <span className="truncate font-mono">{slug}.html</span>
            </button>
          );
        })}
        {css.length > 0 && (
          <>
            <div className="px-2 py-1 mt-2 text-[9px] font-bold text-white/14 uppercase tracking-widest">Styles</div>
            {css.map((f) => (
              <button key={f.id} onClick={() => onSelectFile(f.id)}
                className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-[11px] transition-all ${
                  selectedFileId===f.id ? "bg-teal-500/10 text-teal-300" : "text-white/38 hover:text-white/65 hover:bg-white/[0.035]"
                }`}>
                <FileCode2 size={11} className="flex-shrink-0 text-teal-400/50"/>
                <span className="truncate font-mono">{f.name}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── Add Page Modal ─────────────────────────────────────────────────────────────
function AddPageModal({ project, onClose }: { project: Project; onClose: ()=>void }) {
  const addPage        = useAppStore((s) => s.addPage);
  const setPageContent = useAppStore((s) => s.setPageContent);
  const setPageStatus  = useAppStore((s) => s.setPageStatus);
  const setGenStatus   = useAppStore((s) => s.setGenStatus);
  const addGenLog      = useAppStore((s) => s.addGenLog);
  const setApiError    = useAppStore((s) => s.setApiError);

  const [name,     setName]     = useState("");
  const [purpose,  setPurpose]  = useState("");
  const [useAI,    setUseAI]    = useState(true);
  const [creating, setCreating] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function create() {
    if (!name.trim()) return;
    setError(null);
    const id   = crypto.randomUUID();
    const slug = name.trim().toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
    addPage({ id, name: name.trim(), slug, sections: [], purpose: purpose.trim() || name.trim(), html: "", status: useAI ? "generating" : "done" });

    if (!useAI) { onClose(); return; }

    setCreating(true);
    setGenStatus("pages", `Generating ${name.trim()}…`);
    addGenLog(`📄 Generating page: ${name.trim()}…`, "progress");
    // Reuse navbar from first page that has HTML for brand consistency
    const firstPage = project.pages?.find((p) => p.html);
    const navbarHtml = firstPage?.html ? extractNavbarHtml(firstPage.html) : null;
    try {
      const result = await streamGeneratePage(
        {
          blueprint: project.blueprint,
          page: { id, name: name.trim(), slug, sections: ["hero", "content", "cta"], purpose: purpose.trim() || name.trim() },
          brief: project.brief,
          navbarHtml,
        },
        (chars) => setGenStatus("pages", `Generating ${name.trim()}… ${(chars / 1000).toFixed(1)}k`),
        120_000
      );
      setPageContent(id, result.html, result.sections);
      addGenLog(`✅ ${name.trim()} generated`, "success");
      setGenStatus("done", "Done!");
      onClose();
    } catch (err) {
      const { appErr, apiError } = buildClientApiError(err, API_GENERATE_001, {
        pageId: id,
        pageName: name.trim(),
      });
      logAppError(appErr);
      setApiError(apiError);
      setError(appErr.userMessage);
      setPageStatus(id, "error");
      addGenLog(`❌ ${appErr.userMessage}`, "error");
      setGenStatus("error", "Failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0f0f14] shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-white">New page</h3>
          <button onClick={onClose} className="text-white/28 hover:text-white/65 transition-colors"><X size={13}/></button>
        </div>
        <div className="p-4 space-y-3">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !creating && create()}
            placeholder="Page name (e.g. About, Pricing)"
            className="w-full bg-white/[0.05] border border-white/[0.07] rounded-xl px-3 py-2 text-[13px] text-white placeholder-white/18 focus:outline-none focus:border-accent-500/35 transition-colors"/>
          {useAI && (
            <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)}
              placeholder="Describe what this page should contain (optional)"
              rows={2}
              className="w-full bg-white/[0.05] border border-white/[0.07] rounded-xl px-3 py-2 text-[13px] text-white placeholder-white/18 focus:outline-none focus:border-accent-500/35 resize-none transition-colors"/>
          )}
          {/* AI toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-[12px] text-white/60 font-medium">Generate with AI</p>
              <p className="text-[10px] text-white/25 mt-0.5">
                {useAI ? "AI will build this page matching your brand" : "Creates a blank page"}
              </p>
            </div>
            <EditorSwitch
              checked={useAI}
              onChange={() => setUseAI(!useAI)}
              title={useAI ? "Generate with AI on" : "Generate with AI off"}
            />
          </div>
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] text-red-400">
              {error}
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-white/[0.06] flex justify-end gap-2">
          <button onClick={onClose} disabled={creating} className="px-3 py-1.5 text-[12px] text-white/32 hover:text-white/60 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={create} disabled={!name.trim() || creating}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent-600 hover:bg-accent-500 disabled:opacity-30 text-white text-[12px] font-semibold transition-colors">
            {creating && <Loader2 size={11} className="animate-spin"/>}
            {creating ? "Generating…" : useAI ? "Generate page" : "Create blank"}
          </button>
        </div>
      </div>
    </div>
  );
}
