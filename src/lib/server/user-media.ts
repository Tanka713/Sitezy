import type { ProjectMediaAsset } from "@/types";
import { normalizeMediaAssets } from "@/lib/media/library";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  DB_DELETE_001,
  DB_READ_001,
  DB_UPDATE_001,
  DB_WRITE_001,
  createAppError,
  type ErrorCode,
} from "@/lib/errors";

type UserMediaRow = {
  id: string;
  user_id: string;
  name: string;
  url: string;
  thumbnail_url: string | null;
  kind: ProjectMediaAsset["kind"];
  storage_bucket: string | null;
  storage_path: string | null;
  thumbnail_storage_bucket: string | null;
  thumbnail_storage_path: string | null;
  mime_type: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
  updated_at: string;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

function buildMediaError(
  error: unknown,
  fallbackCode: ErrorCode,
  devMessage: string,
  metadata?: Record<string, unknown>
) {
  const maybe = (error ?? {}) as SupabaseErrorLike;
  return createAppError({
    code: fallbackCode,
    devMessage,
    severity: "error",
    metadata: {
      ...metadata,
      ...(maybe.code ? { dbCode: maybe.code } : {}),
      ...(maybe.details ? { dbDetails: maybe.details } : {}),
      ...(maybe.hint ? { dbHint: maybe.hint } : {}),
    },
    cause: error,
  });
}

function rowToAsset(row: UserMediaRow): ProjectMediaAsset {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    thumbnailUrl: row.thumbnail_url ?? null,
    kind: row.kind,
    storageBucket: row.storage_bucket ?? null,
    storagePath: row.storage_path ?? null,
    thumbnailStorageBucket: row.thumbnail_storage_bucket ?? null,
    thumbnailStoragePath: row.thumbnail_storage_path ?? null,
    mimeType: row.mime_type ?? null,
    size: typeof row.size === "number" ? row.size : null,
    width: typeof row.width === "number" ? row.width : null,
    height: typeof row.height === "number" ? row.height : null,
    createdAt: row.created_at,
  };
}

export async function listUserMedia(userId: string): Promise<ProjectMediaAsset[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_media")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw buildMediaError(error, DB_READ_001, `Failed to list media for user ${userId}`, { userId });
  }

  return ((data ?? []) as UserMediaRow[]).map(rowToAsset);
}

export async function upsertUserMediaAssets(
  userId: string,
  assets: ProjectMediaAsset[]
): Promise<ProjectMediaAsset[]> {
  const normalized = normalizeMediaAssets(assets);
  if (!normalized.length) return listUserMedia(userId);

  const now = new Date().toISOString();
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("user_media")
    .upsert(
      normalized.map((asset) => ({
        id: asset.id,
        user_id: userId,
        name: asset.name,
        url: asset.url,
        thumbnail_url: asset.thumbnailUrl,
        kind: asset.kind,
        storage_bucket: asset.storageBucket,
        storage_path: asset.storagePath,
        thumbnail_storage_bucket: asset.thumbnailStorageBucket,
        thumbnail_storage_path: asset.thumbnailStoragePath,
        mime_type: asset.mimeType,
        size: asset.size,
        width: asset.width,
        height: asset.height,
        created_at: asset.createdAt || now,
        updated_at: now,
      })),
      { onConflict: "id" }
    );

  if (error) {
    throw buildMediaError(error, DB_WRITE_001, `Failed to upsert media assets for user ${userId}`, {
      userId,
      assetCount: normalized.length,
    });
  }

  return listUserMedia(userId);
}

export async function renameUserMediaAsset(
  userId: string,
  assetId: string,
  name: string
): Promise<ProjectMediaAsset[]> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw createAppError({
      code: DB_UPDATE_001,
      devMessage: `Media rename attempted with empty name for asset ${assetId}`,
      severity: "warn",
      metadata: { userId, assetId },
    });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("user_media")
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq("id", assetId)
    .eq("user_id", userId);

  if (error) {
    throw buildMediaError(error, DB_UPDATE_001, `Failed to rename media asset ${assetId}`, {
      userId,
      assetId,
    });
  }

  return listUserMedia(userId);
}

export async function deleteUserMediaAsset(userId: string, assetId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { data: row, error: readError } = await supabase
    .from("user_media")
    .select("storage_bucket, storage_path, thumbnail_storage_bucket, thumbnail_storage_path")
    .eq("id", assetId)
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    throw buildMediaError(readError, DB_DELETE_001, `Failed to resolve media asset ${assetId} before delete`, {
      userId,
      assetId,
      stage: "resolve-delete",
    });
  }

  const objectsToDelete = [
    row?.storage_bucket && row?.storage_path
      ? { bucket: row.storage_bucket, path: row.storage_path }
      : null,
    row?.thumbnail_storage_bucket && row?.thumbnail_storage_path
      ? { bucket: row.thumbnail_storage_bucket, path: row.thumbnail_storage_path }
      : null,
  ].filter((entry): entry is { bucket: string; path: string } => !!entry);

  if (objectsToDelete.length) {
    const byBucket = new Map<string, string[]>();
    for (const entry of objectsToDelete) {
      byBucket.set(entry.bucket, [...(byBucket.get(entry.bucket) ?? []), entry.path]);
    }

    for (const [bucket, paths] of byBucket) {
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove(paths);

      if (storageError) {
        throw buildMediaError(storageError, DB_DELETE_001, `Failed to remove storage objects for media asset ${assetId}`, {
          userId,
          assetId,
          storageBucket: bucket,
          storagePaths: paths,
          stage: "storage-delete",
        });
      }
    }
  }

  const { error } = await supabase
    .from("user_media")
    .delete()
    .eq("id", assetId)
    .eq("user_id", userId);

  if (error) {
    throw buildMediaError(error, DB_DELETE_001, `Failed to delete media asset ${assetId}`, {
      userId,
      assetId,
    });
  }
}
