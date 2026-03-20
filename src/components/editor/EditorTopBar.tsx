"use client";
import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { downloadBlob } from "@/lib/utils";
import {
  ArrowLeft, Download, Maximize2, Undo2, Redo2,
  Loader2, CheckCircle2, AlertCircle, RefreshCw,
  Monitor, Tablet, Smartphone, Eye, Code2, Columns,
  ChevronDown, Zap,
} from "lucide-react";
import type { Project, PageSection } from "@/types";

interface Props { project: Project; }

export function EditorTopBar({ project }: Props) {
  const closeProject   = useAppStore((s) => s.closeProject);
  const setFullPreview = useAppStore((s) => s.setFullPreview);
  const undo           = useAppStore((s) => s.undo);
  const redo           = useAppStore((s) => s.redo);
  const undoStack      = useAppStore((s) => s.undoStack);
  const redoStack      = useAppStore((s) => s.redoStack);
  const isSaved        = useAppStore((s) => s.isSaved);
  const genStatus      = useAppStore((s) => s.generationStatus);
  const genProgress    = useAppStore((s) => s.generationProgress);
  const previewMode    = useAppStore((s) => s.editor.previewMode);
  const devicePreview  = useAppStore((s) => s.editor.devicePreview);
  const setPreviewMode = useAppStore((s) => s.setPreviewMode);
  const setDevicePreview = useAppStore((s) => s.setDevicePreview);
  const setPageContent = useAppStore((s) => s.setPageContent);
  const setPageStatus  = useAppStore((s) => s.setPageStatus);
  const setGenStatus   = useAppStore((s) => s.setGenStatus);
  const addGenLog      = useAppStore((s) => s.addGenLog);

  const [showRegenMenu, setShowRegenMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.key === "z" && e.shiftKey) || e.key === "y") { e.preventDefault(); redo(); }
      if (e.key === "s") { e.preventDefault(); /* auto-save is implicit */ }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const isGenerating = genStatus === "blueprint" || genStatus === "pages" || genStatus === "normalizing";

  async function handleExport() {
    if (!project || exporting) return;
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const name = project.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
      downloadBlob(blob, `${name}-sitezy.zip`);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleRegenerateAll() {
    if (!project.blueprint || isGenerating) return;
    setShowRegenMenu(false);
    setGenStatus("pages", "Regenerating all pages...");
    addGenLog("🔄 Regenerating entire site...", "progress");

    const pages = project.pages ?? [];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      setPageStatus(page.id, "generating");
      addGenLog(`📄 Regenerating ${page.name} (${i + 1}/${pages.length})...`, "progress");
      setGenStatus("pages", `Regenerating ${page.name} (${i + 1}/${pages.length})...`);
      try {
        const bpPage = {
          id: page.id, name: page.name, slug: page.slug,
          sections: page.sections.map((s) => s.type || s.name),
          purpose: page.purpose,
        };
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blueprint: project.blueprint, page: bpPage, brief: project.brief }),
        });
        if (!res.ok) throw new Error("Failed");
        const result: { html: string; sections: PageSection[] } = await res.json();
        setPageContent(page.id, result.html, result.sections);
        addGenLog(`✅ ${page.name} regenerated`, "success");
      } catch {
        setPageStatus(page.id, "error");
        addGenLog(`⚠️ ${page.name} failed`, "error");
      }
    }
    setGenStatus("done", "All pages regenerated!");
    addGenLog("🎉 Regeneration complete!", "success");
  }

  async function handleRegenerateCurrent() {
    const selectedPageId = useAppStore.getState().editor.selectedPageId;
    const page = project.pages?.find((p) => p.id === selectedPageId);
    if (!page || !project.blueprint) return;
    setShowRegenMenu(false);
    setGenStatus("pages", `Regenerating ${page.name}...`);
    setPageStatus(page.id, "generating");
    addGenLog(`🔄 Regenerating ${page.name}...`, "progress");
    try {
      const bpPage = {
        id: page.id, name: page.name, slug: page.slug,
        sections: page.sections.map((s) => s.type || s.name),
        purpose: page.purpose,
      };
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueprint: project.blueprint, page: bpPage, brief: project.brief }),
      });
      if (!res.ok) throw new Error("Failed");
      const result: { html: string; sections: PageSection[] } = await res.json();
      setPageContent(page.id, result.html, result.sections);
      addGenLog(`✅ ${page.name} regenerated`, "success");
      setGenStatus("done", "Page regenerated!");
    } catch {
      setPageStatus(page.id, "error");
      addGenLog(`⚠️ ${page.name} failed`, "error");
      setGenStatus("error", "Regeneration failed");
    }
  }

  return (
    <header className="h-12 border-b border-white/[0.06] flex items-center gap-1 px-3 flex-shrink-0 bg-[#080809]">
      {/* Back */}
      <button onClick={() => closeProject()}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-white/40 hover:text-white/80 hover:bg-white/[0.04] rounded-lg text-[12px] transition-colors flex-shrink-0">
        <ArrowLeft size={13} />
        <span className="hidden sm:inline">Dashboard</span>
      </button>

      <div className="w-px h-5 bg-white/[0.06] mx-1" />

      {/* Project name */}
      <span className="text-[13px] font-semibold text-white/80 max-w-[160px] truncate flex-shrink-0">
        {project.name}
      </span>

      {/* Status pill */}
      <div className="ml-1 flex-shrink-0">
        {isGenerating ? (
          <span className="flex items-center gap-1.5 text-[11px] text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
            <Loader2 size={10} className="spin" />
            {genProgress ? genProgress.slice(0, 30) + (genProgress.length > 30 ? "…" : "") : "Generating"}
          </span>
        ) : isSaved ? (
          <span className="flex items-center gap-1 text-[11px] text-emerald-500/60">
            <CheckCircle2 size={10} /> Saved
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-amber-500/60">
            <AlertCircle size={10} /> Unsaved
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* Preview mode toggle */}
      <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5 gap-0.5 mr-1">
        {([
          { mode: "preview" as const, icon: <Eye size={11} />, title: "Preview" },
          { mode: "split"   as const, icon: <Columns size={11} />, title: "Split" },
          { mode: "code"    as const, icon: <Code2 size={11} />, title: "Code" },
        ] as const).map(({ mode, icon, title }) => (
          <button key={mode} onClick={() => setPreviewMode(mode)} title={title}
            className={`w-7 h-6 flex items-center justify-center rounded-md transition-colors ${previewMode === mode ? "bg-white/[0.1] text-white" : "text-white/25 hover:text-white/60"}`}>
            {icon}
          </button>
        ))}
      </div>

      {/* Device toggle */}
      <div className="flex items-center gap-0.5 mr-2">
        {([
          { d: "desktop" as const, icon: <Monitor size={11} /> },
          { d: "tablet"  as const, icon: <Tablet size={11} /> },
          { d: "mobile"  as const, icon: <Smartphone size={11} /> },
        ] as const).map(({ d, icon }) => (
          <button key={d} onClick={() => setDevicePreview(d)} title={d}
            className={`w-7 h-6 flex items-center justify-center rounded-md transition-colors ${devicePreview === d ? "text-white bg-white/[0.06]" : "text-white/25 hover:text-white/50"}`}>
            {icon}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-white/[0.06]" />

      {/* Undo / Redo */}
      <button onClick={undo} disabled={undoStack.length === 0} title="Undo (Ctrl+Z)"
        className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.05] disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
        <Undo2 size={13} />
      </button>
      <button onClick={redo} disabled={redoStack.length === 0} title="Redo (Ctrl+Shift+Z)"
        className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.05] disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
        <Redo2 size={13} />
      </button>

      <div className="w-px h-5 bg-white/[0.06] mx-1" />

      {/* Regenerate dropdown */}
      <div className="relative" onMouseLeave={() => setShowRegenMenu(false)}>
        <button onClick={() => setShowRegenMenu(!showRegenMenu)} disabled={!project.blueprint || isGenerating}
          className="flex items-center gap-1 px-2.5 py-1.5 text-white/50 hover:text-white/90 hover:bg-white/[0.05] border border-white/[0.08] rounded-lg text-[12px] font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          <RefreshCw size={11} className={isGenerating ? "spin" : ""} />
          <span className="hidden md:inline">Regenerate</span>
          <ChevronDown size={10} />
        </button>
        {showRegenMenu && (
          <div className="absolute right-0 top-9 w-52 bg-[#131318] border border-white/[0.1] rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden">
            <p className="px-3 py-1 text-[10px] text-white/25 uppercase tracking-wider font-semibold">Regenerate</p>
            <button onClick={handleRegenerateCurrent}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors">
              <Zap size={12} className="text-brand-400" /> Current page only
            </button>
            <button onClick={handleRegenerateAll}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors">
              <RefreshCw size={12} className="text-amber-400" /> Entire website
            </button>
          </div>
        )}
      </div>

      {/* Export */}
      <button onClick={handleExport} disabled={exporting}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-white/50 hover:text-white/90 hover:bg-white/[0.05] border border-white/[0.08] rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50">
        {exporting ? <Loader2 size={11} className="spin" /> : <Download size={11} />}
        <span className="hidden md:inline">Export</span>
      </button>

      {/* Full preview */}
      <button onClick={() => setFullPreview(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white border border-brand-500/30 rounded-lg text-[12px] font-medium transition-colors shadow-sm shadow-brand-500/20">
        <Maximize2 size={11} />
        <span className="hidden md:inline">Preview</span>
      </button>
    </header>
  );
}
