import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  assertLaunchRole,
  createOrUpdateBetaInvite,
  isInviteDispatchConfigured,
  listBetaAccessRecords,
  summarizeBetaAccess,
} from "@/lib/server/beta-access";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  DB_WRITE_001,
  VALIDATION_INPUT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";
import type { BetaRole } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated admin invite list request",
        severity: "warn",
      });
    }

    await assertLaunchRole(user, "admin");
    const members = await listBetaAccessRecords();

    return NextResponse.json({
      members,
      summary: summarizeBetaAccess(members),
      canEmailInvites: isInviteDispatchConfigured(),
    });
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated admin invite create request",
        severity: "warn",
      });
    }

    await assertLaunchRole(user, "admin");

    const body = await parseRequestBody<{
      email?: string;
      role?: BetaRole;
      note?: string | null;
      sendEmail?: boolean;
    }>(req);

    if (!body.email || typeof body.email !== "string") {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: "Admin invite create called without an email",
        severity: "warn",
      });
    }

    const result = await createOrUpdateBetaInvite(user, {
      email: body.email,
      role: body.role,
      note: body.note,
      sendEmail: Boolean(body.sendEmail),
      origin: new URL(req.url).origin,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}
