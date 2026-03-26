"use client";
import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { getSectionContext, replaceSectionInPageHtml } from "@/lib/editor/structure";
import {
  Layers, FolderTree, Plus, FileCode2,
  ChevronRight, MoreHorizontal, RefreshCw, Pencil, Copy, Trash2, X,
  AlertCircle, CheckCircle2, Clock, Loader2, Sparkles,
} from "lucide-react";
import type { PageSection, Project, ProjectPage } from "@/types";

interface Props { project: Project; }

export function LeftSidebar({ project }: Props) {
  const leftPanelTab      = useAppStore((s) => s.editor.leftPanelTab);
  const selectedPageId    = useAppStore((s) => s.editor.selectedPageId);
  const selectedFileId    = useAppStore((s) => s.editor.selectedFileId);
  const selectedSectionId = useAppStore((s) => s.editor.selectedSectionId);
  const visualEditMode    = useAppStore((s) => s.editor.visualEditMode);
  const setLeftPanel      = useAppStore((s) => s.setLeftPanel);
  const selectPage        = useAppStore((s) => s.selectPage);
  const selectFile        = useAppStore((s) => s.selectFile);
  const selectSection     = useAppStore((s) => s.selectSection);
  const updateFileContent = useAppStore((s) => s.updateFileContent);

  const pages = project.pages ?? [];
  const files = project.files ?? {};
  const [showAdd, setShowAdd] = useState(false);

  const tabs = [
    { key: "pages"     as const, icon: <Layers size={11}/>,    label: "Pages" },
    { key: "navigator" as const, icon: <FolderTree size={11}/>, label: "Layers" },
    { key: "files"     as const, icon: <FileCode2 size={11}/>,  label: "Files" },
  ];

  return (
    <aside className="editor-sidebar flex h-full w-[248px] flex-shrink-0 flex-col border-r border-white/[0.07]">
      <div className="border-b border-white/[0.06] px-3 py-3.5 flex-shrink-0">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/28">Workspace</p>
            <p className="mt-1 text-[11px] text-white/48">{project.name}</p>
          </div>
          <span className="editor-chip rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em]">
            {pages.length} pages
          </span>
        </div>
        <div className="editor-tablist flex items-center gap-1 rounded-[20px] p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setLeftPanel(t.key)}
            data-active={leftPanelTab === t.key}
            className="editor-tab flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl px-2 text-[10.5px] font-semibold transition-all"
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {leftPanelTab === "pages"     && <PagesPanel project={project} pages={pages} selectedPageId={selectedPageId} onSelectPage={selectPage} onAddPage={() => setShowAdd(true)} />}
        {leftPanelTab === "navigator" && <NavPanel project={project} pages={pages} selectedPageId={selectedPageId} selectedSectionId={selectedSectionId} visualEditMode={visualEditMode} updateFileContent={updateFileContent} onSelectPage={selectPage} onSelectSection={selectSection} />}
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
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.05] flex-shrink-0 bg-white/[0.02]">
        <span className="text-[10px] font-bold text-white/32 uppercase tracking-[0.18em]">
          Pages <span className="text-white/14 font-normal">{pages.length}</span>
        </span>
        <button onClick={onAddPage} className="editor-action-btn flex h-8 w-8 items-center justify-center rounded-xl text-white/60">
          <Plus size={12}/>
        </button>
      </div>
      <div className="editor-scroll flex-1 overflow-auto py-2">
        {pages.length === 0 ? (
          <div className="px-4 py-8 text-center text-[11px] text-white/24">No pages yet.</div>
        ) : (
          <div className="px-3 space-y-1.5">
            {pages.map((p) => (
              <PageRow key={p.id} page={p} project={project} isSelected={selectedPageId===p.id} onSelect={() => onSelectPage(p.id)}/>
            ))}
          </div>
        )}
        {pages.length > 0 && (
          <button onClick={onAddPage} className="mx-3 mt-2 flex w-[calc(100%-24px)] items-center gap-2 rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.02] px-3 py-3 text-[11px] text-white/42 transition-all hover:border-white/[0.16] hover:bg-white/[0.04] hover:text-white/72">
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
    if (regen || page.status === "generating") return <Loader2 size={10} className="text-indigo-400 animate-spin"/>;
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
    const navbarHtml = otherPage?.html
      ? (otherPage.html.match(/<nav[\s\S]*?<\/nav>/i)?.[0] ?? otherPage.html.match(/<header[\s\S]*?<\/header>/i)?.[0] ?? null)
      : null;
    try {
      const bp = { id: page.id, name: page.name, slug: page.slug, sections: page.sections.map((s) => s.type || s.name), purpose: page.purpose };
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blueprint: project.blueprint, page: bp, brief: project.brief, navbarHtml }) });
      if (!res.ok) throw new Error();
      const result: { html: string; sections: PageSection[] } = await res.json();
      setPageContent(page.id, result.html, result.sections);
      setGenStatus("done", "Done!");
    } catch { setPageStatus(page.id, "error"); setGenStatus("error", "Failed"); }
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
            className="flex-1 bg-white/[0.07] border border-indigo-500/35 rounded-md px-2 py-1 text-[12px] text-white focus:outline-none min-w-0"/>
          <button onClick={() => setRen(false)} className="text-white/25 hover:text-white transition-colors"><X size={10}/></button>
        </div>
      ) : (
        <div onClick={onSelect} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onSelect()}
          className={`flex items-center gap-2.5 w-full px-3 py-3 rounded-2xl text-left text-[12px] transition-all cursor-pointer border ${
            isSelected
              ? "border-white/[0.12] bg-[linear-gradient(180deg,rgba(45,212,191,0.18),rgba(255,255,255,0.03))] text-white shadow-[0_18px_28px_rgba(13,148,136,0.12)]"
              : "border-white/[0.04] bg-white/[0.015] text-white/48 hover:border-white/[0.08] hover:bg-white/[0.045] hover:text-white/80"
          }`}>
          <span className="flex-shrink-0">{status()}</span>
          <span className="flex-1 truncate font-medium">{page.name}</span>
          <div role="button" tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setMenu(!menu); }}
            onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), setMenu(!menu))}
            className="opacity-0 group-hover/row:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg text-white/28 hover:text-white hover:bg-white/[0.09] transition-all flex-shrink-0 cursor-pointer">
            <MoreHorizontal size={11}/>
          </div>
        </div>
      )}
      {menu && (
        <div ref={menuRef} className="editor-dialog absolute right-2 top-10 z-50 w-44 overflow-hidden rounded-2xl py-1.5">
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
      className={`flex items-center gap-2 w-full px-3.5 py-2.5 text-[11px] transition-colors disabled:opacity-20 disabled:cursor-not-allowed ${
        danger ? "text-red-300/70 hover:bg-red-500/10 hover:text-red-200" : "text-white/56 hover:bg-white/[0.05] hover:text-white"
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
function NavPanel({ project, pages, selectedPageId, selectedSectionId, visualEditMode, updateFileContent, onSelectPage, onSelectSection }: {
  project: Project;
  pages: ProjectPage[]; selectedPageId: string|null; selectedSectionId: string|null;
  visualEditMode: boolean; updateFileContent: (fileId: string, content: string) => void;
  onSelectPage: (id: string|null)=>void; onSelectSection: (id: string|null)=>void;
}) {
  const setPageContent = useAppStore((s) => s.setPageContent);
  const addGenLog = useAppStore((s) => s.addGenLog);
  const setGenStatus = useAppStore((s) => s.setGenStatus);
  const [exp, setExp] = useState<Record<string,boolean>>(() =>
    Object.fromEntries(pages.map((p) => [p.id, true]))
  );
  const [confirmDelete, setConfirmDelete] = useState<string|null>(null);
  const [regeneratingSectionId, setRegeneratingSectionId] = useState<string | null>(null);
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

  function confirmDeleteSection(sectionId: string) {
    setConfirmDelete(null);
    if (selectedSectionId === sectionId) onSelectSection(null);
    if (visualEditMode) {
      const iframe = document.querySelector('iframe[data-sitezy-preview-frame="editor"]') as HTMLIFrameElement | null;
      iframe?.contentWindow?.postMessage({ target: "sitezy-iframe", type: "delete-section", sectionId }, "*");
    } else {
      const page = pages.find((p) => p.id === selectedPageId);
      if (!page?.html || !selectedPageId) return;
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<body>${page.html}</body>`, "text/html");
      const el = doc.querySelector(`[data-sz-section-id="${sectionId.replace(/"/g, '\\"')}"]`);
      if (el) { el.remove(); updateFileContent(selectedPageId, doc.body.innerHTML); }
    }
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
            type: context.section.type,
            name: context.section.name,
            html: context.sectionHtml,
            previousSectionName: context.previousSectionName,
            nextSectionName: context.nextSectionName,
          },
          instruction: buildSectionRegenInstruction(mode, prompt),
        }),
      });

      if (!res.ok) throw new Error("Failed to regenerate section");
      const result: { html: string } = await res.json();
      const replaced = replaceSectionInPageHtml(page.html, sectionId, result.html, context.section);
      if (!replaced.replacedSectionId) throw new Error("Section replacement failed");

      setPageContent(page.id, replaced.html, replaced.sections);
      onSelectSection(replaced.replacedSectionId);
      addGenLog(`✅ ${context.section.name} regenerated`, "success");
      setGenStatus("done", `${context.section.name} regenerated`);
    } catch {
      addGenLog(`❌ Failed to regenerate ${context.section.name}`, "error");
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
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3.5 border-b border-white/[0.05] flex-shrink-0 bg-white/[0.02]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-white/32 uppercase tracking-[0.18em]">Layers</span>
          <span className="editor-chip rounded-full px-2 py-1 text-[9px] font-medium">Structure</span>
        </div>
      </div>
      <div className="editor-scroll flex-1 overflow-auto py-3 px-3 space-y-1.5">
        {pages.map((page) => {
          const open = exp[page.id] ?? true;
          return (
            <div key={page.id}>
              <button
                onClick={() => setExp((e) => ({ ...e, [page.id]: !open }))}
                className={`flex items-center w-full px-3 py-2.5 rounded-2xl text-[11px] font-semibold transition-all hover:bg-white/[0.04] ${selectedPageId===page.id?"border border-white/[0.08] bg-white/[0.05] text-white/88":"border border-transparent text-white/38"}`}>
                <ChevronRight size={11} className={`text-white/25 transition-transform flex-shrink-0 ${open?"rotate-90":""}`}/>
                <span className="flex-1 text-left truncate px-1">{page.name}</span>
                <span className="text-[9px] text-white/14 font-normal ml-1">{page.sections.length}</span>
              </button>
              {open && (
                <div className="mb-1 ml-4 space-y-1 border-l border-white/[0.05] pl-3">
                  {page.sections.length === 0
                    ? <div className="py-1 text-[10px] text-white/16">No sections</div>
                    : page.sections.map((sec, i) => (
                      <div key={sec.id} className="group/sec">
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
                                  const iframe = document.querySelector('iframe[data-sitezy-preview-frame="editor"]') as HTMLIFrameElement | null;
                                  const target = iframe?.contentDocument?.querySelector(`[data-sz-section-id="${sec.id}"]`);
                                  target?.scrollIntoView({ behavior: "smooth", block: "start" });
                                }}
                              className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-[11px] transition-all pr-12 border ${
                                selectedSectionId===sec.id
                                  ? "border-white/[0.1] bg-[linear-gradient(180deg,rgba(45,212,191,0.16),rgba(255,255,255,0.03))] text-white shadow-[0_14px_22px_rgba(13,148,136,0.1)]"
                                  : "border-transparent text-white/34 hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-white/68"
                              }`}>
                              <span className="text-[9px] text-white/14 font-mono w-4 flex-shrink-0">{i+1}</span>
                              <span className="truncate">{sec.name||sec.type}</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openRegenMenu(page.id, sec.id, e.currentTarget); }}
                              title="Regenerate this section"
                              disabled={!project.blueprint || regeneratingSectionId !== null}
                              className={`absolute right-7 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover/sec:opacity-100 transition-all ${
                                !project.blueprint || regeneratingSectionId !== null
                                  ? "text-white/10 cursor-not-allowed"
                                  : "text-white/25 hover:text-teal-200 hover:bg-teal-400/10"
                              } ${regeneratingSectionId === sec.id || (regenMenu?.pageId === page.id && regenMenu?.sectionId === sec.id) ? "opacity-100 text-teal-200 bg-teal-400/10" : ""}`}>
                              {regeneratingSectionId === sec.id ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDelete(sec.id); }}
                              title="Delete section"
                              className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover/sec:opacity-100 text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all">
                              <Trash2 size={10} />
                            </button>
                            {regenMenu?.pageId === page.id && regenMenu?.sectionId === sec.id && (
                              <div
                                ref={regenMenuRef}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  left: regenMenuPos?.left ?? 0,
                                  top: regenMenuPos?.top ?? 0,
                                }}
                                className="editor-dialog fixed z-[120] w-[252px] overflow-hidden rounded-[24px]"
                              >
                                <div className="border-b border-white/[0.06] bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.2),transparent_55%)] px-3.5 py-3">
                                  <div className="flex items-start gap-2.5">
                                    <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl border border-teal-300/20 bg-teal-400/10 text-teal-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] flex-shrink-0">
                                      <Sparkles size={13} />
                                    </span>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <p className="text-[11px] font-semibold tracking-[0.01em] text-white/90">Regenerate Section</p>
                                        <span className="rounded-full border border-teal-300/18 bg-teal-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-teal-100/85">
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
                                              ? "border-teal-300/26 bg-[linear-gradient(180deg,rgba(45,212,191,0.22),rgba(20,184,166,0.08))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
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
                                        className="editor-plain-input w-full resize-none rounded-[10px] bg-transparent px-2.5 py-2 text-[10.5px] leading-relaxed text-white/72 placeholder-white/18 focus:outline-none"
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
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[linear-gradient(180deg,rgba(45,212,191,0.94),rgba(13,148,136,0.94))] px-3 py-2 text-[10px] font-semibold text-white shadow-[0_10px_24px_rgba(13,148,136,0.24)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3.5 border-b border-white/[0.05] flex-shrink-0 bg-white/[0.02]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold text-white/32 uppercase tracking-[0.18em]">Files</p>
          <span className="editor-chip rounded-full px-2 py-1 text-[9px] font-medium">{Object.keys(files).length}</span>
        </div>
      </div>
      <div className="editor-scroll flex-1 overflow-auto py-3 px-3 space-y-1.5">
        <div className="px-2 py-1 text-[9px] font-bold text-white/18 uppercase tracking-widest">Pages</div>
        {pages.map((p) => {
          const slug = p.slug || p.name.toLowerCase().replace(/\s+/g,"-");
          return (
            <button key={p.id} onClick={() => onSelectFile(p.id)}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[11px] transition-all border ${
                selectedFileId===p.id ? "border-white/[0.1] bg-[linear-gradient(180deg,rgba(45,212,191,0.16),rgba(255,255,255,0.03))] text-white" : "border-transparent text-white/42 hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-white/72"
              }`}>
              <FileCode2 size={11} className="flex-shrink-0 text-teal-200/60"/>
              <span className="truncate font-mono">{slug}.html</span>
            </button>
          );
        })}
        {css.length > 0 && (
          <>
            <div className="px-2 py-1 mt-2 text-[9px] font-bold text-white/18 uppercase tracking-widest">Styles</div>
            {css.map((f) => (
              <button key={f.id} onClick={() => onSelectFile(f.id)}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[11px] transition-all border ${
                  selectedFileId===f.id ? "border-white/[0.1] bg-[linear-gradient(180deg,rgba(251,191,36,0.18),rgba(255,255,255,0.03))] text-white" : "border-transparent text-white/42 hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-white/72"
                }`}>
                <FileCode2 size={11} className="flex-shrink-0 text-amber-200/60"/>
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
    const navbarHtml = firstPage?.html
      ? (firstPage.html.match(/<nav[\s\S]*?<\/nav>/i)?.[0] ?? firstPage.html.match(/<header[\s\S]*?<\/header>/i)?.[0] ?? null)
      : null;
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: project.blueprint,
          page: { id, name: name.trim(), slug, sections: ["hero","content","cta"], purpose: purpose.trim()||name.trim() },
          brief: project.brief,
          navbarHtml,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `API error ${res.status}`);
      }
      const result: { html: string; sections: PageSection[] } = await res.json();
      setPageContent(id, result.html, result.sections);
      addGenLog(`✅ ${name.trim()} generated`, "success");
      setGenStatus("done", "Done!");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setError(msg);
      setPageStatus(id, "error");
      addGenLog(`❌ ${msg}`, "error");
      setGenStatus("error", "Failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="editor-dialog w-full max-w-sm overflow-hidden rounded-[28px]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h3 className="text-[13px] font-semibold text-white">New page</h3>
          <button onClick={onClose} className="editor-action-btn flex h-9 w-9 items-center justify-center rounded-xl text-white/48"><X size={13}/></button>
        </div>
        <div className="p-5 space-y-3.5">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !creating && create()}
            placeholder="Page name (e.g. About, Pricing)"
            className="editor-input w-full rounded-2xl px-3.5 py-3 text-[13px] text-white focus:outline-none"/>
          {useAI && (
            <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)}
              placeholder="Describe what this page should contain (optional)"
              rows={2}
              className="editor-input w-full resize-none rounded-2xl px-3.5 py-3 text-[13px] text-white focus:outline-none"/>
          )}
          <div className="editor-panel-soft flex items-center justify-between rounded-2xl px-4 py-3">
            <div>
              <p className="text-[12px] text-white/60 font-medium">Generate with AI</p>
              <p className="text-[10px] text-white/25 mt-0.5">
                {useAI ? "AI will build this page matching your brand" : "Creates a blank page"}
              </p>
            </div>
            <button onClick={() => setUseAI(!useAI)}
              data-active={useAI}
              data-size="md"
              className="editor-switch"
            >
              <span className="editor-switch-thumb" />
            </button>
          </div>
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] text-red-400">
              {error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-white/[0.06] px-5 py-4">
          <button onClick={onClose} disabled={creating} className="editor-action-btn rounded-2xl px-4 py-2 text-[12px] font-medium disabled:opacity-50">Cancel</button>
          <button onClick={create} disabled={!name.trim() || creating}
            className="editor-action-btn-primary flex items-center gap-1.5 rounded-2xl px-4 py-2 text-[12px] font-semibold disabled:opacity-30">
            {creating && <Loader2 size={11} className="animate-spin"/>}
            {creating ? "Generating…" : useAI ? "Generate page" : "Create blank"}
          </button>
        </div>
      </div>
    </div>
  );
}
