import { NextRequest, NextResponse } from "next/server";
import { updateProjectDomain } from "@/lib/server/project-publishing";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  API_REQUEST_002,
  AUTH_REQUIRED_001,
  DB_UPDATE_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; domainId: string } }
) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to update domain ${params.domainId} for project ${params.id}`,
        severity: "warn",
      });
    }

    const body = await parseRequestBody<{ action?: string }>(req);
    const action = body?.action;
    if (action !== "verify" && action !== "set_primary" && action !== "remove") {
      throw createAppError({
        code: API_REQUEST_002,
        devMessage: `Invalid domain action ${String(action)} for domain ${params.domainId}`,
        severity: "warn",
        metadata: { projectId: params.id, domainId: params.domainId, action },
      });
    }

    const publishedSite = await updateProjectDomain(params.id, params.domainId, user.id, action);
    return NextResponse.json({ publishedSite });
  } catch (error) {
    return handleRouteError(error, requestId, DB_UPDATE_001);
  }
}
