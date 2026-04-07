import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  AUTH_REQUIRED_001,
  DB_DELETE_001,
  VALIDATION_INPUT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated account deletion request",
        severity: "warn",
      });
    }

    const body = await parseRequestBody<{ confirmation?: string }>(req);
    if ((body.confirmation ?? "").trim().toUpperCase() !== "DELETE") {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: "Account deletion request missing DELETE confirmation token",
        userMessage: "Type DELETE to confirm permanent account removal.",
        severity: "warn",
      });
    }

    const admin = getSupabaseAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      throw createAppError({
        code: DB_DELETE_001,
        devMessage: `Supabase admin deleteUser failed for ${user.id}: ${error.message}`,
        userMessage: "We couldn't delete your account right now. Please try again.",
        severity: "error",
        metadata: { userId: user.id },
        cause: error,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, requestId, DB_DELETE_001);
  }
}
