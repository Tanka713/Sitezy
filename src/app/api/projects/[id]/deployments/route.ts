import { NextRequest, NextResponse } from "next/server";
import { listProjectDeployments } from "@/lib/server/project-publishing";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
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
        devMessage: `Unauthenticated request to list deployments for project ${params.id}`,
        severity: "warn",
      });
    }

    const deployments = await listProjectDeployments(params.id, user.id);
    return NextResponse.json({ deployments });
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}
