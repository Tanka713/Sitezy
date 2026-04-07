import type { User } from "@supabase/supabase-js";
import type { BetaAccessRecord, BetaAccessStatus, BetaRole, CurrentBetaAccess } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  AUTH_INVITE_001,
  AUTH_PERMISSION_001,
  DB_READ_001,
  DB_UPDATE_001,
  DB_WRITE_001,
  VALIDATION_INPUT_001,
  createAppError,
  type ErrorCode,
} from "@/lib/errors";
import {
  getBetaDeniedMessage,
  getPublicLaunchConfig,
  hasMinimumBetaRole,
  normalizeLaunchEmail,
  resolveLaunchAccess,
} from "@/lib/server/launch";

type BetaAccessRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  note: string | null;
  invited_by: string | null;
  user_id: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

const VALID_ROLES = new Set<BetaRole>(["customer", "customer_service", "admin"]);
const VALID_STATUSES = new Set<BetaAccessStatus>(["invited", "active", "revoked"]);

function normalizeRole(role: unknown): BetaRole {
  return VALID_ROLES.has(role as BetaRole) ? (role as BetaRole) : "customer";
}

function normalizeStatus(status: unknown): BetaAccessStatus {
  return VALID_STATUSES.has(status as BetaAccessStatus) ? (status as BetaAccessStatus) : "invited";
}

