"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildStudioCmsHref,
  buildStudioEditorHref,
  buildStudioLeadsHref,
  buildStudioWorkspaceHref,
} from "@/lib/app-navigation";
import { useAppStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { resolvePublishedHref } from "@/lib/publishing";
import {
  Copy, Database, ExternalLink, FileCode2, Globe2, Inbox, Loader2, MoreHorizontal, Pencil, Rocket, Trash2,
} from "lucide-react";
import { API_UNKNOWN_001, createAppError, normalizeError, type ErrorCode } from "@/lib/errors";
import { SitezyButton, SitezyBadge } from "@/components/ui/sitezy";
import type { Project } from "@/types";

// ── Thumbnail ──────────────────────────────────────────────────────────────────

function ProjectThumbnail({
  project,
  compact = false,
}: {
  project: Project;
  compact?: boolean;
}) {
  const blueprint = project.blueprint ?? null;
  const primaryColor = blueprint?.colorScheme?.primary ?? project.brief.colorPalette?.[0] ?? "#6b77ff";
  const secondaryColor = blueprint?.colorScheme?.secondary ?? project.brief.colorPalette?.[1] ?? "#7cc7ff";
  const accentColor = blueprint?.colorScheme?.accent ?? project.brief.colorPalette?.[2] ?? "#f5b46b";
  const previewPages = (project.pages.length > 0 ? project.pages.map((page) => page.name) : project.brief.pages)
    .filter((pageName) => Boolean(pageName))
    .slice(0, compact ? 2 : 3);
  const totalSections = project.pages.reduce((count, page) => count + page.sections.length, 0);
  const headline = blueprint?.siteName || project.brief.siteName || project.name;
  const summary = blueprint?.tagline || project.brief.description || "Ready to open in the editor.";
  const shellLabel = (blueprint?.layoutStyle ?? project.brief.siteType ?? "site concept").replace(/-/g, " ");
  const metricLabel = totalSections > 0
    ? `${totalSections} sections`
    : `${Math.max(project.pages.length, project.brief.pages.length, 1)} pages`;
  const toneLabel = typeof project.brief.tone === "string" && project.brief.tone.trim()
    ? project.brief.tone
    : "Refined";

  if (compact) {
    return (
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          background: `radial-gradient(circle at 18% 20%, ${primaryColor}40, transparent 38%), radial-gradient(circle at 84% 18%, ${accentColor}24, transparent 30%), linear-gradient(155deg, #0b1020, #111827 58%, #0b1220)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-55"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="relative p-2">
          <div className="rounded-[10px] border border-white/10 bg-[rgba(8,12,20,0.6)] p-2 shadow-[0_10px_24px_rgba(0,0,0,0.24)] backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
                <span className="truncate text-[6px] font-semibold uppercase tracking-[0.18em] text-white/58">
                  {shellLabel}
                </span>
              </div>
              <span
                className="rounded-full border px-1.5 py-0.5 text-[5.5px] font-medium uppercase tracking-[0.16em] text-white/68"
                style={{ borderColor: `${secondaryColor}55`, backgroundColor: `${secondaryColor}1a` }}
              >
                {metricLabel}
              </span>
            </div>

            <p className="mt-2 truncate text-[8px] font-semibold tracking-[-0.03em] text-white/92">
              {headline}
            </p>

            <div className="mt-2 space-y-1">
              <div className="h-1 rounded-full bg-white/14" style={{ width: "76%" }} />
              <div className="h-1 rounded-full bg-white/10" style={{ width: "54%" }} />
            </div>

            <div className="mt-2 flex items-center gap-1">
              {previewPages.map((pageName, index) => (
                <span
                  key={`${pageName}-${index}`}
                  className="truncate rounded-full border border-white/10 bg-white/6 px-1.5 py-0.5 text-[5.5px] uppercase tracking-[0.14em] text-white/55"
                >
                  {pageName}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: `radial-gradient(circle at 14% 18%, ${primaryColor}42, transparent 34%), radial-gradient(circle at 84% 16%, ${accentColor}24, transparent 28%), linear-gradient(160deg, #0a101b, #0f1727 58%, #0a1220)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative flex h-full flex-col p-4">
        <div className="flex h-full flex-col rounded-[22px] border border-white/10 bg-[rgba(8,12,20,0.58)] p-3.5 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {[primaryColor, secondaryColor, accentColor].map((color, index) => (
                <span
                  key={`${color}-${index}`}
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-medium uppercase tracking-[0.22em] text-white/40">
                {toneLabel}
              </span>
              <span
                className="rounded-full border px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/70"
                style={{ borderColor: `${secondaryColor}55`, backgroundColor: `${secondaryColor}1a` }}
              >
                {shellLabel}
              </span>
            </div>
          </div>

          <div className="mt-3 grid flex-1 grid-cols-[minmax(0,1.2fr)_minmax(0,0.88fr)] gap-3">
            <div
              className="flex min-w-0 flex-col justify-between rounded-[18px] border border-white/8 p-3.5"
              style={{
                background: `linear-gradient(145deg, ${primaryColor}1f, rgba(255,255,255,0.02) 55%, rgba(255,255,255,0.01))`,
              }}
            >
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-white/42">
                  {project.brief.siteType || "Website"}
                </p>
                <p
                  className="mt-2 text-[23px] font-semibold leading-[0.96] tracking-[-0.055em] text-white/94"
                  style={{
                    display: "-webkit-box",
                    overflow: "hidden",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                  }}
                >
                  {headline}
                </p>
                <p
                  className="mt-2 text-[11px] leading-[1.55] text-white/56"
                  style={{
                    display: "-webkit-box",
                    overflow: "hidden",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                  }}
                >
                  {summary}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span
                  className="rounded-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#08101b]"
                  style={{ backgroundColor: accentColor }}
                >
                  Open
                </span>
                <span className="h-8 flex-1 rounded-full border border-white/8 bg-white/6" />
              </div>
            </div>

            <div className="grid grid-rows-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-3">
              <div className="rounded-[18px] border border-white/8 bg-[rgba(255,255,255,0.03)] p-3">
                <div
                  className="h-full rounded-[14px] border border-white/10"
                  style={{
                    background: `linear-gradient(145deg, ${secondaryColor}32, ${primaryColor}1a 60%, rgba(255,255,255,0.05))`,
                    boxShadow: `inset 0 1px 0 ${accentColor}26`,
                  }}
                >
                  <div className="flex h-full flex-col justify-between p-3">
                    <div className="flex items-center justify-between">
                      <span className="h-2 w-12 rounded-full bg-white/18" />
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
                    </div>
                    <div className="space-y-2">
                      <div className="h-16 rounded-[12px] bg-[rgba(7,11,19,0.34)]" />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-8 rounded-[10px] bg-white/10" />
                        <div className="h-8 rounded-[10px] bg-white/8" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[16px] border border-white/8 bg-[rgba(255,255,255,0.03)] p-3">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/42">Pages</p>
                  <p className="mt-2 text-[22px] font-semibold tracking-[-0.05em] text-white/92">
                    {Math.max(project.pages.length, project.brief.pages.length, 1)}
                  </p>
                </div>
                <div className="rounded-[16px] border border-white/8 bg-[rgba(255,255,255,0.03)] p-3">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/42">Sections</p>
                  <p className="mt-2 text-[22px] font-semibold tracking-[-0.05em] text-white/92">
                    {Math.max(totalSections, previewPages.length, 1)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {previewPages.map((pageName, index) => (
              <div
                key={`${pageName}-${index}`}
                className="rounded-[14px] border border-white/8 bg-[rgba(255,255,255,0.03)] px-3 py-2.5"
              >
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">
                  Page {index + 1}
                </p>
                <p className="mt-1 truncate text-[12px] font-medium tracking-[-0.02em] text-white/82">
                  {pageName}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────────

interface Props {
  project: Project;
  viewMode?: "grid" | "list";
}

export function ProjectCard({ project, viewMode = "grid" }: Props) {
  const router = useRouter();
  const openProject     = useAppStore((s) => s.openProject);
  const deleteProject   = useAppStore((s) => s.deleteProject);
  const duplicateProject = useAppStore((s) => s.duplicateProject);
  const renameProject   = useAppStore((s) => s.renameProject);
  const hydrateProjects = useAppStore((s) => s.hydrateProjects);
  const setApiError     = useAppStore((s) => s.setApiError);

  const [showMenu, setShowMenu]       = useState(false);
  const [editing, setEditing]         = useState(false);
  const [nameVal, setNameVal]         = useState(project.name);
  const [armedDelete, setArmedDelete] = useState(false);
  const [hovered, setHovered]         = useState(false);
  const [publishing, setPublishing]   = useState(false);
  const armRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const bp         = project?.blueprint ?? null;
  const pageCount  = project?.pages?.length ?? 0;
  const donePages  = project?.pages?.filter((p) => p.status === "done").length ?? 0;
  const isReady    = project.status === "ready" || donePages > 0;
  const isGenerating =
    project.status === "generating" ||
    project.generationJob?.status === "queued" ||
    project.generationJob?.status === "running";
  const isPublished = project.publishedSite?.status === "published";
  const primaryColor = bp?.colorScheme?.primary ?? "#6b77ff";
  const workspaceHref = buildStudioWorkspaceHref();
  const cmsHref = buildStudioCmsHref(project.id, workspaceHref);
  const leadsHref = buildStudioLeadsHref(project.id, buildStudioEditorHref(project.id));

  useEffect(() => {
    if (!showMenu) return;

    router.prefetch(cmsHref);
    router.prefetch(leadsHref);

    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowMenu(false);
      }
    }

    window.addEventListener("mousedown", handlePointer);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("keydown", handleKey);
    };
  }, [cmsHref, leadsHref, router, showMenu]);

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!armedDelete) {
      setArmedDelete(true);
      armRef.current = setTimeout(() => setArmedDelete(false), 2400);
      return;
    }

    if (armRef.current) clearTimeout(armRef.current);
    setArmedDelete(false);
    setShowMenu(false);
    void deleteProject(project.id);
  }

  function handleRename() {
    if (nameVal.trim() && nameVal !== project.name) void renameProject(project.id, nameVal.trim());
    setEditing(false);
  }

  async function handlePublish(e: React.MouseEvent) {
    e.stopPropagation();
    if (publishing || isGenerating) return;

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
        requestId?: string | null;
      };
      if (!res.ok || !data.publishedSite) {
        throw createAppError({
          code: (data.code as ErrorCode | undefined) ?? API_UNKNOWN_001,
          devMessage: `Dashboard publish failed for project ${project.id} (${res.status})`,
          userMessage: data.error ?? "We couldn't publish this project right now.",
          severity: "error",
          metadata: {
            projectId: project.id,
            status: res.status,
            requestId: data.requestId ?? null,
          },
        });
      }

      await hydrateProjects();
      setShowMenu(false);
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, { action: "dashboardPublishProject", projectId: project.id });
      setApiError({
        message: appErr.userMessage,
        requestId: typeof appErr.metadata?.requestId === "string" ? appErr.metadata.requestId : null,
        code: appErr.code,
      });
    } finally {
      setPublishing(false);
    }
  }

  function handleOpenLive(e: React.MouseEvent) {
    e.stopPropagation();
    const subdomain = project.publishedSite?.subdomain;
    if (!subdomain) return;
    window.open(resolvePublishedHref(subdomain), "_blank", "noopener");
    setShowMenu(false);
  }

  function handleOpenCms(e: React.MouseEvent) {
    e.stopPropagation();
    router.push(cmsHref);
    setShowMenu(false);
  }

  function handleOpenLeads(e: React.MouseEvent) {
    e.stopPropagation();
    router.push(leadsHref);
    setShowMenu(false);
  }

  function renderProjectMenu() {
    return (
      <div className="absolute right-0 top-11 z-20 w-44 rounded-[18px] border border-[var(--border-softer)] bg-[var(--surface-overlay)] p-2 shadow-[var(--shadow-lg)] backdrop-blur-xl">
        <MenuAction onClick={() => { void openProject(project.id); setShowMenu(false); }} icon={<ExternalLink size={14} />} label="Open editor" />
        <MenuAction onClick={handleOpenCms} icon={<Database size={14} />} label="Open CMS" />
        <MenuAction onClick={handleOpenLeads} icon={<Inbox size={14} />} label="Open leads" />
        <MenuAction
          onClick={handlePublish}
          icon={publishing ? <Loader2 size={14} className="spin" /> : <Rocket size={14} />}
          label={isPublished ? "Republish" : "Publish"}
        />
        {isPublished ? (
          <MenuAction onClick={handleOpenLive} icon={<Globe2 size={14} />} label="Open live" />
        ) : null}
        <MenuAction onClick={() => { setEditing(true); setShowMenu(false); }} icon={<Pencil size={14} />} label="Rename" />
        <MenuAction onClick={() => { void duplicateProject(project.id); setShowMenu(false); }} icon={<Copy size={14} />} label="Duplicate" />
        <div className="my-1.5 h-px bg-[var(--border-soft)]" />
        <MenuAction onClick={handleDelete} icon={<Trash2 size={14} />} label={armedDelete ? "Confirm delete?" : "Delete"} danger />
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────

  if (viewMode === "list") {
    return (
      <div
        ref={rootRef}
        role="button"
        tabIndex={0}
        onClick={() => void openProject(project.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void openProject(project.id); }
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative grid w-full grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] items-center gap-4 rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-5 py-4 text-left transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-4)]"
      >
        <div className="flex min-w-0 items-center gap-4">
          {/* Mini thumbnail */}
          <div className="relative h-12 w-20 flex-shrink-0 overflow-hidden rounded-[12px] border border-[var(--border-softer)]">
            {isReady ? (
              <ProjectThumbnail project={project} compact />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(135deg, ${primaryColor}26, var(--surface-4))` }}
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-[-0.02em]">{project.name}</p>
            <p className="mt-0.5 truncate text-[12px] text-[var(--text-tertiary)]">
              {bp?.layoutStyle ?? "Untitled blueprint"}
            </p>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-1.5">
            {isGenerating && <SitezyBadge className="sz-status-info">Generating</SitezyBadge>}
            {isReady && <SitezyBadge className="sz-status-success">{donePages}/{pageCount} pages</SitezyBadge>}
            {isPublished ? <SitezyBadge className="sz-status-success">Live</SitezyBadge> : null}
          </div>
        </div>

        <p className="text-[12px] text-[var(--fg-muted)]">{formatDate(project.createdAt)}</p>

        <div className="relative flex justify-end gap-2">
          <SitezyButton
            variant={hovered ? "primary" : "secondary"}
            size="sm"
            className="min-w-[92px]"
            onClick={(e) => { e.stopPropagation(); void openProject(project.id); }}
          >
            Open
          </SitezyButton>
          <button
            type="button"
            aria-label="Project actions"
            aria-expanded={showMenu}
            onClick={(event) => {
              event.stopPropagation();
              setShowMenu((current) => !current);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-softer)] bg-[var(--bg-frost)] text-[var(--fg-soft)] transition-all hover:text-[var(--text-primary)]"
          >
            <MoreHorizontal size={15} />
          </button>
          {showMenu ? renderProjectMenu() : null}
        </div>
      </div>
    );
  }

  // ── Grid view ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={rootRef}
      role="button"
      tabIndex={0}
      onClick={() => void openProject(project.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void openProject(project.id); }
      }}
      className={`group relative flex cursor-pointer flex-col rounded-[26px] border border-[var(--border-soft)] bg-[linear-gradient(160deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] transition-all duration-300 ${showMenu ? "z-30" : "z-0"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowMenu(false); }}
      style={{
        boxShadow: hovered
          ? "0 28px 72px rgba(0,0,0,0.38), 0 0 0 1px rgba(255,255,255,0.08)"
          : "0 4px 16px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Thumbnail area */}
      <div className="relative h-[220px]">
        <div className="absolute inset-0 overflow-hidden rounded-t-[26px]">
          {isReady ? (
            <ProjectThumbnail project={project} />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: bp
                  ? `radial-gradient(circle at top left, ${primaryColor}35, transparent 55%), linear-gradient(160deg, var(--surface-5), var(--surface-3))`
                  : "linear-gradient(180deg, var(--surface-4), var(--surface-3))",
              }}
            >
              {!bp && (
                <div className="flex h-full items-center justify-center">
                  <FileCode2 size={32} className="text-[var(--fg-subtle)]" />
                </div>
              )}
            </div>
          )}

          {/* Bottom fade */}
          <div className="pointer-events-none absolute inset-0" style={{ background: "var(--surface-card-fade)" }} />

          {/* Date overlay at bottom */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 px-5 pb-4">
            {!editing && (
              <p className="text-[11px] font-medium text-[var(--fg-muted)]">
                {formatDate(project.createdAt)}
                {bp?.typography?.headingFont ? ` · ${bp.typography.headingFont}` : ""}
              </p>
            )}
          </div>
        </div>

        {/* Status badges — top left */}
        <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-1.5">
          {isGenerating && (
            <SitezyBadge className="sz-status-info backdrop-blur-sm">
              Generating
            </SitezyBadge>
          )}
          {isReady && (
            <SitezyBadge className="sz-status-success backdrop-blur-sm">
              {donePages}/{pageCount} pages
            </SitezyBadge>
          )}
          {isPublished ? (
            <SitezyBadge className="sz-status-success backdrop-blur-sm">
              Live
            </SitezyBadge>
          ) : null}
        </div>

        {/* Menu — top right */}
        <div className="absolute right-3 top-3 z-20">
          <button
            type="button"
            aria-label="Project actions"
            aria-expanded={showMenu}
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-softer)] bg-[var(--bg-frost)] text-[var(--fg-soft)] opacity-100 backdrop-blur-sm transition-all hover:text-[var(--text-primary)] lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
          >
            <MoreHorizontal size={15} />
          </button>

          {showMenu ? renderProjectMenu() : null}
        </div>
      </div>

      {/* Bottom strip */}
      <div className="border-t border-[var(--border-soft)] px-5 py-4">
        {editing ? (
          <input
            autoFocus
            value={nameVal}
            onChange={(event) => setNameVal(event.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") { setNameVal(project.name); setEditing(false); }
            }}
            className="sz-input min-h-[36px] flex-1 text-[14px]"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold tracking-[-0.02em]">{project.name}</p>
            <p className="mt-0.5 truncate text-[12px] text-[var(--fg-muted)] tracking-[-0.005em]">
              {project.brief?.description || "Open to start editing."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Menu item ─────────────────────────────────────────────────────────────────

function MenuAction({
  onClick, icon, label, danger = false,
}: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-[13px] transition-all ${
        danger
          ? "text-[var(--danger-fg)] hover:bg-[rgba(240,106,116,0.12)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
