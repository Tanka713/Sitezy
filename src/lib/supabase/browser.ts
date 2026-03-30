import { createBrowserClient } from "@supabase/ssr";
import { STATE_INIT_001, createAppError } from "@/lib/errors";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw createAppError({
      code: STATE_INIT_001,
      devMessage: "Missing NEXT_PUBLIC_SUPABASE_URL in browser environment",
      severity: "fatal",
      metadata: { envVar: "NEXT_PUBLIC_SUPABASE_URL", runtime: "browser" },
    });
  }

  if (!supabasePublishableKey) {
    throw createAppError({
      code: STATE_INIT_001,
      devMessage: "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in browser environment",
      severity: "fatal",
      metadata: { envVar: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", runtime: "browser" },
    });
  }

  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabasePublishableKey);
  }

  return browserClient;
}
