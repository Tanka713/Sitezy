import { derivePageStateFromHtml } from "@/lib/editor/structure";
import { resolveEffectiveProjectLeadCaptureSettings } from "@/lib/lead-capture";
import { resolveProjectPageSeo } from "@/lib/seo";
import { listCmsCollectionsForProject } from "@/lib/server/project-cms";
import { getProjectSnapshot } from "@/lib/server/project-db";
import { resolveProjectRuntimePage } from "@/lib/server/project-page-runtime";
import { readUserSettings } from "@/lib/server/user-settings";
import type { Project } from "@/types";
import { buildPublishedNavigationScript, rewriteInternalPublishedLinks } from "@/lib/published-site-routing";
import { buildPublishedPagePath } from "@/lib/publishing";
import { buildFullPageHtml, buildProjectPageNavigationLinks } from "@/lib/utils";
import type { ResolvedPublishedProject } from "@/lib/server/project-publishing";

function collectPublishedGlobalCss(project: Project): string {
  return Object.values(project.files)
    .filter((file) => file.type === "css" && file.content.trim())
    .map((file) => file.content)
    .join("\n\n");
}

export function buildPublishedNotFoundHtml(message: string) {
  return `<!doctype html><html><head><meta charset="utf-8" /><title>Site unavailable</title><style>html,body{height:100%;margin:0;background:#05070b;color:#dce3ef;font:14px/1.5 Inter,system-ui,sans-serif}body{display:flex;align-items:center;justify-content:center;padding:24px}.card{max-width:560px;border:1px solid rgba(255,255,255,0.08);border-radius:24px;background:rgba(255,255,255,0.03);padding:24px 26px}.eyebrow{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,0.38)}h1{margin:12px 0 8px;font-size:26px;line-height:1.1}p{margin:0;color:rgba(255,255,255,0.58)}</style></head><body><div class="card"><div class="eyebrow">Sitezy publish</div><h1>Site unavailable</h1><p>${message}</p></div></body></html>`;
}

export async function buildPublishedProjectHtml(
  resolved: ResolvedPublishedProject,
  pathname: string
): Promise<{ html: string; status: number }> {
  const project = resolved.project;
  const currentSnapshot = await getProjectSnapshot(project.id, resolved.ownerUserId, { admin: true });
  const ownerSettings = await readUserSettings(resolved.ownerUserId, { admin: true });
  const cmsCollections = (await listCmsCollectionsForProject(project.id, resolved.ownerUserId, { admin: true })).collections;
  const runtimePage = resolveProjectRuntimePage(project, pathname, cmsCollections);
  const activePage = runtimePage.page;

  if (!activePage) {
    return {
      html: buildPublishedNotFoundHtml("This published site does not have any pages yet."),
      status: 404,
    };
  }

  const normalized = derivePageStateFromHtml(
    rewriteInternalPublishedLinks(activePage.html, project.pages ?? []),
    activePage.sections
  );
  const effectiveSettings = resolveEffectiveProjectLeadCaptureSettings(
    currentSnapshot?.project.integrationSettings ?? project.integrationSettings,
    ownerSettings
  );
  const navigationLinks = buildProjectPageNavigationLinks(project.pages ?? [], (target) =>
    buildPublishedPagePath(target.slug || target.name)
  );

  return {
    html: buildFullPageHtml(
      normalized.html,
      project.blueprint ?? null,
      activePage.name,
      buildPublishedNavigationScript(),
      collectPublishedGlobalCss(project),
      resolveProjectPageSeo(project, activePage, resolved.site.liveUrl, runtimePage.seoOverrides),
      {
        mode: "published",
        projectId: null,
        contactCaptureEnabled: effectiveSettings.contactCapture === "sitezy",
        newsletterCaptureEnabled: effectiveSettings.newsletterCapture === "sitezy",
        submitEndpoint: "/api/leads/submit",
      },
      {
        projectId: project.id,
        endpoint: `/api/projects/${project.id}/analytics`,
        enableSitezyAnalytics: Boolean(ownerSettings.integrations.analytics.enableSitezyAnalytics),
        ga4MeasurementId:
          ownerSettings.integrations.analytics.ga4.enabled
            ? ownerSettings.integrations.analytics.ga4.measurementId
            : null,
        metaPixelId:
          ownerSettings.integrations.analytics.metaPixel.enabled
            ? ownerSettings.integrations.analytics.metaPixel.pixelId
            : null,
      },
      runtimePage.cmsRuntimeConfig,
      navigationLinks,
    ),
    status: 200,
  };
}
