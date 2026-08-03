import type {
  LeadCaptureExportKind,
  LeadNotificationDeliveryStatus,
  LeadSubmission,
  LeadSubmissionKind,
  NewsletterSubscriber,
  ProjectIntegrationSettings,
  ProjectLeadSummary,
} from "@/types";
import {
  extractLeadSummaryFields,
  normalizeLeadFields,
  normalizeLeadSubmissionKind,
  normalizeProjectIntegrationSettings,
} from "@/lib/lead-capture";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  DB_READ_001,
  DB_READ_002,
  DB_SCHEMA_001,
  DB_UPDATE_001,
  DB_WRITE_001,
  DB_WRITE_002,
  VALIDATION_INPUT_001,
  createAppError,
  type ErrorCode,
} from "@/lib/errors";

type LeadSubmissionRow = {
  id: string;
  project_id: string;
  user_id: string;
  kind: string;
  page_path: string;
  form_id: string | null;
  name: string | null;
  email: string | null;
  message: string | null;
  fields_json: Record<string, string> | null;
  notification_email: string | null;
  notification_delivery_status: string;
  notification_error: string | null;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
};

type NewsletterSubscriberRow = {
  id: string;
  project_id: string;
  user_id: string;
  email: string;
  name: string | null;
  source_submission_id: string | null;
  subscribed_at: string;
  created_at: string;
  updated_at: string;
};

