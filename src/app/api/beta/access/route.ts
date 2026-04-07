import { NextRequest, NextResponse } from "next/server";
import { VALIDATION_INPUT_001, createAppError, handleRouteError, parseRequestBody } from "@/lib/errors";
import { resolveLaunchAccessForEmail } from "@/lib/server/beta-access";
import { getBetaDeniedMessage, getPublicLaunchConfig } from "@/lib/server/launch";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const body = await parseRequestBody<{ email?: string }>(req);
    const email = String(body.email ?? "").trim();

    if (!email) {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: "Beta access check called without an email",
        severity: "warn",
      });
    }

    const launch = getPublicLaunchConfig();
    const access = await resolveLaunchAccessForEmail(email);

    return NextResponse.json({
      allowed: access.allowed,
      inviteOnlyBeta: launch.inviteOnlyBeta,
      supportEmail: launch.supportEmail,
      role: access.role,
      status: access.status,
      source: access.source,
      message: access.allowed
        ? "This email currently has beta access."
        : "This email doesn't currently have access to the private beta.",
      ...(access.allowed ? {} : { error: getBetaDeniedMessage() }),
    });
  } catch (error) {
    return handleRouteError(error, requestId, VALIDATION_INPUT_001);
  }
}
