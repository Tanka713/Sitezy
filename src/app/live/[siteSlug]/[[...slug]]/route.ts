import { NextRequest, NextResponse } from "next/server";
import { resolvePublishedProjectBySubdomain } from "@/lib/server/project-publishing";
import { buildPublishedNotFoundHtml, buildPublishedProjectHtml } from "@/lib/server/published-site-render";

export const runtime = "nodejs";

function htmlResponse(html: string, status = 200) {
  return new NextResponse(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { siteSlug: string; slug?: string[] } }
) {
  const resolved = await resolvePublishedProjectBySubdomain(params.siteSlug);
  if (!resolved) {
    return htmlResponse(buildPublishedNotFoundHtml("That published site could not be found."), 404);
  }

  const pathname = params.slug?.length ? `/${params.slug.join("/")}` : "/";
  const result = await buildPublishedProjectHtml(resolved, pathname);
  return htmlResponse(result.html, result.status);
}
