import type { User } from "@supabase/supabase-js";
import type { AdminMemberBillingSnapshot, PhoneOtpStatus, UserSettings, UserSettingsPayload } from "@/types";
import { buildAccountProfile, defaultUserSettings, mergeUserSettings, normalizeUserSettings } from "@/lib/settings";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  DB_DELETE_001,
  DB_READ_001,
  DB_UPDATE_001,
  DB_WRITE_001,
  createAppError,
  type ErrorCode,
} from "@/lib/errors";

type UserSettingsRow = {
  user_id: string;
  settings_json: Partial<UserSettings> | null;
  created_at: string;
  updated_at: string;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

function buildSettingsError(
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

export async function readUserSettings(userId: string, options?: { admin?: boolean }): Promise<UserSettings> {
  return readUserSettingsWithClient(userId, getSettingsClient(options));
}

function getSettingsClient(options?: { admin?: boolean }) {
  return options?.admin ? getSupabaseAdminClient() : getSupabaseServerClient();
}

async function readUserSettingsWithClient(
  userId: string,
  supabase: ReturnType<typeof getSupabaseServerClient> | ReturnType<typeof getSupabaseAdminClient>
): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("settings_json")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw buildSettingsError(error, DB_READ_001, `Failed to read settings for user ${userId}`, { userId });
  }

  return normalizeUserSettings((data as Pick<UserSettingsRow, "settings_json"> | null)?.settings_json ?? defaultUserSettings);
}

export async function getUserSettingsPayload(user: User): Promise<UserSettingsPayload> {
  const settings = await readUserSettings(user.id);
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const phoneOtpStatus = normalizePhoneOtpStatus(metadata.phone_otp_status);

  return {
    account: buildAccountProfile({
      id: user.id,
      email: user.email ?? "",
      name: typeof metadata.full_name === "string" ? metadata.full_name : undefined,
      profileImageUrl: typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
      profileImageStorageBucket:
        typeof metadata.avatar_storage_bucket === "string" ? metadata.avatar_storage_bucket : null,
      profileImageStoragePath:
        typeof metadata.avatar_storage_path === "string" ? metadata.avatar_storage_path : null,
      emailConfirmedAt: user.email_confirmed_at ?? null,
      phoneCountryCode:
        typeof metadata.phone_country_code === "string" && metadata.phone_country_code.trim()
          ? metadata.phone_country_code.trim()
          : null,
      phoneNumber:
        typeof metadata.phone_number === "string" && metadata.phone_number.trim()
          ? metadata.phone_number.trim()
          : user.phone?.trim() || null,
      phoneOtpStatus,
    }),
    settings,
  };
}

function normalizePhoneOtpStatus(value: unknown): PhoneOtpStatus | null {
  if (value === "not_provided" || value === "pending_setup" || value === "enabled" || value === "disabled") {
    return value;
  }
  return null;
}

export async function upsertUserSettings(
  userId: string,
  patch?: Partial<UserSettings> | null,
  options?: { admin?: boolean }
): Promise<UserSettings> {
  const supabase = getSettingsClient(options);
  const current = await readUserSettingsWithClient(userId, supabase);
  const next = mergeUserSettings(current, patch);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        settings_json: next,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

  if (error) {
    throw buildSettingsError(error, DB_WRITE_001, `Failed to upsert settings for user ${userId}`, { userId });
  }

  return next;
}

export async function resetUserSettings(userId: string): Promise<UserSettings> {
  return resetUserSettingsWithClient(userId, getSupabaseServerClient());
}

async function resetUserSettingsWithClient(
  userId: string,
  supabase: ReturnType<typeof getSupabaseServerClient> | ReturnType<typeof getSupabaseAdminClient>
): Promise<UserSettings> {
  const { error } = await supabase
    .from("user_settings")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw buildSettingsError(error, DB_DELETE_001, `Failed to reset settings for user ${userId}`, { userId });
  }

  return defaultUserSettings;
}

export async function updateUserBillingSnapshot(
  userId: string,
  patch: Partial<UserSettings["billing"]>,
  options?: { admin?: boolean }
): Promise<UserSettings> {
  const supabase = getSettingsClient(options);
  const current = await readUserSettingsWithClient(userId, supabase);
  const next = mergeUserSettings(current, {
    billing: { ...current.billing, ...patch },
  });
  const { error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        settings_json: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    throw buildSettingsError(error, DB_UPDATE_001, `Failed to update billing snapshot for user ${userId}`, {
      userId,
    });
  }

  return next;
}

export async function readUserBillingSnapshots(
  userIds: string[],
  options?: { admin?: boolean }
): Promise<Map<string, AdminMemberBillingSnapshot>> {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueUserIds.length) {
    return new Map();
  }

  const supabase = getSettingsClient(options);
  const { data, error } = await supabase
    .from("user_settings")
    .select("user_id, settings_json")
    .in("user_id", uniqueUserIds);

  if (error) {
    throw buildSettingsError(error, DB_READ_001, "Failed to read billing snapshots for admin", {
      userIds: uniqueUserIds,
    });
  }

  const snapshots = new Map<string, AdminMemberBillingSnapshot>();
  for (const row of (data ?? []) as Array<Pick<UserSettingsRow, "user_id" | "settings_json">>) {
    const settings = normalizeUserSettings(row.settings_json ?? defaultUserSettings);
    snapshots.set(row.user_id, {
      planName: settings.billing.planName,
      tokenUsage: settings.billing.tokenUsage,
      tokenLimit: settings.billing.tokenLimit,
      remainingCredits: settings.billing.remainingCredits,
    });
  }

  for (const userId of uniqueUserIds) {
    if (!snapshots.has(userId)) {
      snapshots.set(userId, {
        planName: defaultUserSettings.billing.planName,
        tokenUsage: defaultUserSettings.billing.tokenUsage,
        tokenLimit: defaultUserSettings.billing.tokenLimit,
        remainingCredits: defaultUserSettings.billing.remainingCredits,
      });
    }
  }

  return snapshots;
}
