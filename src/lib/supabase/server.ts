import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { STATE_INIT_001, createAppError } from "@/lib/errors";


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
  return data.user;
}
