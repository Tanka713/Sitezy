import { NextRequest, NextResponse } from "next/server";
import {
  enqueueFullSiteGenerationJob,
  getActiveGenerationJobForProject,
} from "@/lib/server/project-generation-jobs";
import { getProjectSnapshot, saveProjectSnapshot } from "@/lib/server/project-db";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  API_REQUEST_002,
  AUTH_REQUIRED_001,
  DB_READ_001,
  DB_READ_002,
  DB_WRITE_001,
  VALIDATION_PROJECT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";
import type { SiteBrief } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to enqueue generation for project ${params.id}`,
        severity: "warn",
      });
    }

    const body = await parseRequestBody<{ brief?: SiteBrief }>(req);
    if (!body.brief) {
      throw createAppError({
        code: API_REQUEST_002,
        devMessage: `Generation enqueue request for project ${params.id} omitted brief`,
        severity: "warn",
        metadata: { projectId: params.id },
      });
    }

    const snapshot = await getProjectSnapshot(params.id, user.id);
    if (!snapshot) {
      throw createAppError({
        code: DB_READ_002,
        devMessage: `Project ${params.id} not found for enqueue request by user ${user.id}`,
        severity: "warn",
        metadata: { projectId: params.id, userId: user.id },
      });
    }

    if (snapshot.project.id !== params.id) {
      throw createAppError({
        code: VALIDATION_PROJECT_001,
        devMessage: `Generation enqueue route/project mismatch for ${params.id}`,
        severity: "warn",
        metadata: {
          routeProjectId: params.id,
          snapshotProjectId: snapshot.project.id,
          userId: user.id,
        },
      });
    }

    const existingJob = await getActiveGenerationJobForProject(params.id);
    if (existingJob) {
      return NextResponse.json({ job: existingJob });
    }

    const now = new Date().toISOString();
    await saveProjectSnapshot(
      {
        project: {
          ...snapshot.project,
          brief: body.brief,
          blueprint: null,
          pages: [],
          files: {},
          status: "generating",
          updatedAt: now,
          generationJob: null,
        },
        editorState: snapshot.editorState,
        aiChats: snapshot.aiChats,
      },
      user.id
    );

    const job = await enqueueFullSiteGenerationJob(params.id, user.id, body.brief);
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to read generation job for project ${params.id}`,
        severity: "warn",
      });
    }

    const snapshot = await getProjectSnapshot(params.id, user.id);
    if (!snapshot) {
      throw createAppError({
        code: DB_READ_002,
        devMessage: `Project ${params.id} not found for generation job read by user ${user.id}`,
        severity: "warn",
        metadata: { projectId: params.id, userId: user.id },
      });
    }

    return NextResponse.json({ job: snapshot.project.generationJob ?? null });
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}
