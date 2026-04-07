import { createClient } from "@supabase/supabase-js";
import { STATE_INIT_001, createAppError } from "@/lib/errors";

export function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw createAppError({
      code: STATE_INIT_001,
      devMessage: "Missing NEXT_PUBLIC_SUPABASE_URL in admin environment",
      severity: "fatal",
      metadata: { envVar: "NEXT_PUBLIC_SUPABASE_URL", runtime: "server-admin" },
    });
  }

  if (!serviceRoleKey) {
    throw createAppError({
      code: STATE_INIT_001,
      devMessage: "Missing SUPABASE_SERVICE_ROLE_KEY for admin client",
      userMessage: "This environment is not configured for account deletion yet.",
      severity: "warn",
      metadata: { envVar: "SUPABASE_SERVICE_ROLE_KEY", runtime: "server-admin" },
    });
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
