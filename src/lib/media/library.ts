import type { ProjectMediaAsset, VirtualFile } from "@/types";

export const MEDIA_LIBRARY_FILE_ID = "__sitezy_media_library__";
export const MEDIA_LIBRARY_FILE_NAME = "sitezy.media.json";
export const MEDIA_LIBRARY_FILE_PATH = "/.sitezy/sitezy.media.json";
export const USER_MEDIA_BUCKET = "sitezy-media";

type FileLike = {
  id?: string | null;
  name?: string | null;
  path?: string | null;
  content: string;
};

function fallbackId(): string {
  return `media_${Math.random().toString(36).slice(2, 10)}`;
}

function makeId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : fallbackId();
}

function inferKind(url: string, mimeType?: string | null): ProjectMediaAsset["kind"] {
  const mime = (mimeType || "").toLowerCase();
  const raw = url.toLowerCase();
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  if (/^data:video\//.test(raw)) return "video";
  if (/^data:image\//.test(raw)) return "image";
  if (/\.(mp4|webm|ogg|mov)(\?|#|$)/.test(raw)) return "video";
  return "image";
}

function deriveName(url: string, fallback = "Media Asset"): string {
  if (!url) return fallback;
  if (url.startsWith("data:")) {
    const mime = url.slice(5, url.indexOf(";"));
    const ext = mime.split("/")[1] || "asset";
    return `uploaded-${ext}`;
  }
  try {
    const parsed = new URL(url);
    const tail = parsed.pathname.split("/").filter(Boolean).pop();
    return tail || fallback;
  } catch {
    const tail = url.split("/").filter(Boolean).pop();
    return tail || fallback;
  }
}

export function normalizeMediaAsset(asset: Partial<ProjectMediaAsset> & { url: string }): ProjectMediaAsset {
  return {
    id: asset.id || makeId(),
    name: asset.name?.trim() || deriveName(asset.url),
    url: asset.url,
    thumbnailUrl: asset.thumbnailUrl ?? null,
    kind: asset.kind || inferKind(asset.url, asset.mimeType),
    storageBucket: asset.storageBucket ?? null,
    storagePath: asset.storagePath ?? null,
    thumbnailStorageBucket: asset.thumbnailStorageBucket ?? null,
    thumbnailStoragePath: asset.thumbnailStoragePath ?? null,
    mimeType: asset.mimeType ?? null,
    size: typeof asset.size === "number" ? asset.size : null,
    width: typeof asset.width === "number" ? asset.width : null,
    height: typeof asset.height === "number" ? asset.height : null,
    createdAt: asset.createdAt || new Date().toISOString(),
  };
}

export function normalizeMediaAssets(input: unknown): ProjectMediaAsset[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is Partial<ProjectMediaAsset> & { url: string } => !!item && typeof item === "object" && typeof (item as { url?: unknown }).url === "string")
    .map((item) => normalizeMediaAsset(item))
    .sort((a, b) => {
      const at = Date.parse(a.createdAt || "") || 0;
      const bt = Date.parse(b.createdAt || "") || 0;
      return bt - at;
    });
}

export function mergeMediaAssets(existing: ProjectMediaAsset[], incoming: ProjectMediaAsset[]): ProjectMediaAsset[] {
  const byUrl = new Map<string, ProjectMediaAsset>();
  for (const asset of normalizeMediaAssets(existing)) byUrl.set(asset.url, asset);
  for (const asset of normalizeMediaAssets(incoming)) {
    if (!byUrl.has(asset.url)) byUrl.set(asset.url, asset);
  }
  return Array.from(byUrl.values()).sort((a, b) => {
    const at = Date.parse(a.createdAt || "") || 0;
    const bt = Date.parse(b.createdAt || "") || 0;
    return bt - at;
  });
}

export function isMediaLibraryFileLike(file: { id?: string | null; name?: string | null; path?: string | null }): boolean {
  return file.id === MEDIA_LIBRARY_FILE_ID
    || file.name === MEDIA_LIBRARY_FILE_NAME
    || file.path === MEDIA_LIBRARY_FILE_PATH;
}

export function parseMediaLibraryContent(content: string | null | undefined): ProjectMediaAsset[] {
  if (!content?.trim()) return [];
  try {
    const parsed = JSON.parse(content) as { assets?: unknown } | unknown[];
    if (Array.isArray(parsed)) return normalizeMediaAssets(parsed);
    return normalizeMediaAssets(parsed?.assets);
  } catch {
    return [];
  }
}

export function extractMediaLibraryFromFileList<T extends FileLike>(files: T[]): { media: ProjectMediaAsset[]; files: T[] } {
  let media: ProjectMediaAsset[] = [];
  const visibleFiles = files.filter((file) => {
    if (!isMediaLibraryFileLike(file)) return true;
    media = parseMediaLibraryContent(file.content);
    return false;
  });
  return { media, files: visibleFiles };
}

export function extractMediaLibraryFromRecord(files: Record<string, VirtualFile>): { media: ProjectMediaAsset[]; files: Record<string, VirtualFile> } {
  const entries = Object.entries(files);
  let media: ProjectMediaAsset[] = [];
  const visibleEntries = entries.filter(([, file]) => {
    if (!isMediaLibraryFileLike(file)) return true;
    media = parseMediaLibraryContent(file.content);
    return false;
  });
  return { media, files: Object.fromEntries(visibleEntries) };
}

export function createMediaLibraryFile(assets: ProjectMediaAsset[]): VirtualFile | null {
  const normalized = normalizeMediaAssets(assets);
  if (!normalized.length) return null;
  return {
    id: MEDIA_LIBRARY_FILE_ID,
    name: MEDIA_LIBRARY_FILE_NAME,
    path: MEDIA_LIBRARY_FILE_PATH,
    content: JSON.stringify({ version: 1, assets: normalized }, null, 2),
    type: "json",
    language: "json",
  };
}
