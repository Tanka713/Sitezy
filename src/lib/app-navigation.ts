export function isSafeAppHref(value: string | null | undefined): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return Boolean(trimmed) && trimmed.startsWith("/") && !trimmed.startsWith("//");
}

export function resolveAppReturnHref(value: string | null | undefined, fallback: string): string {
  return isSafeAppHref(value) ? value.trim() : fallback;
}

export function buildSettingsHref(returnTo?: string | null): string {
  const params = new URLSearchParams();
  if (isSafeAppHref(returnTo)) {
    params.set("returnTo", returnTo.trim());
  }
  const query = params.toString();
  return query ? `/settings?${query}` : "/settings";
}

export function buildStudioEditorHref(projectId: string | null | undefined): string {
  const normalizedProjectId = typeof projectId === "string" ? projectId.trim() : "";
  if (!normalizedProjectId) return "/studio";
  const params = new URLSearchParams({ projectId: normalizedProjectId });
  return `/studio?${params.toString()}`;
}

export function buildStudioWorkspaceHref(): string {
  const params = new URLSearchParams({ surface: "workspace" });
  return `/studio?${params.toString()}`;
}

export function buildStudioLeadsHref(projectId: string, returnTo?: string | null): string {
  const normalizedProjectId = projectId.trim();
  const params = new URLSearchParams();
  if (isSafeAppHref(returnTo)) {
    params.set("returnTo", returnTo.trim());
  }
  const query = params.toString();
  return query ? `/studio/leads/${normalizedProjectId}?${query}` : `/studio/leads/${normalizedProjectId}`;
}

export function buildStudioCmsHref(projectId: string, returnTo?: string | null): string {
  const normalizedProjectId = projectId.trim();
  const params = new URLSearchParams();
  if (isSafeAppHref(returnTo)) {
    params.set("returnTo", returnTo.trim());
  }
  const query = params.toString();
  return query ? `/studio/cms/${normalizedProjectId}?${query}` : `/studio/cms/${normalizedProjectId}`;
}

export function buildSupportHref(topic?: string | null): string {
  const normalizedTopic = typeof topic === "string" ? topic.trim() : "";
  if (!normalizedTopic) return "/support";
  const params = new URLSearchParams({ topic: normalizedTopic });
  return `/support?${params.toString()}`;
}

export function buildSupportInboxHref(): string {
  return "/support/inbox";
}

export function getAppReturnLabel(href: string, fallback = "Back"): string {
  const normalizedHref = href.trim();

  if (normalizedHref.startsWith("/studio/leads/")) return "Leads";
  if (normalizedHref.startsWith("/studio/cms/")) return "CMS";
  if (normalizedHref.startsWith("/admin")) return "Admin";
  if (normalizedHref.startsWith("/customer-service")) return "Customer Service";
  if (normalizedHref.startsWith("/settings")) return "Settings";

  if (normalizedHref.startsWith("/studio")) {
    const queryIndex = normalizedHref.indexOf("?");
    if (queryIndex >= 0) {
      const params = new URLSearchParams(normalizedHref.slice(queryIndex + 1));
      if (params.get("projectId")?.trim()) {
        return "Editor";
      }
    }
    return "Workspace";
  }

  return fallback;
}
