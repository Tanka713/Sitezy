import type { User } from "@supabase/supabase-js";
import type { BetaInterestRequest, BetaInterestSource } from "@/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  DB_READ_001,
  DB_SCHEMA_001,
  DB_WRITE_001,
  DB_UPDATE_001,
  VALIDATION_INPUT_001,
  createAppError,
  type ErrorCode,
} from "@/lib/errors";
import { normalizeLaunchEmail } from "@/lib/server/launch";

type BetaInterestRow = {
  id: string;
  user_id: string;
  email: string;
  user_name: string | null;
  note: string | null;
  source: string;
  created_at: string;
  updated_at: string;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

function normalizeInterestSource(source: unknown): BetaInterestSource {
  return source === "signup" || source === "oauth" || source === "login" ? source : "app";
}

function resolveUserName(user: Pick<User, "user_metadata">) {
  const candidates = [user.user_metadata?.full_name, user.user_metadata?.name, user.user_metadata?.display_name];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function buildBetaInterestError(
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

function isMissingBetaInterestStorage(error: unknown) {
  const maybe = (error ?? {}) as SupabaseErrorLike;
  const code = maybe.code?.toUpperCase() ?? "";
  const message = maybe.message?.toLowerCase() ?? "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("beta_interest_requests") ||
    message.includes("could not find the table")
  );
}

function buildMissingBetaInterestStorageError(action: string) {
  return createAppError({
    code: DB_SCHEMA_001,
    devMessage: `Beta interest storage is unavailable during ${action}`,
    userMessage: "Beta interest needs the latest database migration before it can be saved.",
    severity: "warn",
    metadata: {
      requiredMigration: "supabase/add-beta-interest-requests.sql",
      feature: "beta-interest",
      action,
    },
  });
}

function mapBetaInterest(row: BetaInterestRow): BetaInterestRequest {
  return {
    id: row.id,
    userId: row.user_id,
    email: normalizeLaunchEmail(row.email),
    userName: typeof row.user_name === "string" && row.user_name.trim() ? row.user_name.trim() : null,
    note: typeof row.note === "string" && row.note.trim() ? row.note.trim() : null,
    source: normalizeInterestSource(row.source),
    persisted: true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createProvisionalBetaInterest(
  user: Pick<User, "id" | "email" | "user_metadata">,
  source: BetaInterestSource,
  note?: string | null
): BetaInterestRequest {
  const now = new Date().toISOString();
  return {
    id: `beta-interest-pending:${user.id}`,
    userId: user.id,
    email: normalizeLaunchEmail(user.email),
    userName: resolveUserName(user),
    note: typeof note === "string" && note.trim() ? note.trim() : null,
    source,
    persisted: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function readBetaInterestForUser(userId: string): Promise<BetaInterestRequest | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("beta_interest_requests")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingBetaInterestStorage(error)) {
      return null;
    }
    throw buildBetaInterestError(error, DB_READ_001, `Failed to read beta interest for user ${userId}`, { userId });
  }

  return data ? mapBetaInterest(data as BetaInterestRow) : null;
}

export async function ensureBetaInterestForUser(
  user: Pick<User, "id" | "email" | "user_metadata">,
  source: BetaInterestSource = "app"
): Promise<BetaInterestRequest> {
  const email = normalizeLaunchEmail(user.email);
  if (!email) {
    throw createAppError({
      code: VALIDATION_INPUT_001,
      devMessage: `Cannot register beta interest without an email for ${user.id}`,
      userMessage: "We need an account email before we can register your beta interest.",
      severity: "warn",
      metadata: { userId: user.id },
    });
  }

  const existing = await readBetaInterestForUser(user.id);
  if (existing) return existing;

  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    user_id: user.id,
    email,
    user_name: resolveUserName(user),
    note: null,
    source,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase.from("beta_interest_requests").insert(row).select("*").single();
  if (error || !data) {
    if (isMissingBetaInterestStorage(error)) {
      return createProvisionalBetaInterest(user, source);
    }
    throw buildBetaInterestError(error, DB_WRITE_001, `Failed to create beta interest for user ${user.id}`, {
      userId: user.id,
      source,
    });
  }

  return mapBetaInterest(data as BetaInterestRow);
}

export async function updateBetaInterestForUser(
  user: Pick<User, "id" | "email" | "user_metadata">,
  input: { note?: string | null; source?: BetaInterestSource }
): Promise<BetaInterestRequest> {
  const existing = await ensureBetaInterestForUser(user, input.source ?? "app");
  if (existing.persisted === false) {
    throw buildMissingBetaInterestStorageError("updateBetaInterestForUser");
  }
  const note = typeof input.note === "string" && input.note.trim() ? input.note.trim() : null;
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("beta_interest_requests")
    .update({
      email: normalizeLaunchEmail(user.email),
      user_name: resolveUserName(user),
      note,
      source: input.source ?? existing.source,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error || !data) {
    if (isMissingBetaInterestStorage(error)) {
      throw buildMissingBetaInterestStorageError("updateBetaInterestForUser");
    }
    throw buildBetaInterestError(error, DB_UPDATE_001, `Failed to update beta interest for user ${user.id}`, {
      userId: user.id,
    });
  }

  return mapBetaInterest(data as BetaInterestRow);
}

export async function listBetaInterestRequestsForAdmin(): Promise<{
  requests: BetaInterestRequest[];
  storageReady: boolean;
}> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("beta_interest_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingBetaInterestStorage(error)) {
      return {
        requests: [],
        storageReady: false,
      };
    }

    throw buildBetaInterestError(error, DB_READ_001, "Failed to list beta interest requests for admin");
  }

  return {
    requests: ((data ?? []) as BetaInterestRow[]).map(mapBetaInterest),
    storageReady: true,
  };
}
