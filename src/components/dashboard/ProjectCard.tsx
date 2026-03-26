"use client";

import { useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import {
  ExternalLink,
  FileCode2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Project } from "@/types";

interface Props {
  project: Project;
  viewMode?: "grid" | "list";
}

export function ProjectCard({ project, viewMode = "grid" }: Props) {
  const openProject = useAppStore((state) => state.openProject);
  const deleteProject = useAppStore((state) => state.deleteProject);
  const renameProject = useAppStore((state) => state.renameProject);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(project.name);
  const [armedDelete, setArmedDelete] = useState(false);
  const armRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const blueprint = project.blueprint ?? null;
  const pageCount = project.pages?.length ?? 0;
  const donePages = project.pages?.filter((page) => page.status === "done").length ?? 0;
  const isReady = project.status === "ready" || donePages > 0;
  const completion = pageCount > 0 ? Math.round((donePages / pageCount) * 100) : 0;

  const primaryColor = blueprint?.colorScheme?.primary ?? "#54d5c8";
  const secondaryColor = blueprint?.colorScheme?.secondary ?? "#82b8ff";
  const gradientBackground = `radial-gradient(circle at top left, ${primaryColor}32, transparent 48%), radial-gradient(circle at bottom right, ${secondaryColor}28, transparent 42%), linear-gradient(180deg, rgba(17,30,42,0.96), rgba(8,14,22,0.98))`;

  function handleDelete(event: React.MouseEvent) {
    event.stopPropagation();

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
    const trimmed = nameVal.trim();
    if (trimmed && trimmed !== project.name) {
      void renameProject(project.id, trimmed);
    }
    setEditing(false);
  }

  if (viewMode === "list") {
    return (
      <div className="group rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,29,42,0.96),rgba(9,17,27,0.98))] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.22)] transition-transform duration-200 hover:-translate-y-0.5 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div
            className="relative h-28 overflow-hidden rounded-[24px] border border-white/10 lg:w-[18rem] lg:flex-shrink-0"
            style={{ background: gradientBackground }}
          >
            <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:26px_26px]" />
            <div className="absolute inset-4 rounded-[18px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]">
              <div className="flex h-9 items-center justify-between border-b border-white/8 px-4">
                <div className="flex gap-2">
                  <div className="h-2 w-2 rounded-full bg-white/18" />
                  <div className="h-2 w-2 rounded-full bg-white/12" />
                  <div className="h-2 w-2 rounded-full bg-white/10" />
                </div>
                <div className="h-2 w-10 rounded-full bg-white/12" />
              </div>
              <div className="px-4 py-4">
                <div className="h-2.5 w-16 rounded-full bg-white/14" />
                <div className="mt-3 h-8 w-28 rounded-[16px] bg-white/18" />
                <div className="mt-3 h-2 w-20 rounded-full bg-white/12" />
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[1rem] font-semibold tracking-[-0.03em] text-white">
                  {project.name}
                </p>
                <p className="mt-2 text-sm text-slate-300/54">
                  {formatDate(project.createdAt)} · {pageCount} pages
                  {blueprint?.layoutStyle ? ` · ${blueprint.layoutStyle}` : ""}
                </p>
              </div>
              <div
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                  isReady
                    ? "border-emerald-400/24 bg-emerald-400/12 text-emerald-200"
                    : "border-white/10 bg-white/[0.04] text-slate-300/64"
                }`}
              >
                {isReady ? `${donePages}/${pageCount} ready` : "In progress"}
              </div>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#54d5c8,#82b8ff)]"
                style={{ width: `${Math.max(completion, isReady ? 100 : 18)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 lg:justify-end">
            <button
              onClick={() => void openProject(project.id)}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-5 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]"
            >
              Open
              <ExternalLink size={14} />
            </button>
            <button
              onClick={handleDelete}
              className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
                armedDelete
                  ? "border-red-400/30 bg-red-500/14 text-red-200"
                  : "border-white/10 bg-white/[0.04] text-slate-300/54 hover:text-red-200"
              }`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,29,42,0.96),rgba(9,17,27,0.98))] shadow-[0_24px_70px_rgba(0,0,0,0.22)] transition-transform duration-200 hover:-translate-y-1"
      onMouseLeave={() => setShowMenu(false)}
    >
      <div className="relative h-52 overflow-hidden border-b border-white/8" style={{ background: gradientBackground }}>
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="absolute left-4 top-4 flex gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              isReady
                ? "border-emerald-400/24 bg-emerald-400/12 text-emerald-200"
                : "border-white/10 bg-white/[0.04] text-slate-200/62"
            }`}
          >
            {isReady ? `${donePages}/${pageCount} ready` : "Generating"}
          </span>
        </div>

        <div className="absolute right-4 top-4">
          <button
            onClick={(event) => {
              event.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#09131bcc] text-slate-200/60 opacity-0 transition-all duration-200 hover:text-white group-hover:opacity-100"
          >
            <MoreHorizontal size={15} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-[22px] border border-white/10 bg-[#0c161fcc] py-2 shadow-[0_22px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl">
              <button
                onClick={() => {
                  void openProject(project.id);
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-200/72 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <ExternalLink size={14} />
                Open Editor
              </button>
              <button
                onClick={() => {
                  setEditing(true);
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-200/72 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <Pencil size={14} />
                Rename
              </button>
              <div className="mx-3 my-2 h-px bg-white/8" />
              <button
                onClick={handleDelete}
                className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  armedDelete
                    ? "bg-red-500/10 text-red-200"
                    : "text-red-200/82 hover:bg-red-500/10 hover:text-red-100"
                }`}
              >
                <Trash2 size={14} />
                {armedDelete ? "Confirm delete?" : "Delete"}
              </button>
            </div>
          )}
        </div>

        <div className="absolute inset-x-5 bottom-5 top-14 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,30,42,0.94),rgba(10,19,29,0.96))] shadow-[0_18px_40px_rgba(0,0,0,0.2)]">
          <div className="flex h-10 items-center justify-between border-b border-white/8 px-4">
            <div className="flex gap-2">
              <div className="h-2 w-2 rounded-full bg-white/18" />
              <div className="h-2 w-2 rounded-full bg-white/12" />
              <div className="h-2 w-2 rounded-full bg-white/10" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.62rem] uppercase tracking-[0.18em] text-slate-200/54">
              {blueprint?.layoutStyle ?? "Draft"}
            </div>
          </div>

          <div className="relative h-[calc(100%-2.5rem)] px-5 py-5">
            {blueprint ? (
              <>
                <div className="max-w-[11rem]">
                  <div className="h-2.5 w-16 rounded-full bg-white/14" />
                  <div
                    className="mt-4 text-[2rem] font-semibold tracking-[-0.06em] text-white/88"
                    style={{ fontFamily: blueprint.typography?.headingFont || undefined }}
                  >
                    {project.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="mt-3 h-2.5 w-28 rounded-full bg-white/12" />
                  <div className="mt-2 h-2.5 w-20 rounded-full bg-white/10" />
                </div>
                <div
                  className="absolute bottom-5 right-5 flex h-16 w-24 items-center justify-center rounded-[20px] border border-white/10 text-xs font-medium text-white/86"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}22, ${secondaryColor}22)`,
                  }}
                >
                  Live canvas
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center">
                <FileCode2 size={34} className="text-white/18" />
              </div>
            )}
          </div>
        </div>

        {blueprint?.colorScheme && (
          <div className="absolute bottom-4 right-4 flex gap-1.5">
            {Object.values(blueprint.colorScheme)
              .slice(0, 4)
              .map((color, index) => (
                <div
                  key={`${String(color)}-${index}`}
                  className="h-3.5 w-3.5 rounded-full border border-black/20"
                  style={{ background: color as string }}
                />
              ))}
          </div>
        )}
      </div>

      <div className="p-5">
        {editing ? (
          <input
            autoFocus
            value={nameVal}
            onChange={(event) => setNameVal(event.target.value)}
            onBlur={handleRename}
            onKeyDown={(event) => event.key === "Enter" && handleRename()}
            className="w-full rounded-2xl border border-[#54d5c844] bg-white/[0.04] px-3 py-2 text-[1rem] font-medium text-white focus:outline-none"
          />
        ) : (
          <h3 className="truncate text-[1.05rem] font-semibold tracking-[-0.03em] text-white">
            {project.name}
          </h3>
        )}

        <p className="mt-2 text-sm text-slate-300/54">
          {formatDate(project.createdAt)}
          {blueprint?.typography?.headingFont ? ` · ${blueprint.typography.headingFont}` : ""}
        </p>

        <p className="mt-4 text-sm leading-6 text-slate-300/64">
          {project.brief?.description || "Project brief will appear here once the workspace is initialized."}
        </p>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-300/48">
            <span>{pageCount} pages</span>
            <span>{completion}% complete</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#54d5c8,#82b8ff)]"
              style={{ width: `${Math.max(completion, isReady ? 100 : 14)}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => void openProject(project.id)}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] text-sm font-medium text-white transition-colors hover:bg-white/[0.08]"
        >
          Open Editor
          <ExternalLink size={14} />
        </button>
      </div>
    </div>
  );
}
