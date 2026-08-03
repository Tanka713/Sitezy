import { NextRequest, NextResponse } from "next/server";
import { createBillingCheckoutSession } from "@/lib/server/billing";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_WRITE_001,
  createAppError,
  handleRouteError,
} from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated billing checkout request",
        severity: "warn",
      });
    }

    const url = await createBillingCheckoutSession({
      userId: user.id,
      email: user.email?.trim() || "",
      origin: req.nextUrl.origin,
    });

    return NextResponse.json({ url });
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}
