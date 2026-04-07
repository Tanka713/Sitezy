import { NextRequest, NextResponse } from "next/server";
import { addProjectDomain } from "@/lib/server/project-publishing";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  API_REQUEST_002,
  AUTH_REQUIRED_001,
  DB_WRITE_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to add domain for project ${params.id}`,
        severity: "warn",
      });
    }

    const body = await parseRequestBody<{ hostname?: string }>(req);
    const hostname = String(body?.hostname ?? "").trim();
    if (!hostname) {
      throw createAppError({
        code: API_REQUEST_002,
        devMessage: `Missing hostname while adding domain for project ${params.id}`,
        severity: "warn",
        metadata: { projectId: params.id },
      });
    }

    const publishedSite = await addProjectDomain(params.id, user.id, hostname);
    return NextResponse.json({ publishedSite });
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}
