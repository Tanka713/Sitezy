import { derivePageStateFromHtml } from "@/lib/editor/structure";
import { resolveProjectPageSeo } from "@/lib/seo";
import type { Project } from "@/types";
import { buildPublishedNavigationScript, resolvePublishedPage, rewriteInternalPublishedLinks } from "@/lib/published-site-routing";
import { buildFullPageHtml } from "@/lib/utils";
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

export function buildPublishedProjectHtml(
  resolved: ResolvedPublishedProject,
  pathname: string
): { html: string; status: number } {
  const project = resolved.project;
  const activePage = resolvePublishedPage(project.pages ?? [], pathname);

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

  return {
    html: buildFullPageHtml(
      normalized.html,
      project.blueprint ?? null,
      activePage.name,
      buildPublishedNavigationScript(),
      collectPublishedGlobalCss(project),
      resolveProjectPageSeo(project, activePage, resolved.site.liveUrl)
    ),
    status: 200,
  };
}
