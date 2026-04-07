"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  AlertCircle, CheckCircle2, Clock, Loader2, Sparkles, GripVertical,
} from "lucide-react";
import { EditorSwitch } from "./EditorSwitch";
import { extractNavbarHtml, uid } from "@/lib/utils";
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
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/[0.04] bg-[#0e1117]/95 backdrop-blur-2xl">
      <div className="flex flex-shrink-0 flex-col gap-2.5 px-3.5 pb-2.5 pt-3.5">
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setLeftPanel(t.key)}
              className={`relative flex h-8 flex-1 items-center justify-center rounded-[10px] text-center transition-all duration-200 ${
                leftPanelTab === t.key
                  ? "bg-white/[0.08] text-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "text-white/32 hover:text-white/55"
              }`}
            >
              <span className="text-[10.5px] font-medium tracking-wide">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3">
        {leftPanelTab === "pages"     && <PagesPanel project={project} pages={pages} selectedPageId={selectedPageId} onSelectPage={selectPage} onAddPage={() => setShowAdd(true)} />}
        {leftPanelTab === "navigator" && <NavPanel project={project} pages={pages} selectedPageId={selectedPageId} selectedSectionId={selectedSectionId} onSelectPage={selectPage} onSelectSection={selectSection} />}
        {leftPanelTab === "files"     && <FilesPanel pages={pages} files={files} selectedFileId={selectedFileId} onSelectFile={selectFile} />}
      </div>

      {showAdd && createPortal(<AddPageModal project={project} onClose={() => setShowAdd(false)} />, document.body)}
    </aside>
  );
}

// ── Pages ─────────────────────────────────────────────────────────────────────
function PagesPanel({ project, pages, selectedPageId, onSelectPage, onAddPage }: {
  project: Project; pages: ProjectPage[]; selectedPageId: string | null;
  onSelectPage: (id: string|null)=>void; onAddPage: ()=>void;
}) {
  const setPageContent  = useAppStore((s) => s.setPageContent);
  const setPageStatus   = useAppStore((s) => s.setPageStatus);
  const setGenStatus    = useAppStore((s) => s.setGenStatus);
  const addGenLog       = useAppStore((s) => s.addGenLog);
  const genStatus       = useAppStore((s) => s.generationStatus);
  const genProgress     = useAppStore((s) => s.generationProgress);
  const setApiError     = useAppStore((s) => s.setApiError);

  const isGenerating =
    genStatus === "blueprint" ||
    genStatus === "pages" ||
    genStatus === "normalizing" ||
    project.generationJob?.status === "queued" ||
    project.generationJob?.status === "running" ||
    project.status === "generating" ||
    pages.some((page) => page.status === "pending" || page.status === "generating");

  const [showRegen, setShowRegen]     = useState(false);
  const [regenPrompt, setRegenPrompt] = useState("");
  const [regenBtnPos, setRegenBtnPos] = useState<DOMRect | null>(null);
  const regenPopupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showRegen) return;
    function onDown(e: MouseEvent) {
      if (regenPopupRef.current && !regenPopupRef.current.contains(e.target as Node)) {
        setShowRegen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showRegen]);

  async function handleRegenerateAll() {
    if (!project.blueprint || isGenerating) return;
    setShowRegen(false);
    setRegenPrompt("");
    setGenStatus("pages", "Regenerating all pages…");
    addGenLog("🔄 Regenerating entire site…", "progress");
    let sharedNavbarHtml: string | null = null;
    let successCount = 0;
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      setPageStatus(page.id, "generating");
      setGenStatus("pages", `Regenerating ${page.name} (${i + 1}/${pages.length})…`);
      addGenLog(`📄 Regenerating ${page.name}…`, "progress");
      try {
        const bpPage = { id: page.id, name: page.name, slug: page.slug, sections: page.sections.map((s) => s.type || s.name), purpose: page.purpose };
        const result = await streamGeneratePage(
          { blueprint: project.blueprint, page: bpPage, brief: project.brief, navbarHtml: i > 0 ? sharedNavbarHtml : null },
          () => setGenStatus("pages", `Regenerating ${page.name} (${i + 1}/${pages.length})...`),
          180_000
        );
        setPageContent(page.id, result.html, result.sections, { completeGeneration: true });
        successCount += 1;
        addGenLog(`✅ ${page.name} regenerated`, "success");
        if (i === 0 && !sharedNavbarHtml && result.html) {
          sharedNavbarHtml = extractNavbarHtml(result.html);
        }
      } catch (err) {
        const { appErr, apiError } = buildClientApiError(err, API_GENERATE_001, { pageId: page.id, pageName: page.name });
        logAppError(appErr);
        setApiError(apiError);
        setPageStatus(page.id, "error");
        addGenLog(`⚠️ ${page.name} failed: ${appErr.userMessage}`, "error");
      }
    }
    const failCount = pages.length - successCount;
    setGenStatus(failCount === 0 ? "done" : "error", failCount === 0 ? "All pages regenerated!" : `${successCount}/${pages.length} pages done`);
    addGenLog(failCount === 0 ? "✅ All done!" : `⚠️ Done with ${failCount} failure${failCount > 1 ? "s" : ""}.`, failCount === 0 ? "success" : "error");
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex flex-shrink-0 items-center justify-between px-0.5 pb-3">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/25">
            Pages <span className="ml-1 text-white/14">{pages.length}</span>
          </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              setRegenBtnPos((e.currentTarget as HTMLElement).getBoundingClientRect());
              setShowRegen((v) => !v);
            }}
            disabled={!project.blueprint || isGenerating}
            title="Regenerate all pages"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/25 transition-all hover:bg-white/[0.06] hover:text-white/70 disabled:opacity-25 disabled:cursor-not-allowed"
          >
            {isGenerating ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          </button>

          {showRegen && regenBtnPos && createPortal(
            <div
              ref={regenPopupRef}
              style={{ position: "fixed", top: regenBtnPos.bottom + 8, left: Math.max(8, regenBtnPos.right - 260), zIndex: 9999 }}
              className="w-[260px] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#12161f] shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            >
              <div className="flex items-center gap-2.5 border-b border-white/[0.05] px-3.5 py-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-[#5B8CFF]/12 text-[#5B8CFF]">
                  <Sparkles size={11} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-white/85">Regenerate site</p>
                  <p className="text-[9.5px] text-white/30">{pages.length} pages will be rewritten</p>
                </div>
                <button onClick={() => setShowRegen(false)} className="flex h-6 w-6 items-center justify-center rounded-md text-white/25 transition-colors hover:bg-white/[0.06] hover:text-white/60">
                  <X size={11} />
                </button>
              </div>
              <div className="px-3.5 py-3">
                <p className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-white/22">
                  Direction <span className="normal-case tracking-normal text-white/16">— optional</span>
                </p>
                <textarea
                  value={regenPrompt}
                  onChange={(e) => setRegenPrompt(e.target.value)}
                  placeholder="Change tone, update content, try a new layout…"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-[10.5px] leading-relaxed text-white/70 placeholder-white/16 outline-none transition-colors focus:border-white/[0.1]"
                />
              </div>
              <div className="flex items-center justify-end border-t border-white/[0.05] px-3.5 py-2.5">
                <button
                  onClick={() => void handleRegenerateAll()}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#5B8CFF] px-3.5 py-1.5 text-[10px] font-semibold text-white shadow-[0_2px_8px_rgba(91,140,255,0.25)] transition-all hover:bg-[#6B99FF] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Sparkles size={10} />
                  Regenerate all
                </button>
              </div>
            </div>,
            document.body
          )}

          <button onClick={onAddPage} className="flex h-7 w-7 items-center justify-center rounded-lg text-white/25 transition-all hover:bg-white/[0.06] hover:text-white/70">
            <Plus size={12}/>
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto pb-2">
        {pages.length === 0 ? (
          <div className="px-3 py-8 text-center text-[11px] text-white/22">
            {project.generationJob?.status === "queued"
              ? project.generationJob.progressMessage?.trim() || "Queued for generation..."
              : project.generationJob?.status === "running"
                ? project.generationJob.progressMessage?.trim() || "Generating pages..."
                : project.status === "generating"
                  ? "Analyzing brief and preparing pages..."
                  : "No pages yet."}
          </div>
        ) : (
          <div className="space-y-0.5">
            {pages.map((p) => (
              <PageRow
                key={p.id}
                page={p}
                project={project}
                isSelected={selectedPageId === p.id}
                isGlobalGenerating={isGenerating}
                generationProgress={genProgress}
                onSelect={() => onSelectPage(p.id)}
              />
            ))}
          </div>
        )}
        {pages.length > 0 && (
          <button onClick={onAddPage} className="mt-1.5 flex w-full items-center gap-2 rounded-xl border border-dashed border-white/[0.06] px-3 py-2 text-[10.5px] text-white/25 transition-all hover:border-white/[0.1] hover:bg-white/[0.03] hover:text-white/50">
            <Plus size={10}/> Add page
          </button>
        )}
      </div>
    </div>
  );
}

