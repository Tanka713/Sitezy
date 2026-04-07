import { NextRequest, NextResponse } from "next/server";
import { getProjectSnapshot } from "@/lib/server/project-db";
import { getPublishedSiteForProject, publishProjectSnapshot } from "@/lib/server/project-publishing";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  DB_READ_002,
  DB_WRITE_001,
  createAppError,
  handleRouteError,
} from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to read publish state for project ${params.id}`,
        severity: "warn",
      });
    }

    const publishedSite = await getPublishedSiteForProject(params.id, user.id);
    return NextResponse.json({ publishedSite });
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to publish project ${params.id}`,
        severity: "warn",
      });
    }

    const snapshot = await getProjectSnapshot(params.id, user.id);
    if (!snapshot) {
      throw createAppError({
        code: DB_READ_002,
        devMessage: `Publish requested for missing project ${params.id}`,
        severity: "warn",
        metadata: { projectId: params.id, userId: user.id },
      });
    }

    const publishedSite = await publishProjectSnapshot(snapshot, user.id);
    return NextResponse.json({ publishedSite });
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}
