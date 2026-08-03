import { NextRequest, NextResponse } from "next/server";
import { readBillingSummary } from "@/lib/server/billing";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  createAppError,
  handleRouteError,
} from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated billing summary request",
        severity: "warn",
      });
    }

    return NextResponse.json(await readBillingSummary(user.id));
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}
