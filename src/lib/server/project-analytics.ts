import type {
  ProjectAnalyticsEventType,
  ProjectAnalyticsSummary,
} from "@/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  DB_READ_001,
  DB_READ_002,
  DB_WRITE_001,
  createAppError,
} from "@/lib/errors";

type AnalyticsClient = ReturnType<typeof getSupabaseServerClient>;
type AnalyticsClientOptions = { admin?: boolean };

type ProjectOwnerRow = {
  id: string;
  user_id: string;
};

type ProjectAnalyticsRollupRow = {
  project_id: string;
  user_id: string;
  rollup_date: string;
  sessions: number;
  page_views: number;
  lead_conversions: number;
  subscriber_conversions: number;
  deployments_published: number;
};

type ProjectAnalyticsEventRow = {
  id: string;
  project_id: string;
  user_id: string;
  event_type: ProjectAnalyticsEventType;
  page_path: string;
  session_id: string | null;
  visitor_id: string | null;
  referrer: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
};

function getAnalyticsClient(options?: AnalyticsClientOptions) {
  return options?.admin ? getSupabaseAdminClient() : getSupabaseServerClient();
}

function startDate(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - Math.max(0, days - 1));
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function normalizePagePath(value: unknown) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

async function resolveProjectOwnerId(
  projectId: string,
  userId?: string | null,
  options?: AnalyticsClientOptions
) {
  const client = getAnalyticsClient(options);
  const query = client
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId);

  if (!options?.admin && userId) {
    query.eq("user_id", userId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw createAppError({
      code: DB_READ_001,
      devMessage: `Failed to resolve analytics project owner for ${projectId}`,
      severity: "error",
      metadata: { projectId, userId },
      cause: error,
    });
  }

  if (!data) {
    throw createAppError({
      code: DB_READ_002,
      devMessage: `Analytics project ${projectId} not found`,
      severity: "warn",
      metadata: { projectId, userId },
    });
  }

  return (data as ProjectOwnerRow).user_id;
}

function incrementForEvent(eventType: ProjectAnalyticsEventType) {
  return {
    sessions: eventType === "session" ? 1 : 0,
    page_views: eventType === "page_view" ? 1 : 0,
    lead_conversions: eventType === "lead_conversion" ? 1 : 0,
    subscriber_conversions: eventType === "subscriber_conversion" ? 1 : 0,
    deployments_published: eventType === "deployment_published" ? 1 : 0,
  };
}

export async function recordProjectAnalyticsEvent(
  input: {
    projectId: string;
    eventType: ProjectAnalyticsEventType;
    pagePath?: string | null;
    sessionId?: string | null;
    visitorId?: string | null;
    referrer?: string | null;
    metadata?: Record<string, unknown> | null;
    userId?: string | null;
  },
  options?: AnalyticsClientOptions
) {
  const client = getAnalyticsClient({ admin: true });
  const ownerUserId = input.userId?.trim()
    ? input.userId.trim()
    : await resolveProjectOwnerId(input.projectId, null, { admin: true });
  const now = new Date().toISOString();
  const pagePath = normalizePagePath(input.pagePath);
  const eventId = crypto.randomUUID();

  const { error: eventError } = await client.from("project_analytics_events").insert({
    id: eventId,
    project_id: input.projectId,
    user_id: ownerUserId,
    event_type: input.eventType,
    page_path: pagePath,
    session_id: input.sessionId ?? null,
    visitor_id: input.visitorId ?? null,
    referrer: input.referrer ?? null,
    metadata_json: input.metadata ?? {},
    created_at: now,
    updated_at: now,
  });

  if (eventError) {
    throw createAppError({
      code: DB_WRITE_001,
      devMessage: `Failed to record analytics event ${input.eventType} for ${input.projectId}`,
      severity: "error",
      metadata: { projectId: input.projectId, eventType: input.eventType },
      cause: eventError,
    });
  }

  const date = now.slice(0, 10);
  const increments = incrementForEvent(input.eventType);
  const { data: existing } = await client
    .from("project_analytics_daily_rollups")
    .select("*")
    .eq("project_id", input.projectId)
    .eq("rollup_date", date)
    .maybeSingle();

  const current = (existing as ProjectAnalyticsRollupRow | null) ?? null;
  const { error: rollupError } = await client.from("project_analytics_daily_rollups").upsert({
    project_id: input.projectId,
    user_id: ownerUserId,
    rollup_date: date,
    sessions: (current?.sessions ?? 0) + increments.sessions,
    page_views: (current?.page_views ?? 0) + increments.page_views,
    lead_conversions: (current?.lead_conversions ?? 0) + increments.lead_conversions,
    subscriber_conversions: (current?.subscriber_conversions ?? 0) + increments.subscriber_conversions,
    deployments_published: (current?.deployments_published ?? 0) + increments.deployments_published,
    updated_at: now,
  });

  if (rollupError) {
    throw createAppError({
      code: DB_WRITE_001,
      devMessage: `Failed to update analytics rollup for ${input.projectId}`,
      severity: "error",
      metadata: { projectId: input.projectId, eventType: input.eventType },
      cause: rollupError,
    });
  }
}

