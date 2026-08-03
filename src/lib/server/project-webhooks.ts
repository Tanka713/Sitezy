import { createHmac } from "node:crypto";
import type {
  ProjectWebhook,
  ProjectWebhookDelivery,
  ProjectWebhookEventType,
} from "@/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  DB_READ_001,
  DB_READ_002,
  DB_UPDATE_001,
  DB_WRITE_001,
  VALIDATION_INPUT_001,
  createAppError,
} from "@/lib/errors";

type WebhookClient = ReturnType<typeof getSupabaseServerClient>;
type WebhookClientOptions = { admin?: boolean };

type ProjectWebhookRow = {
  id: string;
  project_id: string;
  user_id: string;
  label: string;
  target_url: string;
  secret: string | null;
  events_json: ProjectWebhookEventType[] | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

type WebhookDeliveryRow = {
  id: string;
  webhook_id: string;
  project_id: string;
  user_id: string;
  event_type: ProjectWebhookEventType;
  payload_json: Record<string, unknown> | null;
  status: "pending" | "delivered" | "failed";
  attempt_count: number;
  response_status: number | null;
  response_body: string | null;
  next_attempt_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

const VALID_WEBHOOK_EVENTS = new Set<ProjectWebhookEventType>([
  "lead.created",
  "subscriber.created",
  "deployment.published",
]);

function getWebhookClient(options?: WebhookClientOptions) {
  return options?.admin ? getSupabaseAdminClient() : getSupabaseServerClient();
}

function mapWebhook(row: ProjectWebhookRow): ProjectWebhook {
  return {
    id: row.id,
    projectId: row.project_id,
    label: row.label,
    targetUrl: row.target_url,
    secret: row.secret,
    events: Array.isArray(row.events_json)
      ? row.events_json.filter((event): event is ProjectWebhookEventType => VALID_WEBHOOK_EVENTS.has(event))
      : [],
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWebhookDelivery(row: WebhookDeliveryRow): ProjectWebhookDelivery {
  return {
    id: row.id,
    webhookId: row.webhook_id,
    projectId: row.project_id,
    eventType: row.event_type,
    status: row.status,
    attemptCount: row.attempt_count,
    responseStatus: row.response_status,
    responseBody: row.response_body,
    nextAttemptAt: row.next_attempt_at,
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureProjectOwner(projectId: string, userId: string, options?: WebhookClientOptions) {
  const client = getWebhookClient(options);
  const query = client.from("projects").select("id, user_id").eq("id", projectId);
  if (!options?.admin) {
    query.eq("user_id", userId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw createAppError({
      code: DB_READ_001,
      devMessage: `Failed to resolve webhook project ${projectId}`,
      severity: "error",
      metadata: { projectId, userId },
      cause: error,
    });
  }
  if (!data) {
    throw createAppError({
      code: DB_READ_002,
      devMessage: `Webhook project ${projectId} not found`,
      severity: "warn",
      metadata: { projectId, userId },
    });
  }
  return String((data as { user_id: string }).user_id);
}

function normalizeEventList(value: unknown): ProjectWebhookEventType[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry))
    .filter((entry): entry is ProjectWebhookEventType => VALID_WEBHOOK_EVENTS.has(entry as ProjectWebhookEventType));
}

function normalizeUrl(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).toString();
  } catch {
    return "";
  }
}

export async function listProjectWebhooks(
  projectId: string,
  userId: string,
  options?: WebhookClientOptions
) {
  await ensureProjectOwner(projectId, userId, options);
  const client = getWebhookClient(options);
  const { data, error } = await client
    .from("project_webhooks")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw createAppError({
      code: DB_READ_001,
      devMessage: `Failed to list project webhooks for ${projectId}`,
      severity: "error",
      metadata: { projectId, userId },
      cause: error,
    });
  }

  return ((data ?? []) as ProjectWebhookRow[]).map(mapWebhook);
}

export async function listProjectWebhookDeliveries(
  projectId: string,
  userId: string,
  webhookId: string,
  options?: WebhookClientOptions
) {
  await ensureProjectOwner(projectId, userId, options);
  const client = getWebhookClient(options);
  const { data, error } = await client
    .from("webhook_deliveries")
    .select("*")
    .eq("project_id", projectId)
    .eq("webhook_id", webhookId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw createAppError({
      code: DB_READ_001,
      devMessage: `Failed to list webhook deliveries for ${webhookId}`,
      severity: "error",
      metadata: { projectId, userId, webhookId },
      cause: error,
    });
  }

  return ((data ?? []) as WebhookDeliveryRow[]).map(mapWebhookDelivery);
}

export async function createProjectWebhook(
  projectId: string,
  userId: string,
  input: {
    label?: string | null;
    targetUrl?: string | null;
    secret?: string | null;
    events?: ProjectWebhookEventType[] | null;
    enabled?: boolean;
  },
  options?: WebhookClientOptions
) {
  await ensureProjectOwner(projectId, userId, options);
  const label = String(input.label ?? "").trim() || "Webhook";
  const targetUrl = normalizeUrl(input.targetUrl);
  const events = normalizeEventList(input.events ?? []);

  if (!targetUrl) {
    throw createAppError({
      code: VALIDATION_INPUT_001,
      devMessage: `Webhook target URL missing or invalid for project ${projectId}`,
      severity: "warn",
      metadata: { projectId, userId, targetUrl: input.targetUrl ?? null },
    });
  }

  if (!events.length) {
    throw createAppError({
      code: VALIDATION_INPUT_001,
      devMessage: `Webhook create request omitted events for project ${projectId}`,
      severity: "warn",
      metadata: { projectId, userId },
    });
  }

  const now = new Date().toISOString();
  const client = getWebhookClient(options);
  const { data, error } = await client
    .from("project_webhooks")
    .insert({
      id: crypto.randomUUID(),
      project_id: projectId,
      user_id: userId,
      label,
      target_url: targetUrl,
      secret: typeof input.secret === "string" && input.secret.trim() ? input.secret.trim() : null,
      events_json: events,
      enabled: input.enabled ?? true,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw createAppError({
      code: DB_WRITE_001,
      devMessage: `Failed to create project webhook for ${projectId}`,
      severity: "error",
      metadata: { projectId, userId },
      cause: error,
    });
  }

  return mapWebhook(data as ProjectWebhookRow);
}

export async function updateProjectWebhook(
  projectId: string,
  userId: string,
  webhookId: string,
  input: {
    label?: string | null;
    targetUrl?: string | null;
    secret?: string | null;
    events?: ProjectWebhookEventType[] | null;
    enabled?: boolean;
  },
  options?: WebhookClientOptions
) {
  await ensureProjectOwner(projectId, userId, options);
  const client = getWebhookClient(options);
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof input.label === "string") patch.label = input.label.trim() || "Webhook";
  if (typeof input.targetUrl === "string") {
    const targetUrl = normalizeUrl(input.targetUrl);
    if (!targetUrl) {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: `Webhook update target URL invalid for ${webhookId}`,
        severity: "warn",
        metadata: { projectId, userId, webhookId, targetUrl: input.targetUrl },
      });
    }
    patch.target_url = targetUrl;
  }
  if (typeof input.secret === "string") patch.secret = input.secret.trim() || null;
  if (Array.isArray(input.events)) patch.events_json = normalizeEventList(input.events);
  if (typeof input.enabled === "boolean") patch.enabled = input.enabled;

  const { data, error } = await client
    .from("project_webhooks")
    .update(patch)
    .eq("id", webhookId)
    .eq("project_id", projectId)
    .select("*")
    .single();

  if (error || !data) {
    throw createAppError({
      code: DB_UPDATE_001,
      devMessage: `Failed to update webhook ${webhookId}`,
      severity: "error",
      metadata: { projectId, userId, webhookId },
      cause: error,
    });
  }

  return mapWebhook(data as ProjectWebhookRow);
}

