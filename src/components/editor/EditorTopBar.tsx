"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  buildStudioCmsHref,
  buildStudioEditorHref,
  buildStudioLeadsHref,
} from "@/lib/app-navigation";
import { useAppStore } from "@/lib/store";
import { getJobGenerationEtaLabel, getTimingEtaLabel } from "@/lib/generation-eta";
import { downloadBlob } from "@/lib/utils";
import { resolvePublishedHref } from "@/lib/publishing";
import {
  ArrowLeft, Download, Maximize2,
  Loader2, CheckCircle2, AlertCircle,
  Pencil, Check, X, Save, Rocket, Globe2, Database, Inbox,
  Layers3, Link2, SlidersHorizontal,
} from "lucide-react";
import { API_UNKNOWN_001, createAppError, logAppError, normalizeError, SAVE_SERIALIZE_001, type ErrorCode } from "@/lib/errors";
import { AdaptiveFeedbackPrompt } from "@/components/editor/AdaptiveFeedbackPrompt";
import { SitezyBadge, SitezyButton } from "@/components/ui/sitezy";
import { UserAvatarMenu } from "@/components/ui/UserAvatarMenu";
import type { Project, UserAccountProfile } from "@/types";

interface Props {
  project: Project;
  initialAccount?: UserAccountProfile | null;
  leftOpen: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

function TopBarTooltip({ label, shortcut }: { label: string; shortcut?: string }) {
  return (
    <span className="sz-tooltip pointer-events-none absolute left-1/2 top-full z-[220] mt-2 -translate-x-1/2 whitespace-nowrap rounded-[10px] px-2.5 py-1 text-[10px] font-medium opacity-0 transition-all duration-150 group-hover:opacity-100">
      {label}
      {shortcut ? <span className="ml-1 text-[9px] font-normal text-[var(--fg-muted)]">({shortcut})</span> : null}
    </span>
  );
}

export function EditorTopBar({
  project,
  initialAccount = null,
  leftOpen,
  rightOpen,
  onToggleLeft,
  onToggleRight,
  iframeRef,
}: Props) {
  const router = useRouter();
  const closeProject    = useAppStore((s) => s.closeProject);
  const undo            = useAppStore((s) => s.undo);
  const redo            = useAppStore((s) => s.redo);
  const isSaved         = useAppStore((s) => s.isSaved);
  const genStatus       = useAppStore((s) => s.generationStatus);
  const genProgress     = useAppStore((s) => s.generationProgress);
  const generationStartedAt = useAppStore((s) => s.generationStartedAt);
  const generationEstimateMs = useAppStore((s) => s.generationEstimateMs);
  const renameProject         = useAppStore((s) => s.renameProject);
  const setApiError           = useAppStore((s) => s.setApiError);
  const saveCurrentProject    = useAppStore((s) => s.saveCurrentProject);
  const syncProjectFromServer = useAppStore((s) => s.syncProjectFromServer);
  const saveState             = useAppStore((s) => s.saveState);
  const saveError             = useAppStore((s) => s.saveError);
  const visualEditMode        = useAppStore((s) => s.editor.visualEditMode);
  const selectedPageId        = useAppStore((s) => s.editor.selectedPageId);

  const [exporting, setExporting]   = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [sharingPreview, setSharingPreview] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal]         = useState(project.name);
  const [now, setNow] = useState(() => Date.now());
  const nameInputRef = useRef<HTMLInputElement>(null);