function PageRow({
  page,
  project,
  isSelected,
  isGlobalGenerating,
  generationProgress,
  onSelect,
}: {
  page: ProjectPage;
  project: Project;
  isSelected: boolean;
  isGlobalGenerating: boolean;
  generationProgress: string;
  onSelect: ()=>void;
}) {
  const deletePage    = useAppStore((s) => s.deletePage);
  const duplicatePage = useAppStore((s) => s.duplicatePage);
  const renamePage    = useAppStore((s) => s.renamePage);
  const setPageContent  = useAppStore((s) => s.setPageContent);
  const setPageStatus   = useAppStore((s) => s.setPageStatus);
  const setGenStatus    = useAppStore((s) => s.setGenStatus);
  const addGenLog       = useAppStore((s) => s.addGenLog);
  const setApiError     = useAppStore((s) => s.setApiError);

  const [menu,           setMenu]           = useState(false);
  const [ren,            setRen]            = useState(false);
  const [name,           setName]           = useState(page.name);
  const [regen,          setRegen]          = useState(false);
  const [armedDelete,    setArmedDelete]    = useState(false);
  const [showRegenPopup, setShowRegenPopup] = useState(false);
  const [regenPromptVal, setRegenPromptVal] = useState("");
  const [regenBtnPos,    setRegenBtnPos]    = useState<DOMRect | null>(null);
  const menuRef      = useRef<HTMLDivElement>(null);
  const regenPopRef  = useRef<HTMLDivElement>(null);
  const armRef       = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!showRegenPopup) return;
    function onDown(e: MouseEvent) {
      if (regenPopRef.current && !regenPopRef.current.contains(e.target as Node)) setShowRegenPopup(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showRegenPopup]);

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

  const progressTargetsPage =
    generationProgress.trim().length > 0 &&
    generationProgress.toLowerCase().includes(page.name.trim().toLowerCase());
  const showsGeneratingState =
    regen ||
    page.status === "pending" ||
    page.status === "generating" ||
    (isGlobalGenerating && (progressTargetsPage || (isSelected && !page.html)));

  function status() {
    if (showsGeneratingState) return <Loader2 size={10} className="text-accent-400 animate-spin"/>;
    if (page.status === "done")  return <CheckCircle2 size={10} className="text-emerald-500"/>;
    if (page.status === "error") return <AlertCircle  size={10} className="text-red-400"/>;
    return <Clock size={10} className="text-white/18"/>;
  }

  async function handleRegen(prompt?: string) {
    if (!project.blueprint) return;
    setShowRegenPopup(false); setMenu(false); setRegen(true); setPageStatus(page.id, "generating");
    setGenStatus("pages", `Regenerating ${page.name}…`);
    // Reuse navbar from another already-generated page for consistency
    const otherPage = project.pages?.find((p) => p.html && p.id !== page.id);
    const navbarHtml = otherPage?.html ? extractNavbarHtml(otherPage.html) : null;
    try {
      const bp = { id: page.id, name: page.name, slug: page.slug, sections: page.sections.map((s) => s.type || s.name), purpose: page.purpose };
      const result = await streamGeneratePage(
        { blueprint: project.blueprint, page: bp, brief: project.brief, navbarHtml, instruction: prompt?.trim() || null },
        () => setGenStatus("pages", `Regenerating ${page.name}...`),
        180_000
      );
      setPageContent(page.id, result.html, result.sections, { completeGeneration: true });
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
        <div className="flex items-center gap-1.5 px-1.5 py-1">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRen(false); }}
            className="flex-1 rounded-lg border border-[#5B8CFF]/30 bg-white/[0.05] px-2.5 py-1.5 text-[11.5px] text-white outline-none min-w-0"/>
          <button onClick={() => setRen(false)} className="text-white/25 hover:text-white transition-colors"><X size={10}/></button>
        </div>
      ) : (
        <div onClick={onSelect} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onSelect()}
          className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left text-[11.5px] transition-all duration-150 cursor-pointer ${
            isSelected
              ? "bg-[#5B8CFF]/10 text-white shadow-[inset_0_0_0_1px_rgba(91,140,255,0.15)]"
              : "text-white/50 hover:text-white/75 hover:bg-white/[0.04]"
          }`}>
          <span className="flex-shrink-0">{status()}</span>
          <span className="flex-1 truncate font-medium">{page.name}</span>
          <button type="button"
            onClick={(e) => { e.stopPropagation(); setMenu(!menu); }}
            onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), setMenu(!menu))}
            className="opacity-0 group-hover/row:opacity-100 w-6 h-6 flex items-center justify-center rounded-md text-white/25 hover:text-white hover:bg-white/[0.08] transition-all flex-shrink-0 cursor-pointer">
            <MoreHorizontal size={11}/>
          </button>
        </div>
      )}
      {menu && (
        <div ref={menuRef} className="absolute right-1 top-9 z-50 w-[172px] overflow-hidden rounded-xl border border-white/[0.06] bg-[#12161f] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
          <MI icon={<RefreshCw size={11}/>} label="Regenerate" disabled={!project.blueprint} onClick={(e) => {
            setRegenBtnPos((e.currentTarget as HTMLElement).getBoundingClientRect());
            setMenu(false);
            setShowRegenPopup(true);
          }}/>
          <MI icon={<Pencil size={11}/>}    label="Rename"     onClick={() => { setRen(true); setMenu(false); }}/>
          <MI icon={<Copy size={11}/>}      label="Duplicate"  onClick={() => { duplicatePage(page.id); setMenu(false); }}/>
          <div className="mx-2.5 h-px bg-white/[0.05] my-0.5"/>
          <MI icon={<Trash2 size={11}/>}    label={armedDelete ? "Confirm delete?" : "Delete"} danger onClick={handleDeletePage} disabled={(project.pages?.length??0)<=1}/>
        </div>
      )}
      {showRegenPopup && regenBtnPos && createPortal(
        <div
          ref={regenPopRef}
          style={{ position: "fixed", top: regenBtnPos.bottom + 6, left: Math.max(8, regenBtnPos.right - 260), zIndex: 9999 }}
          className="w-[260px] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#12161f] shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
        >
          <div className="flex items-center gap-2.5 border-b border-white/[0.05] px-3.5 py-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-[#5B8CFF]/12 text-[#5B8CFF]">
              <Sparkles size={11} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-white/85">Regenerate page</p>
              <p className="truncate text-[9.5px] text-white/30">{page.name}</p>
            </div>
            <button onClick={() => setShowRegenPopup(false)} className="flex h-6 w-6 items-center justify-center rounded-md text-white/25 transition-colors hover:bg-white/[0.06] hover:text-white/60">
              <X size={11} />
            </button>
          </div>
          <div className="px-3.5 py-3">
            <p className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-white/22">
              Direction <span className="normal-case tracking-normal text-white/16">— optional</span>
            </p>
            <textarea
              value={regenPromptVal}
              onChange={(e) => setRegenPromptVal(e.target.value)}
              placeholder="Change tone, update content, try a new layout…"
              rows={2}
              className="w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-[10.5px] leading-relaxed text-white/70 placeholder-white/16 outline-none transition-colors focus:border-white/[0.1]"
            />
          </div>
          <div className="flex items-center justify-end border-t border-white/[0.05] px-3.5 py-2.5">
            <button
              onClick={() => { void handleRegen(regenPromptVal); setRegenPromptVal(""); }}
              disabled={regen}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#5B8CFF] px-3.5 py-1.5 text-[10px] font-semibold text-white shadow-[0_2px_8px_rgba(91,140,255,0.25)] transition-all hover:bg-[#6B99FF] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Sparkles size={10} />
              Regenerate
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function MI({ icon, label, onClick, danger, disabled }: { icon: React.ReactNode; label: string; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-2.5 w-full px-3 py-2 text-[11px] transition-colors duration-100 disabled:opacity-20 disabled:cursor-not-allowed ${
        danger ? "text-red-400/60 hover:bg-red-500/8 hover:text-red-300" : "text-white/50 hover:bg-white/[0.05] hover:text-white/85"
      }`}>
      {icon} {label}
    </button>
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildManualPageTemplate(project: Project, pageName: string, purpose: string): string {
  const siteName = project.blueprint?.siteName || project.name || "Sitezy";
  const description = project.brief?.description?.trim() || "A polished page starter you can refine visually or in code.";
  const pageSummary = purpose.trim() || `A starter layout for the ${pageName} page.`;
  const primary = project.blueprint?.colorScheme.primary || "#6b77ff";
  const secondary = project.blueprint?.colorScheme.secondary || "#111827";
  const accent = project.blueprint?.colorScheme.accent || primary;
  const text = project.blueprint?.colorScheme.text || "#101827";
  const bg = project.blueprint?.colorScheme.bg || "#ffffff";
  const muted = project.blueprint?.colorScheme.muted || "#667085";
  const border = project.blueprint?.colorScheme.border || "rgba(15,23,42,0.10)";
  const headingFont = project.blueprint?.typography.headingFont || "Inter";
  const bodyFont = project.blueprint?.typography.bodyFont || "Inter";
  const existingNavbar = project.pages
    .map((page) => page.html)
    .find((html) => !!html)
    ?.trim();
  const navbarHtml = existingNavbar ? extractNavbarHtml(existingNavbar) : null;

  return `
${navbarHtml ?? `<nav data-sz-section-id="sec-${uid()}" data-sz-section-type="navbar" data-sz-section-name="Navigation" style="position:sticky;top:0;z-index:1000;padding:18px 32px;border-bottom:1px solid ${border};background:color-mix(in srgb, ${bg} 92%, white 8%);backdrop-filter:blur(18px);font-family:'${bodyFont}',system-ui,sans-serif;">
  <div style="width:min(100%,1180px);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:20px;">
    <a href="/" style="font-family:'${headingFont}',system-ui,sans-serif;font-size:22px;font-weight:800;color:${text};text-decoration:none;">${escapeHtml(siteName)}</a>
    <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;">
      <a href="/home" style="color:${muted};text-decoration:none;font-size:14px;">Home</a>
      <a href="/${escapeHtml(pageName.toLowerCase().replace(/\s+/g, "-"))}" style="color:${text};text-decoration:none;font-size:14px;font-weight:600;">${escapeHtml(pageName)}</a>
      <a href="#next-step" style="display:inline-flex;align-items:center;justify-content:center;padding:12px 18px;border-radius:14px;background:${primary};color:#fff;text-decoration:none;font-size:14px;font-weight:700;box-shadow:0 12px 28px rgba(0,0,0,0.12);">Get started</a>
    </div>
  </div>
</nav>`}
<section data-sz-section-id="sec-${uid()}" data-sz-section-type="hero" data-sz-section-name="Hero" style="padding:112px 32px 88px;background:linear-gradient(135deg, color-mix(in srgb, ${primary} 10%, ${bg}), ${bg});font-family:'${bodyFont}',system-ui,sans-serif;color:${text};">
  <div style="width:min(100%,1180px);margin:0 auto;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(320px,0.85fr);gap:28px;align-items:center;">
    <div style="display:grid;gap:22px;">
      <span style="display:inline-flex;width:max-content;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:color-mix(in srgb, ${primary} 10%, white);border:1px solid color-mix(in srgb, ${primary} 22%, transparent);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${primary};">Starter Page</span>
      <div>
        <h1 style="margin:0 0 14px;font-family:'${headingFont}',system-ui,sans-serif;font-size:clamp(42px,7vw,78px);line-height:.97;letter-spacing:-.04em;color:${text};">${escapeHtml(pageName)}</h1>
        <p style="margin:0;max-width:720px;font-size:18px;line-height:1.8;color:${muted};">${escapeHtml(pageSummary)}</p>
      </div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;">
        <a href="#overview" style="display:inline-flex;align-items:center;justify-content:center;padding:15px 24px;border-radius:16px;background:${primary};color:#fff;text-decoration:none;font-size:15px;font-weight:700;">Explore section</a>
        <a href="#next-step" style="display:inline-flex;align-items:center;justify-content:center;padding:15px 24px;border-radius:16px;border:1px solid ${border};background:${bg};color:${text};text-decoration:none;font-size:15px;font-weight:600;">Edit this page</a>
      </div>
    </div>
    <div style="padding:28px;border-radius:26px;background:${bg};border:1px solid ${border};box-shadow:0 24px 60px rgba(15,23,42,0.10);display:grid;gap:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <strong style="font-family:'${headingFont}',system-ui,sans-serif;font-size:18px;color:${text};">${escapeHtml(siteName)}</strong>
        <span style="display:inline-flex;align-items:center;gap:8px;font-size:12px;color:${muted};"><span style="width:8px;height:8px;border-radius:999px;background:${accent};display:inline-block;"></span>Demo layout</span>
      </div>
      <div style="display:grid;gap:12px;">
        ${[
          ["Message", "Replace this intro with your real pitch."],
          ["Visual", "Swap structure, blocks, or styles from the editor."],
          ["Action", "Use this starter to move faster without AI."],
        ].map(([label, body]) => `<div style="padding:14px 16px;border-radius:18px;background:color-mix(in srgb, ${primary} 4%, ${bg});border:1px solid ${border};"><p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${primary};">${label}</p><p style="margin:0;font-size:14px;line-height:1.7;color:${muted};">${body}</p></div>`).join("")}
      </div>
    </div>
  </div>
</section>
<section id="overview" data-sz-section-id="sec-${uid()}" data-sz-section-type="features" data-sz-section-name="Highlights" style="padding:0 32px 88px;background:${bg};font-family:'${bodyFont}',system-ui,sans-serif;color:${text};">
  <div style="width:min(100%,1180px);margin:0 auto;display:grid;gap:24px;">
    <div style="max-width:720px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${primary};">Overview</p>
      <h2 style="margin:0 0 12px;font-family:'${headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);line-height:1.08;color:${text};">A clean demo structure you can keep or replace.</h2>
      <p style="margin:0;font-size:16px;line-height:1.8;color:${muted};">${escapeHtml(description)}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;">
      ${[
        ["01", "Hero content", "Update the headline, summary, and CTAs without starting from a blank page."],
        ["02", "Flexible section", "Drop in blocks, switch layouts, or turn this into services, pricing, or FAQ."],
        ["03", "Next step", "Use this page as a placeholder until you decide to regenerate it with AI later."],
      ].map(([num, title, body]) => `<article style="padding:26px;border-radius:24px;background:color-mix(in srgb, ${primary} 4%, ${bg});border:1px solid ${border};box-shadow:0 16px 36px rgba(15,23,42,0.06);"><span style="display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:999px;background:${primary};color:#fff;font-size:13px;font-weight:700;">${num}</span><h3 style="margin:18px 0 10px;font-family:'${headingFont}',system-ui,sans-serif;font-size:22px;line-height:1.12;color:${text};">${title}</h3><p style="margin:0;font-size:14px;line-height:1.8;color:${muted};">${body}</p></article>`).join("")}
    </div>
  </div>
</section>
<section id="next-step" data-sz-section-id="sec-${uid()}" data-sz-section-type="cta" data-sz-section-name="Call To Action" style="padding:0 32px 96px;background:${bg};font-family:'${bodyFont}',system-ui,sans-serif;color:${text};">
  <div style="width:min(100%,1180px);margin:0 auto;padding:40px;border-radius:30px;background:${secondary};color:#fff;display:grid;gap:16px;box-shadow:0 24px 60px rgba(2,6,23,0.24);">
    <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,0.62);">Next step</p>
    <h2 style="margin:0;font-family:'${headingFont}',system-ui,sans-serif;font-size:clamp(30px,4vw,48px);line-height:1.05;color:#fff;">This page is ready for editing.</h2>
    <p style="margin:0;max-width:720px;font-size:16px;line-height:1.8;color:rgba(255,255,255,0.72);">Keep this starter, refine it visually, or switch to AI regeneration later once you know what this page should become.</p>
    <div style="display:flex;gap:14px;flex-wrap:wrap;">
      <a href="#overview" style="display:inline-flex;align-items:center;justify-content:center;padding:14px 22px;border-radius:16px;background:#fff;color:${secondary};text-decoration:none;font-size:14px;font-weight:700;">Review structure</a>
      <a href="/" style="display:inline-flex;align-items:center;justify-content:center;padding:14px 22px;border-radius:16px;border:1px solid rgba(255,255,255,0.16);color:#fff;text-decoration:none;font-size:14px;font-weight:600;">Back to home</a>
    </div>
  </div>
