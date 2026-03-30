"use client";

import { useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import {
  Check, Copy, ExternalLink, FileCode2, MoreHorizontal, Pencil, Trash2,
} from "lucide-react";
import { SitezyButton, SitezyBadge } from "@/components/ui/sitezy";
import type { Project } from "@/types";

// ── Thumbnail ──────────────────────────────────────────────────────────────────

function ProjectThumbnail({ projectId }: { projectId: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="absolute inset-0 bg-[#080b11]">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.05] to-transparent" />
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

  const [showMenu, setShowMenu]       = useState(false);
  const [editing, setEditing]         = useState(false);
  const [nameVal, setNameVal]         = useState(project.name);
  const [armedDelete, setArmedDelete] = useState(false);
  const [hovered, setHovered]         = useState(false);
  const armRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bp         = project?.blueprint ?? null;
  const pageCount  = project?.pages?.length ?? 0;
  const donePages  = project?.pages?.filter((p) => p.status === "done").length ?? 0;
  const isReady    = project.status === "ready" || donePages > 0;
  const isGenerating = project.status === "generating";
  const primaryColor = bp?.colorScheme?.primary ?? "#6b77ff";

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

  // ── List view ────────────────────────────────────────────────────────────────

  if (viewMode === "list") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => void openProject(project.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void openProject(project.id); }
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="grid w-full grid-cols-[2.8fr_1fr_1.3fr_100px] items-center gap-4 rounded-[22px] border border-white/[0.05] bg-white/[0.02] px-5 py-4 text-left transition-all hover:border-white/[0.1] hover:bg-white/[0.04]"
      >
        <div className="flex min-w-0 items-center gap-4">
          {/* Mini thumbnail */}
          <div className="relative h-12 w-20 flex-shrink-0 overflow-hidden rounded-[12px] border border-white/[0.08]">
            {isReady ? (
              <ProjectThumbnail projectId={project.id} />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(135deg, ${primaryColor}26, rgba(255,255,255,0.04))` }}
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
          {isGenerating && <SitezyBadge className="bg-[rgba(107,119,255,0.14)] text-[var(--text-accent)]">Generating</SitezyBadge>}
          {isReady && <SitezyBadge className="bg-[rgba(49,196,141,0.12)] text-[#9fe5c6]">{donePages}/{pageCount} pages</SitezyBadge>}
        </div>

        <p className="text-[12px] text-[var(--text-tertiary)]">{formatDate(project.createdAt)}</p>

        <div className="flex justify-end">
          <SitezyButton
            variant={hovered ? "primary" : "secondary"}
            size="sm"
            className="min-w-[92px]"
            onClick={(e) => { e.stopPropagation(); void openProject(project.id); }}
          >
            Open
          </SitezyButton>
        </div>
      </div>
    );
  }

  // ── Grid view ────────────────────────────────────────────────────────────────

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-[24px] border border-white/[0.06] bg-[rgba(255,255,255,0.02)] transition-all duration-200"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowMenu(false); }}
      style={{
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.09)"
          : "0 2px 16px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.06)",
      }}
    >
      {/* Thumbnail area */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => void openProject(project.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void openProject(project.id); }
        }}
        className="relative h-[260px] cursor-pointer overflow-hidden"
      >
        {isReady ? (
          <ProjectThumbnail projectId={project.id} />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: bp
                ? `radial-gradient(circle at top left, ${primaryColor}35, transparent 55%), linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))`
                : "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
            }}
          >
            {!bp && (
              <div className="flex h-full items-center justify-center">
                <FileCode2 size={32} className="text-white/[0.12]" />
              </div>
            )}
          </div>
        )}

        {/* Bottom fade */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(9,11,18,0.88)] via-[rgba(9,11,18,0.1)] to-transparent" />

        {/* Status badges — top left */}
        <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
          {isGenerating && (
            <SitezyBadge className="bg-[rgba(107,119,255,0.18)] text-[var(--text-accent)] backdrop-blur-sm">
              Generating
            </SitezyBadge>
          )}
          {isReady && (
            <SitezyBadge className="bg-[rgba(49,196,141,0.14)] text-[#9fe5c6] backdrop-blur-sm">
              <Check size={10} />
              {donePages}/{pageCount} pages
            </SitezyBadge>
          )}
        </div>

        {/* Menu — top right */}
        <div className="absolute right-3 top-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.1] bg-black/40 text-white/50 opacity-0 backdrop-blur-sm transition-all hover:text-white group-hover:opacity-100"
          >
            <MoreHorizontal size={15} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-11 z-20 w-44 rounded-[18px] border border-white/[0.08] bg-[rgba(12,15,24,0.98)] p-2 shadow-[0_24px_54px_rgba(0,0,0,0.4)] backdrop-blur-xl">
              <MenuAction onClick={() => { void openProject(project.id); setShowMenu(false); }} icon={<ExternalLink size={14} />} label="Open editor" />
              <MenuAction onClick={() => { setEditing(true); setShowMenu(false); }} icon={<Pencil size={14} />} label="Rename" />
              <MenuAction onClick={() => { void duplicateProject(project.id); setShowMenu(false); }} icon={<Copy size={14} />} label="Duplicate" />
              <div className="my-1.5 h-px bg-white/[0.06]" />
              <MenuAction onClick={handleDelete} icon={<Trash2 size={14} />} label={armedDelete ? "Confirm delete?" : "Delete"} danger />
            </div>
          )}
        </div>

        {/* Name overlay at bottom */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 px-5 pb-5">
          {editing ? null : (
            <>
              <h3 className="truncate text-[17px] font-semibold tracking-[-0.03em] text-white drop-shadow-sm">
                {project.name}
              </h3>
              <p className="mt-1 text-[11px] text-white/[0.42]">
                {formatDate(project.createdAt)}
                {bp?.typography?.headingFont ? ` · ${bp.typography.headingFont}` : ""}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Bottom strip */}
      <div className="flex items-center justify-between gap-3 border-t border-white/[0.05] px-5 py-4">
        {editing ? (
          <input
            autoFocus
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") { setNameVal(project.name); setEditing(false); }
            }}
            className="sz-input min-h-[36px] flex-1 text-[14px]"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="max-w-[70%] truncate text-[12px] text-[var(--text-secondary)]">
            {project.brief?.description || "Open to start editing."}
          </p>
        )}
        {!editing && (
          <SitezyButton variant="primary" size="sm" onClick={() => void openProject(project.id)}>
            Open
            <ExternalLink size={13} />
          </SitezyButton>
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
          ? "text-[#ffb7c0] hover:bg-[rgba(240,106,116,0.12)]"
          : "text-[var(--text-secondary)] hover:bg-white/[0.05] hover:text-[var(--text-primary)]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
