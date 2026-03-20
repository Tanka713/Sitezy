"use client";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  Layers, FileCode2, Puzzle, CheckCircle2, Loader2,
  Clock, AlertCircle, ChevronRight, Plus, RefreshCw,
  Copy, Trash2, MoreHorizontal, Pencil, X, Zap,
} from "lucide-react";
import type { Project, ProjectPage, PageSection } from "@/types";

interface Props { project: Project; }

export function LeftSidebar({ project }: Props) {
  const leftPanelTab  = useAppStore((s) => s.editor.leftPanelTab);
  const selectedPageId = useAppStore((s) => s.editor.selectedPageId);
  const selectedFileId = useAppStore((s) => s.editor.selectedFileId);
  const setLeftPanel  = useAppStore((s) => s.setLeftPanel);
  const selectPage    = useAppStore((s) => s.selectPage);
  const selectFile    = useAppStore((s) => s.selectFile);

  const pages    = project?.pages ?? [];
  const files    = project?.files ?? {};
  const blueprint = project?.blueprint ?? null;

  const [showAddPage, setShowAddPage] = useState(false);

  const tabs = [
    { key: "pages"      as const, icon: <Layers size={14} />,   label: "Pages" },
    { key: "files"      as const, icon: <FileCode2 size={14} />, label: "Files" },
    { key: "components" as const, icon: <Puzzle size={14} />,   label: "Assets" },
  ];

  return (
    <aside className="w-[220px] border-r border-white/[0.06] flex flex-col bg-[#0a0a0c] flex-shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-white/[0.06]">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setLeftPanel(tab.key)} title={tab.label}
            className={`flex-1 py-2.5 flex items-center justify-center transition-colors ${leftPanelTab === tab.key ? "text-white border-b-2 border-brand-500" : "text-white/30 hover:text-white/60 border-b-2 border-transparent"}`}>
            {tab.icon}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto py-2">
        {/* ── Pages ── */}
        {leftPanelTab === "pages" && (
          <div>
            <div className="px-3 py-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">Pages</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-white/25">{pages.length}</span>
                <button onClick={() => setShowAddPage(true)} title="Add new page"
                  className="w-5 h-5 flex items-center justify-center rounded text-white/30 hover:text-white hover:bg-white/[0.08] transition-colors ml-1">
                  <Plus size={11} />
                </button>
              </div>
            </div>

            {pages.length === 0 ? (
              <div className="px-3 py-4 text-center text-white/20 text-[12px]">
                No pages yet.<br />Generate a site first.
              </div>
            ) : (
              pages.map((page) => (
                <PageRow key={page.id} page={page} project={project}
                  isSelected={selectedPageId === page.id}
                  onSelect={() => selectPage(page.id)} />
              ))
            )}

            {/* Add Page button at bottom */}
            {pages.length > 0 && (
              <button onClick={() => setShowAddPage(true)}
                className="flex items-center gap-2 w-full px-3 py-2 mt-1 text-white/30 hover:text-white/70 hover:bg-white/[0.04] rounded-lg mx-1 text-[12px] transition-colors">
                <Plus size={12} />
                Add page
              </button>
            )}
          </div>
        )}

        {/* ── Files ── */}
        {leftPanelTab === "files" && (
          <div>
            <div className="px-3 py-1.5">
              <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">Files</span>
            </div>
            {pages.length === 0 ? (
              <div className="px-3 py-4 text-center text-white/20 text-[12px]">No files yet.</div>
            ) : (
              <div className="px-1 mb-1">
                <div className="px-2 py-1 text-[10px] text-white/20 font-medium">/pages</div>
                {pages.map((page) => {
                  const slug = page.slug || page.name.toLowerCase().replace(/\s+/g, "-");
                  return (
                    <button key={page.id} onClick={() => selectFile(page.id)}
                      className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-[12px] transition-colors ${selectedFileId === page.id ? "bg-brand-500/15 text-brand-300" : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"}`}>
                      <FileCode2 size={11} className="flex-shrink-0" />
                      <span className="truncate">{slug}.html</span>
                      {page.status === "done" && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
            {Object.values(files).filter((f) => f.type === "css").map((file) => (
              <button key={file.id} onClick={() => selectFile(file.id)}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-[12px] transition-colors mx-1 ${selectedFileId === file.id ? "bg-brand-500/15 text-brand-300" : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"}`}>
                <FileCode2 size={11} className="flex-shrink-0" />
                <span className="truncate">{file.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Assets / Blueprint ── */}
        {leftPanelTab === "components" && (
          <div className="px-3 py-4">
            <div className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-3">Blueprint</div>
            {blueprint ? (
              <div className="space-y-3">
                <InfoRow label="Layout"       value={blueprint.layoutStyle ?? "—"} />
                <InfoRow label="Heading Font" value={blueprint.typography?.headingFont ?? "—"} />
                <InfoRow label="Body Font"    value={blueprint.typography?.bodyFont ?? "—"} />
                <InfoRow label="Animation"    value={blueprint.animationStyle ?? "—"} />
                {blueprint.brandPersonality && (
                  <InfoRow label="Brand" value={blueprint.brandPersonality.slice(0, 60) + "…"} />
                )}
                {blueprint.colorScheme && (
                  <div>
                    <span className="text-[10px] text-white/25">Colors</span>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {Object.entries(blueprint.colorScheme).map(([key, color]) => (
                        <div key={key} title={`${key}: ${color}`}
                          className="w-5 h-5 rounded border border-black/30 cursor-default"
                          style={{ background: color as string }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-white/20 text-[12px]">Generate a site to see blueprint info.</div>
            )}
          </div>
        )}
      </div>

      {showAddPage && (
        <AddPageModal project={project} onClose={() => setShowAddPage(false)} />
      )}
    </aside>
  );
}

// ─── Page Row with context menu ───────────────────────────────────────────────
function PageRow({ page, project, isSelected, onSelect }: { page: ProjectPage; project: Project; isSelected: boolean; onSelect: () => void }) {
  const deletePage    = useAppStore((s) => s.deletePage);
  const duplicatePage = useAppStore((s) => s.duplicatePage);
  const renamePage    = useAppStore((s) => s.renamePage);
  const setPageContent = useAppStore((s) => s.setPageContent);
  const setPageStatus  = useAppStore((s) => s.setPageStatus);
  const setGenStatus   = useAppStore((s) => s.setGenStatus);
  const addGenLog      = useAppStore((s) => s.addGenLog);

  const [showMenu,    setShowMenu]    = useState(false);
  const [renaming,    setRenaming]    = useState(false);
  const [nameVal,     setNameVal]     = useState(page.name);
  const [regenerating, setRegenerating] = useState(false);

  const StatusIcon = () => {
    if (regenerating) return <Loader2 size={10} className="text-brand-400 spin" />;
    switch (page.status) {
      case "done":      return <CheckCircle2 size={10} className="text-emerald-500" />;
      case "generating":return <Loader2 size={10} className="text-brand-400 spin" />;
      case "error":     return <AlertCircle size={10} className="text-red-400" />;
      default:          return <Clock size={10} className="text-white/20" />;
    }
  };

  async function handleRegenerate() {
    if (!project.blueprint) return;
    setShowMenu(false);
    setRegenerating(true);
    setGenStatus("pages", `Regenerating ${page.name}...`);
    addGenLog(`🔄 Regenerating ${page.name}...`, "progress");
    try {
      setPageStatus(page.id, "generating");
      const bpPage = { id: page.id, name: page.name, slug: page.slug, sections: page.sections.map(s=>s.type||s.name), purpose: page.purpose };
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueprint: project.blueprint, page: bpPage, brief: project.brief }),
      });
      if (!res.ok) throw new Error("Regeneration failed");
      const result: { html: string; sections: PageSection[] } = await res.json();
      setPageContent(page.id, result.html, result.sections);
      addGenLog(`✅ ${page.name} regenerated`, "success");
      setGenStatus("done", "Page regenerated!");
    } catch (err) {
      setPageStatus(page.id, "error");
      addGenLog(`❌ Failed to regenerate ${page.name}`, "error");
      setGenStatus("error", "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  }

  function handleRename() {
    if (nameVal.trim() && nameVal !== page.name) renamePage(page.id, nameVal.trim());
    setRenaming(false);
  }

  const canDelete = (project?.pages?.length ?? 0) > 1;

  return (
    <div className="relative group/row" onMouseLeave={() => setShowMenu(false)}>
      {renaming ? (
        <div className="flex items-center gap-1 px-2 py-1 mx-1">
          <input autoFocus value={nameVal} onChange={e=>setNameVal(e.target.value)}
            onBlur={handleRename} onKeyDown={e=>{if(e.key==="Enter")handleRename();if(e.key==="Escape")setRenaming(false);}}
            className="flex-1 bg-white/[0.08] border border-brand-500/40 rounded px-2 py-1 text-[12px] text-white focus:outline-none min-w-0" />
          <button onClick={()=>setRenaming(false)} className="text-white/30 hover:text-white"><X size={11}/></button>
        </div>
      ) : (
        <button onClick={onSelect}
          className={`flex items-center gap-2.5 w-full px-3 py-2 text-left rounded-lg mx-1 transition-colors text-[13px] ${isSelected ? "bg-brand-500/15 text-white border-l-2 border-brand-500 pl-2.5" : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"}`}>
          <StatusIcon />
          <span className="flex-1 truncate">{page.name}</span>
          <button onClick={e=>{e.stopPropagation();setShowMenu(!showMenu);}}
            className="opacity-0 group-hover/row:opacity-100 w-5 h-5 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/[0.1] transition-all flex-shrink-0">
            <MoreHorizontal size={11}/>
          </button>
        </button>
      )}

      {/* Context menu */}
      {showMenu && (
        <div className="absolute right-1 top-7 w-44 bg-[#131318] border border-white/[0.1] rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
          <MenuItem icon={<RefreshCw size={12}/>} label="Regenerate" onClick={handleRegenerate} disabled={!project.blueprint} />
          <MenuItem icon={<Pencil size={12}/>} label="Rename" onClick={()=>{setRenaming(true);setShowMenu(false);}} />
          <MenuItem icon={<Copy size={12}/>} label="Duplicate" onClick={()=>{duplicatePage(page.id);setShowMenu(false);}} />
          <div className="h-px bg-white/[0.06] my-1"/>
          <MenuItem icon={<Trash2 size={12}/>} label="Delete" onClick={()=>{if(canDelete)deletePage(page.id);setShowMenu(false);}} danger disabled={!canDelete} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger=false, disabled=false }: { icon:React.ReactNode; label:string; onClick:()=>void; danger?:boolean; disabled?:boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-2.5 w-full px-3 py-2 text-[12px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${danger?"text-red-400/80 hover:bg-red-500/10 hover:text-red-400":"text-white/60 hover:bg-white/[0.05] hover:text-white"}`}>
      {icon}{label}
    </button>
  );
}

// ─── Add Page Modal ───────────────────────────────────────────────────────────
function AddPageModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const addPage       = useAppStore((s) => s.addPage);
  const setPageContent = useAppStore((s) => s.setPageContent);
  const setGenStatus   = useAppStore((s) => s.setGenStatus);
  const addGenLog      = useAppStore((s) => s.addGenLog);

  const [pageName, setPageName]   = useState("");
  const [pageDesc, setPageDesc]   = useState("");
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState("");

  async function handleAdd() {
    if (!pageName.trim()) return;
    setLoading(true);
    setError("");

    const newId   = Math.random().toString(36).slice(2,10);
    const newSlug = pageName.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
    const newPage = { id:newId, name:pageName.trim(), slug:newSlug, sections:[], purpose:pageDesc||pageName, html:"", status:"pending" as const };

    addPage(newPage);
    addGenLog(`📄 Adding page: ${pageName}...`, "progress");

    if (project.blueprint) {
      setGenStatus("pages", `Generating ${pageName}...`);
      try {
        const res = await fetch("/api/add-page", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ blueprint:project.blueprint, pageName:pageName.trim(), pageDescription:pageDesc, brief:project.brief }),
        });
        if (!res.ok) { const e=await res.json(); throw new Error(e.error||"Failed"); }
        const result: { html:string; sections:PageSection[]; page:{sections:string[]} } = await res.json();
        setPageContent(newId, result.html, result.sections ?? []);
        addGenLog(`✅ ${pageName} generated`, "success");
        setGenStatus("done", `${pageName} added!`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed");
        addGenLog(`⚠️ ${pageName} generation failed`, "error");
        setGenStatus("error", "Page generation failed");
      }
    }

    setLoading(false);
    if (!error) onClose();
  }

  const SUGGESTIONS = ["Gallery","Careers","Partners","Press","Legal","Privacy","Terms","Login","Signup","Checkout"];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0e0e12] border border-white/[0.08] rounded-2xl w-full max-w-[420px] shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-brand-500/20 flex items-center justify-center">
              <Plus size={13} className="text-brand-400" />
            </div>
            <h3 className="font-semibold text-[14px]">Add New Page</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors">
            <X size={14}/>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-2">Page Name *</label>
            <input autoFocus value={pageName} onChange={e=>setPageName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleAdd()}
              placeholder="e.g. Gallery, Careers, Press..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-colors"/>
          </div>

          {/* Quick picks */}
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.filter(s=>!project.pages.map(p=>p.name).includes(s)).slice(0,8).map(s=>(
              <button key={s} onClick={()=>setPageName(s)}
                className="px-2.5 py-1 text-[11px] bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/70 hover:border-white/[0.15] rounded-lg transition-colors">
                {s}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-2">Description (optional)</label>
            <input value={pageDesc} onChange={e=>setPageDesc(e.target.value)}
              placeholder="What should this page contain or achieve?"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-colors"/>
          </div>

          {error && <p className="text-red-400 text-[12px]">{error}</p>}

          {project.blueprint ? (
            <p className="text-[11px] text-white/30">AI will generate this page to match your existing design.</p>
          ) : (
            <p className="text-[11px] text-amber-500/60">Generate a site first to auto-generate page content.</p>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-[13px] text-white/50 border border-white/[0.08] rounded-xl hover:bg-white/[0.04] transition-colors">
            Cancel
          </button>
          <button onClick={handleAdd} disabled={!pageName.trim()||loading}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium rounded-xl transition-all ${pageName.trim()&&!loading?"bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20":"bg-white/[0.05] text-white/20 cursor-not-allowed"}`}>
            {loading?<><Loader2 size={13} className="spin"/>Generating...</>:<><Zap size={13}/>Add Page</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] text-white/25">{label}</span>
      <p className="text-[12px] text-white/60 capitalize mt-0.5">{value}</p>
    </div>
  );
}
