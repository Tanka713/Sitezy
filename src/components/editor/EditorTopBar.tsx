"use client";
import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { downloadBlob, extractNavbarHtml } from "@/lib/utils";
import { streamGeneratePage } from "@/lib/utils/generateStream";
import {
  ArrowLeft, Download, Maximize2,
  Loader2, CheckCircle2, AlertCircle, RefreshCw,
  ChevronDown, Zap, Pencil, Check, X, Save, Layers3, SlidersHorizontal,
} from "lucide-react";
import { createAppError, logAppError, normalizeError, API_GENERATE_001, SAVE_SERIALIZE_001 } from "@/lib/errors";
import { SitezyBadge, SitezyButton } from "@/components/ui/sitezy";
import type { Project, PageSection } from "@/types";

interface Props {
  project: Project;
  leftOpen: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

function TopBarTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-1/2 top-full z-[220] mt-2 -translate-x-1/2 whitespace-nowrap rounded-[10px] border border-white/[0.08] bg-[#11141d] px-2.5 py-1 text-[10px] font-medium text-white/90 opacity-0 shadow-[0_12px_28px_rgba(0,0,0,0.34)] transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
      {label}
    </span>
  );
}

export function EditorTopBar({ project, leftOpen, rightOpen, onToggleLeft, onToggleRight, iframeRef }: Props) {
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
  const setApiError           = useAppStore((s) => s.setApiError);
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
    function postToPreviewFrame(type: "undo" | "redo") {
      const frame = iframeRef?.current;
      if (frame?.contentWindow) {
        frame.contentWindow.postMessage({ target: "sitezy-iframe", type }, "*");
        return true;
      }
      return false;
    }

    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (visualEditMode) {
          if (!postToPreviewFrame("undo")) undo();
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
          if (!postToPreviewFrame("redo")) redo();
        } else {
          redo();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [iframeRef, undo, redo, visualEditMode, saveCurrentProject]);

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
      const requestId =
        typeof appErr.metadata?.requestId === "string" && appErr.metadata.requestId.trim()
          ? appErr.metadata.requestId
          : null;
      setApiError({
        message: appErr.userMessage,
        requestId,
        code: appErr.code,
      });
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
    let successCount = 0;
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      setPageStatus(page.id, "generating");
      setGenStatus("pages", `Regenerating ${page.name} (${i + 1}/${pages.length})...`);
      addGenLog(`📄 Regenerating ${page.name}...`, "progress");
      try {
        const bpPage = { id: page.id, name: page.name, slug: page.slug, sections: page.sections.map((s) => s.type || s.name), purpose: page.purpose };
        const result = await streamGeneratePage(
          { blueprint: project.blueprint, page: bpPage, brief: project.brief, navbarHtml: i > 0 ? sharedNavbarHtml : null },
          (chars) => setGenStatus("pages", `Regenerating ${page.name} (${i + 1}/${pages.length})… ${(chars / 1000).toFixed(1)}k`),
          120_000
        );
        setPageContent(page.id, result.html, result.sections);
        successCount += 1;
        addGenLog(`✅ ${page.name} regenerated`, "success");
        if (i === 0 && !sharedNavbarHtml && result.html) {
          sharedNavbarHtml = extractNavbarHtml(result.html);
        }
      } catch (err) {
        const appErr = normalizeError(err, API_GENERATE_001, { pageId: page.id, pageName: page.name });
        logAppError(appErr);
        setPageStatus(page.id, "error");
        addGenLog(`⚠️ ${page.name} failed: ${appErr.userMessage}`, "error");
      }
    }
    const failCount = pages.length - successCount;
    const summary = failCount === 0
      ? "All pages regenerated!"
      : `${successCount}/${pages.length} pages regenerated (${failCount} failed)`;
    setGenStatus("done", summary);
    addGenLog(failCount === 0 ? "✅ All done!" : `⚠️ Done with ${failCount} failure${failCount > 1 ? "s" : ""}.`, failCount === 0 ? "success" : "error");
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
      const result = await streamGeneratePage(
        { blueprint: project.blueprint, page: bpPage, brief: project.brief },
        (chars) => setGenStatus("pages", `Regenerating ${page.name}… ${(chars / 1000).toFixed(1)}k`),
        120_000
      );
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
    <header className="sz-topbar relative z-[140] flex h-[60px] flex-shrink-0 items-center gap-3 overflow-visible px-3 md:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="group relative">
          <SitezyButton variant="ghost" size="sm" onClick={() => closeProject()} className="h-9 min-h-[36px] px-3">
            <ArrowLeft size={14} />
            <span className="hidden lg:inline">Workspace</span>
          </SitezyButton>
          <div className="lg:hidden">
            <TopBarTooltip label="Workspace" />
          </div>
        </div>

        <div className="hidden h-6 w-px bg-white/[0.06] lg:block" />

        <div className="hidden items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.03] p-1 lg:flex">
          <button
            onClick={onToggleLeft}
            aria-label="Toggle structure panel"
            title="Structure (⌘/Ctrl+\\)"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all ${
              leftOpen
                ? "bg-white/[0.08] text-white"
                : "text-white/42 hover:bg-white/[0.05] hover:text-white/72"
            }`}
          >
            <Layers3 size={14} />
          </button>
          <button
            onClick={onToggleRight}
            aria-label="Toggle inspector panel"
            title="Inspector (⌘/Ctrl+Shift+\\)"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all ${
              rightOpen
                ? "bg-white/[0.08] text-white"
                : "text-white/42 hover:bg-white/[0.05] hover:text-white/72"
            }`}
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-2">
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
                className="sz-input min-h-[38px] max-w-[240px]"
              />
              <button onClick={handleNameSave} className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-300 transition-all hover:bg-white/[0.06]">
                <Check size={14} />
              </button>
              <button
                onClick={() => {
                  setNameVal(project.name);
                  setEditingName(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/34 transition-all hover:bg-white/[0.06] hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditingName(true);
                setTimeout(() => nameInputRef.current?.select(), 50);
              }}
              className="group flex min-w-0 items-center gap-2 rounded-[16px] border border-transparent px-2.5 py-1.5 transition-all hover:border-white/[0.06] hover:bg-white/[0.03]"
            >
              <div className="min-w-0 text-left">
                <p className="truncate text-[15px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{project.name}</p>
              </div>
              <Pencil size={12} className="text-white/0 transition-colors group-hover:text-white/32" />
            </button>
          )}
        </div>
      </div>

      <div className="hidden items-center gap-2 xl:flex">
        {isGenerating ? (
          <SitezyBadge className="bg-[rgba(107,119,255,0.14)] text-[var(--text-accent)]">
            <Loader2 size={11} className="spin" />
            {genProgress ? genProgress.slice(0, 34) + (genProgress.length > 34 ? "…" : "") : "Generating"}
          </SitezyBadge>
        ) : isSaved ? (
          <SitezyBadge className="bg-[rgba(49,196,141,0.12)] text-[#9fe5c6]">
            <CheckCircle2 size={11} />
            Synced
          </SitezyBadge>
        ) : (
          <SitezyBadge className="bg-[rgba(240,176,76,0.12)] text-[#ffd999]">
            <AlertCircle size={11} />
            Draft changes
          </SitezyBadge>
        )}
      </div>

      <div className="relative z-[150] flex items-center gap-2">
        <div className="group relative" onMouseLeave={() => setShowRegenMenu(false)}>
          <SitezyButton
            variant="secondary"
            size="sm"
            onClick={() => setShowRegenMenu(!showRegenMenu)}
            disabled={!project.blueprint || isGenerating}
            className="h-9 min-h-[36px] px-3"
          >
            <RefreshCw size={14} className={isGenerating ? "spin" : ""} />
            <span className="hidden xl:inline">Regenerate</span>
            <ChevronDown size={13} />
          </SitezyButton>
          <div className="xl:hidden">
            <TopBarTooltip label="Regenerate" />
          </div>
          {showRegenMenu ? (
            <div className="absolute right-0 top-full z-[220] w-60 pt-2">
              <div className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-[rgba(12,15,22,0.98)] p-2 shadow-[0_24px_54px_rgba(0,0,0,0.35)] backdrop-blur-xl animate-fade-in">
                <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/24">Regenerate</p>
                <button
                  onClick={handleRegenerateCurrent}
                  className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-[13px] text-[var(--text-secondary)] transition-all hover:bg-white/[0.05] hover:text-[var(--text-primary)]"
                >
                  <Zap size={14} className="text-[var(--text-accent)]" />
                  Current page
                </button>
                <button
                  onClick={handleRegenerateAll}
                  className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-[13px] text-[var(--text-secondary)] transition-all hover:bg-white/[0.05] hover:text-[var(--text-primary)]"
                >
                  <RefreshCw size={14} className="text-amber-300" />
                  Entire website
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="group relative">
          <SitezyButton
            variant={isSaved || saveState === "saved" ? "secondary" : "primary"}
            size="sm"
            onClick={() => saveCurrentProject({ manual: true })}
            disabled={saveState === "saving" || isSaved}
            title="Save project (⌘S)"
            className="h-9 min-h-[36px] px-3"
          >
            {saveState === "saving" ? <Loader2 size={14} className="spin" /> : isSaved ? <CheckCircle2 size={14} /> : <Save size={14} />}
            <span className="hidden xl:inline">{saveState === "saving" ? "Saving…" : isSaved ? "Saved" : "Save"}</span>
          </SitezyButton>
          <div className="xl:hidden">
            <TopBarTooltip label={saveState === "saving" ? "Saving" : isSaved ? "Saved" : "Save"} />
          </div>
        </div>

        <div className="group relative">
          <SitezyButton variant="secondary" size="sm" onClick={handleExport} disabled={exporting} className="h-9 min-h-[36px] px-3">
            {exporting ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
            <span className="hidden xl:inline">Export</span>
          </SitezyButton>
          <div className="xl:hidden">
            <TopBarTooltip label="Export" />
          </div>
        </div>

        <div className="group relative">
          <SitezyButton variant="primary" size="sm" onClick={() => setFullPreview(true)} className="h-9 min-h-[36px] px-3">
            <Maximize2 size={14} />
            <span className="hidden xl:inline">Preview</span>
          </SitezyButton>
          <div className="xl:hidden">
            <TopBarTooltip label="Preview" />
          </div>
        </div>
      </div>
    </header>
  );
}
