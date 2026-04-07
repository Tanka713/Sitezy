"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ImageIcon, Search, Trash2, Upload, Video, X, AlertTriangle, Pencil } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { normalizeMediaAsset, USER_MEDIA_BUCKET } from "@/lib/media/library";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { OverlayDialog } from "@/components/ui/OverlayDialog";
import type { ProjectMediaAsset } from "@/types";

interface Props {
  title: string;
  description?: string;
  allowedKinds?: ProjectMediaAsset["kind"][];
  allowMultiple?: boolean;
  selectedUrls?: string[];
  actionLabel?: string;
  onSelect: (assets: ProjectMediaAsset[]) => void;
  onClose: () => void;
}

function acceptForKinds(kinds: ProjectMediaAsset["kind"][]): string {
  if (kinds.length === 1 && kinds[0] === "video") return "video/*";
  if (kinds.length === 1 && kinds[0] === "image") return "image/*";
  return "image/*,video/*";
}

function inferFileKind(file: File): ProjectMediaAsset["kind"] {
  return file.type.startsWith("video/") ? "video" : "image";
}

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
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "asset";
}

function withExtension(name: string, extension: string): string {
  const base = sanitizeFileName(name).replace(/\.[a-z0-9]+$/i, "");
  return `${base}.${extension}`;
}

function constrainDimensions(width: number, height: number, maxDimension: number) {
  if (!width || !height) return { width: maxDimension, height: maxDimension };
  if (Math.max(width, height) <= maxDimension) return { width, height };
  const scale = maxDimension / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  return { canvas, ctx };
}

async function canvasToFile(
  source: RasterSource,
  width: number,
  height: number,
  name: string,
  mimeType: string,
  quality: number
): Promise<File> {
  const { canvas, ctx } = createCanvas(width, height);
  source.draw(ctx, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error(`Failed to render ${name}`));
    }, mimeType, quality);
  });
  return new File([blob], name, { type: mimeType, lastModified: Date.now() });
}

async function loadRasterSource(file: File): Promise<RasterSource> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, width, height) => {
        ctx.drawImage(bitmap, 0, 0, width, height);
      },
      close: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = objectUrl;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Failed to decode ${file.name}`));
  });
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    draw: (ctx, width, height) => {
      ctx.drawImage(image, 0, 0, width, height);
    },
    close: () => URL.revokeObjectURL(objectUrl),
  };
}

async function optimizeImageFile(file: File): Promise<{
  uploadFile: File;
  thumbnailFile: File;
  width: number;
  height: number;
  mimeType: string;
}> {
  const source = await loadRasterSource(file);
  try {
    const main = constrainDimensions(source.width, source.height, MAX_IMAGE_DIMENSION);
    const thumb = constrainDimensions(source.width, source.height, MAX_THUMBNAIL_DIMENSION);
    const uploadFile = await canvasToFile(source, main.width, main.height, withExtension(file.name, "webp"), "image/webp", 0.86);
    const thumbnailFile = await canvasToFile(source, thumb.width, thumb.height, withExtension(file.name.replace(/\.[a-z0-9]+$/i, "-thumb"), "webp"), "image/webp", 0.76);
    return {
      uploadFile,
      thumbnailFile,
      width: source.width,
      height: source.height,
      mimeType: "image/webp",
    };
  } finally {
    source.close();
  }
}

function buildObjectPath(userId: string, fileName: string, variant?: "thumb") {
  const base = `${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
  return `${userId}/${variant === "thumb" ? `thumb-${base}` : base}`;
}

function canOptimizeImage(file: File) {
  return OPTIMIZABLE_IMAGE_TYPES.has(file.type.toLowerCase());
}

