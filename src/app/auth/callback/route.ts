import { NextRequest, NextResponse } from "next/server";
import { BETA_INTEREST_PATH } from "@/lib/app-routing";
import { claimBetaAccessForUser, resolveLaunchAccessForUser } from "@/lib/server/beta-access";
import { ensureBetaInterestForUser } from "@/lib/server/beta-interest";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/app";
  const flow = url.searchParams.get("flow");

  if (code) {
    const supabase = getSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      if (flow === "verify-email") {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/login?reason=verified", url.origin));
      }

      const access = await resolveLaunchAccessForUser(user);
      if (!access.allowed) {
        try {
          await ensureBetaInterestForUser(user, "oauth");
        } catch {}
        return NextResponse.redirect(new URL(BETA_INTEREST_PATH, url.origin));
      }

      try {
        await claimBetaAccessForUser(user);
      } catch {}
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
