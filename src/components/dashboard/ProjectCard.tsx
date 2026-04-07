"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { resolvePublishedHref } from "@/lib/publishing";
import {
  Check, Copy, Database, ExternalLink, FileCode2, Globe2, Loader2, MoreHorizontal, Pencil, Rocket, Trash2,
} from "lucide-react";
import { API_UNKNOWN_001, createAppError, normalizeError, type ErrorCode } from "@/lib/errors";
import { SitezyButton, SitezyBadge } from "@/components/ui/sitezy";
import type { Project } from "@/types";

// ── Thumbnail ──────────────────────────────────────────────────────────────────

function ProjectThumbnail({ projectId }: { projectId: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="absolute inset-0 bg-[var(--bg-subtle)]">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[var(--surface-5)] to-transparent" />
      )}
      <iframe
        src={`/api/preview-frame?projectId=${projectId}`}
        title="Site preview"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "1440px",
          height: "900px",
          border: "none",
          transform: "scale(0.278)",
          transformOrigin: "top left",
          pointerEvents: "none",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────────

interface Props {
  project: Project;
  viewMode?: "grid" | "list";
}

export function ProjectCard({ project, viewMode = "grid" }: Props) {
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

  useEffect(() => {
    if (!showMenu) return;

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
  }, [showMenu]);

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
    window.location.assign(`/studio/cms/${project.id}`);
    setShowMenu(false);
  }

  function renderProjectMenu() {
    return (
      <div className="absolute right-0 top-11 z-20 w-44 rounded-[18px] border border-[var(--border-softer)] bg-[var(--surface-overlay)] p-2 shadow-[var(--shadow-lg)] backdrop-blur-xl">
        <MenuAction onClick={() => { void openProject(project.id); setShowMenu(false); }} icon={<ExternalLink size={14} />} label="Open editor" />
        <MenuAction onClick={handleOpenCms} icon={<Database size={14} />} label="Open CMS" />
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
              <ProjectThumbnail projectId={project.id} />
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
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[26px] border border-[var(--border-soft)] bg-[linear-gradient(160deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] transition-all duration-300"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowMenu(false); }}
      style={{
        transform: hovered ? "translateY(-5px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 28px 72px rgba(0,0,0,0.38), 0 0 0 1px rgba(255,255,255,0.08)"
          : "0 4px 16px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Thumbnail area */}
      <div className="relative h-[220px]">
        <div className="absolute inset-0 overflow-hidden">
          {isReady ? (
            <ProjectThumbnail projectId={project.id} />
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
              <Check size={10} />
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
      <div className="flex items-center justify-between gap-3 border-t border-[var(--border-soft)] px-5 py-4">
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
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold tracking-[-0.02em]">{project.name}</p>
              <p className="mt-0.5 truncate text-[12px] text-[var(--fg-muted)] tracking-[-0.005em]">
                {project.brief?.description || "Open to start editing."}
              </p>
            </div>
            <ExternalLink size={13} className="flex-shrink-0 text-[var(--fg-subtle)] transition-colors duration-200 group-hover:text-[var(--accent-default)]" />
          </>
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