type ProjectIntegrationSettingsRow = {
  id: string;
  user_id: string;
  integration_settings_json: Partial<ProjectIntegrationSettings> | null;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

type LeadCaptureClient =
  | ReturnType<typeof getSupabaseServerClient>
  | ReturnType<typeof getSupabaseAdminClient>;

type LeadCaptureOptions = {
  admin?: boolean;
};

type CreateLeadSubmissionInput = {
  projectId: string;
  userId: string;
  kind: LeadSubmissionKind;
  pagePath: string;
  formId?: string | null;
  fields: Record<string, string>;
  notificationEmail?: string | null;
  options?: LeadCaptureOptions;
};

const CONSTRAINT_CODES = new Set(["23502", "23503", "23505", "23514"]);

function getLeadCaptureClient(options?: LeadCaptureOptions): LeadCaptureClient {
  return options?.admin ? getSupabaseAdminClient() : getSupabaseServerClient();
}

function isLeadCaptureSchemaMissing(error: unknown) {
  const maybe = (error ?? {}) as SupabaseErrorLike;
  const message = `${maybe.message ?? ""} ${maybe.details ?? ""} ${maybe.hint ?? ""}`.toLowerCase();
  return (
    maybe.code === "42P01" ||
    maybe.code === "42703" ||
    maybe.code === "PGRST202" ||
    maybe.code === "PGRST204" ||
    maybe.code === "PGRST205" ||
    message.includes("project_lead_submissions") ||
    message.includes("project_newsletter_subscribers") ||
    message.includes("integration_settings_json")
  );
}

function buildLeadCaptureError(
  error: unknown,
  fallbackCode: ErrorCode,
  devMessage: string,
  metadata?: Record<string, unknown>
) {
  const maybe = (error ?? {}) as SupabaseErrorLike;
  const code = isLeadCaptureSchemaMissing(error)
    ? DB_SCHEMA_001
    : typeof maybe.code === "string" && CONSTRAINT_CODES.has(maybe.code)
    ? DB_WRITE_002
    : fallbackCode;

  return createAppError({
    code,
    devMessage,
    userMessage:
      code === DB_SCHEMA_001
        ? "Lead capture needs the latest database migration before it can be used."
        : undefined,
    severity: code === DB_SCHEMA_001 ? "warn" : "error",
    metadata: {
      ...metadata,
      ...(maybe.code ? { dbCode: maybe.code } : {}),
      ...(maybe.details ? { dbDetails: maybe.details } : {}),
      ...(maybe.hint ? { dbHint: maybe.hint } : {}),
    },
    cause: error,
  });
}

function normalizeNotificationDeliveryStatus(value: unknown): LeadNotificationDeliveryStatus {
  return value === "sent" || value === "failed" ? value : "not_requested";
}

function mapLeadSubmission(row: LeadSubmissionRow): LeadSubmission {
  return {
    id: row.id,
    projectId: row.project_id,
    kind: normalizeLeadSubmissionKind(row.kind),
    pagePath: row.page_path || "/",
    formId: row.form_id,
    name: row.name,
    email: row.email ? row.email.toLowerCase() : null,
    message: row.message,
    fields: normalizeLeadFields(row.fields_json ?? {}),
    notificationEmail: row.notification_email,
    notificationDeliveryStatus: normalizeNotificationDeliveryStatus(row.notification_delivery_status),
    notificationError: row.notification_error,
    notifiedAt: row.notified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNewsletterSubscriber(row: NewsletterSubscriberRow): NewsletterSubscriber {
  return {
    id: row.id,
    projectId: row.project_id,
    email: row.email.toLowerCase(),
    name: row.name,
    sourceSubmissionId: row.source_submission_id,
    subscribedAt: row.subscribed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function readProjectIntegrationRow(
  projectId: string,
  userId: string,
  options?: LeadCaptureOptions
): Promise<ProjectIntegrationSettingsRow> {
  const client = getLeadCaptureClient(options);
  const query = client
    .from("projects")
    .select("id, user_id, integration_settings_json")
    .eq("id", projectId)
    .eq("user_id", userId)
    .limit(1);

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw buildLeadCaptureError(error, DB_READ_001, `Failed to read project lead settings for ${projectId}`, {
      projectId,
      userId,
    });
  }
  if (!data) {
    throw createAppError({
      code: DB_READ_002,
      devMessage: `Project ${projectId} not found while reading lead settings`,
      severity: "warn",
      metadata: { projectId, userId },
    });
  }

  return data as ProjectIntegrationSettingsRow;
}

async function upsertNewsletterSubscriber(
  client: LeadCaptureClient,
  input: {
    projectId: string;
    userId: string;
    email: string;
    name: string | null;
    sourceSubmissionId: string;
  }
): Promise<NewsletterSubscriber> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const now = new Date().toISOString();

  const { data: existing, error: existingError } = await client
    .from("project_newsletter_subscribers")
    .select("*")
    .eq("project_id", input.projectId)
    .eq("user_id", input.userId)
    .eq("email", normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw buildLeadCaptureError(
      existingError,
      DB_READ_001,
      `Failed to check newsletter subscriber ${normalizedEmail} for ${input.projectId}`,
      { projectId: input.projectId, userId: input.userId, email: normalizedEmail }
    );
  }

  if (existing) {
    const row = existing as NewsletterSubscriberRow;
    const { data, error } = await client
      .from("project_newsletter_subscribers")
      .update({
        name: input.name ?? row.name,
        source_submission_id: input.sourceSubmissionId,
        updated_at: now,
      })
      .eq("id", row.id)
      .select("*")
      .single();

    if (error || !data) {
      throw buildLeadCaptureError(
        error,
        DB_UPDATE_001,
        `Failed to update newsletter subscriber ${row.id}`,
        { projectId: input.projectId, userId: input.userId, email: normalizedEmail, subscriberId: row.id }
      );
    }

    return mapNewsletterSubscriber(data as NewsletterSubscriberRow);
  }

  const payload = {
    id: crypto.randomUUID(),
    project_id: input.projectId,
    user_id: input.userId,
    email: normalizedEmail,
    name: input.name,
    source_submission_id: input.sourceSubmissionId,
    subscribed_at: now,
    created_at: now,
    updated_at: now,
  };

  const { data: inserted, error: insertError } = await client
    .from("project_newsletter_subscribers")
    .insert(payload)
    .select("*")
    .single();

  if (insertError || !inserted) {
    if ((insertError as SupabaseErrorLike | undefined)?.code === "23505") {
      const { data: raced, error: racedError } = await client
        .from("project_newsletter_subscribers")
        .select("*")
        .eq("project_id", input.projectId)
        .eq("user_id", input.userId)
        .eq("email", normalizedEmail)
        .limit(1)
        .maybeSingle();

      if (racedError || !raced) {
        throw buildLeadCaptureError(
          racedError ?? insertError,
          DB_READ_001,
          `Failed to recover newsletter subscriber race for ${normalizedEmail}`,
          { projectId: input.projectId, userId: input.userId, email: normalizedEmail }
        );
      }

      return mapNewsletterSubscriber(raced as NewsletterSubscriberRow);
    }

    throw buildLeadCaptureError(
      insertError,
      DB_WRITE_001,
      `Failed to create newsletter subscriber ${normalizedEmail}`,
      { projectId: input.projectId, userId: input.userId, email: normalizedEmail }
    );
  }

  return mapNewsletterSubscriber(inserted as NewsletterSubscriberRow);
}

export async function listLeadSubmissionsForProject(
  projectId: string,
  userId: string,
  options?: LeadCaptureOptions
): Promise<LeadSubmission[]> {
  const client = getLeadCaptureClient(options);
  const query = client
    .from("project_lead_submissions")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  const { data, error } = await query;
  if (error) {
    throw buildLeadCaptureError(error, DB_READ_001, `Failed to list lead submissions for ${projectId}`, {
      projectId,
      userId,
    });
  }

  return ((data ?? []) as LeadSubmissionRow[]).map(mapLeadSubmission);
}

export async function listNewsletterSubscribersForProject(
  projectId: string,
  userId: string,
  options?: LeadCaptureOptions
): Promise<NewsletterSubscriber[]> {
  const client = getLeadCaptureClient(options);
  const query = client
    .from("project_newsletter_subscribers")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .order("subscribed_at", { ascending: false })
    .limit(500);

  const { data, error } = await query;
  if (error) {
    throw buildLeadCaptureError(error, DB_READ_001, `Failed to list newsletter subscribers for ${projectId}`, {
      projectId,
      userId,
    });
  }

  return ((data ?? []) as NewsletterSubscriberRow[]).map(mapNewsletterSubscriber);
}

async function countRows(
  client: LeadCaptureClient,
  table: "project_lead_submissions" | "project_newsletter_subscribers",
  filters: Array<[string, string]>
) {
  let query = client.from(table).select("id", { count: "exact", head: true });
  for (const [column, value] of filters) {
    query = query.eq(column, value);
  }
  const { count, error } = await query;
  if (error) {
    throw error;
  }
  return count ?? 0;
}

export async function getProjectLeadSummary(
  projectId: string,
  userId: string,
  options?: LeadCaptureOptions
): Promise<ProjectLeadSummary> {
  const client = getLeadCaptureClient(options);

  try {
    const [totalSubmissions, totalContactSubmissions, totalNewsletterSubmissions, totalSubscribers, latestRow] =
      await Promise.all([
        countRows(client, "project_lead_submissions", [
          ["project_id", projectId],
          ["user_id", userId],
        ]),
        countRows(client, "project_lead_submissions", [
          ["project_id", projectId],
          ["user_id", userId],
          ["kind", "contact"],
        ]),
        countRows(client, "project_lead_submissions", [
          ["project_id", projectId],
          ["user_id", userId],
          ["kind", "newsletter"],
        ]),
        countRows(client, "project_newsletter_subscribers", [
          ["project_id", projectId],
          ["user_id", userId],
        ]),
        client
          .from("project_lead_submissions")
          .select("created_at")
          .eq("project_id", projectId)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (latestRow.error) {
      throw latestRow.error;
    }

    return {
      totalSubmissions,
      totalContactSubmissions,
      totalNewsletterSubmissions,
      totalSubscribers,
      latestSubmissionAt: (latestRow.data as { created_at?: string } | null)?.created_at ?? null,
    };
  } catch (error) {
    throw buildLeadCaptureError(error, DB_READ_001, `Failed to build lead summary for ${projectId}`, {
      projectId,
      userId,
    });
  }
}

export async function updateProjectLeadCaptureSettings(
  projectId: string,
  userId: string,
  patch: Partial<ProjectIntegrationSettings>
): Promise<ProjectIntegrationSettings> {
  const current = await readProjectIntegrationRow(projectId, userId);
  const next = normalizeProjectIntegrationSettings({
    ...(current.integration_settings_json ?? {}),
    ...patch,
  });
  const now = new Date().toISOString();
  const client = getLeadCaptureClient();

  const { data, error } = await client
    .from("projects")
    .update({
      integration_settings_json: next,
      updated_at: now,
    })
    .eq("id", projectId)
    .eq("user_id", userId)
    .select("integration_settings_json")
    .single();

  if (error || !data) {
    throw buildLeadCaptureError(error, DB_UPDATE_001, `Failed to update lead settings for ${projectId}`, {
      projectId,
      userId,
    });
  }

  return normalizeProjectIntegrationSettings(
    (data as Pick<ProjectIntegrationSettingsRow, "integration_settings_json">).integration_settings_json
  );
}

export async function createLeadSubmissionRecord(
  input: CreateLeadSubmissionInput
): Promise<{ submission: LeadSubmission; subscriber: NewsletterSubscriber | null }> {
  const kind = normalizeLeadSubmissionKind(input.kind);
  const pagePath = typeof input.pagePath === "string" && input.pagePath.trim() ? input.pagePath.trim() : "/";
  const fields = normalizeLeadFields(input.fields);
  const { email, name, message } = extractLeadSummaryFields(kind, fields);

  if (!Object.keys(fields).length) {
    throw createAppError({
      code: VALIDATION_INPUT_001,
      devMessage: `Lead submission for project ${input.projectId} did not include any usable fields`,
      severity: "warn",
      metadata: { projectId: input.projectId, userId: input.userId, kind },
    });
  }

  if (kind === "newsletter" && !email) {
    throw createAppError({
      code: VALIDATION_INPUT_001,
      devMessage: `Newsletter submission for project ${input.projectId} did not include an email address`,
      severity: "warn",
      metadata: { projectId: input.projectId, userId: input.userId, kind },
    });
  }

  const client = getLeadCaptureClient(input.options);
  const now = new Date().toISOString();
  const payload = {
    id: crypto.randomUUID(),
    project_id: input.projectId,
    user_id: input.userId,
    kind,
    page_path: pagePath,
    form_id: input.formId?.trim() || null,
    name,
    email,
    message,
    fields_json: fields,
    notification_email: input.notificationEmail?.trim() || null,
    notification_delivery_status: "not_requested",
    notification_error: null,
    notified_at: null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await client
    .from("project_lead_submissions")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw buildLeadCaptureError(error, DB_WRITE_001, `Failed to create lead submission for ${input.projectId}`, {
      projectId: input.projectId,
      userId: input.userId,
      kind,
    });
  }

  const submission = mapLeadSubmission(data as LeadSubmissionRow);
  const subscriber =
    kind === "newsletter" && email
      ? await upsertNewsletterSubscriber(client, {
          projectId: input.projectId,
          userId: input.userId,
          email,
          name,
          sourceSubmissionId: submission.id,
        })
      : null;

  return { submission, subscriber };
}

export async function updateLeadSubmissionNotification(
  submissionId: string,
  input: {
    projectId: string;
    userId: string;
    deliveryStatus: LeadNotificationDeliveryStatus;
    notificationError?: string | null;
    notifiedAt?: string | null;
  },
  options?: LeadCaptureOptions
): Promise<LeadSubmission> {
  const client = getLeadCaptureClient(options);
  const { data, error } = await client
    .from("project_lead_submissions")
    .update({
      notification_delivery_status: input.deliveryStatus,
      notification_error: input.notificationError?.trim() || null,
      notified_at: input.notifiedAt ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .eq("project_id", input.projectId)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (error || !data) {
    throw buildLeadCaptureError(error, DB_UPDATE_001, `Failed to update lead notification for ${submissionId}`, {
      submissionId,
      projectId: input.projectId,
      userId: input.userId,
    });
  }

  return mapLeadSubmission(data as LeadSubmissionRow);
}

function escapeCsvValue(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildLeadExportCsv(
  kind: LeadCaptureExportKind,
  items: LeadSubmission[] | NewsletterSubscriber[]
): string {
  if (kind === "subscribers") {
    const rows = items as NewsletterSubscriber[];
    const header = [
      "id",
      "projectId",
      "email",
      "name",
      "sourceSubmissionId",
      "subscribedAt",
      "createdAt",
      "updatedAt",
    ];
    const body = rows.map((row) =>
      [
        row.id,
        row.projectId,
        row.email,
        row.name ?? "",
        row.sourceSubmissionId ?? "",
        row.subscribedAt,
        row.createdAt,
        row.updatedAt,
      ]
        .map(escapeCsvValue)
        .join(",")
    );
    return [header.join(","), ...body].join("\n");
  }

  const rows = items as LeadSubmission[];
  const header = [
    "id",
    "projectId",
    "kind",
    "pagePath",
    "formId",
    "name",
    "email",
    "message",
    "notificationEmail",
    "notificationDeliveryStatus",
    "notificationError",
    "notifiedAt",
    "createdAt",
    "updatedAt",
    "fieldsJson",
  ];
  const body = rows.map((row) =>
    [
      row.id,
      row.projectId,
      row.kind,
      row.pagePath,
      row.formId ?? "",
      row.name ?? "",
      row.email ?? "",
      row.message ?? "",
      row.notificationEmail ?? "",
      row.notificationDeliveryStatus,
      row.notificationError ?? "",
      row.notifiedAt ?? "",
      row.createdAt,
      row.updatedAt,
      JSON.stringify(row.fields),
    ]
      .map(escapeCsvValue)
      .join(",")
  );
  return [header.join(","), ...body].join("\n");
}
