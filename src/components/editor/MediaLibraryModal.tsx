"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImageIcon, Search, Trash2, Upload, Video, X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { normalizeMediaAsset, USER_MEDIA_BUCKET } from "@/lib/media/library";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
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
  const [mounted, setMounted] = useState(false);
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [isDragActive, setIsDragActive] = useState(false);
  const dragDepthRef = useRef(0);

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

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted]);

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

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[160] bg-[rgba(5,7,13,0.72)] backdrop-blur-xl">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex h-full w-full items-center justify-center p-4 md:p-6">
        <div className="relative flex h-[min(860px,calc(100vh-32px))] w-full max-w-[1280px] flex-col overflow-hidden rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,#171821,#11131a)] shadow-[0_40px_120px_rgba(0,0,0,0.58)]">
          <div className="flex flex-shrink-0 items-start justify-between gap-5 border-b border-white/[0.06] px-5 py-5 md:px-7">
            <div className="min-w-0">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[18px] border border-white/[0.08] bg-white/[0.04] text-accent-200">
                  <ImageIcon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Media Library</p>
                  <h3 className="mt-1 text-[24px] font-semibold tracking-[-0.04em] text-white">{title}</h3>
                  <p className="mt-2 max-w-2xl text-[13px] leading-6 text-white/46">
                    {description || "Upload once, then reuse or replace media anywhere in the project."}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[16px] border border-white/[0.08] bg-white/[0.04] text-white/45 transition-all hover:border-white/[0.16] hover:text-white/75"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-shrink-0 flex-col gap-3 border-b border-white/[0.06] px-5 py-4 md:px-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/22" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your media library"
                className="h-12 w-full rounded-[18px] border border-white/[0.08] bg-white/[0.045] pl-11 pr-4 text-[13px] text-white/78 placeholder-white/24 focus:border-accent-400/35 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <div className="hidden items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[10px] font-medium text-white/34 xl:flex">
                <span>{assets.length} shown</span>
                <span className="text-white/16">•</span>
                <span>{mediaLibrary.filter((asset) => allowedKinds.includes(asset.kind)).length} total</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple={allowMultiple || allowedKinds.length !== 1}
                accept={acceptForKinds(allowedKinds)}
                className="hidden"
                onChange={(event) => { void handleUpload(event.target.files); }}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex h-12 items-center gap-2 rounded-[18px] border border-accent-400/25 bg-accent-500/15 px-5 text-[13px] font-semibold text-accent-200 transition-all hover:bg-accent-500/24 disabled:cursor-wait disabled:opacity-60"
              >
                <Upload size={15} />
                {isUploading ? "Uploading..." : "Upload media"}
              </button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div
              className="relative min-h-0 overflow-auto px-5 py-5 md:px-7"
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragActive && (
                <div className="pointer-events-none absolute inset-5 z-20 flex items-center justify-center rounded-[28px] border border-dashed border-accent-300/45 bg-[rgba(99,102,241,0.12)] backdrop-blur-sm">
                  <div className="rounded-[24px] border border-accent-300/25 bg-[rgba(13,16,27,0.86)] px-8 py-7 text-center shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] border border-accent-300/20 bg-accent-500/16 text-accent-200">
                      <Upload size={18} />
                    </div>
                    <p className="text-[15px] font-semibold text-white">Drop files to upload</p>
                    <p className="mt-2 text-[12px] leading-6 text-white/48">
                      Images and videos will be added to your media library.
                    </p>
                  </div>
                </div>
              )}
              {assets.length ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {assets.map((asset) => {
                    const selected = selectedIds.includes(asset.id);
                    return (
                      <div
                        key={asset.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleSelect(asset)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleSelect(asset);
                          }
                        }}
                        onDoubleClick={() => {
                          onSelect([asset]);
                          onClose();
                        }}
                        className={`group overflow-hidden rounded-[24px] border text-left transition-all ${
                          selected
                            ? "border-accent-400/38 bg-accent-500/10 shadow-[0_0_0_1px_rgba(129,140,248,0.22)]"
                            : "border-white/[0.08] bg-white/[0.035] hover:border-white/[0.16] hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="relative aspect-[16/10] overflow-hidden bg-[#0e0f14]">
                          {asset.kind === "image" ? (
                            <img src={asset.thumbnailUrl || asset.url} alt={asset.name} className="h-full w-full object-cover" />
                          ) : (
                            <video src={asset.url} className="h-full w-full object-cover" muted playsInline />
                          )}
                          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/45 px-2 py-1 text-[10px] font-medium text-white/70">
                            {asset.kind === "image" ? <ImageIcon size={11} /> : <Video size={11} />}
                            {asset.kind}
                          </div>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              void removeMediaAsset(asset.id);
                            }}
                            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/65 opacity-0 transition-all hover:border-red-400/30 hover:text-red-200 group-hover:opacity-100"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="space-y-2 px-4 py-4">
                          <input
                            value={nameDrafts[asset.id] ?? asset.name}
                            onChange={(event) => {
                              const value = event.target.value;
                              setNameDrafts((current) => ({ ...current, [asset.id]: value }));
                            }}
                            onBlur={() => { void commitRename(asset.id, asset.name); }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void commitRename(asset.id, asset.name);
                                (event.currentTarget as HTMLInputElement).blur();
                              }
                              if (event.key === "Escape") {
                                event.preventDefault();
                                setNameDrafts((current) => ({ ...current, [asset.id]: asset.name }));
                                (event.currentTarget as HTMLInputElement).blur();
                              }
                            }}
                            onClick={(event) => event.stopPropagation()}
                            className="w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[12px] font-medium text-white/82 focus:border-accent-400/35 focus:outline-none"
                          />
                          <p className="truncate text-[10px] text-white/32">{asset.url.startsWith("data:") ? "Uploaded asset" : asset.url}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/[0.08] bg-white/[0.03] px-8 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-white/[0.08] bg-white/[0.05] text-accent-200">
                    <Upload size={18} />
                  </div>
                  <h4 className="text-[16px] font-semibold text-white">Your media library is empty</h4>
                  <p className="mt-2 max-w-sm text-[12px] leading-6 text-white/45">
                    Upload product shots, team photos, logos, or background media once, then reuse them anywhere in the builder.
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-5 inline-flex h-11 items-center gap-2 rounded-[18px] border border-accent-400/25 bg-accent-500/15 px-5 text-[12px] font-semibold text-accent-200 transition-all hover:bg-accent-500/24"
                  >
                    <Upload size={14} />
                    Upload first asset
                  </button>
                  <p className="mt-3 text-[11px] text-white/30">
                    or drag files here
                  </p>
                </div>
              )}
            </div>

            <aside className="flex min-h-0 flex-col border-t border-white/[0.06] bg-white/[0.02] lg:border-l lg:border-t-0">
              <div className="border-b border-white/[0.06] px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/28">Selection</p>
                <p className="mt-1 text-[11px] leading-5 text-white/34">
                  {selectedIds.length
                    ? `${selectedIds.length} asset${selectedIds.length > 1 ? "s" : ""} selected`
                    : `Choose ${allowMultiple ? "one or more assets" : "an asset"} to continue.`}
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
                {selectionAssets.length ? (
                  <div className="space-y-3">
                    {selectionAssets.map((asset) => (
                      <div key={asset.id} className="rounded-[20px] border border-white/[0.08] bg-white/[0.035] p-3.5">
                        <div className="aspect-[16/10] overflow-hidden rounded-[14px] bg-black/20">
                          {asset.kind === "image" ? (
                            <img src={asset.thumbnailUrl || asset.url} alt={asset.name} className="h-full w-full object-cover" />
                          ) : (
                            <video src={asset.url} className="h-full w-full object-cover" muted playsInline />
                          )}
                        </div>
                        <p className="mt-3 truncate text-[12px] font-medium text-white/82">{asset.name}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/28">{asset.kind}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[22px] border border-dashed border-white/[0.08] bg-white/[0.025] px-5 py-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/[0.08] bg-white/[0.04] text-white/28">
                      {allowedKinds.length === 1 && allowedKinds[0] === "video" ? <Video size={16} /> : <ImageIcon size={16} />}
                    </div>
                    <p className="mt-4 text-[12px] font-semibold text-white/56">Nothing selected</p>
                    <p className="mt-2 text-[11px] leading-6 text-white/34">
                      Select {allowMultiple ? "one or more assets" : "an asset"} from the library, or upload new media.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 border-t border-white/[0.06] px-5 py-4">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-[18px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[12px] font-semibold text-white/58 transition-all hover:border-white/[0.16] hover:text-white/82"
                >
                  Cancel
                </button>
                <button
                  onClick={useSelected}
                  disabled={!selectedIds.length}
                  className="flex-1 rounded-[18px] border border-accent-400/25 bg-accent-500/15 px-4 py-3 text-[12px] font-semibold text-accent-200 transition-all hover:bg-accent-500/24 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {actionLabel}
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
