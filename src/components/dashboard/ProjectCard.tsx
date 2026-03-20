"use client";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { MoreHorizontal, Pencil, Trash2, ExternalLink, FileCode2 } from "lucide-react";
import type { Project } from "@/types";

interface Props {
  project: Project;
  viewMode?: "grid" | "list";
}

export function ProjectCard({ project, viewMode = "grid" }: Props) {
  const openProject = useAppStore((s) => s.openProject);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const renameProject = useAppStore((s) => s.renameProject);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(project.name);

  const bp = project?.blueprint ?? null;
  const pageCount = project?.pages?.length ?? 0;
  const donePages = project?.pages?.filter((p) => p.status === "done").length ?? 0;
  const isReady = project.status === "ready" || donePages > 0;

  const primaryColor = bp?.colorScheme?.primary ?? "#7c3aed";
  const secondaryColor = bp?.colorScheme?.secondary ?? "#2563eb";

  function handleRename() {
    if (nameVal.trim() && nameVal !== project.name) {
      renameProject(project.id, nameVal.trim());
    }
    setEditing(false);
  }

  if (viewMode === "list") {
    return (
      <div className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/[0.07] rounded-xl hover:border-white/[0.12] transition-colors group">
        <div
          className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-sm"
          style={{ background: `linear-gradient(135deg, ${primaryColor}33, ${secondaryColor}33)`, border: `1px solid ${primaryColor}33` }}
        >
          {project.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[14px] truncate">{project.name}</p>
          <p className="text-white/30 text-[12px]">
            {formatDate(project.createdAt)} · {pageCount} pages
            {bp ? ` · ${bp.layoutStyle}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => openProject(project.id)}
            className="px-3 py-1.5 text-[12px] bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors"
          >
            Open
          </button>
          <button
            onClick={() => deleteProject(project.id)}
            className="w-7 h-7 flex items-center justify-center text-white/30 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-[#0e0e12] border border-white/[0.07] rounded-xl overflow-hidden hover:border-white/[0.14] transition-all group"
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* Thumbnail */}
      <div
        className="h-36 relative flex items-center justify-center"
        style={{
          background: bp
            ? `linear-gradient(135deg, ${primaryColor}18 0%, ${secondaryColor}12 100%)`
            : "#0d0d10",
        }}
      >
        {bp ? (
          <div className="text-center">
            <div
              className="text-3xl font-black mb-1"
              style={{ color: primaryColor, opacity: 0.9, fontFamily: bp.typography?.headingFont }}
            >
              {project.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="text-[10px] text-white/30 tracking-wider uppercase">
              {bp.layoutStyle}
            </div>
          </div>
        ) : (
          <FileCode2 size={28} className="text-white/10" />
        )}

        {/* Status badge */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {isReady && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              {donePages}/{pageCount} pages
            </span>
          )}
        </div>

        {/* Menu button */}
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-black/40 text-white/50 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
          >
            <MoreHorizontal size={14} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 w-44 bg-[#111116] border border-white/10 rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
              <button
                onClick={() => { openProject(project.id); setShowMenu(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors"
              >
                <ExternalLink size={13} /> Open Editor
              </button>
              <button
                onClick={() => { setEditing(true); setShowMenu(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors"
              >
                <Pencil size={13} /> Rename
              </button>
              <div className="h-px bg-white/[0.06] my-1" />
              <button
                onClick={() => { deleteProject(project.id); setShowMenu(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>

        {/* Color dots */}
        {bp?.colorScheme && (
          <div className="absolute bottom-3 right-3 flex gap-1">
            {Object.values(bp.colorScheme).slice(0, 4).map((color, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full border border-black/20"
                style={{ background: color as string }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {editing ? (
          <input
            autoFocus
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            className="w-full bg-white/[0.05] border border-brand-500/40 rounded-lg px-2 py-1 text-[14px] font-medium text-white focus:outline-none mb-1"
          />
        ) : (
          <h3 className="font-semibold text-[14px] text-white/90 mb-1 truncate">
            {project.name}
          </h3>
        )}
        <p className="text-white/30 text-[11px] mb-3">
          {formatDate(project.createdAt)}
          {bp?.typography?.headingFont ? ` · ${bp.typography.headingFont}` : ""}
        </p>
        <button
          onClick={() => openProject(project.id)}
          className="w-full flex items-center justify-center gap-1.5 py-2 bg-brand-600/90 hover:bg-brand-600 text-white text-[13px] font-medium rounded-lg transition-colors"
        >
          Open Editor
          <ExternalLink size={12} />
        </button>
      </div>
    </div>
  );
}
