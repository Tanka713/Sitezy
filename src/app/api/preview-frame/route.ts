import { NextRequest, NextResponse } from "next/server";
import { listCmsCollectionsForProject } from "@/lib/server/project-cms";
import { getProjectSnapshot } from "@/lib/server/project-db";
import { buildPreviewPageRuntime } from "@/lib/server/project-page-runtime";
import { readUserSettings } from "@/lib/server/user-settings";
import { resolveEffectiveProjectLeadCaptureSettings } from "@/lib/lead-capture";
import { resolveProjectPageSeo } from "@/lib/seo";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { buildFullPageHtml, buildProjectPageNavigationLinks } from "@/lib/utils";
import type { CmsRuntimeConfig } from "@/lib/cms-runtime";
import type { ProjectPage } from "@/types";
import type { SiteBlueprint } from "@/types";

export const runtime = "nodejs";

function rewriteFrameCmsRuntimeConfig(
  config: CmsRuntimeConfig | null,
  projectId: string,
  page: ProjectPage
): CmsRuntimeConfig | null {
  if (!config?.detailPathTemplate) return config;
  const detailPageId = page.meta?.cmsBinding?.detailPageId || page.id;
  return {
    ...config,
    detailPathTemplate: `/preview/${projectId}?page=${encodeURIComponent(detailPageId)}&entry=:slug`,
  };
}

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

    const settings = await readUserSettings(user.id);
    const cmsCollections = (await listCmsCollectionsForProject(projectId, user.id)).collections;
    const previewRuntime = buildPreviewPageRuntime(snapshot.project, page, cmsCollections);
    const effectiveSettings = resolveEffectiveProjectLeadCaptureSettings(
      snapshot.project.integrationSettings,
      settings,
      user.email?.trim() ?? null
    );
    const navigationLinks = buildProjectPageNavigationLinks(snapshot.project.pages, (target) =>
      `/preview/${snapshot.project.id}?page=${encodeURIComponent(target.id)}`
    );
    const html = buildFullPageHtml(
      page.html,
      (snapshot.project.blueprint ?? null) as SiteBlueprint | null,
      page.name,
      "",
      "",
      resolveProjectPageSeo(snapshot.project, page, null, previewRuntime.seoOverrides),
      {
        mode: "preview",
        projectId: snapshot.project.id,
        contactCaptureEnabled: effectiveSettings.contactCapture === "sitezy",
        newsletterCaptureEnabled: effectiveSettings.newsletterCapture === "sitezy",
        submitEndpoint: "/api/leads/submit",
      },
      {
        projectId: snapshot.project.id,
        endpoint: `/api/projects/${snapshot.project.id}/analytics`,
        enableSitezyAnalytics: Boolean(settings.integrations.analytics.enableSitezyAnalytics),
        ga4MeasurementId:
          settings.integrations.analytics.ga4.enabled
            ? settings.integrations.analytics.ga4.measurementId
            : null,
          metaPixelId:
            settings.integrations.analytics.metaPixel.enabled
              ? settings.integrations.analytics.metaPixel.pixelId
              : null,
      },
      rewriteFrameCmsRuntimeConfig(previewRuntime.cmsRuntimeConfig, snapshot.project.id, page),
      navigationLinks,
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
