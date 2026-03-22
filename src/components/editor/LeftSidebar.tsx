"use client";
import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
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
    <aside className="w-[240px] border-r border-white/[0.06] flex flex-col bg-[#09090c] h-full flex-shrink-0">
      <div className="flex border-b border-white/[0.06] flex-shrink-0">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setLeftPanel(t.key)}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-[10.5px] font-semibold transition-colors border-b-2 ${
              leftPanelTab === t.key
                ? "text-white border-indigo-500"
                : "text-white/20 border-transparent hover:text-white/45"
            }`}>
            {t.icon}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {leftPanelTab === "pages"     && <PagesPanel project={project} pages={pages} selectedPageId={selectedPageId} onSelectPage={selectPage} onAddPage={() => setShowAdd(true)} />}
        {leftPanelTab === "navigator" && <NavPanel pages={pages} selectedPageId={selectedPageId} selectedSectionId={selectedSectionId} visualEditMode={visualEditMode} updateFileContent={updateFileContent} onSelectPage={selectPage} onSelectSection={selectSection} />}
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
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.05] flex-shrink-0">
        <span className="text-[10px] font-bold text-white/22 uppercase tracking-widest">
          Pages <span className="text-white/14 font-normal">{pages.length}</span>
        </span>
        <button onClick={onAddPage} className="w-6 h-6 flex items-center justify-center rounded-md text-white/25 hover:text-white hover:bg-white/[0.07] transition-all">
          <Plus size={12}/>
        </button>
      </div>
      <div className="flex-1 overflow-auto py-1.5">
        {pages.length === 0 ? (
          <div className="px-4 py-8 text-center text-[11px] text-white/18">No pages yet.</div>
        ) : (
          <div className="px-2 space-y-0.5">
            {pages.map((p) => (
              <PageRow key={p.id} page={p} project={project} isSelected={selectedPageId===p.id} onSelect={() => onSelectPage(p.id)}/>
            ))}
          </div>
        )}
        {pages.length > 0 && (
          <button onClick={onAddPage} className="flex items-center gap-2 mx-2 mt-1 px-2.5 py-2 w-[calc(100%-16px)] rounded-lg text-[11px] text-white/22 hover:text-white/50 hover:bg-white/[0.035] transition-all">
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
    try {
      const bp = { id: page.id, name: page.name, slug: page.slug, sections: page.sections.map((s) => s.type || s.name), purpose: page.purpose };
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blueprint: project.blueprint, page: bp, brief: project.brief }) });
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
          className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-left text-[12px] transition-all cursor-pointer ${
            isSelected ? "bg-indigo-500/10 text-white" : "text-white/42 hover:text-white/75 hover:bg-white/[0.035]"
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

// ── Navigator ─────────────────────────────────────────────────────────────────
function NavPanel({ pages, selectedPageId, selectedSectionId, visualEditMode, updateFileContent, onSelectPage, onSelectSection }: {
  pages: ProjectPage[]; selectedPageId: string|null; selectedSectionId: string|null;
  visualEditMode: boolean; updateFileContent: (fileId: string, content: string) => void;
  onSelectPage: (id: string|null)=>void; onSelectSection: (id: string|null)=>void;
}) {
  const [exp, setExp] = useState<Record<string,boolean>>(() =>
    Object.fromEntries(pages.map((p) => [p.id, true]))
  );
  const [confirmDelete, setConfirmDelete] = useState<string|null>(null);

  function confirmDeleteSection(sectionId: string) {
    setConfirmDelete(null);
    if (selectedSectionId === sectionId) onSelectSection(null);
    if (visualEditMode) {
      const iframe = document.querySelector('iframe[title^="Preview"]') as HTMLIFrameElement | null;
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

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2.5 border-b border-white/[0.05] flex-shrink-0">
        <span className="text-[10px] font-bold text-white/22 uppercase tracking-widest">Layers</span>
      </div>
      <div className="flex-1 overflow-auto py-1.5 px-2 space-y-0.5">
        {pages.map((page) => {
          const open = exp[page.id] ?? true;
          return (
            <div key={page.id}>
              <button
                onClick={() => setExp((e) => ({ ...e, [page.id]: !open }))}
                className={`flex items-center w-full px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:bg-white/[0.03] ${selectedPageId===page.id?"text-white/80":"text-white/35"}`}>
                <ChevronRight size={11} className={`text-white/25 transition-transform flex-shrink-0 ${open?"rotate-90":""}`}/>
                <span className="flex-1 text-left truncate px-1">{page.name}</span>
                <span className="text-[9px] text-white/14 font-normal ml-1">{page.sections.length}</span>
              </button>
              {open && (
                <div className="ml-4 border-l border-white/[0.04] pl-2 space-y-0.5 mb-1">
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
                                const iframe = document.querySelector('iframe[title^="Preview"]') as HTMLIFrameElement | null;
                                const target = iframe?.contentDocument?.querySelector(`[data-sz-section-id="${sec.id}"]`);
                                target?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }}
                              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] transition-all pr-7 ${
                                selectedSectionId===sec.id
                                  ? "bg-indigo-500/10 text-white"
                                  : "text-white/32 hover:text-white/62 hover:bg-white/[0.025]"
                              }`}>
                              <span className="text-[9px] text-white/14 font-mono w-4 flex-shrink-0">{i+1}</span>
                              <span className="truncate">{sec.name||sec.type}</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDelete(sec.id); }}
                              title="Delete section"
                              className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover/sec:opacity-100 text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all">
                              <Trash2 size={10} />
                            </button>
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
      <div className="px-3 py-2.5 border-b border-white/[0.05] flex-shrink-0">
        <p className="text-[10px] font-bold text-white/22 uppercase tracking-widest">Files</p>
      </div>
      <div className="flex-1 overflow-auto py-2 px-2 space-y-0.5">
        <div className="px-2 py-1 text-[9px] font-bold text-white/14 uppercase tracking-widest">Pages</div>
        {pages.map((p) => {
          const slug = p.slug || p.name.toLowerCase().replace(/\s+/g,"-");
          return (
            <button key={p.id} onClick={() => onSelectFile(p.id)}
              className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-[11px] transition-all ${
                selectedFileId===p.id ? "bg-indigo-500/10 text-indigo-300" : "text-white/38 hover:text-white/65 hover:bg-white/[0.035]"
              }`}>
              <FileCode2 size={11} className="flex-shrink-0 text-indigo-400/50"/>
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
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: project.blueprint,
          page: { id, name: name.trim(), slug, sections: ["hero","content","cta"], purpose: purpose.trim()||name.trim() },
          brief: project.brief,
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
            className="w-full bg-white/[0.05] border border-white/[0.07] rounded-xl px-3 py-2 text-[13px] text-white placeholder-white/18 focus:outline-none focus:border-indigo-500/35 transition-colors"/>
          {useAI && (
            <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)}
              placeholder="Describe what this page should contain (optional)"
              rows={2}
              className="w-full bg-white/[0.05] border border-white/[0.07] rounded-xl px-3 py-2 text-[13px] text-white placeholder-white/18 focus:outline-none focus:border-indigo-500/35 resize-none transition-colors"/>
          )}
          {/* AI toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-[12px] text-white/60 font-medium">Generate with AI</p>
              <p className="text-[10px] text-white/25 mt-0.5">
                {useAI ? "AI will build this page matching your brand" : "Creates a blank page"}
              </p>
            </div>
            <button onClick={() => setUseAI(!useAI)}
              className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${useAI ? "bg-indigo-600" : "bg-white/[0.1]"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${useAI ? "translate-x-[18px]" : "translate-x-0.5"}`}/>
            </button>
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
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-[12px] font-semibold transition-colors">
            {creating && <Loader2 size={11} className="animate-spin"/>}
            {creating ? "Generating…" : useAI ? "Generate page" : "Create blank"}
          </button>
        </div>
      </div>
    </div>
  );
}
