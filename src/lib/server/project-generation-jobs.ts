import {
  DB_SCHEMA_001,
  DB_SCHEMA_002,
  DB_READ_001,
  DB_UPDATE_001,
  DB_WRITE_001,
  createAppError,
} from "@/lib/errors";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ProjectGenerationJob,
  SiteBrief,
} from "@/types";

type GenerationJobRow = {
  id: string;
  project_id: string;
  user_id: string;
  kind: string;
  status: string;
  brief_json: SiteBrief;
  progress_message: string | null;
  current_page_id: string | null;
  current_page_name: string | null;
  total_pages: number | null;
  completed_pages: number | null;
  locked_by: string | null;
  locked_at: string | null;
  heartbeat_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  last_error_code: string | null;
  created_at: string;
  updated_at: string;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

function getGenerationJobsClient(options?: { admin?: boolean }) {
  return options?.admin ? getSupabaseAdminClient() : getSupabaseServerClient();
}

function buildGenerationJobError(
  error: unknown,
  fallbackCode: typeof DB_SCHEMA_001 | typeof DB_SCHEMA_002 | typeof DB_READ_001 | typeof DB_WRITE_001 | typeof DB_UPDATE_001,
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

function isGenerationJobsSchemaMissing(error: unknown): boolean {
  const maybe = (error ?? {}) as SupabaseErrorLike;
  return (
    maybe.code === "42P01" ||
    maybe.code === "42883" ||
    maybe.code === "PGRST202" ||
    maybe.code === "PGRST205" ||
    maybe.message?.includes("project_generation_jobs") === true ||
    maybe.message?.includes("claim_project_generation_job") === true
  );
}

function mapGenerationJob(row: GenerationJobRow): ProjectGenerationJob {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    kind: "full_site",
    status:
      row.status === "running" ||
      row.status === "completed" ||
      row.status === "failed" ||
      row.status === "canceled"
        ? row.status
        : "queued",
    progressMessage: row.progress_message,
    currentPageId: row.current_page_id,
    currentPageName: row.current_page_name,
    totalPages: Number.isFinite(row.total_pages) ? Number(row.total_pages) : 0,
    completedPages: Number.isFinite(row.completed_pages) ? Number(row.completed_pages) : 0,
    lockedBy: row.locked_by,
    lockedAt: row.locked_at,
    heartbeatAt: row.heartbeat_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    lastError: row.last_error,
    lastErrorCode: row.last_error_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function enqueueFullSiteGenerationJob(
  projectId: string,
  userId: string,
  brief: SiteBrief,
  options?: { admin?: boolean }
): Promise<ProjectGenerationJob> {
  const supabase = getGenerationJobsClient(options);

  const { data: existingRow, error: existingError } = await supabase
    .from("project_generation_jobs")
    .select("*")
    .eq("project_id", projectId)
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    if (isGenerationJobsSchemaMissing(existingError)) {
      throw buildGenerationJobError(
        existingError,
        DB_SCHEMA_002,
        `Project generation jobs schema is missing while enqueueing ${projectId}`,
        { projectId, userId }
      );
    }
    throw buildGenerationJobError(
      existingError,
      DB_READ_001,
      `Failed to read active generation job for project ${projectId}`,
      { projectId, userId }
    );
  }

  if (existingRow) {
    return mapGenerationJob(existingRow as GenerationJobRow);
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_generation_jobs")
    .insert({
      id: crypto.randomUUID(),
      project_id: projectId,
      user_id: userId,
      kind: "full_site",
      status: "queued",
      brief_json: brief,
      progress_message: "Queued for generation...",
      total_pages: 0,
      completed_pages: 0,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    if (isGenerationJobsSchemaMissing(error)) {
      throw buildGenerationJobError(
        error,
        DB_SCHEMA_002,
        `Project generation jobs schema is missing while enqueueing ${projectId}`,
        { projectId, userId }
      );
    }
    throw buildGenerationJobError(
      error,
      DB_WRITE_001,
      `Failed to enqueue generation job for project ${projectId}`,
      { projectId, userId }
    );
  }

  return mapGenerationJob(data as GenerationJobRow);
}

export async function getGenerationJobById(
  jobId: string,
  options?: { admin?: boolean }
): Promise<ProjectGenerationJob | null> {
  const supabase = getGenerationJobsClient(options);
  const { data, error } = await supabase
    .from("project_generation_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    if (isGenerationJobsSchemaMissing(error)) {
      return null;
    }
    throw buildGenerationJobError(error, DB_READ_001, `Failed to load generation job ${jobId}`, {
      jobId,
    });
  }

  return data ? mapGenerationJob(data as GenerationJobRow) : null;
}

export async function getActiveGenerationJobForProject(
  projectId: string,
  options?: { admin?: boolean }
): Promise<ProjectGenerationJob | null> {
  const supabase = getGenerationJobsClient(options);
  const { data, error } = await supabase
    .from("project_generation_jobs")
    .select("*")
    .eq("project_id", projectId)
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isGenerationJobsSchemaMissing(error)) {
      return null;
    }
    throw buildGenerationJobError(
      error,
      DB_READ_001,
      `Failed to load active generation job for project ${projectId}`,
      { projectId }
    );
  }

  return data ? mapGenerationJob(data as GenerationJobRow) : null;
}

export async function listLatestActiveGenerationJobs(
  projectIds: string[],
  options?: { admin?: boolean }
): Promise<Map<string, ProjectGenerationJob>> {
  const uniqueProjectIds = [...new Set(projectIds.filter(Boolean))];
  if (!uniqueProjectIds.length) {
    return new Map();
  }

  const supabase = getGenerationJobsClient(options);
  const { data, error } = await supabase
    .from("project_generation_jobs")
    .select("*")
    .in("project_id", uniqueProjectIds)
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false });

  if (error) {
    if (isGenerationJobsSchemaMissing(error)) {
      return new Map();
    }
    throw buildGenerationJobError(error, DB_READ_001, "Failed to load active generation jobs", {
      projectIds: uniqueProjectIds,
    });
  }

  const jobs = new Map<string, ProjectGenerationJob>();
  for (const row of (data ?? []) as GenerationJobRow[]) {
    if (!jobs.has(row.project_id)) {
      jobs.set(row.project_id, mapGenerationJob(row));
    }
  }
  return jobs;
}

