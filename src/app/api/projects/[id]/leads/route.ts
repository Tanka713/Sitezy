import { NextRequest, NextResponse } from "next/server";
import { getProjectSnapshot } from "@/lib/server/project-db";
import {
  getProjectLeadSummary,
  listLeadSubmissionsForProject,
} from "@/lib/server/lead-capture";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  DB_READ_002,
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
        devMessage: `Unauthenticated request to list leads for project ${params.id}`,
        severity: "warn",
      });
    }

    const snapshot = await getProjectSnapshot(params.id, user.id);
    if (!snapshot) {
      throw createAppError({
        code: DB_READ_002,
        devMessage: `Lead list requested for missing project ${params.id}`,
        severity: "warn",
        metadata: { projectId: params.id, userId: user.id },
      });
    }

    const [summary, submissions] = await Promise.all([
      getProjectLeadSummary(params.id, user.id),
      listLeadSubmissionsForProject(params.id, user.id),
    ]);

    return NextResponse.json({ summary, submissions });
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}
