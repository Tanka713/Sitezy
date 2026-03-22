import { NextRequest, NextResponse } from "next/server";
import { createDraftProject, listProjects } from "@/lib/server/project-db";
import type { Project, SiteBrief } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ projects: listProjects() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const brief = body?.brief as SiteBrief | undefined;
    const project = body?.project as Project | undefined;

    if (!project && !brief) {
      return NextResponse.json({ error: "Missing project or brief" }, { status: 400 });
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "draft",
    };

    const snapshot = createDraftProject(draft);
    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
