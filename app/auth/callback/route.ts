import { NextRequest, NextResponse } from "next/server";
import { BETA_INTEREST_PATH } from "@/lib/app-routing";
import { claimBetaAccessForUser, resolveLaunchAccessForUser } from "@/lib/server/beta-access";
import { ensureBetaInterestForUser } from "@/lib/server/beta-interest";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function resolveSafeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/app";
  return value;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = resolveSafeNext(url.searchParams.get("next"));
  const flow = url.searchParams.get("flow");

  if (code) {
    const supabase = getSupabaseServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return NextResponse.redirect(new URL("/login?reason=auth-failed", url.origin));
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(new URL("/login?reason=auth-failed", url.origin));
    }

    if (flow === "verify-email") {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?reason=verified", url.origin));
    }

    if (flow === "recovery") {
      return NextResponse.redirect(new URL("/reset-password", url.origin));
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

  return NextResponse.redirect(new URL(next, url.origin));
}
