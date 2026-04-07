import { NextRequest, NextResponse } from "next/server";
import { assertLaunchRole, readBetaAccessRecordById } from "@/lib/server/beta-access";
import { readUserSettings, updateUserBillingSnapshot } from "@/lib/server/user-settings";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  DB_UPDATE_001,
  VALIDATION_INPUT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";
import type { AdminMemberRecord } from "@/types";

export const runtime = "nodejs";

function buildBillingSnapshot(settings: Awaited<ReturnType<typeof readUserSettings>>["billing"]) {
  return {
    planName: settings.planName,
    tokenUsage: settings.tokenUsage,
    tokenLimit: settings.tokenLimit,
    remainingCredits: Math.max(0, settings.tokenLimit - settings.tokenUsage),
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = req.headers.get("x-request-id") ?? null;

  try {
    const actor = await getAuthenticatedUser();
    if (!actor) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated admin credit update request",
        severity: "warn",
      });
    }

    await assertLaunchRole(actor, "admin");

    const body = await parseRequestBody<{
      creditDelta?: number;
      setTokenLimit?: number;
      resetUsage?: boolean;
    }>(req);

    const member = await readBetaAccessRecordById(params.id);
    if (!member) {
      throw createAppError({
        code: DB_READ_001,
        devMessage: `Admin credit update could not find beta member ${params.id}`,
        severity: "warn",
        metadata: { memberId: params.id },
      });
    }

    if (!member.userId) {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: `Admin credit update called for unclaimed invite ${params.id}`,
        userMessage: "Credits can only be changed after the invited user has created and linked their account.",
        severity: "warn",
        metadata: { memberId: params.id, email: member.email },
      });
    }

    const hasCreditDelta = typeof body.creditDelta === "number" && Number.isFinite(body.creditDelta);
    const hasSetTokenLimit = typeof body.setTokenLimit === "number" && Number.isFinite(body.setTokenLimit);
    const shouldResetUsage = Boolean(body.resetUsage);

    if (!hasCreditDelta && !hasSetTokenLimit && !shouldResetUsage) {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: `Admin credit update called without any billing change for ${params.id}`,
        severity: "warn",
        metadata: { memberId: params.id },
      });
    }

    const current = await readUserSettings(member.userId, { admin: true });
    const requestedDelta = hasCreditDelta ? Math.trunc(body.creditDelta as number) : 0;
    const requestedLimit = hasSetTokenLimit ? Math.trunc(body.setTokenLimit as number) : null;

    if (requestedDelta < 0) {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: `Admin credit update attempted negative delta ${requestedDelta} for ${params.id}`,
        userMessage: "Add credits with a positive amount.",
        severity: "warn",
        metadata: { memberId: params.id, creditDelta: requestedDelta },
      });
    }

    if (requestedLimit !== null && requestedLimit < 1) {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: `Admin credit update attempted invalid limit ${requestedLimit} for ${params.id}`,
        userMessage: "Credit limit must be at least 1.",
        severity: "warn",
        metadata: { memberId: params.id, tokenLimit: requestedLimit },
      });
    }

    const nextTokenUsage = shouldResetUsage ? 0 : current.billing.tokenUsage;
    const nextTokenLimit =
      requestedLimit !== null ? requestedLimit : current.billing.tokenLimit + requestedDelta;

    if (nextTokenLimit < nextTokenUsage) {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: `Admin credit update would set limit below usage for ${params.id}`,
        userMessage: "Credit limit can't be lower than current usage unless you reset usage first.",
        severity: "warn",
        metadata: {
          memberId: params.id,
          tokenUsage: current.billing.tokenUsage,
          nextTokenUsage,
          nextTokenLimit,
        },
      });
    }

    const next = await updateUserBillingSnapshot(
      member.userId,
      {
        tokenUsage: nextTokenUsage,
        tokenLimit: nextTokenLimit,
      },
      { admin: true }
    );

    const record: AdminMemberRecord = {
      ...member,
      billing: buildBillingSnapshot(next.billing),
    };

    return NextResponse.json({ record });
  } catch (error) {
    return handleRouteError(error, requestId, DB_UPDATE_001);
  }
}