function mapBetaAccessRecord(row: BetaAccessRow): BetaAccessRecord {
  return {
    id: row.id,
    email: normalizeLaunchEmail(row.email),
    role: normalizeRole(row.role),
    status: normalizeStatus(row.status),
    note: row.note,
    invitedBy: row.invited_by,
    userId: row.user_id,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildBetaAccessError(
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

function buildInviteRedirect(origin?: string | null) {
  if (!origin) return undefined;
  try {
    return new URL("/auth/callback?next=/app", origin).toString();
  } catch {
    return undefined;
  }
}

export function isInviteDispatchConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function readCurrentSessionBetaAccessRecord(user: Pick<User, "id" | "email">): Promise<BetaAccessRecord | null> {
  const normalizedEmail = normalizeLaunchEmail(user.email);
  if (!normalizedEmail) return null;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("beta_access")
    .select("*")
    .or(`user_id.eq.${user.id},email.eq.${normalizedEmail}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw buildBetaAccessError(error, DB_READ_001, `Failed to read beta access for ${user.id}`, {
      userId: user.id,
      email: normalizedEmail,
    });
  }

  return data ? mapBetaAccessRecord(data as BetaAccessRow) : null;
}

export async function readBetaAccessRecordByEmail(email?: string | null): Promise<BetaAccessRecord | null> {
  const normalizedEmail = normalizeLaunchEmail(email);
  if (!normalizedEmail) return null;

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("beta_access")
    .select("*")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    throw buildBetaAccessError(error, DB_READ_001, `Failed to read beta access by email ${normalizedEmail}`, {
      email: normalizedEmail,
    });
  }

  return data ? mapBetaAccessRecord(data as BetaAccessRow) : null;
}

export async function readBetaAccessRecordById(id: string): Promise<BetaAccessRecord | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("beta_access")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw buildBetaAccessError(error, DB_READ_001, `Failed to read beta access by id ${id}`, {
      id,
    });
  }

  return data ? mapBetaAccessRecord(data as BetaAccessRow) : null;
}

export async function resolveLaunchAccessForUser(user?: Pick<User, "id" | "email"> | null): Promise<CurrentBetaAccess> {
  const normalizedEmail = normalizeLaunchEmail(user?.email);
  if (!normalizedEmail) {
    return resolveLaunchAccess(null, null);
  }

  let record: BetaAccessRecord | null = null;
  if (user) {
    try {
      record = await readCurrentSessionBetaAccessRecord(user);
    } catch {
      record = null;
    }
  }
  return resolveLaunchAccess(normalizedEmail, record);
}

export async function resolveLaunchAccessForEmail(email?: string | null): Promise<CurrentBetaAccess> {
  const normalizedEmail = normalizeLaunchEmail(email);
  if (!normalizedEmail) {
    return resolveLaunchAccess(null, null);
  }

  try {
    const record = await readBetaAccessRecordByEmail(normalizedEmail);
    return resolveLaunchAccess(normalizedEmail, record);
  } catch {
    return resolveLaunchAccess(normalizedEmail, null);
  }
}

export async function claimBetaAccessForUser(user: Pick<User, "id" | "email">) {
  const normalizedEmail = normalizeLaunchEmail(user.email);
  if (!normalizedEmail || !isInviteDispatchConfigured()) return null;

  let record: BetaAccessRecord | null = null;
  try {
    record = await readBetaAccessRecordByEmail(normalizedEmail);
  } catch {
    return null;
  }
  if (!record || record.status === "revoked") return record;
  if (record.userId === user.id && record.status === "active" && record.acceptedAt) return record;

  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("beta_access")
    .update({
      user_id: user.id,
      status: "active",
      accepted_at: record.acceptedAt ?? now,
      updated_at: now,
    })
    .eq("id", record.id)
    .select("*")
    .single();

  if (error || !data) {
    throw buildBetaAccessError(error, DB_UPDATE_001, `Failed to claim beta access for ${user.id}`, {
      userId: user.id,
      email: normalizedEmail,
    });
  }

  return mapBetaAccessRecord(data as BetaAccessRow);
}

export async function assertLaunchRole(
  user: Pick<User, "id" | "email"> | null | undefined,
  minimumRole: BetaRole
) {
  const access = await resolveLaunchAccessForUser(user ?? null);

  if (access.allowed && hasMinimumBetaRole(access.role, minimumRole)) {
    return access;
  }

  throw createAppError({
    code: AUTH_PERMISSION_001,
    devMessage: `User ${user?.id ?? "anonymous"} lacks required beta role ${minimumRole}`,
    userMessage: access.allowed ? "You don't have permission to open this dashboard." : getBetaDeniedMessage(),
    severity: "warn",
    metadata: {
      userId: user?.id ?? null,
      email: normalizeLaunchEmail(user?.email),
      minimumRole,
      actualRole: access.role,
      source: access.source,
    },
  });
}

export async function listBetaAccessRecords(): Promise<BetaAccessRecord[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("beta_access")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw buildBetaAccessError(error, DB_READ_001, "Failed to list beta access records");
  }

  return ((data ?? []) as BetaAccessRow[]).map(mapBetaAccessRecord);
}

export async function createOrUpdateBetaInvite(
  actor: Pick<User, "id" | "email">,
  input: {
    email?: string | null;
    role?: BetaRole;
    note?: string | null;
    sendEmail?: boolean;
    origin?: string | null;
  }
) {
  const email = normalizeLaunchEmail(input.email);
  if (!email) {
    throw createAppError({
      code: VALIDATION_INPUT_001,
      devMessage: "Beta invite create called without an email",
      userMessage: "Enter an email to send beta access.",
      severity: "warn",
    });
  }

  const role = normalizeRole(input.role);
  const note = typeof input.note === "string" && input.note.trim() ? input.note.trim() : null;
  const now = new Date().toISOString();
  const admin = getSupabaseAdminClient();
  const existing = await readBetaAccessRecordByEmail(email);

  const nextRecord = {
    id: existing?.id ?? crypto.randomUUID(),
    email,
    role,
    status: existing?.status === "active" ? "active" : "invited",
    note,
    invited_by: actor.id,
    user_id: existing?.userId ?? null,
    accepted_at: existing?.acceptedAt ?? null,
    updated_at: now,
  };

  const inviteWrite = existing
    ? await admin
        .from("beta_access")
        .update({
          email: nextRecord.email,
          role: nextRecord.role,
          status: nextRecord.status,
          note: nextRecord.note,
          invited_by: nextRecord.invited_by,
          user_id: nextRecord.user_id,
          accepted_at: nextRecord.accepted_at,
          updated_at: nextRecord.updated_at,
        })
        .eq("id", existing.id)
        .select("*")
        .single()
    : await admin
        .from("beta_access")
        .insert({
          ...nextRecord,
          created_at: now,
        })
        .select("*")
        .single();

  const { data, error } = inviteWrite;

  if (error || !data) {
    throw buildBetaAccessError(error, DB_WRITE_001, `Failed to persist beta invite for ${email}`, {
      actorId: actor.id,
      email,
      operation: existing ? "update" : "insert",
    });
  }

  let inviteEmailSent = false;
  let inviteEmailError: string | null = null;
  let inviteEmailCode: ErrorCode | null = null;

  if (input.sendEmail) {
    try {
      const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: buildInviteRedirect(input.origin),
        data: {
          beta_role: role,
        },
      });
      if (inviteError) {
        inviteEmailError = inviteError.message;
        inviteEmailCode = AUTH_INVITE_001;
      } else {
        inviteEmailSent = true;
      }
    } catch (error) {
      inviteEmailError = error instanceof Error ? error.message : "We couldn't send the invite email.";
      inviteEmailCode = AUTH_INVITE_001;
    }
  }

  return {
    record: mapBetaAccessRecord(data as BetaAccessRow),
    inviteEmailSent,
    inviteEmailCode,
    inviteEmailError,
  };
}

export async function updateBetaAccessRecord(
  id: string,
  patch: {
    role?: BetaRole;
    status?: BetaAccessStatus;
  }
) {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.role) updates.role = normalizeRole(patch.role);
  if (patch.status) updates.status = normalizeStatus(patch.status);

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("beta_access")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw buildBetaAccessError(error, DB_UPDATE_001, `Failed to update beta access record ${id}`, { id });
  }

  return mapBetaAccessRecord(data as BetaAccessRow);
}

export function summarizeBetaAccess(records: BetaAccessRecord[]) {
  return {
    total: records.length,
    invited: records.filter((record) => record.status === "invited").length,
    active: records.filter((record) => record.status === "active").length,
    revoked: records.filter((record) => record.status === "revoked").length,
    customerService: records.filter((record) => record.role === "customer_service").length,
    admins: records.filter((record) => record.role === "admin").length,
  };
}

export function getBetaAccessLabel(access: CurrentBetaAccess) {
  if (!access.inviteOnlyBeta) return "Open beta";
  if (access.allowed && access.role === "admin") return "Admin access";
  if (access.allowed && access.role === "customer_service") return "Customer service access";
  if (access.allowed) return "Invited beta access";
  return getPublicLaunchConfig().betaDeniedMessage;
}