export async function summarizeProjectAnalytics(
  projectId: string,
  userId: string,
  options?: AnalyticsClientOptions & { days?: number }
): Promise<ProjectAnalyticsSummary> {
  await resolveProjectOwnerId(projectId, userId, options);
  const client = getAnalyticsClient(options);
  const from = startDate(options?.days ?? 30);

  const [{ data: rollups, error: rollupsError }, { data: events, error: eventsError }] = await Promise.all([
    client
      .from("project_analytics_daily_rollups")
      .select("*")
      .eq("project_id", projectId)
      .gte("rollup_date", from)
      .order("rollup_date", { ascending: true }),
    client
      .from("project_analytics_events")
      .select("id, project_id, user_id, event_type, page_path, session_id, visitor_id, referrer, metadata_json, created_at")
      .eq("project_id", projectId)
      .gte("created_at", `${from}T00:00:00.000Z`)
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  if (rollupsError) {
    throw createAppError({
      code: DB_READ_001,
      devMessage: `Failed to read analytics rollups for ${projectId}`,
      severity: "error",
      metadata: { projectId, userId },
      cause: rollupsError,
    });
  }

  if (eventsError) {
    throw createAppError({
      code: DB_READ_001,
      devMessage: `Failed to read analytics events for ${projectId}`,
      severity: "error",
      metadata: { projectId, userId },
      cause: eventsError,
    });
  }

  const safeRollups = (rollups ?? []) as ProjectAnalyticsRollupRow[];
  const safeEvents = (events ?? []) as ProjectAnalyticsEventRow[];
  const topPagesMap = new Map<string, number>();

  for (const event of safeEvents) {
    if (event.event_type !== "page_view") continue;
    const path = normalizePagePath(event.page_path);
    topPagesMap.set(path, (topPagesMap.get(path) ?? 0) + 1);
  }

  return {
    sessions: safeRollups.reduce((sum, row) => sum + (row.sessions ?? 0), 0),
    pageViews: safeRollups.reduce((sum, row) => sum + (row.page_views ?? 0), 0),
    leadConversions: safeRollups.reduce((sum, row) => sum + (row.lead_conversions ?? 0), 0),
    subscriberConversions: safeRollups.reduce((sum, row) => sum + (row.subscriber_conversions ?? 0), 0),
    deploymentsPublished: safeRollups.reduce((sum, row) => sum + (row.deployments_published ?? 0), 0),
    topPages: [...topPagesMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pagePath, views]) => ({ pagePath, views })),
    daily: safeRollups.map((row) => ({
      date: row.rollup_date,
      sessions: row.sessions ?? 0,
      pageViews: row.page_views ?? 0,
      leadConversions: row.lead_conversions ?? 0,
      subscriberConversions: row.subscriber_conversions ?? 0,
    })),
  };
}