export function MediaLibraryModal({
  title,
  description,
  allowedKinds = ["image", "video"],
  allowMultiple = false,
  selectedUrls = [],
  actionLabel = "Use selected",
  onSelect,
  onClose,
}: Props) {
  const mediaLibrary = useAppStore((state) => state.mediaLibrary);
  const upsertMediaAssets = useAppStore((state) => state.upsertMediaAssets);
  const removeMediaAsset = useAppStore((state) => state.removeMediaAsset);
  const renameMediaAsset = useAppStore((state) => state.renameMediaAsset);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [isDragActive, setIsDragActive] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const dragDepthRef = useRef(0);
  const modalTitleId = useId();

  const assets = useMemo(() => {
    const filtered = mediaLibrary.filter((asset) => allowedKinds.includes(asset.kind));
    const query = search.trim().toLowerCase();
    if (!query) return filtered;
    return filtered.filter((asset) =>
      asset.name.toLowerCase().includes(query)
      || asset.url.toLowerCase().includes(query)
      || asset.kind.toLowerCase().includes(query)
    );
  }, [allowedKinds, mediaLibrary, search]);
  const selectedUrlsKey = selectedUrls.join("\n");

  useEffect(() => {
    const nextSelected = mediaLibrary
      .filter((asset) => selectedUrls.includes(asset.url))
      .map((asset) => asset.id);
    setSelectedIds(nextSelected);
  }, [mediaLibrary, selectedUrlsKey]);

  useEffect(() => {
    setNameDrafts(Object.fromEntries(mediaLibrary.map((asset) => [asset.id, asset.name])));
  }, [mediaLibrary]);

  function toggleSelect(asset: ProjectMediaAsset) {
    setSelectedIds((current) => {
      if (allowMultiple) {
        return current.includes(asset.id)
          ? current.filter((id) => id !== asset.id)
          : [...current, asset.id];
      }
      return current[0] === asset.id ? [] : [asset.id];
    });
  }

  function useSelected() {
    const picked = mediaLibrary.filter((asset) => selectedIds.includes(asset.id));
    if (!picked.length) return;
    onSelect(allowMultiple ? picked : [picked[0]]);
    onClose();
  }

  function resetDragState() {
    dragDepthRef.current = 0;
    setIsDragActive(false);
  }

  function hasSupportedTransferFiles(dataTransfer: DataTransfer | null) {
    if (!dataTransfer?.files?.length) return false;
    return Array.from(dataTransfer.files).some((file) => {
      const kind = inferFileKind(file);
      return allowedKinds.includes(kind);
    });
  }

  function handleDragEnter(event: React.DragEvent<HTMLElement>) {
    if (!hasSupportedTransferFiles(event.dataTransfer)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>) {
    if (!hasSupportedTransferFiles(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragActive(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLElement>) {
    if (!hasSupportedTransferFiles(event.dataTransfer)) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    if (!hasSupportedTransferFiles(event.dataTransfer)) return;
    event.preventDefault();
    resetDragState();
    void handleUpload(event.dataTransfer.files);
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setIsUploading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw authError ?? new Error("Authentication required to upload media");
      }

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
            .upload(objectPath, uploadFile, {
              cacheControl: "3600",
              upsert: false,
              contentType: uploadFile.type || undefined,
            });

          if (uploadError) throw uploadError;
          uploadedPaths.push({ bucket: USER_MEDIA_BUCKET, path: objectPath });

          const { data: publicData } = supabase.storage.from(USER_MEDIA_BUCKET).getPublicUrl(objectPath);
          const url = publicData.publicUrl;

          let thumbnailUrl: string | null = null;
          let thumbnailPath: string | null = null;
          if (optimized?.thumbnailFile) {
            thumbnailPath = buildObjectPath(authData.user.id, optimized.thumbnailFile.name, "thumb");
            const { error: thumbError } = await supabase.storage
              .from(USER_MEDIA_BUCKET)
              .upload(thumbnailPath, optimized.thumbnailFile, {
                cacheControl: "3600",
                upsert: false,
                contentType: optimized.thumbnailFile.type || undefined,
              });
            if (thumbError) throw thumbError;
            uploadedPaths.push({ bucket: USER_MEDIA_BUCKET, path: thumbnailPath });
            thumbnailUrl = supabase.storage.from(USER_MEDIA_BUCKET).getPublicUrl(thumbnailPath).data.publicUrl;
          }

          return normalizeMediaAsset({
            name: file.name,
            url,
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
      } catch (error) {
        if (uploadedPaths.length) {
          await Promise.allSettled(
            uploadedPaths.map(({ bucket, path }) => supabase.storage.from(bucket).remove([path]))
          );
        }
        throw error;
      }
      setSelectedIds((current) => {
        const uploadedIds = nextAssets.map((asset) => asset.id);
        return allowMultiple ? [...new Set([...current, ...uploadedIds])] : uploadedIds.slice(0, 1);
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const selectionAssets = mediaLibrary.filter((asset) => selectedIds.includes(asset.id));

  async function commitRename(assetId: string, fallbackName: string) {
    const nextName = (nameDrafts[assetId] ?? fallbackName).trim();
    if (!nextName || nextName === fallbackName) {
      setNameDrafts((current) => ({ ...current, [assetId]: fallbackName }));
      return;
    }
    await renameMediaAsset(assetId, nextName);
  }

  const pendingDeleteAsset = pendingDeleteId
    ? mediaLibrary.find((a) => a.id === pendingDeleteId) ?? null
    : null;

  async function confirmDelete() {
    if (!pendingDeleteAsset) return;
    setSelectedIds((cur) => cur.filter((id) => id !== pendingDeleteAsset.id));
    await removeMediaAsset(pendingDeleteAsset.id);
    setPendingDeleteId(null);
  }

  const totalCount = mediaLibrary.filter((a) => allowedKinds.includes(a.kind)).length;

  return (
    <OverlayDialog
      open
      onClose={onClose}
      titleId={modalTitleId}
      containerClassName="p-4 md:p-8"
      panelClassName="relative flex h-[min(880px,calc(100vh-48px))] w-full max-w-[1320px] flex-col overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#0B0D12] shadow-[0_60px_140px_-20px_rgba(0,0,0,0.85)]"
    >
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.5]">
        <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(91,140,255,0.12),transparent_70%)]" />
        <div className="absolute -right-32 top-1/3 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle_at_center,rgba(122,92,255,0.08),transparent_70%)]" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* ── HEADER ───────────────────────────────────────────────── */}
        <div className="flex flex-shrink-0 items-center justify-between gap-6 border-b border-white/[0.05] px-8 py-5">
          <div className="flex min-w-0 items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">Media Library</span>
                <span className="h-1 w-1 rounded-full bg-white/15" />
                <span className="text-[10px] font-medium tabular-nums text-white/35">{totalCount} {totalCount === 1 ? "asset" : "assets"}</span>
              </div>
              <h3 id={modalTitleId} className="mt-1.5 text-[22px] font-semibold tracking-[-0.035em] text-white">
                {title}
              </h3>
              {description ? (
                <p className="mt-1 max-w-xl text-[12px] leading-5 text-white/40">
                  {description}
                </p>
              ) : null}
            </div>
          </div>

          <button
            onClick={onClose}
            className="group flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-white/[0.06] bg-white/[0.02] text-white/40 transition-all hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white/85"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── TOOLBAR ──────────────────────────────────────────────── */}
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-white/[0.05] px-8 py-4">
          <div className="relative min-w-0 flex-1">
            <Search size={13} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets…"
              className="h-10 w-full rounded-[12px] border border-white/[0.06] bg-white/[0.02] pl-10 pr-3 text-[12px] text-white/85 placeholder-white/25 transition-colors focus:border-[#5B8CFF]/35 focus:bg-white/[0.04] focus:outline-none"
            />
          </div>

          <div className="hidden items-center gap-1.5 rounded-[10px] border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[10px] font-medium text-white/45 md:flex">
            <span className="tabular-nums text-white/70">{assets.length}</span>
            <span className="text-white/25">/</span>
            <span className="tabular-nums">{totalCount}</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple={allowMultiple || allowedKinds.length !== 1}
            accept={acceptForKinds(allowedKinds)}
            className="hidden"
            onChange={(e) => { void handleUpload(e.target.files); }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="group inline-flex h-10 items-center gap-2 rounded-[12px] bg-gradient-to-b from-[#5B8CFF] to-[#4A78EE] px-4 text-[12px] font-semibold text-white shadow-[0_8px_24px_-6px_rgba(91,140,255,0.5)] transition-all hover:from-[#6B98FF] hover:to-[#5384F4] hover:shadow-[0_10px_28px_-6px_rgba(91,140,255,0.6)] disabled:cursor-wait disabled:opacity-60"
          >
            <Upload size={13} />
            {isUploading ? "Uploading…" : "Upload"}
          </button>
        </div>

        {/* ── BODY ─────────────────────────────────────────────────── */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Asset grid */}
          <div
            className="relative min-h-0 overflow-y-auto overflow-x-hidden px-8 py-6"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragActive && (
              <div className="pointer-events-none absolute inset-4 z-20 flex items-center justify-center rounded-[16px] border-2 border-dashed border-[#5B8CFF]/45 bg-[#5B8CFF]/[0.05] backdrop-blur-[2px]">
                <div className="rounded-[16px] border border-[#5B8CFF]/25 bg-[#0B0D12]/90 px-7 py-5 text-center shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
                  <Upload size={18} className="mx-auto mb-2.5 text-[#5B8CFF]" />
                  <p className="text-[13px] font-semibold text-white">Drop to upload</p>
                  <p className="mt-1 text-[11px] text-white/45">Images and videos</p>
                </div>
              </div>
            )}

            {assets.length ? (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 2xl:grid-cols-3">
                {assets.map((asset) => {
                  const selected = selectedIds.includes(asset.id);
                  return (
                    <div
                      key={asset.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleSelect(asset)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSelect(asset); }
                      }}
                      onDoubleClick={() => { onSelect([asset]); onClose(); }}
                      className={`group relative overflow-hidden rounded-[14px] border text-left transition-all ${
                        selected
                          ? "border-[#5B8CFF]/45 bg-[#5B8CFF]/[0.06] shadow-[0_0_0_1px_rgba(91,140,255,0.25),0_18px_40px_-12px_rgba(91,140,255,0.35)]"
                          : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.12] hover:bg-white/[0.03]"
                      }`}
                    >
                      {/* Selection check */}
                      {selected && (
                        <div className="absolute right-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#5B8CFF] text-white shadow-[0_4px_12px_rgba(91,140,255,0.5)]">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}

                      {/* Thumbnail */}
                      <div className="relative aspect-[16/10] overflow-hidden bg-[#0F1320]">
                        {asset.kind === "image" ? (
                          <img
                            src={asset.thumbnailUrl || asset.url}
                            alt={asset.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <video src={asset.url} className="h-full w-full object-cover" muted playsInline />
                        )}

                        {/* Bottom gradient */}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />

                        {/* Kind badge */}
                        <div className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-black/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/80 backdrop-blur-sm">
                          {asset.kind === "image" ? <ImageIcon size={9} /> : <Video size={9} />}
                          {asset.kind}
                        </div>

                        {/* Delete (hover) */}
                        {!selected && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setPendingDeleteId(asset.id); }}
                            className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-black/50 text-white/65 opacity-0 backdrop-blur-sm transition-all hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-300 group-hover:opacity-100"
                            aria-label="Delete asset"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="px-3 py-2.5">
                        <input
                          value={nameDrafts[asset.id] ?? asset.name}
                          onChange={(e) => {
                            const value = e.target.value;
                            setNameDrafts((cur) => ({ ...cur, [asset.id]: value }));
                          }}
                          onBlur={() => { void commitRename(asset.id, asset.name); }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void commitRename(asset.id, asset.name);
                              (e.currentTarget as HTMLInputElement).blur();
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              setNameDrafts((cur) => ({ ...cur, [asset.id]: asset.name }));
                              (e.currentTarget as HTMLInputElement).blur();
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full truncate rounded-[8px] bg-transparent px-1.5 py-1 text-[11px] font-medium text-white/85 transition-colors focus:bg-white/[0.04] focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-[16px] border border-dashed border-white/[0.08] bg-white/[0.015] px-8 text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[14px] border border-white/[0.06] bg-white/[0.03] text-white/45">
                  <ImageIcon size={20} strokeWidth={1.5} />
                </div>
                <h4 className="text-[15px] font-semibold tracking-[-0.01em] text-white">
                  {search ? "No matching assets" : "Your library is empty"}
                </h4>
                <p className="mt-2 max-w-xs text-[12px] leading-5 text-white/40">
                  {search ? "Try a different search term." : "Upload images and videos once, then reuse them anywhere across your projects."}
                </p>
                {!search && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-5 inline-flex h-9 items-center gap-2 rounded-[10px] bg-gradient-to-b from-[#5B8CFF] to-[#4A78EE] px-4 text-[12px] font-semibold text-white shadow-[0_8px_24px_-6px_rgba(91,140,255,0.5)] transition-all hover:from-[#6B98FF] hover:to-[#5384F4]"
                  >
                    <Upload size={13} />
                    Upload first asset
                  </button>
                )}
                {!search && (
                  <p className="mt-3 text-[10px] text-white/30">or drag files into this window</p>
                )}
              </div>
            )}
          </div>

          {/* ── SELECTION RAIL ─────────────────────────────────────── */}
          <aside className="relative flex min-h-0 flex-col border-t border-white/[0.05] bg-white/[0.012] lg:border-l lg:border-t-0">
            <div className="border-b border-white/[0.05] px-6 py-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">Selection</p>
              <p className="mt-1.5 text-[11px] leading-5 text-white/55">
                {selectedIds.length
                  ? `${selectedIds.length} ${selectedIds.length > 1 ? "assets" : "asset"} ready`
                  : `Choose ${allowMultiple ? "one or more assets" : "an asset"}`}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {selectionAssets.length ? (
                <div className="space-y-2.5">
                  {selectionAssets.map((asset) => (
                    <div key={asset.id} className="overflow-hidden rounded-[12px] border border-white/[0.06] bg-white/[0.02]">
                      <div className="aspect-[16/10] overflow-hidden bg-[#0F1320]">
                        {asset.kind === "image" ? (
                          <img src={asset.thumbnailUrl || asset.url} alt={asset.name} className="h-full w-full object-cover" />
                        ) : (
                          <video src={asset.url} className="h-full w-full object-cover" muted playsInline />
                        )}
                      </div>
                      <div className="px-3 py-2.5">
                        <p className="truncate text-[11px] font-medium text-white/85">{asset.name}</p>
                        <p className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-white/35">{asset.kind}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[14px] border border-dashed border-white/[0.07] px-5 py-10 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[12px] border border-white/[0.06] bg-white/[0.025] text-white/30">
                    {allowedKinds.length === 1 && allowedKinds[0] === "video" ? <Video size={15} /> : <ImageIcon size={15} />}
                  </div>
                  <p className="mt-4 text-[11px] font-semibold text-white/55">Nothing selected</p>
                  <p className="mt-1.5 text-[10px] leading-5 text-white/35">
                    Click an asset to add it to your selection.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-white/[0.05] px-5 py-4">
              <button
                onClick={onClose}
                className="flex-1 rounded-[10px] border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[11px] font-semibold text-white/55 transition-all hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white/85"
              >
                Cancel
              </button>
              <button
                onClick={useSelected}
                disabled={!selectedIds.length}
                className="flex-1 rounded-[10px] bg-gradient-to-b from-[#5B8CFF] to-[#4A78EE] px-3 py-2.5 text-[11px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(91,140,255,0.5)] transition-all hover:from-[#6B98FF] hover:to-[#5384F4] disabled:cursor-not-allowed disabled:from-white/[0.04] disabled:to-white/[0.04] disabled:text-white/25 disabled:shadow-none"
              >
                {actionLabel}
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* ── DELETE CONFIRMATION ─────────────────────────────────── */}
      {pendingDeleteAsset && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-[420px] overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#12161F] shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
            <div className="px-7 pb-2 pt-7">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[14px] border border-red-500/20 bg-red-500/[0.08] text-red-400">
                <AlertTriangle size={20} strokeWidth={1.8} />
              </div>
              <h4 className="text-[18px] font-semibold tracking-[-0.02em] text-white">
                Delete this asset?
              </h4>
              <p className="mt-2 text-[12px] leading-6 text-white/50">
                <span className="font-medium text-white/80">{pendingDeleteAsset.name}</span> will be permanently removed from your media library. This cannot be undone.
              </p>

              {/* Preview */}
              <div className="mt-5 overflow-hidden rounded-[12px] border border-white/[0.06] bg-[#0F1320]">
                <div className="aspect-[16/8] overflow-hidden">
                  {pendingDeleteAsset.kind === "image" ? (
                    <img
                      src={pendingDeleteAsset.thumbnailUrl || pendingDeleteAsset.url}
                      alt={pendingDeleteAsset.name}
                      className="h-full w-full object-cover opacity-70"
                    />
                  ) : (
                    <video src={pendingDeleteAsset.url} className="h-full w-full object-cover opacity-70" muted playsInline />
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 px-7 py-5">
              <button
                onClick={() => setPendingDeleteId(null)}
                className="flex-1 rounded-[10px] border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-[12px] font-semibold text-white/65 transition-all hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => void confirmDelete()}
                className="flex-1 rounded-[10px] bg-gradient-to-b from-red-500 to-red-600 px-4 py-2.5 text-[12px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(239,68,68,0.5)] transition-all hover:from-red-400 hover:to-red-500"
              >
                Delete asset
              </button>
            </div>
          </div>
        </div>
      )}
    </OverlayDialog>
  );
}
