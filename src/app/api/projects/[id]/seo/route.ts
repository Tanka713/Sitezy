import { NextRequest, NextResponse } from "next/server";
import { normalizeProjectSeo } from "@/lib/seo";
import { getProjectSnapshot, saveProjectSnapshot } from "@/lib/server/project-db";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  API_REQUEST_002,
  AUTH_REQUIRED_001,
  DB_READ_001,
  DB_READ_002,
  DB_UPDATE_001,
  VALIDATION_PROJECT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";
import type { ProjectSeoSettings } from "@/types";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to update SEO for project ${params.id}`,
        severity: "warn",
      });
    }

    const body = await parseRequestBody<{ seo?: Partial<ProjectSeoSettings> }>(req);
    if (!body.seo || typeof body.seo !== "object") {
      throw createAppError({
        code: API_REQUEST_002,
        devMessage: `Project SEO update for ${params.id} omitted seo payload`,
        severity: "warn",
      });
    }

    const snapshot = await getProjectSnapshot(params.id, user.id);
    if (!snapshot) {
      throw createAppError({
        code: DB_READ_002,
        devMessage: `Project ${params.id} not found for SEO update`,
        severity: "warn",
        metadata: { projectId: params.id, userId: user.id },
      });
    }

    if (snapshot.project.id !== params.id) {
      throw createAppError({
        code: VALIDATION_PROJECT_001,
        devMessage: `SEO update attempted to patch mismatched project ${params.id}`,
        severity: "warn",
      });
    }

    const nextProject = {
      ...snapshot.project,
      seo: normalizeProjectSeo(
        {
          ...snapshot.project.seo,
          ...body.seo,
        },
        snapshot.project
      ),
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveProjectSnapshot(
      {
        ...snapshot,
        project: nextProject,
      },
      user.id
    );

    return NextResponse.json({ project: saved.project });
  } catch (error) {
    return handleRouteError(error, requestId, DB_UPDATE_001);
  }
}