  const derivedGeneratingPage = project.pages.find((page) => page.status === "generating") ?? null;
  const completedPages = project.pages.filter((page) => page.status === "done").length;
  const hasPendingPages = project.pages.some((page) => page.status === "pending");
  const backgroundProgress =
    project.generationJob?.status === "queued" || project.generationJob?.status === "running"
      ? project.generationJob.progressMessage?.trim() || ""
      : "";
  const backgroundJob = project.generationJob?.status === "queued" || project.generationJob?.status === "running";
  const isGenerating =
    genStatus === "blueprint" ||
    genStatus === "pages" ||
    genStatus === "normalizing" ||
    backgroundJob ||
    project.status === "generating" ||
    hasPendingPages ||
    Boolean(derivedGeneratingPage);
  const derivedProgress =
    backgroundProgress ||
    genProgress.trim() ||
    (derivedGeneratingPage
      ? `Generating ${derivedGeneratingPage.name} (${Math.min(project.pages.length, completedPages + 1)}/${project.pages.length})...`
      : project.pages.length === 0
      ? "Analyzing your brief..."
      : hasPendingPages
      ? `Preparing next page (${completedPages}/${project.pages.length})...`
      : "Building your site...");
  const generationEtaLabel = backgroundJob
    ? getJobGenerationEtaLabel(project.generationJob ?? null, now)
    : getTimingEtaLabel(generationStartedAt, generationEstimateMs, now);
  const isPublished = project.publishedSite?.status === "published";
  const editorHref = buildStudioEditorHref(project.id);
  const cmsHref = buildStudioCmsHref(project.id, editorHref);
  const leadsHref = buildStudioLeadsHref(project.id, editorHref);
  const showAdaptiveFeedbackPrompt =
    !isGenerating &&
    Boolean(project.brief.siteName.trim() && (project.blueprint || project.pages.length > 0));

  useEffect(() => { setNameVal(project.name); }, [project.name]);

  useEffect(() => {
    if (!isGenerating) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isGenerating]);

  useEffect(() => {
    router.prefetch(cmsHref);
    router.prefetch(leadsHref);
  }, [cmsHref, leadsHref, router]);

