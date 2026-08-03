"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ImageIcon, Search, Trash2, Upload, Video,
  Grid2X2, List, MoreHorizontal, Pencil, ExternalLink,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { normalizeMediaAsset, USER_MEDIA_BUCKET } from "@/lib/media/library";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { SettingsModal, SettingsPrimaryAction, SettingsSecondaryAction, SettingsStack } from "../ui";
import type { ProjectMediaAsset } from "@/types";

/* ── Image optimization (shared with MediaLibraryModal) ─────────────────── */

type RasterSource = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  close: () => void;
};

const OPTIMIZABLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_DIMENSION = 2400;
const MAX_THUMBNAIL_DIMENSION = 640;

function sanitizeFileName(name: string): string {
  const cleaned = name.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned || "asset";
}

function inferFileKind(file: File): ProjectMediaAsset["kind"] {
  return file.type.startsWith("video/") ? "video" : "image";
}

function canOptimizeImage(file: File) {
  return OPTIMIZABLE_IMAGE_TYPES.has(file.type.toLowerCase());
}

function buildObjectPath(userId: string, fileName: string, variant?: "thumb") {
  const base = `${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
  return `${userId}/${variant === "thumb" ? `thumb-${base}` : base}`;
}

async function loadRasterSource(file: File): Promise<RasterSource> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw(ctx, w, h) { ctx.drawImage(bitmap, 0, 0, w, h); },
      close() { bitmap.close(); },
    };
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw(ctx, w, h) { ctx.drawImage(img, 0, 0, w, h); },
      close() { URL.revokeObjectURL(img.src); },
    });
    img.onerror = () => reject(new Error("Failed to load image for optimization"));
    img.src = URL.createObjectURL(file);
  });
}

function constrainDimensions(srcW: number, srcH: number, maxDim: number) {
  if (srcW <= maxDim && srcH <= maxDim) return { width: srcW, height: srcH };
  const ratio = Math.min(maxDim / srcW, maxDim / srcH);
  return { width: Math.round(srcW * ratio), height: Math.round(srcH * ratio) };
}

function canvasToFile(canvas: HTMLCanvasElement, fileName: string, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(new File([blob], fileName, { type: "image/webp" })) : reject(new Error("Canvas toBlob failed")),
      "image/webp",
      quality,
    );
  });
}

async function optimizeImageFile(file: File) {
  const source = await loadRasterSource(file);
  try {
    const { width, height } = constrainDimensions(source.width, source.height, MAX_IMAGE_DIMENSION);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    source.draw(ctx, width, height);
    const baseName = file.name.replace(/\.[^.]+$/, "");
    const uploadFile = await canvasToFile(canvas, `${baseName}.webp`);
    const thumb = constrainDimensions(source.width, source.height, MAX_THUMBNAIL_DIMENSION);
    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = thumb.width;
    thumbCanvas.height = thumb.height;
    const thumbCtx = thumbCanvas.getContext("2d")!;
    source.draw(thumbCtx, thumb.width, thumb.height);
    const thumbnailFile = await canvasToFile(thumbCanvas, `${baseName}-thumb.webp`, 0.75);
    return { uploadFile, thumbnailFile, width, height, mimeType: "image/webp" };
  } finally {
    source.close();
  }
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

/* ── Component ──────────────────────────────────────────────────────────── */

type ViewMode = "grid" | "list";

export function MediaLibrarySection() {
  const mediaLibrary = useAppStore((s) => s.mediaLibrary);
  const upsertMediaAssets = useAppStore((s) => s.upsertMediaAssets);
  const removeMediaAsset = useAppStore((s) => s.removeMediaAsset);
  const renameMediaAsset = useAppStore((s) => s.renameMediaAsset);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [pendingDeleteAsset, setPendingDeleteAsset] = useState<ProjectMediaAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const dragDepthRef = useRef(0);

  const assets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return mediaLibrary;
    return mediaLibrary.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.url.toLowerCase().includes(query) ||
        a.kind.toLowerCase().includes(query)
    );
  }, [mediaLibrary, search]);

  const totalSize = useMemo(
    () => mediaLibrary.reduce((sum, a) => sum + (a.size ?? 0), 0),
    [mediaLibrary]
  );

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenuId) return;
    function close() { setContextMenuId(null); }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [contextMenuId]);

  /* ── Upload ── */
  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setIsUploading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError ?? new Error("Auth required");

      const uploadedPaths: Array<{ bucket: string; path: string }> = [];
      const nextAssets = await Promise.all(
        Array.from(files).map(async (file) => {
          const kind = inferFileKind(file);
          const shouldOptimize = kind === "image" && canOptimizeImage(file);
          const optimized = shouldOptimize ? await optimizeImageFile(file) : null;
          const uploadFile = optimized?.uploadFile ?? file;
          const objectPath = buildObjectPath(authData.user.id, uploadFile.name);

          const { error: uploadError } = await supabase.storage
            .from(USER_MEDIA_BUCKET)
            .upload(objectPath, uploadFile, { cacheControl: "3600", upsert: false, contentType: uploadFile.type || undefined });
          if (uploadError) throw uploadError;
          uploadedPaths.push({ bucket: USER_MEDIA_BUCKET, path: objectPath });

          const { data: publicData } = supabase.storage.from(USER_MEDIA_BUCKET).getPublicUrl(objectPath);

          let thumbnailUrl: string | null = null;
          let thumbnailPath: string | null = null;
          if (optimized?.thumbnailFile) {
            thumbnailPath = buildObjectPath(authData.user.id, optimized.thumbnailFile.name, "thumb");
            const { error: thumbError } = await supabase.storage
              .from(USER_MEDIA_BUCKET)
              .upload(thumbnailPath, optimized.thumbnailFile, { cacheControl: "3600", upsert: false, contentType: optimized.thumbnailFile.type || undefined });
            if (thumbError) throw thumbError;
            uploadedPaths.push({ bucket: USER_MEDIA_BUCKET, path: thumbnailPath });
            thumbnailUrl = supabase.storage.from(USER_MEDIA_BUCKET).getPublicUrl(thumbnailPath).data.publicUrl;
          }

          return normalizeMediaAsset({
            name: file.name,
            url: publicData.publicUrl,
            thumbnailUrl,
            kind,
            storageBucket: USER_MEDIA_BUCKET,
            storagePath: objectPath,
            thumbnailStorageBucket: thumbnailPath ? USER_MEDIA_BUCKET : null,
            thumbnailStoragePath: thumbnailPath,
            mimeType: optimized?.mimeType ?? file.type ?? null,
            size: file.size,
            width: optimized?.width ?? null,
            height: optimized?.height ?? null,
          });
        })
      );

      try {
        await upsertMediaAssets(nextAssets);
      } catch {
        if (uploadedPaths.length) {
          const supabase2 = getSupabaseBrowserClient();
          await Promise.allSettled(uploadedPaths.map(({ bucket, path }) => supabase2.storage.from(bucket).remove([path])));
        }
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  /* ── Drag & Drop ── */
  function handleDragEnter(e: React.DragEvent) { e.preventDefault(); dragDepthRef.current += 1; setIsDragActive(true); }
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }
  function handleDragLeave(e: React.DragEvent) { e.preventDefault(); dragDepthRef.current = Math.max(0, dragDepthRef.current - 1); if (dragDepthRef.current === 0) setIsDragActive(false); }
  function handleDrop(e: React.DragEvent) { e.preventDefault(); dragDepthRef.current = 0; setIsDragActive(false); void handleUpload(e.dataTransfer.files); }

  /* ── Rename ── */
  function startRename(asset: ProjectMediaAsset) {
    setRenamingId(asset.id);
    setRenameDraft(asset.name);
    setContextMenuId(null);
  }

  async function commitRename(assetId: string) {
    const name = renameDraft.trim();
    if (name && name !== mediaLibrary.find((a) => a.id === assetId)?.name) {
      await renameMediaAsset(assetId, name);
    }
    setRenamingId(null);
  }

  /* ── Delete ── */
  function requestDelete(asset: ProjectMediaAsset) {
    setPendingDeleteAsset(asset);
    setContextMenuId(null);
  }

  async function confirmDelete() {
    if (!pendingDeleteAsset) return;
    setIsDeleting(true);
    try {
      await removeMediaAsset(pendingDeleteAsset.id);
      setPendingDeleteAsset(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <SettingsStack>
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => { void handleUpload(e.target.files); }}
        />

        {/* Stats bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-4 rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--fg-muted)]">
              <ImageIcon size={12} className="text-[var(--fg-faint)]" />
              <span className="font-semibold text-[var(--text-primary)]">{mediaLibrary.filter((a) => a.kind === "image").length}</span>
              images
            </div>
            <div className="h-3.5 w-px bg-[var(--border-soft)]" />
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--fg-muted)]">
              <Video size={12} className="text-[var(--fg-faint)]" />
              <span className="font-semibold text-[var(--text-primary)]">{mediaLibrary.filter((a) => a.kind === "video").length}</span>
              videos
            </div>
            <div className="h-3.5 w-px bg-[var(--border-soft)]" />
            <div className="text-[11px] text-[var(--fg-muted)]">
              <span className="font-semibold text-[var(--text-primary)]">{formatFileSize(totalSize)}</span> total
            </div>
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative min-w-[200px] max-w-[320px] flex-1">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets..."
              className="h-9 w-full rounded-[12px] border border-[var(--border-softer)] bg-[var(--surface-4)] pl-9 pr-3 text-[12px] text-[var(--fg-soft)] placeholder-[var(--fg-subtle)] focus:border-[var(--accent-primary,#5B8CFF)]/35 focus:outline-none"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-0.5 rounded-[10px] border border-[var(--border-soft)] bg-[var(--surface-3)] p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex h-7 w-7 items-center justify-center rounded-[8px] transition-all ${viewMode === "grid" ? "bg-[var(--surface-4)] text-[var(--text-primary)] shadow-sm" : "text-[var(--fg-faint)] hover:text-[var(--fg-muted)]"}`}
            >
              <Grid2X2 size={13} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex h-7 w-7 items-center justify-center rounded-[8px] transition-all ${viewMode === "list" ? "bg-[var(--surface-4)] text-[var(--text-primary)] shadow-sm" : "text-[var(--fg-faint)] hover:text-[var(--fg-muted)]"}`}
            >
              <List size={13} />
            </button>
          </div>
        </div>

        {/* Upload action */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#5B8CFF]/30 bg-[#5B8CFF]/[0.08] px-4 text-[12px] font-semibold text-[#5B8CFF] transition-all hover:border-[#5B8CFF]/50 hover:bg-[#5B8CFF]/[0.14] disabled:cursor-wait disabled:opacity-60"
          >
            <Upload size={14} />
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>

      {/* Drop zone + asset grid */}
      <div
        className="relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragActive && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[24px] border-2 border-dashed border-[var(--accent-primary,#5B8CFF)]/40 bg-[var(--accent-primary,#5B8CFF)]/[0.06] backdrop-blur-sm">
            <div className="rounded-[20px] border border-[var(--accent-primary,#5B8CFF)]/20 bg-[var(--surface-overlay)] px-8 py-6 text-center shadow-xl">
              <Upload size={20} className="mx-auto mb-3 text-[var(--accent-primary,#5B8CFF)]" />
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">Drop files to upload</p>
              <p className="mt-1 text-[11px] text-[var(--fg-muted)]">Images and videos</p>
            </div>
          </div>
        )}

        {assets.length > 0 ? (
          viewMode === "grid" ? (
            /* ── Grid view ── */
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="group overflow-hidden rounded-[20px] border border-[var(--border-softer)] bg-[var(--surface-3)] transition-all hover:border-[var(--border-strong)] hover:shadow-lg"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-[var(--bg-subtle)]">
                    {asset.kind === "image" ? (
                      <img
                        src={asset.thumbnailUrl || asset.url}
                        alt={asset.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <video src={asset.url} className="h-full w-full object-cover" muted playsInline />
                    )}

                    {/* Kind badge */}
                    <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full border border-[var(--border-softer)] bg-[var(--bg-frost)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--fg-soft)]">
                      {asset.kind === "image" ? <ImageIcon size={10} /> : <Video size={10} />}
                      {asset.kind}
                    </div>

                    {/* Actions overlay */}
                    <div className="absolute right-2.5 top-2.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-softer)] bg-[var(--bg-frost)] text-[var(--fg-soft)] transition-all hover:text-[var(--text-primary)]"
                      >
                        <ExternalLink size={11} />
                      </a>
                      <button
                        onClick={(e) => { e.stopPropagation(); requestDelete(asset); }}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-softer)] bg-[var(--bg-frost)] text-[var(--fg-soft)] transition-all hover:border-red-400/30 hover:text-red-400"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>

                    {/* Size overlay */}
                    {asset.size ? (
                      <div className="absolute bottom-2 right-2.5 rounded-full border border-[var(--border-soft)] bg-[var(--bg-frost)] px-2 py-0.5 text-[9px] font-medium text-[var(--fg-soft)] backdrop-blur-sm">
                        {formatFileSize(asset.size)}
                      </div>
                    ) : null}
                  </div>

                  {/* Info */}
                  <div className="px-3.5 py-3">
                    {renamingId === asset.id ? (
                      <input
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={() => void commitRename(asset.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); void commitRename(asset.id); }
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="w-full rounded-[10px] border border-[var(--accent-primary,#5B8CFF)]/30 bg-[var(--surface-4)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-primary)] focus:outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => startRename(asset)}
                        className="group/name flex w-full items-center gap-1.5 text-left"
                      >
                        <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--text-primary)]">
                          {asset.name}
                        </p>
                        <Pencil size={10} className="flex-shrink-0 text-[var(--fg-faint)] opacity-0 transition-opacity group-hover/name:opacity-100" />
                      </button>
                    )}
                    <p className="mt-1 truncate text-[10px] text-[var(--fg-faint)]">
                      {formatDate(asset.createdAt)}
                      {asset.width && asset.height ? ` \u00B7 ${asset.width}\u00D7${asset.height}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── List view ── */
            <div className="overflow-hidden rounded-[20px] border border-[var(--border-softer)]">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-3)]">
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Asset</th>
                    <th className="hidden px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--fg-faint)] md:table-cell">Type</th>
                    <th className="hidden px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--fg-faint)] lg:table-cell">Size</th>
                    <th className="hidden px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--fg-faint)] lg:table-cell">Dimensions</th>
                    <th className="hidden px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--fg-faint)] md:table-cell">Uploaded</th>
                    <th className="w-10 px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-softer)]">
                  {assets.map((asset) => (
                    <tr key={asset.id} className="group bg-[var(--surface-2)] transition-colors hover:bg-[var(--surface-3)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-[10px] bg-[var(--bg-subtle)]">
                            {asset.kind === "image" ? (
                              <img src={asset.thumbnailUrl || asset.url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Video size={14} className="text-[var(--fg-faint)]" />
                              </div>
                            )}
                          </div>
                          {renamingId === asset.id ? (
                            <input
                              autoFocus
                              value={renameDraft}
                              onChange={(e) => setRenameDraft(e.target.value)}
                              onBlur={() => void commitRename(asset.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); void commitRename(asset.id); }
                                if (e.key === "Escape") setRenamingId(null);
                              }}
                              className="min-w-0 flex-1 rounded-[8px] border border-[var(--accent-primary,#5B8CFF)]/30 bg-[var(--surface-4)] px-2 py-1 text-[12px] font-medium text-[var(--text-primary)] focus:outline-none"
                            />
                          ) : (
                            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--text-primary)]">
                              {asset.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <span className="inline-flex items-center gap-1 text-[11px] capitalize text-[var(--fg-muted)]">
                          {asset.kind === "image" ? <ImageIcon size={11} /> : <Video size={11} />}
                          {asset.kind}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-[11px] text-[var(--fg-muted)] lg:table-cell">
                        {formatFileSize(asset.size)}
                      </td>
                      <td className="hidden px-4 py-3 text-[11px] text-[var(--fg-muted)] lg:table-cell">
                        {asset.width && asset.height ? `${asset.width}\u00D7${asset.height}` : "\u2014"}
                      </td>
                      <td className="hidden px-4 py-3 text-[11px] text-[var(--fg-muted)] md:table-cell">
                        {formatDate(asset.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setContextMenuId(contextMenuId === asset.id ? null : asset.id); }}
                            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[var(--fg-faint)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--surface-4)] hover:text-[var(--fg-muted)]"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                          {contextMenuId === asset.id && (
                            <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-overlay)] py-1 shadow-xl">
                              <button
                                onClick={(e) => { e.stopPropagation(); startRename(asset); }}
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-[var(--fg-soft)] transition-colors hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"
                              >
                                <Pencil size={12} /> Rename
                              </button>
                              <a
                                href={asset.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-[var(--fg-soft)] transition-colors hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"
                              >
                                <ExternalLink size={12} /> Open in tab
                              </a>
                              <div className="mx-2 my-1 h-px bg-[var(--border-soft)]" />
                              <button
                                onClick={(e) => { e.stopPropagation(); requestDelete(asset); }}
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-red-400 transition-colors hover:bg-red-500/10"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ── Empty state ── */
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--border-softer)] bg-[var(--surface-3)] px-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] border border-[var(--border-softer)] bg-[var(--surface-4)] text-[var(--fg-faint)]">
              <ImageIcon size={20} />
            </div>
            <h4 className="text-[16px] font-semibold text-[var(--text-primary)]">
              {search ? "No matching assets" : "Your media library is empty"}
            </h4>
            <p className="mt-2 max-w-sm text-[12px] leading-6 text-[var(--fg-muted)]">
              {search
                ? "Try a different search term, or upload new media."
                : "Upload images or videos to get started. Assets are shared across all your projects."
              }
            </p>
            {!search && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-[14px] border border-[var(--accent-primary,#5B8CFF)]/25 bg-[var(--accent-primary,#5B8CFF)]/12 px-4 text-[12px] font-semibold text-[var(--accent-primary,#5B8CFF)] transition-all hover:bg-[var(--accent-primary,#5B8CFF)]/20"
              >
                <Upload size={14} />
                Upload first asset
              </button>
            )}
          </div>
        )}
      </div>

      <SettingsModal
        open={Boolean(pendingDeleteAsset)}
        title="Delete media?"
        onClose={() => {
          if (isDeleting) return;
          setPendingDeleteAsset(null);
        }}
        body={
          pendingDeleteAsset ? (
            <p className="text-[14px] leading-7 text-[var(--text-secondary)]">
              Delete <span className="font-semibold text-[var(--text-primary)]">{pendingDeleteAsset.name}</span> from your media library? This can’t be undone.
            </p>
          ) : null
        }
        actions={
          <>
            <SettingsSecondaryAction
              type="button"
              onClick={() => setPendingDeleteAsset(null)}
              disabled={isDeleting}
            >
              Cancel
            </SettingsSecondaryAction>
            <SettingsPrimaryAction
              type="button"
              onClick={() => void confirmDelete()}
              disabled={isDeleting}
              className="bg-[linear-gradient(135deg,#eb5e67_0%,#cf4459_100%)] border-red-400/30 shadow-[0_12px_28px_rgba(207,68,89,0.22)] hover:bg-[linear-gradient(135deg,#f06a74_0%,#d14a5e_100%)]"
            >
              {isDeleting ? "Deleting..." : "Delete media"}
            </SettingsPrimaryAction>
          </>
        }
      />
    </SettingsStack>
  );
}
