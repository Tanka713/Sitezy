"use client";
import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { downloadBlob } from "@/lib/utils";
import {
  ArrowLeft, Download, Maximize2,
  Loader2, CheckCircle2, AlertCircle, RefreshCw,
  ChevronDown, Zap, Pencil, Check, X, Save,
} from "lucide-react";
import { createAppError, logAppError, normalizeError, API_GENERATE_001, SAVE_SERIALIZE_001 } from "@/lib/errors";
import type { Project, PageSection } from "@/types";

interface Props { project: Project; }

export function EditorTopBar({ project }: Props) {
  const closeProject    = useAppStore((s) => s.closeProject);
  const setFullPreview  = useAppStore((s) => s.setFullPreview);
  const undo            = useAppStore((s) => s.undo);
  const redo            = useAppStore((s) => s.redo);
  const isSaved         = useAppStore((s) => s.isSaved);
  const genStatus       = useAppStore((s) => s.generationStatus);
  const genProgress     = useAppStore((s) => s.generationProgress);
  const setPageContent  = useAppStore((s) => s.setPageContent);
  const setPageStatus   = useAppStore((s) => s.setPageStatus);
  const setGenStatus    = useAppStore((s) => s.setGenStatus);
  const addGenLog       = useAppStore((s) => s.addGenLog);
  const renameProject         = useAppStore((s) => s.renameProject);
  const saveCurrentProject    = useAppStore((s) => s.saveCurrentProject);
  const saveState             = useAppStore((s) => s.saveState);
  const visualEditMode        = useAppStore((s) => s.editor.visualEditMode);

  const [showRegenMenu, setShowRegenMenu] = useState(false);
  const [exporting, setExporting]         = useState(false);
  const [editingName, setEditingName]     = useState(false);
  const [nameVal, setNameVal]             = useState(project.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isGenerating = genStatus === "blueprint" || genStatus === "pages" || genStatus === "normalizing";

  useEffect(() => { setNameVal(project.name); }, [project.name]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (visualEditMode) {
          // Route to iframe's own undo stack when in visual edit mode
          const iframe = document.querySelector("iframe") as HTMLIFrameElement | null;
          iframe?.contentWindow?.postMessage({ target: "sitezy-iframe", type: "undo" }, "*");
        } else {
          undo();
        }
      }
      if (e.key === "s") {
        e.preventDefault();
        saveCurrentProject({ manual: true });
      }
      if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        if (visualEditMode) {
          const iframe = document.querySelector("iframe") as HTMLIFrameElement | null;
          iframe?.contentWindow?.postMessage({ target: "sitezy-iframe", type: "redo" }, "*");
        } else {
          redo();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, visualEditMode, saveCurrentProject]);

  function handleNameSave() {
    if (nameVal.trim() && nameVal !== project.name) renameProject(project.id, nameVal.trim());
    setEditingName(false);
  }

  async function handleExport() {
    if (!project || exporting) return;
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; code?: string };
        throw createAppError({
          code: SAVE_SERIALIZE_001,
          devMessage: `Export failed (${res.status}): ${data.error ?? "unknown"}`,
          severity: "error",
          metadata: { projectId: project.id, status: res.status, code: data.code },
        });
      }
      const blob = await res.blob();
      const name = project.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
      downloadBlob(blob, `${name}-sitezy.zip`);
    } catch (err) {
      const appErr = normalizeError(err, SAVE_SERIALIZE_001);
      logAppError(appErr);
      alert(appErr.userMessage);
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
      setGenStatus("pages", `Regenerating ${page.name} (${i + 1}/${pages.length})...`);
      addGenLog(`📄 Regenerating ${page.name}...`, "progress");
      try {
        const bpPage = { id: page.id, name: page.name, slug: page.slug, sections: page.sections.map((s) => s.type || s.name), purpose: page.purpose };
        const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blueprint: project.blueprint, page: bpPage, brief: project.brief }) });
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string; code?: string };
          throw createAppError({
            code: API_GENERATE_001,
            devMessage: `Regenerate failed for "${page.name}" (${res.status}): ${data.error ?? "unknown"}`,
            severity: "error",
            metadata: { pageId: page.id, pageName: page.name, apiCode: data.code },
          });
        }
        const result: { html: string; sections: PageSection[] } = await res.json();
        setPageContent(page.id, result.html, result.sections);
        addGenLog(`✅ ${page.name} regenerated`, "success");
      } catch (err) {
        const appErr = normalizeError(err, API_GENERATE_001, { pageId: page.id, pageName: page.name });
        logAppError(appErr);
        setPageStatus(page.id, "error");
        addGenLog(`⚠️ ${page.name} failed`, "error");
      }
    }
    setGenStatus("done", "All pages regenerated!");
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
      const bpPage = { id: page.id, name: page.name, slug: page.slug, sections: page.sections.map((s) => s.type || s.name), purpose: page.purpose };
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blueprint: project.blueprint, page: bpPage, brief: project.brief }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; code?: string };
        throw createAppError({
          code: API_GENERATE_001,
          devMessage: `Regenerate current page failed for "${page.name}" (${res.status}): ${data.error ?? "unknown"}`,
          severity: "error",
          metadata: { pageId: page.id, pageName: page.name, apiCode: data.code },
        });
      }
      const result: { html: string; sections: PageSection[] } = await res.json();
      setPageContent(page.id, result.html, result.sections);
      addGenLog(`✅ ${page.name} regenerated`, "success");
      setGenStatus("done", "Page regenerated!");
    } catch (err) {
      const appErr = normalizeError(err, API_GENERATE_001, { pageId: page?.id, pageName: page?.name });
      logAppError(appErr);
      setPageStatus(page.id, "error");
      addGenLog(`⚠️ Regeneration failed: ${appErr.userMessage}`, "error");
      setGenStatus("error", "Regeneration failed");
    }
  }

  return (
    <header className="h-12 border-b border-white/[0.06] flex items-center gap-1.5 px-3 flex-shrink-0 bg-[#080809]">

      {/* Back */}
      <button onClick={() => closeProject()}
        className="flex items-center gap-1.5 px-2 py-1.5 text-white/40 hover:text-white/80 hover:bg-white/[0.04] rounded-lg text-[12px] transition-colors flex-shrink-0">
        <ArrowLeft size={13} />
        <span className="hidden sm:inline">Dashboard</span>
      </button>

      <div className="w-px h-5 bg-white/[0.06] mx-0.5" />

      {/* Project name — inline editable */}
      {editingName ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            ref={nameInputRef}
            autoFocus
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => { if (e.key === "Enter") handleNameSave(); if (e.key === "Escape") { setNameVal(project.name); setEditingName(false); } }}
            className="bg-white/[0.06] border border-brand-500/40 rounded-lg px-2 py-1 text-[13px] text-white font-semibold focus:outline-none w-36"
          />
          <button onClick={handleNameSave} className="w-6 h-6 flex items-center justify-center text-emerald-400 hover:bg-white/[0.06] rounded transition-colors">
            <Check size={11} />
          </button>
          <button onClick={() => { setNameVal(project.name); setEditingName(false); }} className="w-6 h-6 flex items-center justify-center text-white/30 hover:bg-white/[0.06] rounded transition-colors">
            <X size={11} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setEditingName(true); setTimeout(() => nameInputRef.current?.select(), 50); }}
          className="flex items-center gap-1.5 group flex-shrink-0 px-1 py-1 rounded-lg hover:bg-white/[0.04] transition-colors">
          <span className="text-[13px] font-semibold text-white/80 max-w-[160px] truncate">{project.name}</span>
          <Pencil size={10} className="text-white/0 group-hover:text-white/30 transition-colors flex-shrink-0" />
        </button>
      )}

      {/* Status pill */}
      <div className="flex-shrink-0 ml-0.5">
        {isGenerating ? (
          <span className="flex items-center gap-1.5 text-[11px] text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
            <Loader2 size={9} className="spin" />
            {genProgress ? genProgress.slice(0, 28) + (genProgress.length > 28 ? "…" : "") : "Generating"}
          </span>
        ) : isSaved ? (
          <span className="flex items-center gap-1 text-[11px] text-emerald-500/50">
            <CheckCircle2 size={9} /> Saved
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-amber-500/50">
            <AlertCircle size={9} /> Unsaved
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* Regenerate dropdown */}
      <div className="relative" onMouseLeave={() => setShowRegenMenu(false)}>
        <button
          onClick={() => setShowRegenMenu(!showRegenMenu)}
          disabled={!project.blueprint || isGenerating}
          className="flex items-center gap-1 px-2.5 py-1.5 text-white/50 hover:text-white/90 hover:bg-white/[0.05] border border-white/[0.08] rounded-lg text-[12px] font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          <RefreshCw size={11} className={isGenerating ? "spin" : ""} />
          <span className="hidden md:inline">Regenerate</span>
          <ChevronDown size={10} />
        </button>
        {showRegenMenu && (
          <div className="absolute right-0 top-[calc(100%+4px)] w-52 bg-[#111116] border border-white/[0.1] rounded-xl shadow-2xl shadow-black/50 z-50 py-1.5 overflow-hidden animate-fade-in">
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

      {/* Save */}
      <button
        onClick={() => saveCurrentProject({ manual: true })}
        disabled={saveState === "saving" || isSaved}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-white/50 hover:text-white/90 hover:bg-white/[0.05] border border-white/[0.08] rounded-lg text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        {saveState === "saving"
          ? <Loader2 size={11} className="spin" />
          : saveState === "saved" || isSaved
          ? <CheckCircle2 size={11} className="text-emerald-400" />
          : <Save size={11} />}
        <span className="hidden md:inline">Save</span>
      </button>

      {/* Export */}
      <button onClick={handleExport} disabled={exporting}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-white/50 hover:text-white/90 hover:bg-white/[0.05] border border-white/[0.08] rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50">
        {exporting ? <Loader2 size={11} className="spin" /> : <Download size={11} />}
        <span className="hidden md:inline">Export</span>
      </button>

      {/* Full preview */}
      <button onClick={() => setFullPreview(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white border border-brand-500/30 rounded-lg text-[12px] font-medium transition-all shadow-sm shadow-brand-500/20 hover:shadow-brand-500/30">
        <Maximize2 size={11} />
        <span className="hidden md:inline">Preview</span>
      </button>
    </header>
  );
}
