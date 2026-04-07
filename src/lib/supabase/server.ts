import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { STATE_INIT_001, createAppError } from "@/lib/errors";
import type { BetaAccessRecord } from "@/types";
import { normalizeLaunchEmail, resolveLaunchAccess } from "@/lib/server/launch";

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

function mapBetaAccessRecord(row: BetaAccessRow): BetaAccessRecord {
  return {
    id: row.id,
    email: normalizeLaunchEmail(row.email),
    role: row.role === "admin" || row.role === "customer_service" ? row.role : "customer",
    status: row.status === "active" || row.status === "revoked" ? row.status : "invited",
    note: row.note,
    invitedBy: row.invited_by,
    userId: row.user_id,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw createAppError({
      code: STATE_INIT_001,
      devMessage: "Missing NEXT_PUBLIC_SUPABASE_URL in server environment",
      severity: "fatal",
      metadata: { envVar: "NEXT_PUBLIC_SUPABASE_URL", runtime: "server" },
    });
  }

  if (!supabasePublishableKey) {
    throw createAppError({
      code: STATE_INIT_001,
      devMessage: "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in server environment",
      severity: "fatal",
      metadata: { envVar: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", runtime: "server" },
    });
  }

  return { supabaseUrl, supabasePublishableKey };
}

export function getSupabaseServerClient() {
  const cookieStore = cookies();
  const { supabaseUrl, supabasePublishableKey } = getSupabaseEnv();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {}
      },
    },
  });
}

export async function getAuthenticatedUser(options?: { includeBlockedBeta?: boolean }) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  if (options?.includeBlockedBeta) return data.user;

  const normalizedEmail = normalizeLaunchEmail(data.user.email);
  let betaRecord: BetaAccessRecord | null = null;

  if (normalizedEmail) {
    const { data: record } = await supabase
      .from("beta_access")
      .select("*")
      .or(`user_id.eq.${data.user.id},email.eq.${normalizedEmail}`)
      .limit(1)
      .maybeSingle();

    betaRecord = record ? mapBetaAccessRecord(record as BetaAccessRow) : null;
  }

  if (!resolveLaunchAccess(data.user.email, betaRecord).allowed) return null;
  return data.user;
}
