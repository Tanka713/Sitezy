import { NextRequest, NextResponse } from "next/server";
import { deleteProject, getProjectSnapshot, saveProjectSnapshot } from "@/lib/server/project-db";
import { ensureProjectGenerationDaemon } from "@/lib/server/project-generation-daemon";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  API_REQUEST_002,
  AUTH_REQUIRED_001,
  DB_DELETE_001,
  DB_READ_001,
  DB_READ_002,
  DB_UPDATE_001,
  VALIDATION_PROJECT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";
import type { AIChatMessage, EditorState, Project } from "@/types";

export const runtime = "nodejs";

interface SavePayload {
  project: Project;
  editorState: EditorState;
  aiChats: AIChatMessage[];
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const requestId = _.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to load project ${params.id}`,
        severity: "warn",
      });
    }

    const snapshot = await getProjectSnapshot(params.id, user.id);
    if (!snapshot) {
      throw createAppError({
        code: DB_READ_002,
        devMessage: `Project ${params.id} not found for user ${user.id}`,
        severity: "warn",
        metadata: { projectId: params.id, userId: user.id },
      });
    }

    if (snapshot.project.generationJob?.status === "queued" || snapshot.project.generationJob?.status === "running") {
      ensureProjectGenerationDaemon();
    }

    return NextResponse.json(snapshot);
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to save project ${params.id}`,
        severity: "warn",
      });
    }

    const body = await parseRequestBody<Partial<SavePayload>>(req);
    if (!body.project || body.project.id !== params.id) {
      throw createAppError({
        code: VALIDATION_PROJECT_001,
        devMessage: `Invalid save payload for project ${params.id}`,
        severity: "warn",
        metadata: {
          routeProjectId: params.id,
          payloadProjectId: body.project?.id ?? null,
        },
      });
    }

    if (!body.editorState && !Array.isArray(body.aiChats)) {
      throw createAppError({
        code: API_REQUEST_002,
        devMessage: `Save request for project ${params.id} omitted editorState and aiChats payload fields`,
        severity: "warn",
      });
    }

    const snapshot = await saveProjectSnapshot({
      project: body.project,
      editorState: body.editorState ?? {
        selectedPageId: null,
        selectedFileId: null,
        selectedSectionId: null,
        selectedNode: null,
        isCanvasEditing: false,
        leftPanelTab: "pages",
        rightPanelTab: "ai",
        previewMode: "preview",
        devicePreview: "desktop",
        isFullPreview: false,
        leftSidebarOpen: true,
        rightSidebarOpen: true,
        leftPanelWidth: 220,
        rightPanelWidth: 280,
        visualEditMode: true,
        canvasZoom: 1,
        canvasPanX: 0,
        canvasPanY: 0,
        canvasGridVisible: false,
      },
      aiChats: Array.isArray(body.aiChats) ? body.aiChats : [],
    }, user.id);

    return NextResponse.json(snapshot);
  } catch (error) {
    return handleRouteError(error, requestId, DB_UPDATE_001);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const requestId = _.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to delete project ${params.id}`,
        severity: "warn",
      });
    }

    await deleteProject(params.id, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, requestId, DB_DELETE_001);
  }
}
