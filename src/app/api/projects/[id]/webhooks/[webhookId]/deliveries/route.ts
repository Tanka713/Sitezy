import { NextRequest, NextResponse } from "next/server";
import { listProjectWebhookDeliveries } from "@/lib/server/project-webhooks";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  createAppError,
  handleRouteError,
} from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; webhookId: string } }
) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated webhook deliveries request for ${params.webhookId}`,
        severity: "warn",
      });
    }

    return NextResponse.json({
      deliveries: await listProjectWebhookDeliveries(params.id, user.id, params.webhookId),
    });
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}
