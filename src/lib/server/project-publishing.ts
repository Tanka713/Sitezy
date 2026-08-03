import type {
  Project,
  ProjectDeployment,
  ProjectDeploymentStatus,
  ProjectDomain,
  ProjectDomainStatus,
  ProjectPage,
  ProjectPublishStatus,
  ProjectSnapshot,
  PublishedSite,
} from "@/types";
import { normalizeProjectIntegrationSettings } from "@/lib/lead-capture";
import { normalizeProjectPageMeta } from "@/lib/project-pages";
import { normalizeProjectSeo } from "@/lib/seo";
import {
  buildLocalPublishedPath,
  buildSitezyHostname,
  buildSitezyPublishedUrl,
  extractSitezySubdomain,
  getPublishDomain,
  normalizeHostname,
  slugifySiteToken,
} from "@/lib/publishing";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  API_REQUEST_002,
  AUTH_PERMISSION_001,
  DB_READ_001,
  DB_READ_002,
  DB_SCHEMA_001,
  DB_WRITE_001,
  DB_WRITE_002,
  DB_UPDATE_001,
  NETWORK_DNS_001,
  VALIDATION_INPUT_001,
  VALIDATION_DOMAIN_001,
  VALIDATION_PROJECT_001,
  createAppError,
  isAppError,
} from "@/lib/errors";

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