type GenerationJobPatch = {
  status?: ProjectGenerationJob["status"];
  progressMessage?: string | null;
  currentPageId?: string | null;
  currentPageName?: string | null;
  totalPages?: number;
  completedPages?: number;
  heartbeatAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  lockedBy?: string | null;
  lockedAt?: string | null;
  lastError?: string | null;
  lastErrorCode?: string | null;
};

export async function updateGenerationJob(
  jobId: string,
  patch: GenerationJobPatch,
  options?: { admin?: boolean }
): Promise<ProjectGenerationJob> {
  const supabase = getGenerationJobsClient(options);
  const now = new Date().toISOString();

  const payload: Record<string, unknown> = {
    updated_at: now,
  };

  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.progressMessage !== undefined) payload.progress_message = patch.progressMessage;
  if (patch.currentPageId !== undefined) payload.current_page_id = patch.currentPageId;
  if (patch.currentPageName !== undefined) payload.current_page_name = patch.currentPageName;
  if (patch.totalPages !== undefined) payload.total_pages = patch.totalPages;
  if (patch.completedPages !== undefined) payload.completed_pages = patch.completedPages;
  if (patch.heartbeatAt !== undefined) payload.heartbeat_at = patch.heartbeatAt;
  if (patch.startedAt !== undefined) payload.started_at = patch.startedAt;
  if (patch.completedAt !== undefined) payload.completed_at = patch.completedAt;
  if (patch.lockedBy !== undefined) payload.locked_by = patch.lockedBy;
  if (patch.lockedAt !== undefined) payload.locked_at = patch.lockedAt;
  if (patch.lastError !== undefined) payload.last_error = patch.lastError;
  if (patch.lastErrorCode !== undefined) payload.last_error_code = patch.lastErrorCode;

  const { data, error } = await supabase
    .from("project_generation_jobs")
    .update(payload)
    .eq("id", jobId)
    .select("*")
    .single();

  if (error) {
    if (isGenerationJobsSchemaMissing(error)) {
      throw buildGenerationJobError(error, DB_SCHEMA_002, `Project generation jobs schema is missing while updating ${jobId}`, {
        jobId,
        patch,
      });
    }
    throw buildGenerationJobError(error, DB_UPDATE_001, `Failed to update generation job ${jobId}`, {
      jobId,
      patch,
    });
  }

  return mapGenerationJob(data as GenerationJobRow);
}

export async function touchGenerationJob(
  jobId: string,
  workerId: string,
  options?: { admin?: boolean }
): Promise<ProjectGenerationJob> {
  const now = new Date().toISOString();
  return updateGenerationJob(
    jobId,
    {
      status: "running",
      heartbeatAt: now,
      lockedAt: now,
      lockedBy: workerId,
    },
    options
  );
}

export async function completeGenerationJob(
  jobId: string,
  progressMessage: string,
  options?: { admin?: boolean }
): Promise<ProjectGenerationJob> {
  const now = new Date().toISOString();
  return updateGenerationJob(
    jobId,
    {
      status: "completed",
      progressMessage,
      currentPageId: null,
      currentPageName: null,
      heartbeatAt: now,
      completedAt: now,
    },
    options
  );
}

export async function failGenerationJob(
  jobId: string,
  userMessage: string,
  errorCode: string | null,
  options?: { admin?: boolean }
): Promise<ProjectGenerationJob> {
  const now = new Date().toISOString();
  return updateGenerationJob(
    jobId,
    {
      status: "failed",
      progressMessage: userMessage,
      lastError: userMessage,
      lastErrorCode: errorCode,
      currentPageId: null,
      currentPageName: null,
      heartbeatAt: now,
      completedAt: now,
    },
    options
  );
}

export async function claimNextGenerationJob(
  workerId: string,
  staleAfterSeconds = 120
): Promise<ProjectGenerationJob | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("claim_project_generation_job", {
    p_worker_id: workerId,
    p_stale_after_seconds: staleAfterSeconds,
  });

  if (error) {
    if (isGenerationJobsSchemaMissing(error)) {
      throw buildGenerationJobError(error, DB_SCHEMA_002, "Project generation jobs schema is missing while claiming work", {
        workerId,
        staleAfterSeconds,
      });
    }
    throw buildGenerationJobError(error, DB_UPDATE_001, "Failed to claim generation job", {
      workerId,
      staleAfterSeconds,
    });
  }

  const row = Array.isArray(data) ? data[0] : null;
  return row ? mapGenerationJob(row as GenerationJobRow) : null;
}
