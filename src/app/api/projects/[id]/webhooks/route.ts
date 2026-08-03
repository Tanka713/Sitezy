import { NextRequest, NextResponse } from "next/server";
import {
  createProjectWebhook,
  deleteProjectWebhook,
  listProjectWebhooks,
  updateProjectWebhook,
} from "@/lib/server/project-webhooks";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  DB_UPDATE_001,
  DB_WRITE_001,
  VALIDATION_INPUT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";

export const runtime = "nodejs";

async function requireUser() {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw createAppError({
      code: AUTH_REQUIRED_001,
      devMessage: "Unauthenticated project webhook request",
      severity: "warn",
    });
  }
  return user;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await requireUser();
    return NextResponse.json({
      webhooks: await listProjectWebhooks(params.id, user.id),
    });
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await requireUser();
    const body = await parseRequestBody<{
      label?: string | null;
      targetUrl?: string | null;
      secret?: string | null;
      events?: Array<"lead.created" | "subscriber.created" | "deployment.published"> | null;
      enabled?: boolean;
    }>(req);

    return NextResponse.json({
      webhook: await createProjectWebhook(params.id, user.id, body),
    }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await requireUser();
    const body = await parseRequestBody<{
      webhookId?: string;
      label?: string | null;
      targetUrl?: string | null;
      secret?: string | null;
      events?: Array<"lead.created" | "subscriber.created" | "deployment.published"> | null;
      enabled?: boolean;
    }>(req);

    if (!body.webhookId) {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: `Webhook patch missing webhookId for project ${params.id}`,
        severity: "warn",
        metadata: { projectId: params.id, userId: user.id },
      });
    }

    return NextResponse.json({
      webhook: await updateProjectWebhook(params.id, user.id, body.webhookId, body),
    });
  } catch (error) {
    return handleRouteError(error, requestId, DB_UPDATE_001);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await requireUser();
    const body = await parseRequestBody<{ webhookId?: string }>(req);
    if (!body.webhookId) {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: `Webhook delete missing webhookId for project ${params.id}`,
        severity: "warn",
        metadata: { projectId: params.id, userId: user.id },
      });
    }

    await deleteProjectWebhook(params.id, user.id, body.webhookId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, requestId, DB_UPDATE_001);
  }
}