type PublishedSiteRow = {
  id: string;
  project_id: string;
  user_id: string;
  subdomain: string;
  status: string;
  active_deployment_id: string | null;
  last_published_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProjectDeploymentRow = {
  id: string;
  published_site_id: string;
  project_id: string;
  user_id: string;
  version_number: number;
  status: string;
  published_url: string;
  page_count: number;
  source_deployment_id?: string | null;
  project_json?: unknown;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProjectDomainRow = {
  id: string;
  published_site_id: string;
  project_id: string;
  user_id: string;
  hostname: string;
  status: string;
  is_primary: boolean;
  verification_token: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

type DbClient = ReturnType<typeof getSupabaseServerClient>;
type DbClientOptions = { admin?: boolean };

const CONSTRAINT_CODES = new Set(["23502", "23503", "23505", "23514"]);
const DNS_LOOKUP_TIMEOUT_MS = 7000;
const DNS_JSON_ENDPOINTS = [
  "https://dns.google/resolve",
  "https://cloudflare-dns.com/dns-query",
];

function getPublishingDbClient(options?: DbClientOptions) {
  return options?.admin ? getSupabaseAdminClient() : getSupabaseServerClient();
}

function buildPublishingDbError(
  error: unknown,
  fallbackCode: typeof DB_READ_001 | typeof DB_WRITE_001 | typeof DB_UPDATE_001,
  devMessage: string,
  metadata?: Record<string, unknown>
) {
  const maybe = (error ?? {}) as SupabaseErrorLike;
  const schemaMissing =
    maybe.code === "42P01" ||
    maybe.code === "PGRST202" ||
    maybe.code === "PGRST205" ||
    maybe.message?.includes("published_sites") ||
    maybe.message?.includes("project_deployments") ||
    maybe.message?.includes("project_domains");

  return createAppError({
    code: schemaMissing
      ? DB_SCHEMA_001
      : typeof maybe.code === "string" && CONSTRAINT_CODES.has(maybe.code)
      ? DB_WRITE_002
      : fallbackCode,
    devMessage,
    severity: "error",
    metadata: {
      ...metadata,
      ...(maybe.code ? { dbCode: maybe.code } : {}),
      ...(maybe.details ? { dbDetails: maybe.details } : {}),
      ...(maybe.hint ? { dbHint: maybe.hint } : {}),
    },
    cause: error,
  });
}

function normalizePublishStatus(value: string | null | undefined): ProjectPublishStatus {
  return value === "publishing" || value === "published" || value === "failed" ? value : "unpublished";
}

function normalizeDeploymentStatus(value: string | null | undefined): ProjectDeploymentStatus {
  return value === "publishing" || value === "failed" ? value : "published";
}

function normalizeDomainStatus(value: string | null | undefined): ProjectDomainStatus {
  return value === "verifying" || value === "active" || value === "failed" ? value : "pending";
}

function normalizeStoredPage(input: unknown, index: number): ProjectPage {
  const raw = typeof input === "object" && input ? (input as Partial<ProjectPage>) : {};
  return {
    id: String(raw.id ?? `page-${index + 1}`),
    name: String(raw.name ?? `Page ${index + 1}`),
    slug: String(raw.slug ?? ""),
    sections: Array.isArray(raw.sections) ? raw.sections : [],
    purpose: String(raw.purpose ?? ""),
    html: String(raw.html ?? ""),
    status:
      raw.status === "generating" || raw.status === "done" || raw.status === "error"
        ? raw.status
        : "pending",
    error: typeof raw.error === "string" ? raw.error : undefined,
    revision: typeof raw.revision === "number" && Number.isFinite(raw.revision) ? Math.max(1, Math.trunc(raw.revision)) : 1,
    meta: normalizeProjectPageMeta(raw.meta, raw),
  };
}

function normalizeStoredProject(input: unknown): Project {
  const raw = typeof input === "object" && input ? (input as Partial<Project>) : {};
  return {
    id: String(raw.id ?? crypto.randomUUID()),
    name: String(raw.name ?? "Untitled Project"),
    brief:
      raw.brief && typeof raw.brief === "object"
        ? raw.brief
        : {
            siteName: "",
            description: "",
            siteType: "",
            tone: "Professional",
            pages: [],
            features: "",
    },
    blueprint: raw.blueprint ?? null,
    seo: normalizeProjectSeo(raw.seo, raw),
    integrationSettings: normalizeProjectIntegrationSettings(raw.integrationSettings),
    pages: Array.isArray(raw.pages) ? raw.pages.map(normalizeStoredPage) : [],
    files: raw.files && typeof raw.files === "object" ? raw.files : {},
    media: Array.isArray(raw.media) ? raw.media : [],
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
    status:
      raw.status === "generating" || raw.status === "ready" || raw.status === "error"
        ? raw.status
        : "draft",
    generationJob: null,
    publishedSite: null,
  };
}

function sanitizeDeploymentProject(project: Project): Project {
  return {
    ...normalizeStoredProject(project),
    generationJob: null,
    publishedSite: null,
  };
}

function mapProjectDomain(row: ProjectDomainRow): ProjectDomain {
  return {
    id: row.id,
    publishedSiteId: row.published_site_id,
    projectId: row.project_id,
    hostname: normalizeHostname(row.hostname),
    status: normalizeDomainStatus(row.status),
    isPrimary: row.is_primary,
    verificationToken: row.verification_token,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProjectDeployment(row: ProjectDeploymentRow): ProjectDeployment {
  return {
    id: row.id,
    publishedSiteId: row.published_site_id,
    projectId: row.project_id,
    versionNumber: row.version_number,
    status: normalizeDeploymentStatus(row.status),
    publishedUrl: row.published_url,
    pageCount: row.page_count,
    sourceDeploymentId: row.source_deployment_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function getLatestPublishedDeployment(deployments: ProjectDeployment[]): ProjectDeployment | null {
  return deployments.find((deployment) => deployment.status === "published") ?? null;
}

function buildPublishedSiteModel(
  siteRow: PublishedSiteRow,
  deployments: ProjectDeployment[],
  domains: ProjectDomain[]
): PublishedSite {
  const currentDeployment =
    deployments.find((deployment) => deployment.id === siteRow.active_deployment_id) ??
    getLatestPublishedDeployment(deployments) ??
    deployments[0] ??
    null;
  const primaryActiveDomain =
    domains.find((domain) => domain.isPrimary && domain.status === "active") ??
    domains.find((domain) => domain.status === "active") ??
    null;
  const siteUrl = buildSitezyPublishedUrl(siteRow.subdomain);
  const liveUrl = primaryActiveDomain ? `https://${primaryActiveDomain.hostname}` : siteUrl;

  return {
    id: siteRow.id,
    projectId: siteRow.project_id,
    subdomain: siteRow.subdomain,
    status: normalizePublishStatus(siteRow.status),
    siteUrl,
    internalUrl: buildLocalPublishedPath(siteRow.subdomain),
    liveUrl,
    primaryDomain: primaryActiveDomain?.hostname ?? null,
    activeDeploymentId: siteRow.active_deployment_id,
    deploymentCount: deployments.length,
    lastPublishedAt: siteRow.last_published_at,
    currentDeployment,
    domains,
    createdAt: siteRow.created_at,
    updatedAt: siteRow.updated_at,
  };
}

async function loadPublishRowsForProjects(
  client: DbClient,
  projectIds: string[],
  userId: string,
  options?: DbClientOptions
) {
  if (!projectIds.length) {
    return {
      sites: [] as PublishedSiteRow[],
      deployments: [] as ProjectDeploymentRow[],
      domains: [] as ProjectDomainRow[],
    };
  }

  const siteQuery = client
    .from("published_sites")
    .select("*")
    .in("project_id", projectIds);
  if (!options?.admin) {
    siteQuery.eq("user_id", userId);
  }

  const { data: siteRows, error: siteError } = await siteQuery;
  if (siteError) {
    throw buildPublishingDbError(siteError, DB_READ_001, "Failed to load publish sites for projects", {
      projectIds,
      userId,
    });
  }

  const sites = (siteRows ?? []) as PublishedSiteRow[];
  if (!sites.length) {
    return {
      sites: [],
      deployments: [],
      domains: [],
    };
  }

  const siteIds = sites.map((site) => site.id);

  const deploymentQuery = client
    .from("project_deployments")
    .select("id, published_site_id, project_id, user_id, version_number, status, published_url, page_count, published_at, created_at, updated_at")
    .in("published_site_id", siteIds)
    .order("version_number", { ascending: false });
  const domainQuery = client
    .from("project_domains")
    .select("*")
    .in("published_site_id", siteIds)
    .order("created_at", { ascending: true });

  if (!options?.admin) {
    deploymentQuery.eq("user_id", userId);
    domainQuery.eq("user_id", userId);
  }

  const [{ data: deploymentRows, error: deploymentError }, { data: domainRows, error: domainError }] =
    await Promise.all([deploymentQuery, domainQuery]);

  if (deploymentError) {
    throw buildPublishingDbError(deploymentError, DB_READ_001, "Failed to load project deployments", {
      projectIds,
      siteIds,
      userId,
    });
  }
  if (domainError) {
    throw buildPublishingDbError(domainError, DB_READ_001, "Failed to load project domains", {
      projectIds,
      siteIds,
      userId,
    });
  }

  return {
    sites,
    deployments: (deploymentRows ?? []) as ProjectDeploymentRow[],
    domains: (domainRows ?? []) as ProjectDomainRow[],
  };
}

async function loadPublishedSiteRowByProjectId(
  client: DbClient,
  projectId: string,
  userId: string,
  options?: DbClientOptions
): Promise<PublishedSiteRow | null> {
  const query = client.from("published_sites").select("*").eq("project_id", projectId).limit(1);
  if (!options?.admin) {
    query.eq("user_id", userId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) {
    throw buildPublishingDbError(error, DB_READ_001, `Failed to load publish site for project ${projectId}`, {
      projectId,
      userId,
    });
  }
  return (data as PublishedSiteRow | null) ?? null;
}

async function ensureProjectOwnership(
  client: DbClient,
  projectId: string,
  userId: string,
  options?: DbClientOptions
) {
  const query = client.from("projects").select("id, user_id").eq("id", projectId).limit(1);
  if (!options?.admin) {
    query.eq("user_id", userId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) {
    throw buildPublishingDbError(error, DB_READ_001, `Failed to confirm project ownership for ${projectId}`, {
      projectId,
      userId,
    });
  }
  if (!data) {
    throw createAppError({
      code: DB_READ_002,
      devMessage: `Project ${projectId} does not exist for publish/domain action`,
      severity: "warn",
      metadata: { projectId, userId },
    });
  }
}

async function buildPublishedSiteFromRow(
  client: DbClient,
  siteRow: PublishedSiteRow,
  userId: string,
  options?: DbClientOptions
): Promise<PublishedSite> {
  const { deployments, domains } = await loadPublishRowsForProjects(client, [siteRow.project_id], userId, options);
  return buildPublishedSiteModel(
    siteRow,
    deployments.filter((deployment) => deployment.project_id === siteRow.project_id).map(mapProjectDeployment),
    domains.filter((domain) => domain.project_id === siteRow.project_id).map(mapProjectDomain)
  );
}

async function generateAvailableSubdomain(
  client: DbClient,
  candidate: string
): Promise<string> {
  const base = slugifySiteToken(candidate, "site");
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const next = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data, error } = await client
      .from("published_sites")
      .select("id")
      .eq("subdomain", next)
      .limit(1)
      .maybeSingle();
    if (error) {
      throw buildPublishingDbError(error, DB_READ_001, `Failed to check subdomain availability for ${next}`, {
        candidate: next,
      });
    }
    if (!data) return next;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function validateCustomHostname(hostname: string): string {
  const normalized = normalizeHostname(hostname);
  const publishDomain = getPublishDomain();

  if (!normalized || !normalized.includes(".")) {
    throw createAppError({
      code: VALIDATION_DOMAIN_001,
      devMessage: `Invalid custom hostname: ${hostname}`,
      userMessage: "Enter a valid domain like studio.example.com.",
      severity: "warn",
      metadata: { hostname },
    });
  }

  if (
    normalized === publishDomain ||
    normalized.endsWith(`.${publishDomain}`) ||
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized.endsWith(".vercel.app")
  ) {
    throw createAppError({
      code: VALIDATION_DOMAIN_001,
      devMessage: `Rejected reserved custom hostname: ${normalized}`,
      userMessage: `Use your own domain instead of ${publishDomain}.`,
      severity: "warn",
      metadata: { hostname: normalized },
    });
  }

  return normalized;
}

function normalizeDnsValue(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/\.$/, "")
    .toLowerCase();
}

async function lookupDnsAnswers(hostname: string, type: "CNAME"): Promise<string[]> {
  let lastError: unknown = null;

  for (const endpoint of DNS_JSON_ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DNS_LOOKUP_TIMEOUT_MS);

    try {
      const url = new URL(endpoint);
      url.searchParams.set("name", hostname);
      url.searchParams.set("type", type);

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { accept: "application/dns-json" },
        cache: "no-store",
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`DNS lookup failed with ${res.status}`);
      }

      const payload = (await res.json()) as {
        Status?: number;
        Answer?: Array<{ data?: string | null }>;
      };

      if (!Array.isArray(payload.Answer)) {
        return [];
      }

      return payload.Answer.map((answer) => normalizeDnsValue(answer.data)).filter(Boolean);
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }

  throw createAppError({
    code: NETWORK_DNS_001,
    devMessage: `DNS lookup failed for ${hostname}`,
    userMessage: "We couldn't reach DNS verification right now. Please try again.",
    severity: "error",
    metadata: { hostname, recordType: type },
    cause: lastError,
  });
}

async function verifyCustomHostnameConnection(hostname: string, expectedTarget: string) {
  const answers = await lookupDnsAnswers(hostname, "CNAME");
  const normalizedTarget = normalizeDnsValue(expectedTarget);

  if (!answers.length) {
    return {
      verified: false,
      userMessage: `No CNAME record was found for ${hostname}. Point it to ${expectedTarget} and try again.`,
    };
  }

  if (answers.some((answer) => answer === normalizedTarget)) {
    return { verified: true as const, answers };
  }

  return {
    verified: false,
    userMessage: `${hostname} is pointing to ${answers[0]}. Update the CNAME to ${expectedTarget} and retry.`,
    answers,
  };
}

export async function listPublishedSitesForProjects(
  projectIds: string[],
  userId: string,
  options?: DbClientOptions
): Promise<Map<string, PublishedSite>> {
  const client = getPublishingDbClient(options);
  const { sites, deployments, domains } = await loadPublishRowsForProjects(client, projectIds, userId, options);
  const deploymentMap = new Map<string, ProjectDeployment[]>();
  const domainMap = new Map<string, ProjectDomain[]>();

  for (const deploymentRow of deployments) {
    const list = deploymentMap.get(deploymentRow.project_id) ?? [];
    list.push(mapProjectDeployment(deploymentRow));
    deploymentMap.set(deploymentRow.project_id, list);
  }

  for (const domainRow of domains) {
    const list = domainMap.get(domainRow.project_id) ?? [];
    list.push(mapProjectDomain(domainRow));
    domainMap.set(domainRow.project_id, list);
  }

  return new Map(
    sites.map((site) => [
      site.project_id,
      buildPublishedSiteModel(site, deploymentMap.get(site.project_id) ?? [], domainMap.get(site.project_id) ?? []),
    ])
  );
}

export async function getPublishedSiteForProject(
  projectId: string,
  userId: string,
  options?: DbClientOptions
): Promise<PublishedSite | null> {
  const result = await listPublishedSitesForProjects([projectId], userId, options);
  return result.get(projectId) ?? null;
}

async function publishSanitizedProject(
  project: Project,
  userId: string,
  options?: DbClientOptions & { sourceDeploymentId?: string | null }
): Promise<PublishedSite> {
  const client = getPublishingDbClient(options);

  if (project.status === "generating") {
    throw createAppError({
      code: VALIDATION_PROJECT_001,
      devMessage: `Project ${project.id} cannot be published while generating`,
      userMessage: "Wait for generation to finish before publishing.",
      severity: "warn",
      metadata: { projectId: project.id },
    });
  }

  if (!project.pages.some((page) => page.status === "done" && page.html.trim())) {
    throw createAppError({
      code: VALIDATION_PROJECT_001,
      devMessage: `Project ${project.id} cannot be published without a completed page`,
      userMessage: "This project needs at least one completed page before it can go live.",
      severity: "warn",
      metadata: { projectId: project.id },
    });
  }

  await ensureProjectOwnership(client, project.id, userId, options);

  const existingSite = await loadPublishedSiteRowByProjectId(client, project.id, userId, options);
  const siteId = existingSite?.id ?? crypto.randomUUID();
  const subdomain =
    existingSite?.subdomain ??
    (await generateAvailableSubdomain(client, project.brief.siteName || project.name || project.blueprint?.siteName || "site"));
  const now = new Date().toISOString();
  const previousActiveDeploymentId = existingSite?.active_deployment_id ?? null;
  const previousLastPublishedAt = existingSite?.last_published_at ?? null;
  let nextDeploymentId: string | null = null;

  try {
    if (existingSite) {
      const { error: updateSiteError } = await client
        .from("published_sites")
        .update({
          status: "publishing",
          updated_at: now,
        })
        .eq("id", existingSite.id);
      if (updateSiteError) {
        throw updateSiteError;
      }
    } else {
      const { error: insertSiteError } = await client.from("published_sites").insert({
        id: siteId,
        project_id: project.id,
        user_id: userId,
        subdomain,
        status: "publishing",
        active_deployment_id: null,
        last_published_at: null,
        created_at: now,
        updated_at: now,
      });
      if (insertSiteError) {
        throw insertSiteError;
      }
    }

    const { data: latestDeployment, error: latestDeploymentError } = await client
      .from("project_deployments")
      .select("version_number")
      .eq("published_site_id", siteId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestDeploymentError) {
      throw latestDeploymentError;
    }

    const nextVersion = ((latestDeployment as { version_number?: number } | null)?.version_number ?? 0) + 1;
    const deploymentId = crypto.randomUUID();
    nextDeploymentId = deploymentId;
    const publishedUrl = buildSitezyPublishedUrl(subdomain);

    const { error: insertDeploymentError } = await client.from("project_deployments").insert({
      id: deploymentId,
      published_site_id: siteId,
      project_id: project.id,
      user_id: userId,
      version_number: nextVersion,
      status: "publishing",
      published_url: publishedUrl,
      page_count: project.pages.length,
      source_deployment_id: options?.sourceDeploymentId ?? null,
      project_json: project,
      published_at: null,
      created_at: now,
      updated_at: now,
    });

    if (insertDeploymentError) {
      throw insertDeploymentError;
    }

    const { error: finalizeSiteError } = await client
      .from("published_sites")
      .update({
        status: "published",
        active_deployment_id: deploymentId,
        last_published_at: now,
        updated_at: now,
      })
      .eq("id", siteId);

    if (finalizeSiteError) {
      throw finalizeSiteError;
    }

    const { error: finalizeDeploymentError } = await client
      .from("project_deployments")
      .update({
        status: "published",
        published_at: now,
        updated_at: now,
      })
      .eq("id", deploymentId);

    if (finalizeDeploymentError) {
      throw finalizeDeploymentError;
    }
  } catch (error) {
    try {
      const failureTime = new Date().toISOString();

      if (nextDeploymentId) {
        await client
          .from("project_deployments")
          .update({
            status: "failed",
            updated_at: failureTime,
          })
          .eq("id", nextDeploymentId);
      }

      if (previousActiveDeploymentId) {
        await client
          .from("published_sites")
          .update({
            status: "published",
            active_deployment_id: previousActiveDeploymentId,
            last_published_at: previousLastPublishedAt,
            updated_at: failureTime,
          })
          .eq("id", siteId);
      } else {
        await client
          .from("published_sites")
          .update({
            status: "failed",
            updated_at: failureTime,
          })
          .eq("id", siteId);
      }
    } catch {}

    throw buildPublishingDbError(error, DB_WRITE_001, `Failed to publish project ${project.id}`, {
      projectId: project.id,
      userId,
      siteId,
      subdomain,
    });
  }

  const publishedSite = await getPublishedSiteForProject(project.id, userId, options);
  if (!publishedSite) {
    throw createAppError({
      code: DB_READ_001,
      devMessage: `Published site ${siteId} missing after publishing project ${project.id}`,
      severity: "error",
      metadata: { projectId: project.id, siteId },
    });
  }

  return publishedSite;
}

export async function publishProjectSnapshot(
  snapshot: ProjectSnapshot,
  userId: string,
  options?: DbClientOptions
): Promise<PublishedSite> {
  return publishSanitizedProject(sanitizeDeploymentProject(snapshot.project), userId, options);
}

export async function listProjectDeployments(
  projectId: string,
  userId: string,
  options?: DbClientOptions
): Promise<ProjectDeployment[]> {
  const client = getPublishingDbClient(options);
  await ensureProjectOwnership(client, projectId, userId, options);

  const query = client
    .from("project_deployments")
    .select("id, published_site_id, project_id, user_id, version_number, status, published_url, page_count, source_deployment_id, published_at, created_at, updated_at")
    .eq("project_id", projectId)
    .order("version_number", { ascending: false });
  if (!options?.admin) {
    query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    throw buildPublishingDbError(error, DB_READ_001, `Failed to list deployments for project ${projectId}`, {
      projectId,
      userId,
    });
  }

  return ((data ?? []) as ProjectDeploymentRow[]).map(mapProjectDeployment);
}

async function readDeploymentRow(
  projectId: string,
  userId: string,
  deploymentId: string,
  options?: DbClientOptions
) {
  const client = getPublishingDbClient(options);
  await ensureProjectOwnership(client, projectId, userId, options);

  const query = client
    .from("project_deployments")
    .select("*")
    .eq("project_id", projectId)
    .eq("id", deploymentId);
  if (!options?.admin) {
    query.eq("user_id", userId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw buildPublishingDbError(error, DB_READ_001, `Failed to read deployment ${deploymentId} for project ${projectId}`, {
      projectId,
      userId,
      deploymentId,
    });
  }
  if (!data) {
    throw createAppError({
      code: DB_READ_002,
      devMessage: `Deployment ${deploymentId} not found for project ${projectId}`,
      severity: "warn",
      metadata: { projectId, userId, deploymentId },
    });
  }

  return data as ProjectDeploymentRow;
}

export async function readProjectDeploymentProject(
  projectId: string,
  userId: string,
  deploymentId: string,
  options?: DbClientOptions
): Promise<Project> {
  const row = await readDeploymentRow(projectId, userId, deploymentId, options);
  return normalizeStoredProject(row.project_json);
}

export async function republishProjectDeployment(
  projectId: string,
  userId: string,
  deploymentId: string,
  options?: DbClientOptions
) {
  const project = await readProjectDeploymentProject(projectId, userId, deploymentId, options);
  return publishSanitizedProject(project, userId, {
    ...options,
    sourceDeploymentId: deploymentId,
  });
}

export async function addProjectDomain(
  projectId: string,
  userId: string,
  hostname: string,
  options?: DbClientOptions
): Promise<PublishedSite> {
  const client = getPublishingDbClient(options);
  await ensureProjectOwnership(client, projectId, userId, options);

  const siteRow = await loadPublishedSiteRowByProjectId(client, projectId, userId, options);
  if (!siteRow) {
    throw createAppError({
      code: API_REQUEST_002,
      devMessage: `Attempted to add domain before project ${projectId} was published`,
      userMessage: "Publish this project before adding a custom domain.",
      severity: "warn",
      metadata: { projectId, userId },
    });
  }

  const normalizedHostname = validateCustomHostname(hostname);
  const now = new Date().toISOString();
  const verificationToken = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const existingDomains = await buildPublishedSiteFromRow(client, siteRow, userId, options);
  const alreadyExists = existingDomains.domains.some((domain) => domain.hostname === normalizedHostname);

  if (!alreadyExists) {
    const { error } = await client.from("project_domains").insert({
      id: crypto.randomUUID(),
      published_site_id: siteRow.id,
      project_id: projectId,
      user_id: userId,
      hostname: normalizedHostname,
      status: "pending",
      is_primary: existingDomains.domains.length === 0,
      verification_token: verificationToken,
      verified_at: null,
      created_at: now,
      updated_at: now,
    });

    if (error) {
      throw buildPublishingDbError(error, DB_WRITE_001, `Failed to add domain ${normalizedHostname} for project ${projectId}`, {
        projectId,
        userId,
        hostname: normalizedHostname,
      });
    }
  }

  return buildPublishedSiteFromRow(client, siteRow, userId, options);
}

export async function updateProjectDomain(
  projectId: string,
  domainId: string,
  userId: string,
  action: "verify" | "set_primary" | "remove",
  options?: DbClientOptions
): Promise<PublishedSite> {
  const client = getPublishingDbClient(options);
  await ensureProjectOwnership(client, projectId, userId, options);

  const domainQuery = client
    .from("project_domains")
    .select("*")
    .eq("id", domainId)
    .eq("project_id", projectId)
    .limit(1);
  if (!options?.admin) {
    domainQuery.eq("user_id", userId);
  }

  const { data: domainRow, error: domainError } = await domainQuery.maybeSingle();
  if (domainError) {
    throw buildPublishingDbError(domainError, DB_READ_001, `Failed to load domain ${domainId} for project ${projectId}`, {
      projectId,
      domainId,
      userId,
    });
  }

  if (!domainRow) {
    throw createAppError({
      code: DB_READ_002,
      devMessage: `Domain ${domainId} not found for project ${projectId}`,
      severity: "warn",
      metadata: { projectId, domainId, userId },
    });
  }

  const domain = domainRow as ProjectDomainRow;
  const siteRow = await loadPublishedSiteRowByProjectId(client, projectId, userId, options);
  if (!siteRow || siteRow.id !== domain.published_site_id) {
    throw createAppError({
      code: AUTH_PERMISSION_001,
      devMessage: `Domain ${domainId} does not belong to the published site for project ${projectId}`,
      severity: "warn",
      metadata: { projectId, domainId, userId },
    });
  }

  const now = new Date().toISOString();

  try {
    if (action === "verify") {
      const { error: verifyingError } = await client
        .from("project_domains")
        .update({
          status: "verifying",
          updated_at: now,
        })
        .eq("id", domainId);
      if (verifyingError) throw verifyingError;

      const expectedTarget = getDomainConnectionTarget(siteRow.subdomain);
      let verification: Awaited<ReturnType<typeof verifyCustomHostnameConnection>>;
      try {
        verification = await verifyCustomHostnameConnection(domain.hostname, expectedTarget);
      } catch (error) {
        const { error: failError } = await client
          .from("project_domains")
          .update({
            status: "failed",
            verified_at: null,
            updated_at: now,
          })
          .eq("id", domainId);
        if (failError) throw failError;
        throw error;
      }

      if (!verification.verified) {
        const { error: failError } = await client
          .from("project_domains")
          .update({
            status: "failed",
            verified_at: null,
            updated_at: now,
          })
          .eq("id", domainId);
        if (failError) throw failError;

        throw createAppError({
          code: NETWORK_DNS_001,
          devMessage: `DNS verification failed for ${domain.hostname}; expected ${expectedTarget}`,
          userMessage: verification.userMessage,
          severity: "warn",
          metadata: { projectId, domainId, hostname: domain.hostname, expectedTarget, answers: verification.answers ?? [] },
        });
      }

      const { error } = await client
        .from("project_domains")
        .update({
          status: "active",
          verified_at: now,
          updated_at: now,
        })
        .eq("id", domainId);
      if (error) throw error;
    } else if (action === "set_primary") {
      if (domain.status !== "active") {
        throw createAppError({
          code: VALIDATION_DOMAIN_001,
          devMessage: `Attempted to set inactive domain ${domain.hostname} as primary`,
          userMessage: "Verify this domain before making it primary.",
          severity: "warn",
          metadata: { projectId, domainId, hostname: domain.hostname, status: domain.status },
        });
      }

      const { error: resetError } = await client
        .from("project_domains")
        .update({ is_primary: false, updated_at: now })
        .eq("published_site_id", siteRow.id);
      if (resetError) throw resetError;

      const { error: setError } = await client
        .from("project_domains")
        .update({ is_primary: true, updated_at: now })
        .eq("id", domainId);
      if (setError) throw setError;
    } else {
      const wasPrimary = domain.is_primary;
      const { error } = await client.from("project_domains").delete().eq("id", domainId);
      if (error) throw error;

      if (wasPrimary) {
        const { data: remainingDomains, error: remainingError } = await client
          .from("project_domains")
          .select("id,status")
          .eq("published_site_id", siteRow.id)
          .order("status", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(10);
        if (remainingError) throw remainingError;

        const nextPrimaryId =
          (remainingDomains?.find((candidate) => (candidate as { status?: string }).status === "active") as { id?: string } | undefined)?.id ??
          (remainingDomains?.[0] as { id?: string } | undefined)?.id;
        if (nextPrimaryId) {
          const { error: promoteError } = await client
            .from("project_domains")
            .update({ is_primary: true, updated_at: now })
            .eq("id", nextPrimaryId);
          if (promoteError) throw promoteError;
        }
      }
    }
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }
    throw buildPublishingDbError(error, action === "remove" ? DB_UPDATE_001 : DB_WRITE_001, `Failed to ${action} domain ${domainId}`, {
      projectId,
      domainId,
      userId,
      action,
    });
  }

  return buildPublishedSiteFromRow(client, siteRow, userId, options);
}

export interface ResolvedPublishedProject {
  site: PublishedSite;
  deployment: ProjectDeployment;
  project: Project;
  ownerUserId: string;
}

async function loadResolvedPublishedProject(
  client: DbClient,
  siteRow: PublishedSiteRow
): Promise<ResolvedPublishedProject | null> {
  let deploymentRow: ProjectDeploymentRow | null = null;

  if (siteRow.active_deployment_id) {
    const { data, error } = await client
      .from("project_deployments")
      .select("id, published_site_id, project_id, user_id, version_number, status, published_url, page_count, project_json, published_at, created_at, updated_at")
      .eq("id", siteRow.active_deployment_id)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw buildPublishingDbError(error, DB_READ_001, `Failed to load active deployment for published site ${siteRow.id}`, {
        siteId: siteRow.id,
        deploymentId: siteRow.active_deployment_id,
      });
    }

    deploymentRow = (data as ProjectDeploymentRow | null) ?? null;
  }

  if (!deploymentRow || normalizeDeploymentStatus(deploymentRow.status) !== "published") {
    const { data, error } = await client
      .from("project_deployments")
      .select("id, published_site_id, project_id, user_id, version_number, status, published_url, page_count, project_json, published_at, created_at, updated_at")
      .eq("published_site_id", siteRow.id)
      .eq("status", "published")
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw buildPublishingDbError(error, DB_READ_001, `Failed to load fallback published deployment for site ${siteRow.id}`, {
        siteId: siteRow.id,
        deploymentId: siteRow.active_deployment_id,
      });
    }

    deploymentRow = (data as ProjectDeploymentRow | null) ?? null;
  }

  if (!deploymentRow) return null;

  const site = await buildPublishedSiteFromRow(client, siteRow, siteRow.user_id, { admin: true });
  return {
    site,
    deployment: mapProjectDeployment(deploymentRow as ProjectDeploymentRow),
    project: normalizeStoredProject((deploymentRow as ProjectDeploymentRow).project_json),
    ownerUserId: siteRow.user_id,
  };
}

export async function resolvePublishedProjectBySubdomain(subdomain: string): Promise<ResolvedPublishedProject | null> {
  const client = getPublishingDbClient({ admin: true });
  const normalizedSubdomain = slugifySiteToken(subdomain);
  const { data, error } = await client
    .from("published_sites")
    .select("*")
    .eq("subdomain", normalizedSubdomain)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw buildPublishingDbError(error, DB_READ_001, `Failed to resolve published site by subdomain ${normalizedSubdomain}`, {
      subdomain: normalizedSubdomain,
    });
  }

  if (!data) return null;
  return loadResolvedPublishedProject(client, data as PublishedSiteRow);
}

export async function resolvePublishedProjectByHostname(hostname: string): Promise<ResolvedPublishedProject | null> {
  const client = getPublishingDbClient({ admin: true });
  const normalizedHost = normalizeHostname(hostname);
  if (!normalizedHost) return null;

  const subdomain = extractSitezySubdomain(normalizedHost);
  if (subdomain) {
    return resolvePublishedProjectBySubdomain(subdomain);
  }

  const { data: domainRow, error: domainError } = await client
    .from("project_domains")
    .select("*")
    .eq("hostname", normalizedHost)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (domainError) {
    throw buildPublishingDbError(domainError, DB_READ_001, `Failed to resolve published site by hostname ${normalizedHost}`, {
      hostname: normalizedHost,
    });
  }

  if (!domainRow) return null;

  const { data: siteRow, error: siteError } = await client
    .from("published_sites")
    .select("*")
    .eq("id", (domainRow as ProjectDomainRow).published_site_id)
    .limit(1)
    .maybeSingle();

  if (siteError) {
    throw buildPublishingDbError(siteError, DB_READ_001, `Failed to resolve published site row for hostname ${normalizedHost}`, {
      hostname: normalizedHost,
      siteId: (domainRow as ProjectDomainRow).published_site_id,
    });
  }

  if (!siteRow) return null;
  return loadResolvedPublishedProject(client, siteRow as PublishedSiteRow);
}

export function getDomainConnectionTarget(subdomain: string): string {
  return buildSitezyHostname(subdomain);
}
