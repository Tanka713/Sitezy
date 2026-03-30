import { NextRequest, NextResponse } from "next/server";
import { getProjectSnapshot } from "@/lib/server/project-db";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { buildFullPageHtml } from "@/lib/utils";
import type { SiteBlueprint } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const projectId = searchParams.get("projectId");
  const pageId = searchParams.get("pageId");

  if (!projectId) {
    return new NextResponse("Missing projectId", { status: 400 });
  }

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const snapshot = await getProjectSnapshot(projectId, user.id);
    if (!snapshot) {
      return new NextResponse("Project not found", { status: 404 });
    }

    const page = pageId
      ? snapshot.project.pages.find((p) => p.id === pageId)
      : snapshot.project.pages[0];

    if (!page) {
      return new NextResponse("Page not found", { status: 404 });
    }

    const html = buildFullPageHtml(
      page.html,
      (snapshot.project.blueprint ?? null) as SiteBlueprint | null,
      page.name
    );

    return new NextResponse(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store, max-age=0",
        "x-frame-options": "SAMEORIGIN",
      },
    });
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
