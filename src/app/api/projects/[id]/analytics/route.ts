import { NextRequest, NextResponse } from "next/server";
import { recordProjectAnalyticsEvent, summarizeProjectAnalytics } from "@/lib/server/project-analytics";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  DB_WRITE_001,
  VALIDATION_INPUT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";
import type { ProjectAnalyticsEventType } from "@/types";

export const runtime = "nodejs";

function normalizeEventType(value: unknown): ProjectAnalyticsEventType {
  if (
    value === "session" ||
    value === "page_view" ||
    value === "lead_conversion" ||
    value === "subscriber_conversion" ||
    value === "deployment_published"
  ) {
    return value;
  }

  throw createAppError({
    code: VALIDATION_INPUT_001,
    devMessage: `Invalid analytics event type ${String(value ?? "")}`,
    severity: "warn",
    metadata: { eventType: value ?? null },
  });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated analytics summary request for ${params.id}`,
        severity: "warn",
      });
    }

    const daysParam = Number(req.nextUrl.searchParams.get("days") ?? "30");
    const summary = await summarizeProjectAnalytics(params.id, user.id, {
      days: Number.isFinite(daysParam) && daysParam > 0 ? Math.trunc(daysParam) : 30,
    });
    return NextResponse.json({ summary });
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const body = await parseRequestBody<{
      eventType?: ProjectAnalyticsEventType;
      pagePath?: string;
      sessionId?: string | null;
      visitorId?: string | null;
      referrer?: string | null;
      metadata?: Record<string, unknown> | null;
    }>(req);

    await recordProjectAnalyticsEvent({
      projectId: params.id,
      eventType: normalizeEventType(body.eventType),
      pagePath: body.pagePath,
      sessionId: body.sessionId ?? null,
      visitorId: body.visitorId ?? null,
      referrer: body.referrer ?? null,
      metadata: body.metadata ?? {},
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}
