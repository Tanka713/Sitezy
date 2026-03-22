import { NextRequest, NextResponse } from "next/server";
import { deleteProject, getProjectSnapshot, saveProjectSnapshot } from "@/lib/server/project-db";
import type { AIChatMessage, EditorState, Project } from "@/types";

export const runtime = "nodejs";

interface SavePayload {
  project: Project;
  editorState: EditorState;
  aiChats: AIChatMessage[];
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const snapshot = getProjectSnapshot(params.id);
    if (!snapshot) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as Partial<SavePayload>;
    if (!body.project || body.project.id !== params.id) {
      return NextResponse.json({ error: "Invalid project payload" }, { status: 400 });
    }

    const snapshot = saveProjectSnapshot({
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
      },
      aiChats: Array.isArray(body.aiChats) ? body.aiChats : [],
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    deleteProject(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
