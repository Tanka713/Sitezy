import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { createSupportRequest, listSupportRequests } from "@/lib/server/support-requests";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  DB_WRITE_001,
  VALIDATION_INPUT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";
import type { SupportRequestKind } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated request to list support requests",
        severity: "warn",
      });
    }

    return NextResponse.json({ requests: await listSupportRequests(user.id) });
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
        devMessage: "Unauthenticated request to create support request",
        severity: "warn",
      });
    }

    const body = await parseRequestBody<{
      kind?: SupportRequestKind;
      subject?: string;
      message?: string;
      metadata?: { route?: string | null; browser?: string | null };
    }>(req);

    if (
      typeof body.subject !== "string" ||
      typeof body.message !== "string" ||
      !body.subject.trim() ||
      !body.message.trim()
    ) {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: "Support request POST called with invalid subject or message",
        severity: "warn",
      });
    }

    return NextResponse.json({
      request: await createSupportRequest(user, {
        kind: body.kind === "bug" || body.kind === "feature" ? body.kind : "support",
        subject: body.subject,
        message: body.message,
        metadata: body.metadata,
      }),
    });
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}
