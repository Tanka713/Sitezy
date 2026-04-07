import { NextRequest, NextResponse } from "next/server";
import { resolvePublishedProjectByHostname } from "@/lib/server/project-publishing";
import { buildPublishedNotFoundHtml, buildPublishedProjectHtml } from "@/lib/server/published-site-render";

export const runtime = "nodejs";

function htmlResponse(html: string, status = 200) {
  return new NextResponse(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug?: string[] } }
) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const resolved = await resolvePublishedProjectByHostname(host);
  if (!resolved) {
    return htmlResponse(buildPublishedNotFoundHtml("That published site could not be found."), 404);
  }

  const pathname = params.slug?.length ? `/${params.slug.join("/")}` : "/";
  const result = buildPublishedProjectHtml(resolved, pathname);
  return htmlResponse(result.html, result.status);
}
