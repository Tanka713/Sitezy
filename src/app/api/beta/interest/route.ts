import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { resolveLaunchAccessForUser } from "@/lib/server/beta-access";
import { ensureBetaInterestForUser, readBetaInterestForUser, updateBetaInterestForUser } from "@/lib/server/beta-interest";
import {
  AUTH_PERMISSION_001,
  AUTH_REQUIRED_001,
  DB_READ_001,
  DB_UPDATE_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";

export const runtime = "nodejs";

async function requireBlockedUser() {
  const user = await getAuthenticatedUser({ includeBlockedBeta: true });
  if (!user) {
    throw createAppError({
      code: AUTH_REQUIRED_001,
      devMessage: "Unauthenticated beta interest request",
      severity: "warn",
    });
  }

  const access = await resolveLaunchAccessForUser(user);
  if (access.allowed) {
    throw createAppError({
      code: AUTH_PERMISSION_001,
      devMessage: `Allowed user ${user.id} attempted to use blocked beta interest route`,
      userMessage: "This page is only for accounts waiting on beta access.",
      severity: "warn",
      metadata: { userId: user.id, role: access.role },
    });
  }

  return user;
}

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await requireBlockedUser();
    return NextResponse.json({
      interest: (await readBetaInterestForUser(user.id)) ?? (await ensureBetaInterestForUser(user)),
    });
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}

export async function PUT(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await requireBlockedUser();
    const body = await parseRequestBody<{ note?: string | null }>(req);
    return NextResponse.json({
      interest: await updateBetaInterestForUser(user, {
        note: body.note,
      }),
    });
  } catch (error) {
    return handleRouteError(error, requestId, DB_UPDATE_001);
  }
}