</section>
<footer data-sz-section-id="sec-${uid()}" data-sz-section-type="footer" data-sz-section-name="Footer" style="padding:32px;background:${text};font-family:'${bodyFont}',system-ui,sans-serif;color:#fff;">
  <div style="width:min(100%,1180px);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
    <div>
      <strong style="display:block;font-family:'${headingFont}',system-ui,sans-serif;font-size:18px;">${escapeHtml(siteName)}</strong>
      <span style="font-size:13px;color:rgba(255,255,255,0.58);">${escapeHtml(pageName)} demo page</span>
    </div>
    <div style="display:flex;gap:20px;flex-wrap:wrap;">
      <a href="/home" style="color:rgba(255,255,255,0.68);text-decoration:none;font-size:14px;">Home</a>
      <a href="/${escapeHtml(pageName.toLowerCase().replace(/\s+/g, "-"))}" style="color:#fff;text-decoration:none;font-size:14px;">${escapeHtml(pageName)}</a>
    </div>
  </div>
</footer>`.trim();
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
  const [secMenu, setSecMenu] = useState<{ pageId: string; sectionId: string; pos: DOMRect } | null>(null);
  const secMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!secMenu) return;
    function onDown(e: MouseEvent) {
      if (secMenuRef.current && !secMenuRef.current.contains(e.target as Node)) setSecMenu(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [secMenu]);

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
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex flex-shrink-0 items-center justify-between px-0.5 pb-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/25">
          Layers <span className="ml-1 text-white/14">{pages.reduce((count, page) => count + page.sections.length, 0)}</span>
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto pb-2">
        <div className="space-y-1">
        {pages.map((page) => {
          const open = exp[page.id] ?? true;
          const isPageSelected = selectedPageId === page.id;
          return (
            <div key={page.id} className="space-y-0.5">
              <button
                onClick={() => {
                  onSelectPage(page.id);
                  setExp((e) => ({ ...e, [page.id]: !open }));
                }}
                className={`w-full rounded-xl transition-all duration-150 ${
                  isPageSelected
                    ? "bg-[#5B8CFF]/10 shadow-[inset_0_0_0_1px_rgba(91,140,255,0.15)]"
                    : "hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-2 px-3 py-2">
                  <ChevronRight size={10} className={`flex-shrink-0 text-white/20 transition-transform duration-150 ${open ? "rotate-90" : ""}`} />
                  <div className="min-w-0 flex-1 text-left">
                    <div className={`truncate text-[11px] font-medium ${isPageSelected ? "text-white" : "text-white/65"}`}>{page.name}</div>
                  </div>
                  <span className="text-[9px] tabular-nums text-white/20">
                    {page.sections.length}
                  </span>
                </div>
              </button>
              {open && (
                <div className="space-y-0.5 pl-3 ml-1.5 border-l border-white/[0.04]">
                  {page.sections.length === 0
                    ? (
                      <div className="rounded-lg px-2.5 py-2.5">
                        <p className="text-[10px] text-white/25">No sections yet</p>
                        <p className="mt-0.5 text-[9px] leading-4 text-white/15">Use Elements to add the first section.</p>
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
                        style={dragOver?.pageId === page.id && dragOver.index === i && dragSrc?.sectionId !== sec.id ? { outline: "1px solid rgba(91,140,255,0.4)", borderRadius: 10 } : undefined}
                      >
                        {confirmDelete === sec.id ? (
                          <div className="flex items-center gap-2 rounded-xl bg-red-500/8 px-2.5 py-1.5 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.15)]">
                            <Trash2 size={9} className="text-red-400/70 flex-shrink-0" />
                            <span className="flex-1 text-[10px] text-red-300/70 truncate">Delete "{sec.name||sec.type}"?</span>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-1.5 py-0.5 text-[9px] text-white/30 hover:text-white/60 rounded transition-colors">
                              Cancel
                            </button>
                            <button
                              onClick={() => confirmDeleteSection(sec.id)}
                              className="px-1.5 py-0.5 text-[9px] text-red-400 bg-red-500/12 hover:bg-red-500/20 rounded transition-colors font-medium">
                              Delete
                            </button>
                          </div>
                        ) : (
                          <div
                            className={`relative rounded-xl transition-all duration-150 ${
                              selectedSectionId === sec.id
                                ? "bg-[#5B8CFF]/8 shadow-[inset_0_0_0_1px_rgba(91,140,255,0.12)]"
                                : "hover:bg-white/[0.03]"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 px-2 py-1.5">
                              <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-white/16 transition-colors group-hover/sec:text-white/30">
                                <GripVertical size={9} className="cursor-grab active:cursor-grabbing" />
                              </span>
                              <button
                                onClick={() => {
                                  onSelectSection(sec.id);
                                  onSelectPage(page.id);
                                  const iframe = document.querySelector('iframe[data-sitezy-preview-frame="1"]') as HTMLIFrameElement | null;
                                  const target = iframe?.contentDocument?.querySelector(`[data-sz-section-id="${sec.id}"]`);
                                  target?.scrollIntoView({ behavior: "smooth", block: "start" });
                                }}
                                className="min-w-0 flex-1 text-left"
                              >
                                <div className={`truncate text-[10.5px] font-medium ${selectedSectionId === sec.id ? "text-white" : "text-white/55"}`}>
                                  {sec.name || sec.type}
                                </div>
                                <div className="mt-0.5 truncate text-[8px] text-white/18">
                                  {sec.type}
                                </div>
                              </button>
                              <div className={`transition-all ${
                                selectedSectionId === sec.id ? "opacity-100" : "pointer-events-none opacity-0 group-hover/sec:pointer-events-auto group-hover/sec:opacity-100"
                              }`}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (secMenu?.pageId === page.id && secMenu?.sectionId === sec.id) { setSecMenu(null); return; }
                                  setSecMenu({ pageId: page.id, sectionId: sec.id, pos: (e.currentTarget as HTMLElement).getBoundingClientRect() });
                                }}
                                className={`flex h-5 w-5 items-center justify-center rounded-md text-white/22 transition-all flex-shrink-0 cursor-pointer hover:bg-white/[0.07] hover:text-white/70 ${
                                  secMenu?.pageId === page.id && secMenu?.sectionId === sec.id
                                    ? "opacity-100 text-white/70 bg-white/[0.07]"
                                    : ""
                                }`}
                              >
                                {regeneratingSectionId === sec.id ? <Loader2 size={9} className="animate-spin" /> : <MoreHorizontal size={10} />}
                              </button>
                            </div>
                            </div>
                            {regenMenu?.pageId === page.id && regenMenu?.sectionId === sec.id && createPortal(
                              <div
                                ref={regenMenuRef}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: "fixed",
                                  left: regenMenuPos?.left ?? 0,
                                  top: regenMenuPos?.top ?? 0,
                                  zIndex: 9999,
                                }}
                                className="w-[260px] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#12161f] shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
                              >
                                <div className="flex items-center gap-2.5 border-b border-white/[0.05] px-3.5 py-3">
                                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-[#5B8CFF]/12 text-[#5B8CFF]">
                                    <Sparkles size={11} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-semibold text-white/85">Regenerate</p>
                                    <p className="truncate text-[9.5px] text-white/30">{sec.name || sec.type}</p>
                                  </div>
                                  <button
                                    onClick={() => { setRegenMenu(null); setRegenMenuPos(null); }}
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-white/25 transition-colors hover:bg-white/[0.06] hover:text-white/60"
                                  >
                                    <X size={11} />
                                  </button>
                                </div>

                                <div className="px-3.5 py-3">
                                  <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.14em] text-white/22">Direction</p>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {SECTION_REGEN_OPTIONS.map((option) => (
                                      <button
                                        key={option.key}
                                        onClick={() => setRegenMode(option.key)}
                                        className={`rounded-lg px-2.5 py-2 text-left transition-all duration-150 ${
                                          regenMode === option.key
                                            ? "bg-[#5B8CFF]/12 text-white/85 shadow-[inset_0_0_0_1px_rgba(91,140,255,0.2)]"
                                            : "bg-white/[0.02] text-white/35 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:bg-white/[0.04] hover:text-white/55"
                                        }`}
                                      >
                                        <div className="text-[10px] font-semibold leading-tight">{option.label}</div>
                                        <div className="mt-0.5 text-[8.5px] leading-tight text-white/20">{option.hint}</div>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="px-3.5 pb-3">
                                  <p className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-white/22">Prompt <span className="normal-case tracking-normal text-white/16">— optional</span></p>
                                  <textarea
                                    value={regenPrompt}
                                    onChange={(e) => setRegenPrompt(e.target.value)}
                                    placeholder="Extra direction, tone changes…"
                                    rows={2}
                                    className="w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-[10.5px] leading-relaxed text-white/70 placeholder-white/16 outline-none transition-colors focus:border-white/[0.1]"
                                  />
                                </div>

                                <div className="flex items-center justify-end border-t border-white/[0.05] gap-2 px-3.5 py-2.5">
                                  <button
                                    onClick={() => void handleRegenerateSection(page, sec.id, regenMode, regenPrompt)}
                                    disabled={regeneratingSectionId !== null}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#5B8CFF] px-3.5 py-1.5 text-[10px] font-semibold text-white shadow-[0_2px_8px_rgba(91,140,255,0.25)] transition-all hover:bg-[#6B99FF] disabled:cursor-not-allowed disabled:opacity-35"
                                  >
                                    <Sparkles size={10} />
                                    Regenerate
                                  </button>
                                </div>
                              </div>,
                              document.body
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
      {secMenu && (() => {
        const p = pages.find((pg) => pg.id === secMenu.pageId);
        return createPortal(
          <div
            ref={secMenuRef}
            style={{
              position: "fixed",
              top: secMenu.pos.bottom + 6,
              left: Math.max(8, secMenu.pos.right - 172),
              zIndex: 9999,
            }}
            className="w-[172px] overflow-hidden rounded-xl border border-white/[0.06] bg-[#12161f] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
          >
            <button onClick={() => { if (p) duplicateSection(p, secMenu.sectionId); setSecMenu(null); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-[11px] text-white/50 hover:bg-white/[0.05] hover:text-white/85 transition-colors duration-100">
              <Copy size={11} /> Duplicate
            </button>
            {project.blueprint && (
              <button onClick={() => { if (p) openRegenMenu(secMenu.pageId, secMenu.sectionId, secMenuRef.current as HTMLElement); setSecMenu(null); }} disabled={regeneratingSectionId !== null}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-[11px] text-white/50 hover:bg-white/[0.05] hover:text-white/85 transition-colors duration-100 disabled:opacity-20 disabled:cursor-not-allowed">
                <RefreshCw size={11} /> Regenerate
              </button>
            )}
            <div className="mx-2.5 h-px bg-white/[0.05] my-0.5" />
            <button onClick={() => { setConfirmDelete(secMenu.sectionId); setSecMenu(null); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-[11px] text-red-400/60 hover:bg-red-500/8 hover:text-red-300 transition-colors duration-100">
              <Trash2 size={11} /> Delete
            </button>
          </div>,
          document.body
        );
      })()}
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex flex-shrink-0 items-center justify-between px-0.5 pb-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/25">Files</p>
        <span className="text-[9px] tabular-nums text-white/14">{pages.length + css.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto space-y-0.5 pb-2">
        <div className="px-1 pb-1.5 text-[9px] font-medium text-white/18 uppercase tracking-[0.12em]">Pages</div>
        {pages.map((p) => {
          const rawSlug = (p.slug || p.name.toLowerCase().replace(/\s+/g,"-")).replace(/^\/+/, "");
          const filename = rawSlug ? `${rawSlug}.html` : "index.html";
          return (
            <button key={p.id} onClick={() => onSelectFile(p.id)}
              className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[11px] transition-all duration-150 ${
                selectedFileId===p.id
                  ? "bg-[#5B8CFF]/10 text-white shadow-[inset_0_0_0_1px_rgba(91,140,255,0.15)]"
                  : "text-white/45 hover:text-white/70 hover:bg-white/[0.04]"
              }`}>
              <FileCode2 size={11} className={`flex-shrink-0 ${selectedFileId===p.id ? "text-[#5B8CFF]" : "text-[#5B8CFF]/40"}`}/>
              <span className="truncate font-mono">{filename}</span>
            </button>
          );
        })}
        {css.length > 0 && (
          <>
            <div className="px-1 pt-3 pb-1.5 text-[9px] font-medium text-white/18 uppercase tracking-[0.12em]">Styles</div>
            {css.map((f) => (
              <button key={f.id} onClick={() => onSelectFile(f.id)}
                className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[11px] transition-all duration-150 ${
                  selectedFileId===f.id
                    ? "bg-amber-500/8 text-white shadow-[inset_0_0_0_1px_rgba(245,158,11,0.15)]"
                    : "text-white/45 hover:text-white/70 hover:bg-white/[0.04]"
                }`}>
                <FileCode2 size={11} className={`flex-shrink-0 ${selectedFileId===f.id ? "text-amber-400/80" : "text-amber-300/30"}`}/>
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
    const manualTemplateHtml = useAI ? "" : buildManualPageTemplate(project, name.trim(), purpose.trim());
    addPage({
      id,
      name: name.trim(),
      slug,
      sections: [],
      purpose: purpose.trim() || name.trim(),
      html: manualTemplateHtml,
      status: useAI ? "generating" : "done",
    });

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
        () => setGenStatus("pages", `Generating ${name.trim()}...`),
        180_000
      );
      setPageContent(id, result.html, result.sections, { completeGeneration: true });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md sm:p-6">
      <div className="flex w-full max-w-[960px] max-h-[min(840px,90vh)] flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0e1117] shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-white/[0.05] px-6 py-5">
          <div className="min-w-0">
            <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-white/20">Pages</p>
            <h3 className="mt-1.5 text-[22px] font-semibold tracking-tight text-white/90 sm:text-[26px]">New page</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
          >
            <X size={15}/>
          </button>
        </div>
        <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5 overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              <p className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-white/28">Page name</p>
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !creating && create()}
              placeholder="Page name (e.g. About, Pricing)"
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5 text-[15px] text-white/90 placeholder:text-white/20 outline-none transition-colors focus:border-white/[0.1]"/>
            </div>

            <div className="space-y-2">
              <p className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-white/28">
                {useAI ? "Page direction" : "Starter summary"}
              </p>
              <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)}
                placeholder={useAI ? "Describe what this page should contain (optional)" : "Add a short summary to seed the demo page (optional)"}
                rows={5}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5 text-[14px] leading-relaxed text-white/80 placeholder:text-white/18 resize-none outline-none transition-colors focus:border-white/[0.1]"/>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/8 px-4 py-3 text-[12px] text-red-300/80 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.15)]">
                {error}
              </div>
            )}
          </div>

          <div className="border-t border-white/[0.05] bg-white/[0.015] lg:border-l lg:border-t-0">
            <div className="space-y-4 overflow-y-auto px-6 py-5">
              <div className="space-y-2.5">
                <p className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-white/28">Start with</p>
                <div className="grid gap-2.5">
                  <button
                    type="button"
                    onClick={() => setUseAI(true)}
                    data-active={useAI}
                    className={`flex min-h-[120px] flex-col items-start justify-between rounded-xl px-4 py-4 text-left transition-all duration-200 ${
                      useAI
                        ? "bg-[#5B8CFF]/10 text-white shadow-[inset_0_0_0_1px_rgba(91,140,255,0.2)]"
                        : "bg-white/[0.02] text-white/45 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-[12.5px] font-semibold text-inherit">
                      <Sparkles size={13} className="flex-shrink-0" />
                      AI generate
                    </span>
                    <span className={`max-w-[28ch] text-[12px] leading-relaxed ${useAI ? "text-white/65" : "text-white/28"}`}>
                      Build a page that follows your project direction, style, and structure.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseAI(false)}
                    data-active={!useAI}
                    className={`flex min-h-[120px] flex-col items-start justify-between rounded-xl px-4 py-4 text-left transition-all duration-200 ${
                      !useAI
                        ? "bg-[#7A5CFF]/10 text-white shadow-[inset_0_0_0_1px_rgba(122,92,255,0.2)]"
                        : "bg-white/[0.02] text-white/45 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-[12.5px] font-semibold text-inherit">
                      <FileCode2 size={13} className="flex-shrink-0" />
                      Demo starter
                    </span>
                    <span className={`max-w-[28ch] text-[12px] leading-relaxed ${!useAI ? "text-white/65" : "text-white/28"}`}>
                      Start from a simple editable template and shape it manually.
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.025] px-4 py-3.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-white/70">
                    {useAI ? "AI will generate this page." : "A demo page will be created instantly."}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/30">
                    {useAI ? "Use this when you know the intent and want the system to build it." : "Use this when you want a quick scaffold you can edit right away."}
                  </p>
                </div>
                <EditorSwitch
                  checked={useAI}
                  onChange={() => setUseAI(!useAI)}
                  title={useAI ? "AI generate on" : "Demo starter on"}
                  className="scale-[0.9] flex-shrink-0"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-white/[0.05] px-6 py-4 sm:flex-row sm:justify-end">
          <button onClick={onClose} disabled={creating} className="rounded-xl bg-white/[0.04] px-5 py-2.5 text-[13px] font-medium text-white/55 transition-colors hover:bg-white/[0.07] hover:text-white/80 disabled:opacity-40">Cancel</button>
          <button onClick={create} disabled={!name.trim() || creating}
            className="flex min-w-[170px] items-center justify-center gap-1.5 rounded-xl bg-[#5B8CFF] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(91,140,255,0.3)] transition-all hover:bg-[#6B99FF] disabled:opacity-25">
            {creating && <Loader2 size={11} className="animate-spin"/>}
            {creating ? "Generating..." : useAI ? "Generate page" : "Create demo"}
          </button>
        </div>
      </div>
    </div>
  );
}
