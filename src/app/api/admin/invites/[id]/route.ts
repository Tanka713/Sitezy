import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { assertLaunchRole, updateBetaAccessRecord } from "@/lib/server/beta-access";
import {
  AUTH_REQUIRED_001,
  DB_UPDATE_001,
  VALIDATION_INPUT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";
import type { BetaAccessStatus, BetaRole } from "@/types";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated admin invite patch request",
        severity: "warn",
      });
    }

    await assertLaunchRole(user, "admin");

    const body = await parseRequestBody<{
      role?: BetaRole;
      status?: BetaAccessStatus;
    }>(req);

    if (!body.role && !body.status) {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: `Admin invite patch called without role or status for ${params.id}`,
        severity: "warn",
      });
    }

    return NextResponse.json({
      record: await updateBetaAccessRecord(params.id, {
        role: body.role,
        status: body.status,
      }),
    });
  } catch (error) {
    return handleRouteError(error, requestId, DB_UPDATE_001);
  }
}