export async function deleteProjectWebhook(
  projectId: string,
  userId: string,
  webhookId: string,
  options?: WebhookClientOptions
) {
  await ensureProjectOwner(projectId, userId, options);
  const client = getWebhookClient(options);
  const { error } = await client
    .from("project_webhooks")
    .delete()
    .eq("id", webhookId)
    .eq("project_id", projectId);

  if (error) {
    throw createAppError({
      code: DB_UPDATE_001,
      devMessage: `Failed to delete webhook ${webhookId}`,
      severity: "error",
      metadata: { projectId, userId, webhookId },
      cause: error,
    });
  }
}

function buildSignature(secret: string, timestamp: string, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

async function deliverWebhook(
  client: ReturnType<typeof getSupabaseAdminClient>,
  webhook: ProjectWebhook,
  deliveryId: string,
  payload: Record<string, unknown>,
  eventType: ProjectWebhookEventType
) {
  const serializedPayload = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Sitezy-Event": eventType,
    "X-Sitezy-Delivery-Id": deliveryId,
    "X-Sitezy-Timestamp": timestamp,
  };

  if (webhook.secret) {
    headers["X-Sitezy-Signature"] = buildSignature(webhook.secret, timestamp, serializedPayload);
  }

  try {
    const response = await fetch(webhook.targetUrl, {
      method: "POST",
      headers,
      body: serializedPayload,
    });
    const responseBody = await response.text().catch(() => "");

    await client
      .from("webhook_deliveries")
      .update({
        status: response.ok ? "delivered" : "failed",
        attempt_count: 1,
        response_status: response.status,
        response_body: responseBody.slice(0, 4000),
        delivered_at: response.ok ? new Date().toISOString() : null,
        next_attempt_at: response.ok ? null : new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", deliveryId);
  } catch (error) {
    await client
      .from("webhook_deliveries")
      .update({
        status: "failed",
        attempt_count: 1,
        response_status: null,
        response_body: error instanceof Error ? error.message.slice(0, 4000) : "Unknown delivery error",
        next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", deliveryId);
  }
}

export async function dispatchProjectWebhookEvent(input: {
  projectId: string;
  userId: string;
  eventType: ProjectWebhookEventType;
  payload: Record<string, unknown>;
}) {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("project_webhooks")
    .select("*")
    .eq("project_id", input.projectId)
    .eq("user_id", input.userId)
    .eq("enabled", true);

  if (error) {
    throw createAppError({
      code: DB_READ_001,
      devMessage: `Failed to load project webhooks for dispatch on ${input.projectId}`,
      severity: "error",
      metadata: { projectId: input.projectId, userId: input.userId, eventType: input.eventType },
      cause: error,
    });
  }

  const matchingHooks = ((data ?? []) as ProjectWebhookRow[])
    .map(mapWebhook)
    .filter((hook) => hook.events.includes(input.eventType));

  for (const hook of matchingHooks) {
    const deliveryId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error: insertError } = await client.from("webhook_deliveries").insert({
      id: deliveryId,
      webhook_id: hook.id,
      project_id: input.projectId,
      user_id: input.userId,
      event_type: input.eventType,
      payload_json: input.payload,
      status: "pending",
      attempt_count: 0,
      response_status: null,
      response_body: null,
      next_attempt_at: null,
      delivered_at: null,
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      throw createAppError({
        code: DB_WRITE_001,
        devMessage: `Failed to queue webhook delivery for ${hook.id}`,
        severity: "error",
        metadata: { projectId: input.projectId, userId: input.userId, webhookId: hook.id },
        cause: insertError,
      });
    }

    await deliverWebhook(client, hook, deliveryId, input.payload, input.eventType);
  }
}
