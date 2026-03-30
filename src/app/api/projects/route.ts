import { NextRequest, NextResponse } from "next/server";
import { createDraftProject, listProjects } from "@/lib/server/project-db";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  API_REQUEST_002,
  AUTH_REQUIRED_001,
  DB_READ_001,
  DB_WRITE_001,
  VALIDATION_PROJECT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";
import type { Project, SiteBrief } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated request to list projects",
        severity: "warn",
      });
    }

    return NextResponse.json({ projects: await listProjects(user.id) });
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated request to create a project",
        severity: "warn",
      });
    }

    const body = await parseRequestBody<{
      brief?: SiteBrief;
      project?: Project;
    }>(req);
    const brief = body?.brief as SiteBrief | undefined;
    const project = body?.project as Project | undefined;

    if (!project && !brief) {
      throw createAppError({
        code: API_REQUEST_002,
        devMessage: "Create project request missing both project and brief",
        severity: "warn",
      });
    }

    if (project && !project.id) {
      throw createAppError({
        code: VALIDATION_PROJECT_001,
        devMessage: "Create project request included an invalid project without an id",
        severity: "warn",
      });
    }

    const draft: Project = project ?? {
      id: crypto.randomUUID(),
      name: brief?.siteName?.trim() || "Untitled Project",
      brief: brief ?? {
        siteName: "",
        description: "",
        siteType: "",
        tone: "Professional",
        pages: [],
        features: "",
      },
      blueprint: null,
      pages: [],
      files: {},
      media: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "draft",
    };

    const snapshot = await createDraftProject(draft, user.id);
    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}
