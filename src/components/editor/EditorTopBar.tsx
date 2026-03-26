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
    let sharedNavbarHtml: string | null = null;
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      setPageStatus(page.id, "generating");
      setGenStatus("pages", `Regenerating ${page.name} (${i + 1}/${pages.length})...`);
      addGenLog(`📄 Regenerating ${page.name}...`, "progress");
      try {
        const bpPage = { id: page.id, name: page.name, slug: page.slug, sections: page.sections.map((s) => s.type || s.name), purpose: page.purpose };
        const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blueprint: project.blueprint, page: bpPage, brief: project.brief, navbarHtml: i > 0 ? sharedNavbarHtml : null }) });
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
        // Capture navbar from first successful page for reuse
        if (i === 0 && !sharedNavbarHtml && result.html) {
          const navMatch = result.html.match(/<nav[\s\S]*?<\/nav>/i);
          const headerMatch = result.html.match(/<header[\s\S]*?<\/header>/i);
          sharedNavbarHtml = navMatch?.[0] ?? headerMatch?.[0] ?? null;
        }
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
    <header className="editor-panel relative z-[60] flex min-h-[58px] items-center gap-3 overflow-visible rounded-[24px] px-3 py-2 text-white">

      <button
        onClick={() => closeProject()}
        className="editor-action-btn flex h-9 flex-shrink-0 items-center gap-2 rounded-[14px] px-3 text-[12px] font-medium"
      >
        <ArrowLeft size={13} />
        <span className="hidden sm:inline">Dashboard</span>
      </button>

      <div className="editor-ghost-divider h-7 w-px flex-shrink-0" />

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[14px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(45,212,191,0.18),rgba(251,191,36,0.08))] text-[13px] font-semibold text-white">
          {project.name.slice(0, 1).toUpperCase() || "S"}
        </div>

        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                ref={nameInputRef}
                autoFocus
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNameSave();
                  if (e.key === "Escape") {
                    setNameVal(project.name);
                    setEditingName(false);
                  }
                }}
                className="editor-input w-full max-w-[220px] rounded-xl px-3 py-1.5 text-[14px] font-semibold text-white focus:outline-none"
              />
              <button
                onClick={handleNameSave}
                className="editor-action-btn flex h-7 w-7 items-center justify-center rounded-lg text-emerald-300"
              >
                <Check size={11} />
              </button>
              <button
                onClick={() => {
                  setNameVal(project.name);
                  setEditingName(false);
                }}
                className="editor-action-btn flex h-7 w-7 items-center justify-center rounded-lg text-white/50"
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditingName(true);
                setTimeout(() => nameInputRef.current?.select(), 50);
              }}
              className="group flex max-w-full items-center gap-1.5 rounded-lg px-0.5 py-0.5 text-left transition-colors"
            >
              <span className="truncate text-[14px] font-semibold text-white/90">{project.name}</span>
              <Pencil size={10} className="flex-shrink-0 text-white/0 transition-colors group-hover:text-white/34" />
            </button>
          )}

          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-white/34">
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-medium text-white/64">
              {project.pages?.length ?? 0} page{(project.pages?.length ?? 0) === 1 ? "" : "s"}
            </span>
            {isGenerating ? (
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-teal-300/14 bg-teal-400/8 px-2 py-0.5 text-teal-100/88">
                <Loader2 size={10} className="spin" />
                <span className="max-w-[180px] truncate">
                  {genProgress ? genProgress.slice(0, 28) + (genProgress.length > 28 ? "…" : "") : "Generating"}
                </span>
              </span>
            ) : isSaved ? (
              <span className="hidden md:inline-flex items-center gap-1.5 text-emerald-200/72">
                <CheckCircle2 size={10} /> Saved
              </span>
            ) : (
              <span className="hidden md:inline-flex items-center gap-1.5 text-amber-100/72">
                <AlertCircle size={10} /> Unsaved
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5">

        <div className="relative" onMouseLeave={() => setShowRegenMenu(false)}>
          <button
            onClick={() => setShowRegenMenu(!showRegenMenu)}
            disabled={!project.blueprint || isGenerating}
            className="editor-action-btn flex h-9 items-center gap-2 rounded-[14px] px-3 text-[12px] font-medium disabled:cursor-not-allowed"
          >
            <RefreshCw size={12} className={isGenerating ? "spin" : ""} />
            <span className="hidden md:inline">Regenerate</span>
            <ChevronDown size={11} />
          </button>
          {showRegenMenu && (
            <div className="editor-dialog absolute right-0 top-[calc(100%+10px)] z-[90] w-56 overflow-hidden rounded-[22px] py-2 animate-fade-in">
              <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/28">Regenerate</p>
              <button
                onClick={handleRegenerateCurrent}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[12px] text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <Zap size={12} className="text-[#5eead4]" /> Current page only
              </button>
              <button
                onClick={handleRegenerateAll}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[12px] text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <RefreshCw size={12} className="text-amber-300" /> Entire website
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => saveCurrentProject({ manual: true })}
          disabled={saveState === "saving" || isSaved}
          title="Save project (⌘S)"
          className={`flex h-9 items-center gap-2 rounded-[14px] px-3 text-[12px] font-medium transition-all ${
            isSaved || saveState === "saved"
              ? "editor-action-btn cursor-default text-emerald-200/70"
              : saveState === "saving"
              ? "editor-action-btn cursor-wait"
              : "editor-action-btn-primary"
          }`}
        >
          {saveState === "saving"
            ? <Loader2 size={12} className="spin" />
            : isSaved || saveState === "saved"
            ? <CheckCircle2 size={12} />
            : <Save size={12} />}
          <span className="hidden md:inline">
            {saveState === "saving" ? "Saving…" : isSaved ? "Saved" : "Save"}
          </span>
        </button>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="editor-action-btn flex h-9 items-center gap-2 rounded-[14px] px-3 text-[12px] font-medium disabled:opacity-50"
        >
          {exporting ? <Loader2 size={12} className="spin" /> : <Download size={12} />}
          <span className="hidden md:inline">Export</span>
        </button>

        <button
          onClick={() => setFullPreview(true)}
          className="editor-action-btn-strong flex h-9 items-center gap-2 rounded-[14px] px-3 text-[12px] font-medium"
        >
          <Maximize2 size={12} />
          <span className="hidden md:inline">Preview</span>
        </button>
      </div>
    </header>
  );
}