  useEffect(() => {
    if (!shareCopied) return;
    const timeoutId = window.setTimeout(() => setShareCopied(false), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [shareCopied]);

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
        if (isGenerating) return;
        e.preventDefault();
        if (visualEditMode) {
          if (!postToPreviewFrame("undo")) undo();
        } else {
          undo();
        }
      }
      if (e.key === "s") {
        if (isGenerating) return;
        e.preventDefault();
        saveCurrentProject({ manual: true });
      }
      if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        if (isGenerating) return;
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
  }, [iframeRef, isGenerating, undo, redo, visualEditMode, saveCurrentProject]);

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

  async function handleOpenPreview() {
    const activePageId = selectedPageId ?? project.pages[0]?.id ?? null;
    const previewUrl = `/preview/${project.id}${activePageId ? `?page=${encodeURIComponent(activePageId)}` : ""}`;
    const previewWindow = window.open("about:blank", "_blank");

    if (previewWindow) {
      const theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
      const bg = theme === "light" ? "#f6f9ff" : "#05070b";
      const fg = theme === "light" ? "#0f1720" : "#d8deeb";
      const cardBg = theme === "light" ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.03)";
      const border = theme === "light" ? "rgba(13,17,28,0.08)" : "rgba(255,255,255,0.08)";
      previewWindow.document.write(`<!doctype html><html><head><title>Opening preview…</title><style>html,body{margin:0;height:100%;background:${bg};color:${fg};font:14px/1.5 Inter,system-ui,sans-serif}body{display:flex;align-items:center;justify-content:center}div{display:flex;align-items:center;gap:12px;padding:18px 22px;border:1px solid ${border};border-radius:18px;background:${cardBg};box-shadow:0 16px 40px rgba(0,0,0,0.12)}span.dot{width:10px;height:10px;border-radius:999px;background:#6b77ff;box-shadow:0 0 0 8px rgba(107,119,255,0.12)}</style></head><body><div><span class="dot"></span><span>Preparing preview…</span></div></body></html>`);
      previewWindow.document.close();
    }

    const saved = await saveCurrentProject({ manual: true });
    if (!saved) {
      if (previewWindow) {
        const message = saveError || "Preview could not open because the current project could not be saved.";
        previewWindow.document.open();
        previewWindow.document.write(
          `<!doctype html><html><head><title>Preview unavailable</title><style>html,body{margin:0;height:100%;background:#05070b;color:#d8deeb;font:14px/1.6 Inter,system-ui,sans-serif}body{display:flex;align-items:center;justify-content:center;padding:24px}.card{width:min(100%,520px);border:1px solid rgba(255,255,255,0.08);border-radius:24px;background:rgba(255,255,255,0.03);padding:24px 26px;box-shadow:0 16px 40px rgba(0,0,0,0.22)}.eyebrow{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,0.35)}h1{margin:10px 0 8px;font-size:28px;line-height:1.05}p{margin:0;color:rgba(255,255,255,0.7)}</style></head><body><div class="card"><div class="eyebrow">Preview</div><h1>Preview unavailable</h1><p>${message.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p></div></body></html>`
        );
        previewWindow.document.close();
      }
      return;
    }

    if (previewWindow) {
      try {
        previewWindow.opener = null;
      } catch {}
      previewWindow.location.href = previewUrl;
      return;
    }

    window.open(previewUrl, "_blank", "noopener");
  }

  async function handleCreatePreviewShare() {
    if (!project || sharingPreview || isGenerating) return;
    const activePageId = selectedPageId ?? project.pages[0]?.id ?? null;
    const activePage = activePageId
      ? project.pages.find((page) => page.id === activePageId) ?? null
      : null;

    const saved = await saveCurrentProject({ manual: true });
    if (!saved) return;

    setSharingPreview(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/preview/share`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: activePageId,
          label: activePage ? `${activePage.name} review` : "Project review",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        share?: { shareUrl?: string | null };
        error?: string;
        code?: string;
      };
      if (!res.ok || !data.share?.shareUrl) {
        throw createAppError({
          code: (data.code as ErrorCode | undefined) ?? API_UNKNOWN_001,
          devMessage: `Preview share failed for ${project.id} (${res.status})`,
          userMessage: data.error ?? "We couldn't create a preview share link right now.",
          severity: "error",
          metadata: { projectId: project.id, pageId: activePageId, status: res.status, code: data.code ?? null },
        });
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(data.share.shareUrl);
      } else {
        window.prompt("Copy preview share URL", data.share.shareUrl);
      }
      setShareCopied(true);
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, { action: "createPreviewShare", projectId: project.id });
      logAppError(appErr);
      setApiError({
        message: appErr.userMessage,
        requestId: typeof appErr.metadata?.requestId === "string" ? appErr.metadata.requestId : null,
        code: appErr.code,
      });
    } finally {
      setSharingPreview(false);
    }
  }

  async function handlePublish() {
    if (!project || publishing || isGenerating) return;

    const saved = await saveCurrentProject({ manual: true });
    if (!saved) return;

    setPublishing(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/publish`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        publishedSite?: unknown;
        error?: string;
        code?: string;
      };
      if (!res.ok || !data.publishedSite) {
        throw createAppError({
          code: (data.code as ErrorCode | undefined) ?? API_UNKNOWN_001,
          devMessage: `Publish failed for project ${project.id} (${res.status})`,
          userMessage: data.error ?? "We couldn't publish this project right now.",
          severity: "error",
          metadata: { projectId: project.id, status: res.status, code: data.code ?? null },
        });
      }

      await syncProjectFromServer(project.id, { preserveEditor: true, preserveHistory: true });
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, { action: "publishProject", projectId: project.id });
      logAppError(appErr);
      setApiError({
        message: appErr.userMessage,
        requestId: typeof appErr.metadata?.requestId === "string" ? appErr.metadata.requestId : null,
        code: appErr.code,
      });
    } finally {
      setPublishing(false);
    }
  }

  function handleOpenLive() {
    const subdomain = project.publishedSite?.subdomain;
    if (!subdomain) return;
    window.open(resolvePublishedHref(subdomain), "_blank", "noopener");
  }

  async function handleOpenCms() {
    if (!isSaved) {
      const saved = await saveCurrentProject({ manual: true });
      if (!saved) return;
    }
    router.push(cmsHref);
  }

  async function handleOpenLeads() {
    if (!isSaved) {
      const saved = await saveCurrentProject({ manual: true });
      if (!saved) return;
    }
    router.push(leadsHref);
  }

  return (
    <header className="sz-topbar relative z-[140] flex h-[60px] flex-shrink-0 items-center gap-2 overflow-visible px-3 md:gap-3 md:px-4">
      <div className="flex min-w-0 flex-[1_1_320px] items-center gap-2.5">
        <div className="group relative shrink-0">
          <button
            type="button"
            onClick={() => closeProject()}
            className="inline-flex h-9 items-center gap-2 px-1.5 text-[13px] font-medium text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={14} />
            <span className="hidden lg:inline">Workspace</span>
          </button>
          <div className="lg:hidden">
            <TopBarTooltip label="Workspace" />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--border-soft)] bg-[var(--surface-3)] p-1">
          <div className="group relative">
            <button
              type="button"
              onClick={onToggleLeft}
              aria-pressed={leftOpen}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                leftOpen
                  ? "bg-[rgba(107,119,255,0.14)] text-[var(--text-primary)]"
                  : "text-[var(--fg-muted)] hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Layers3 size={14} />
            </button>
            <TopBarTooltip label={leftOpen ? "Hide structure" : "Show structure"} shortcut="⌘\\" />
          </div>
          <div className="group relative">
            <button
              type="button"
              onClick={onToggleRight}
              aria-pressed={rightOpen}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                rightOpen
                  ? "bg-[rgba(107,119,255,0.14)] text-[var(--text-primary)]"
                  : "text-[var(--fg-muted)] hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"
              }`}
            >
              <SlidersHorizontal size={14} />
            </button>
            <TopBarTooltip label={rightOpen ? "Hide inspector" : "Show inspector"} shortcut="⌘⇧\\" />
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
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
              <button onClick={handleNameSave} className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-300 transition-all hover:bg-[var(--surface-4)]">
                <Check size={14} />
              </button>
              <button
                onClick={() => {
                  setNameVal(project.name);
                  setEditingName(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--fg-faint)] transition-all hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"
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
              className="group flex max-w-full min-w-0 items-center gap-2 rounded-[14px] border border-transparent px-2.5 py-1.5 transition-all duration-200 hover:border-[var(--border-soft)] hover:bg-[var(--surface-3)]"
            >
              <div className="min-w-0 text-left">
                <p className="truncate text-[14px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{project.name}</p>
              </div>
              <Pencil size={11} className="flex-shrink-0 text-transparent transition-colors group-hover:text-[var(--fg-faint)]" />
            </button>
          )}
        </div>
      </div>

      <div className="hidden min-w-0 flex-[0_1_auto] items-center gap-2 2xl:flex">
        {isGenerating ? (
          <SitezyBadge className="sz-status-info min-w-0 max-w-[380px] gap-1.5">
            <Loader2 size={11} className="spin" />
            <span className="truncate">{derivedProgress}</span>
            {generationEtaLabel ? (
              <span className="flex-shrink-0 text-[var(--text-tertiary)]">· {generationEtaLabel}</span>
            ) : null}
          </SitezyBadge>
        ) : isSaved ? (
          <SitezyBadge className="sz-status-success">
            <CheckCircle2 size={11} />
            Synced
          </SitezyBadge>
        ) : (
          <SitezyBadge className="sz-status-warning">
            <AlertCircle size={11} />
            Draft changes
          </SitezyBadge>
        )}
      </div>

      {showAdaptiveFeedbackPrompt ? (
        <AdaptiveFeedbackPrompt
          projectId={project.id}
          brief={project.brief}
          className="max-w-[520px] flex-[0_1_520px]"
        />
      ) : null}

      <div className="relative z-[150] flex min-w-max shrink-0 items-center gap-1.5">
        {/* Secondary action group */}
        <div className="hidden items-center gap-1 rounded-full border border-[var(--border-soft)] bg-[var(--surface-3)] p-1 2xl:flex">
          <div className="group relative">
            <button
              onClick={() => saveCurrentProject({ manual: true })}
              disabled={saveState === "saving" || isSaved || isGenerating}
              title="Save"
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-all disabled:cursor-default disabled:opacity-50 ${
                !isSaved && saveState !== "saving" && saveState !== "saved"
                  ? "bg-[rgba(91,140,255,0.18)] text-[var(--text-primary)]"
                  : "text-[var(--fg-muted)] hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"
              }`}
            >
              {saveState === "saving" ? <Loader2 size={12} className="spin" /> : isSaved ? <CheckCircle2 size={12} /> : <Save size={12} />}
              <span>{saveState === "saving" ? "Saving…" : isSaved ? "Saved" : "Save"}</span>
            </button>
          </div>

          <div className="h-4 w-px bg-[var(--border-soft)]" />

          <div className="group relative">
            <button onClick={() => void handleOpenCms()} title="CMS"
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-[var(--fg-muted)] transition-all hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]">
              <Database size={12} />
              <span>CMS</span>
            </button>
          </div>

          <div className="group relative">
            <button onClick={() => void handleOpenLeads()} title="Leads"
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-[var(--fg-muted)] transition-all hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]">
              <Inbox size={12} />
              <span>Leads</span>
            </button>
          </div>

          <div className="group relative">
            <button onClick={handleExport} disabled={exporting || isGenerating} title="Export"
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-[var(--fg-muted)] transition-all hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)] disabled:opacity-50">
              {exporting ? <Loader2 size={12} className="spin" /> : <Download size={12} />}
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Mobile: condensed save */}
        <div className="group relative 2xl:hidden">
          <SitezyButton
            variant={isSaved || saveState === "saved" ? "secondary" : "primary"}
            size="sm"
            onClick={() => saveCurrentProject({ manual: true })}
            disabled={saveState === "saving" || isSaved || isGenerating}
            className="h-9 min-h-[36px] px-3"
          >
            {saveState === "saving" ? <Loader2 size={14} className="spin" /> : isSaved ? <CheckCircle2 size={14} /> : <Save size={14} />}
          </SitezyButton>
          <TopBarTooltip label={saveState === "saving" ? "Saving" : isSaved ? "Saved" : "Save"} shortcut="⌘S" />
        </div>

        {/* Publish / Live */}
        <div className="group relative">
          <SitezyButton
            variant={isPublished ? "secondary" : "primary"}
            size="sm"
            onClick={() => void handlePublish()}
            disabled={publishing || isGenerating}
            className="h-9 min-h-[36px] px-3"
          >
            {publishing ? <Loader2 size={14} className="spin" /> : <Rocket size={14} />}
            <span className="hidden 2xl:inline">{isPublished ? "Republish" : "Publish"}</span>
          </SitezyButton>
          <div className="2xl:hidden">
            <TopBarTooltip label={isPublished ? "Republish" : "Publish"} />
          </div>
        </div>

        {isPublished ? (
          <div className="group relative">
            <SitezyButton variant="secondary" size="sm" onClick={handleOpenLive} className="h-9 min-h-[36px] px-3">
              <Globe2 size={14} />
              <span className="hidden 2xl:inline">Live</span>
            </SitezyButton>
            <div className="2xl:hidden">
              <TopBarTooltip label="Open live site" />
            </div>
          </div>
        ) : null}

        <div className="group relative">
          <SitezyButton
            variant="secondary"
            size="sm"
            onClick={() => void handleCreatePreviewShare()}
            disabled={sharingPreview || isGenerating}
            className="h-9 min-h-[36px] px-3"
          >
            {sharingPreview ? <Loader2 size={14} className="spin" /> : shareCopied ? <CheckCircle2 size={14} /> : <Link2 size={14} />}
            <span className="hidden 2xl:inline">{shareCopied ? "Copied" : "Share"}</span>
          </SitezyButton>
          <div className="2xl:hidden">
            <TopBarTooltip label={shareCopied ? "Preview link copied" : "Copy preview link"} />
          </div>
        </div>

        <div className="group relative">
          <SitezyButton variant="primary" size="sm" onClick={() => void handleOpenPreview()} disabled={isGenerating} className="h-9 min-h-[36px] px-3">
            <Maximize2 size={14} />
            <span className="hidden 2xl:inline">Preview</span>
          </SitezyButton>
          <div className="2xl:hidden">
            <TopBarTooltip label="Preview" />
          </div>
        </div>

        <UserAvatarMenu
          initialAccount={initialAccount}
          compact
          showStudioShortcut={false}
          settingsReturnHref={editorHref}
        />
      </div>
    </header>
  );
}
