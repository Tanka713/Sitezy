import { NextRequest, NextResponse } from "next/server";
import { getProjectSnapshot, saveProjectSnapshot } from "@/lib/server/project-db";
import {
  readProjectDeploymentProject,
  republishProjectDeployment,
} from "@/lib/server/project-publishing";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  DB_READ_002,
  DB_UPDATE_001,
  VALIDATION_INPUT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; deploymentId: string } }
) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated deployment restore request for ${params.deploymentId}`,
        severity: "warn",
      });
    }

    const body = await parseRequestBody<{ mode?: "draft" | "republish" }>(req);
    const mode = body.mode ?? "draft";

    if (mode === "republish") {
      const publishedSite = await republishProjectDeployment(params.id, user.id, params.deploymentId);
      return NextResponse.json({ mode, publishedSite });
    }

    if (mode !== "draft") {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: `Unsupported deployment restore mode ${String(body.mode ?? "")}`,
        severity: "warn",
        metadata: { projectId: params.id, deploymentId: params.deploymentId, userId: user.id },
      });
    }

    const [currentSnapshot, deploymentProject] = await Promise.all([
      getProjectSnapshot(params.id, user.id),
      readProjectDeploymentProject(params.id, user.id, params.deploymentId),
    ]);

    if (!currentSnapshot) {
      throw createAppError({
        code: DB_READ_002,
        devMessage: `Project ${params.id} not found while restoring deployment ${params.deploymentId}`,
        severity: "warn",
        metadata: { projectId: params.id, deploymentId: params.deploymentId, userId: user.id },
      });
    }

    const restoredSnapshot = await saveProjectSnapshot(
      {
        project: {
          ...deploymentProject,
          updatedAt: new Date().toISOString(),
        },
        editorState: currentSnapshot.editorState,
        aiChats: currentSnapshot.aiChats,
      },
      user.id
    );

    return NextResponse.json({ mode, snapshot: restoredSnapshot });
  } catch (error) {
    return handleRouteError(error, requestId, DB_UPDATE_001);
  }
}
