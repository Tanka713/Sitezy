import type {
  ProjectCollaborationBootstrap,
  ProjectComment,
  ProjectPageLock,
  ProjectPageOperation,
  ProjectPageOperationType,
  ProjectPreviewShare,
} from "@/types";
import { normalizeProjectPageMeta } from "@/lib/project-pages";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  DB_READ_001,
  DB_READ_002,
  DB_UPDATE_001,
  DB_WRITE_001,
  VALIDATION_INPUT_001,
  createAppError,
} from "@/lib/errors";

type CollaborationClient = ReturnType<typeof getSupabaseServerClient>;
type CollaborationClientOptions = { admin?: boolean };

type CommentRow = {
  id: string;
  project_id: string;
  page_id: string | null;
  section_id: string | null;
  author_user_id: string;
  author_name: string | null;
  body: string;
  status: "open" | "resolved";
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

type PageLockRow = {
  id: string;
  project_id: string;
  page_id: string;
  user_id: string;
  mode: "code" | "transform";
  expires_at: string;
  created_at: string;
};

type PageOperationRow = {
  id: string;
  project_id: string;
  page_id: string;
  revision: number;
  expected_revision: number;
  operation_type: ProjectPageOperationType;
  payload_json: Record<string, unknown> | null;
  actor_user_id: string;
  created_at: string;
};

type PreviewShareRow = {
  id: string;
  project_id: string;
  page_id: string | null;
  token: string;
  label: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  created_by: string;
};

type PageRow = {
  id: string;
  project_id: string;
  html: string;
  sections_json: unknown;
  meta_json: unknown;
  revision: number | null;
  updated_at: string;
};

function getCollaborationClient(options?: CollaborationClientOptions) {
  return options?.admin ? getSupabaseAdminClient() : getSupabaseServerClient();
}

async function ensureProjectOwner(projectId: string, userId: string, options?: CollaborationClientOptions) {
  const client = getCollaborationClient(options);
  const query = client.from("projects").select("id").eq("id", projectId);
  if (!options?.admin) {
    query.eq("user_id", userId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) {
    throw createAppError({
      code: DB_READ_001,
      devMessage: `Failed to resolve collaboration project ${projectId}`,
      severity: "error",
      metadata: { projectId, userId },
      cause: error,
    });
  }
  if (!data) {
    throw createAppError({
      code: DB_READ_002,
      devMessage: `Collaboration project ${projectId} not found`,
      severity: "warn",
      metadata: { projectId, userId },
    });
  }
}

function mapComment(row: CommentRow): ProjectComment {
  return {
    id: row.id,
    projectId: row.project_id,
    pageId: row.page_id,
    sectionId: row.section_id,
    authorUserId: row.author_user_id,
    authorName: row.author_name,
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
  };
}

function mapLock(row: PageLockRow): ProjectPageLock {
  return {
    id: row.id,
    projectId: row.project_id,
    pageId: row.page_id,
    userId: row.user_id,
    mode: row.mode,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function mapOperation(row: PageOperationRow): ProjectPageOperation {
  return {
    id: row.id,
    projectId: row.project_id,
    pageId: row.page_id,
    revision: row.revision,
    expectedRevision: row.expected_revision,
    operationType: row.operation_type,
    payload: row.payload_json ?? {},
    actorUserId: row.actor_user_id,
    createdAt: row.created_at,
  };
}

function buildShareUrl(projectId: string, token: string, pageId?: string | null, origin?: string | null) {
  const base = String(origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  const url = new URL(`/preview/${projectId}`, base);
  url.searchParams.set("share", token);
  if (pageId) url.searchParams.set("page", pageId);
  return url.toString();
}

function mapShare(row: PreviewShareRow, origin?: string | null): ProjectPreviewShare {
  return {
    id: row.id,
    projectId: row.project_id,
    pageId: row.page_id,
    token: row.token,
    label: row.label,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    createdBy: row.created_by,
    shareUrl: buildShareUrl(row.project_id, row.token, row.page_id, origin),
  };
}

export async function listProjectComments(
  projectId: string,
  userId: string,
  options?: CollaborationClientOptions
) {
  await ensureProjectOwner(projectId, userId, options);
  const client = getCollaborationClient(options);
  const { data, error } = await client
    .from("project_comments")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw createAppError({
      code: DB_READ_001,
      devMessage: `Failed to list project comments for ${projectId}`,
      severity: "error",
      metadata: { projectId, userId },
      cause: error,
    });
  }

  return ((data ?? []) as CommentRow[]).map(mapComment);
}

export async function createProjectComment(
  input: {
    projectId: string;
    userId: string;
    authorName?: string | null;
    body: string;
    pageId?: string | null;
    sectionId?: string | null;
  },
  options?: CollaborationClientOptions
) {
  await ensureProjectOwner(input.projectId, input.userId, options);
  const body = String(input.body ?? "").trim();
  if (!body) {
    throw createAppError({
      code: VALIDATION_INPUT_001,
      devMessage: `Project comment body missing for ${input.projectId}`,
      severity: "warn",
      metadata: { projectId: input.projectId, userId: input.userId },
    });
  }

  const now = new Date().toISOString();
  const client = getCollaborationClient(options);
  const { data, error } = await client
    .from("project_comments")
    .insert({
      id: crypto.randomUUID(),
      project_id: input.projectId,
      page_id: input.pageId ?? null,
      section_id: input.sectionId ?? null,
      author_user_id: input.userId,
      author_name: input.authorName ?? null,
      body,
      status: "open",
      created_at: now,
      updated_at: now,
      resolved_at: null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw createAppError({
      code: DB_WRITE_001,
      devMessage: `Failed to create project comment for ${input.projectId}`,
      severity: "error",
      metadata: { projectId: input.projectId, userId: input.userId },
      cause: error,
    });
  }

  return mapComment(data as CommentRow);
}

export async function updateProjectCommentStatus(
  input: {
    projectId: string;
    userId: string;
    commentId: string;
    status: "open" | "resolved";
  },
  options?: CollaborationClientOptions
) {
  await ensureProjectOwner(input.projectId, input.userId, options);
  const now = new Date().toISOString();
  const client = getCollaborationClient(options);
  const { data, error } = await client
    .from("project_comments")
    .update({
      status: input.status,
      resolved_at: input.status === "resolved" ? now : null,
      updated_at: now,
    })
    .eq("id", input.commentId)
    .eq("project_id", input.projectId)
    .select("*")
    .single();

  if (error || !data) {
    throw createAppError({
      code: DB_UPDATE_001,
      devMessage: `Failed to update comment ${input.commentId}`,
      severity: "error",
      metadata: { projectId: input.projectId, userId: input.userId, commentId: input.commentId },
      cause: error,
    });
  }

  return mapComment(data as CommentRow);
}

export async function listProjectPreviewShares(
  projectId: string,
  userId: string,
  origin?: string | null,
  options?: CollaborationClientOptions
) {
  await ensureProjectOwner(projectId, userId, options);
  const client = getCollaborationClient(options);
  const { data, error } = await client
    .from("project_preview_shares")
    .select("*")
    .eq("project_id", projectId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw createAppError({
      code: DB_READ_001,
      devMessage: `Failed to list preview shares for ${projectId}`,
      severity: "error",
      metadata: { projectId, userId },
      cause: error,
    });
  }

  return ((data ?? []) as PreviewShareRow[]).map((row) => mapShare(row, origin));
}

export async function createProjectPreviewShare(
  input: {
    projectId: string;
    userId: string;
    pageId?: string | null;
    label?: string | null;
    expiresAt?: string | null;
    origin?: string | null;
  },
  options?: CollaborationClientOptions
) {
  await ensureProjectOwner(input.projectId, input.userId, options);
  const token = crypto.randomUUID().replace(/-/g, "");
  const now = new Date().toISOString();
  const client = getCollaborationClient(options);
  const { data, error } = await client
    .from("project_preview_shares")
    .insert({
      id: crypto.randomUUID(),
      project_id: input.projectId,
      page_id: input.pageId ?? null,
      token,
      label: input.label ?? null,
      expires_at: input.expiresAt ?? null,
      revoked_at: null,
      created_at: now,
      created_by: input.userId,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw createAppError({
      code: DB_WRITE_001,
      devMessage: `Failed to create preview share for ${input.projectId}`,
      severity: "error",
      metadata: { projectId: input.projectId, userId: input.userId },
      cause: error,
    });
  }

  return mapShare(data as PreviewShareRow, input.origin);
}

export async function resolveProjectPreviewShare(
  token: string,
  projectId?: string | null
) {
  const client = getSupabaseAdminClient();
  const query = client
    .from("project_preview_shares")
    .select("*")
    .eq("token", token)
    .is("revoked_at", null);
  if (projectId) query.eq("project_id", projectId);

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw createAppError({
      code: DB_READ_001,
      devMessage: `Failed to resolve preview share token`,
      severity: "error",
      metadata: { token, projectId },
      cause: error,
    });
  }
  if (!data) return null;

  const row = data as PreviewShareRow;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return null;
  }

  return row;
}

export async function listProjectPageLocks(
  projectId: string,
  userId: string,
  options?: CollaborationClientOptions
) {
  await ensureProjectOwner(projectId, userId, options);
  const client = getCollaborationClient(options);
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("project_page_locks")
    .select("*")
    .eq("project_id", projectId)
    .gt("expires_at", now)
    .order("created_at", { ascending: false });

  if (error) {
    throw createAppError({
      code: DB_READ_001,
      devMessage: `Failed to list page locks for ${projectId}`,
      severity: "error",
      metadata: { projectId, userId },
      cause: error,
    });
  }

  return ((data ?? []) as PageLockRow[]).map(mapLock);
}

export async function acquireProjectPageLock(input: {
  projectId: string;
  pageId: string;
  userId: string;
  mode: "code" | "transform";
  ttlSeconds?: number;
}) {
  await ensureProjectOwner(input.projectId, input.userId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + Math.max(60, Math.min(1800, input.ttlSeconds ?? 600)) * 1000).toISOString();
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from("project_page_locks")
    .upsert(
      {
        id: `${input.projectId}:${input.pageId}:${input.mode}`,
        project_id: input.projectId,
        page_id: input.pageId,
        user_id: input.userId,
        mode: input.mode,
        expires_at: expiresAt,
        created_at: now.toISOString(),
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    throw createAppError({
      code: DB_WRITE_001,
      devMessage: `Failed to acquire page lock for ${input.pageId}`,
      severity: "error",
      metadata: input,
      cause: error,
    });
  }

  return mapLock(data as PageLockRow);
}

export async function listProjectPageOperations(
  projectId: string,
  pageId: string,
  userId: string,
  sinceRevision?: number,
  options?: CollaborationClientOptions
) {
  await ensureProjectOwner(projectId, userId, options);
  const client = getCollaborationClient(options);
  const query = client
    .from("project_page_operations")
    .select("*")
    .eq("project_id", projectId)
    .eq("page_id", pageId)
    .order("revision", { ascending: true });
  if (typeof sinceRevision === "number" && Number.isFinite(sinceRevision)) {
    query.gt("revision", Math.trunc(sinceRevision));
  }

  const { data, error } = await query;
  if (error) {
    throw createAppError({
      code: DB_READ_001,
      devMessage: `Failed to list page operations for ${pageId}`,
      severity: "error",
      metadata: { projectId, pageId, userId, sinceRevision },
      cause: error,
    });
  }

  return ((data ?? []) as PageOperationRow[]).map(mapOperation);
}

async function readPageRow(projectId: string, pageId: string) {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("pages")
    .select("id, project_id, html, sections_json, meta_json, revision, updated_at")
    .eq("project_id", projectId)
    .eq("id", pageId)
    .maybeSingle();

  if (error) {
    throw createAppError({
      code: DB_READ_001,
      devMessage: `Failed to read page row ${pageId}`,
      severity: "error",
      metadata: { projectId, pageId },
      cause: error,
    });
  }
  if (!data) {
    throw createAppError({
      code: DB_READ_002,
      devMessage: `Page ${pageId} not found for collaboration op`,
      severity: "warn",
      metadata: { projectId, pageId },
    });
  }
  return data as PageRow;
}

async function assertExistingLock(projectId: string, pageId: string, userId: string, mode: "code" | "transform") {
  const locks = await listProjectPageLocks(projectId, userId);
  const match = locks.find((lock) => lock.pageId === pageId && lock.userId === userId && lock.mode === mode);
  if (!match) {
    throw createAppError({
      code: VALIDATION_INPUT_001,
      devMessage: `Missing required ${mode} lock for page ${pageId}`,
      severity: "warn",
      metadata: { projectId, pageId, userId, mode },
    });
  }
}

export async function applyProjectPageOperation(input: {
  projectId: string;
  pageId: string;
  userId: string;
  operationType: ProjectPageOperationType;
  expectedRevision: number;
  payload?: Record<string, unknown> | null;
  nextHtml?: string | null;
  nextSections?: unknown[] | null;
  nextMeta?: unknown;
  requireLockMode?: "code" | "transform" | null;
}) {
  await ensureProjectOwner(input.projectId, input.userId);
  if (input.requireLockMode) {
    await assertExistingLock(input.projectId, input.pageId, input.userId, input.requireLockMode);
  }

  const current = await readPageRow(input.projectId, input.pageId);
  const currentRevision =
    typeof current.revision === "number" && Number.isFinite(current.revision)
      ? Math.max(1, Math.trunc(current.revision))
      : 1;

  if (currentRevision !== Math.max(1, Math.trunc(input.expectedRevision))) {
    throw createAppError({
      code: DB_UPDATE_001,
      devMessage: `Revision mismatch on page ${input.pageId}; expected ${input.expectedRevision}, current ${currentRevision}`,
      severity: "warn",
      metadata: { projectId: input.projectId, pageId: input.pageId, userId: input.userId, expectedRevision: input.expectedRevision, currentRevision },
    });
  }

  const nextRevision = currentRevision + 1;
  const now = new Date().toISOString();
  const client = getSupabaseAdminClient();
  const nextMeta = input.nextMeta === undefined
    ? current.meta_json
    : normalizeProjectPageMeta(input.nextMeta);

  const { error: pageError } = await client
    .from("pages")
    .update({
      html: typeof input.nextHtml === "string" ? input.nextHtml : current.html,
      sections_json: Array.isArray(input.nextSections) ? input.nextSections : current.sections_json,
      meta_json: nextMeta,
      revision: nextRevision,
      updated_at: now,
    })
    .eq("project_id", input.projectId)
    .eq("id", input.pageId);

  if (pageError) {
    throw createAppError({
      code: DB_UPDATE_001,
      devMessage: `Failed to update page ${input.pageId} for collaboration op`,
      severity: "error",
      metadata: { projectId: input.projectId, pageId: input.pageId, userId: input.userId },
      cause: pageError,
    });
  }

  const operationId = crypto.randomUUID();
  const { data, error } = await client
    .from("project_page_operations")
    .insert({
      id: operationId,
      project_id: input.projectId,
      page_id: input.pageId,
      revision: nextRevision,
      expected_revision: currentRevision,
      operation_type: input.operationType,
      payload_json: input.payload ?? {},
      actor_user_id: input.userId,
      created_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw createAppError({
      code: DB_WRITE_001,
      devMessage: `Failed to persist page operation for ${input.pageId}`,
      severity: "error",
      metadata: { projectId: input.projectId, pageId: input.pageId, userId: input.userId, operationId },
      cause: error,
    });
  }

  return mapOperation(data as PageOperationRow);
}

export async function readProjectCollaborationBootstrap(
  projectId: string,
  userId: string,
  origin?: string | null
): Promise<ProjectCollaborationBootstrap> {
  const [comments, locks, previewShares] = await Promise.all([
    listProjectComments(projectId, userId),
    listProjectPageLocks(projectId, userId),
    listProjectPreviewShares(projectId, userId, origin),
  ]);

  return {
    comments,
    locks,
    previewShares,
  };
}
