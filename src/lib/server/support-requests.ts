import type { User } from "@supabase/supabase-js";
import type {
  BetaRole,
  CustomerServiceSupportRequest,
  SupportReplyAuthorRole,
  SupportReplyEmailDeliveryStatus,
  SupportRequest,
  SupportRequestKind,
  SupportRequestMetadata,
  SupportRequestReply,
  SupportRequestStatus,
} from "@/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSupportReplyEmail } from "@/lib/server/support-email";
import {
  DB_READ_001,
  DB_SCHEMA_001,
  DB_WRITE_001,
  DB_UPDATE_001,
  VALIDATION_INPUT_001,
  createAppError,
  type ErrorCode,
} from "@/lib/errors";

type SupportRequestRow = {
  id: string;
  ticket_number?: number | null;
  user_id: string;
  user_email: string;
  user_name: string | null;
  kind: string;
  subject: string;
  message: string;
  status: string;
  metadata_json: Partial<SupportRequestMetadata> | null;
  created_at: string;
  updated_at: string;
};

type SupportRequestReplyRow = {
  id: string;
  request_id: string;
  user_id: string;
  author_user_id: string | null;
  author_role: string;
  author_name?: string | null;
  body: string;
  email_delivery_status: string;
  email_error: string | null;
  emailed_at: string | null;
  created_at: string;
  updated_at: string;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

function buildSupportError(
  error: unknown,
  fallbackCode: ErrorCode,
  devMessage: string,
  metadata?: Record<string, unknown>
) {
  const maybe = (error ?? {}) as SupabaseErrorLike;
  return createAppError({
    code: fallbackCode,
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

function isMissingSupportReplyStorage(error: unknown) {
  const maybe = (error ?? {}) as SupabaseErrorLike;
  const code = maybe.code?.toUpperCase() ?? "";
  const message = maybe.message?.toLowerCase() ?? "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("support_request_replies") ||
    message.includes("could not find the table")
  );
}

function buildMissingReplyStorageError(action: string) {
  return createAppError({
    code: DB_SCHEMA_001,
    devMessage: `Support reply storage is unavailable during ${action}`,
    userMessage: "Support replies need the latest database migration before they can be used.",
    severity: "warn",
    metadata: {
      requiredMigration: "supabase/add-support-request-replies.sql",
      feature: "support-replies",
      action,
    },
  });
}

function isMissingSupportReplyAuthorNameColumn(error: unknown) {
  const maybe = (error ?? {}) as SupabaseErrorLike;
  const code = maybe.code?.toUpperCase() ?? "";
  const message = maybe.message?.toLowerCase() ?? "";
  return (
    code === "PGRST204" ||
    code === "42703" ||
    message.includes("author_name") ||
    message.includes("could not find the column")
  );
}

function normalizeKind(kind: unknown): SupportRequestKind {
  return kind === "bug" || kind === "feature" ? kind : "support";
}

function normalizeStatus(status: unknown): SupportRequestStatus {
  return status === "pending" || status === "closed" ? status : "open";
}

function normalizeReplyAuthorRole(role: unknown): SupportReplyAuthorRole {
  return role === "admin" || role === "customer_service" || role === "system" ? role : "customer";
}

function normalizeReplyEmailDeliveryStatus(status: unknown): SupportReplyEmailDeliveryStatus {
  return status === "sent" || status === "failed" ? status : "not_requested";
}

function normalizeMetadata(metadata?: Partial<SupportRequestMetadata> | null): SupportRequestMetadata {
  return {
    route: typeof metadata?.route === "string" && metadata.route.trim() ? metadata.route.trim() : null,
    browser: typeof metadata?.browser === "string" && metadata.browser.trim() ? metadata.browser.trim() : null,
  };
}

function normalizeSupportReplyAuthorName(name: unknown): string | null {
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

function mapSupportReply(row: SupportRequestReplyRow, includeDeliveryFields: boolean): SupportRequestReply {
  return {
    id: row.id,
    requestId: row.request_id,
    authorRole: normalizeReplyAuthorRole(row.author_role),
    authorName: normalizeSupportReplyAuthorName(row.author_name),
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(includeDeliveryFields
      ? {
          emailedAt: row.emailed_at,
          emailDeliveryStatus: normalizeReplyEmailDeliveryStatus(row.email_delivery_status),
          emailError: row.email_error,
        }
      : {}),
  };
}

function mapSupportRequest(row: SupportRequestRow, replies: SupportRequestReply[] = []): SupportRequest {
  return {
    id: row.id,
    ticketNumber: typeof row.ticket_number === "number" ? row.ticket_number : null,
    kind: normalizeKind(row.kind),
    subject: row.subject,
    message: row.message,
    status: normalizeStatus(row.status),
    metadata: normalizeMetadata(row.metadata_json),
    replies,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCustomerServiceSupportRequest(
  row: SupportRequestRow,
  replies: SupportRequestReply[] = []
): CustomerServiceSupportRequest {
  return {
    ...mapSupportRequest(row, replies),
    userEmail: row.user_email,
    userName: row.user_name,
  };
}

function groupReplies(rows: SupportRequestReplyRow[], includeDeliveryFields: boolean) {
  const grouped = new Map<string, SupportRequestReply[]>();
  for (const row of rows) {
    const current = grouped.get(row.request_id) ?? [];
    current.push(mapSupportReply(row, includeDeliveryFields));
    grouped.set(row.request_id, current);
  }
  return grouped;
}

async function listSupportRepliesForCustomer(requestIds: string[]) {
  if (!requestIds.length) return new Map<string, SupportRequestReply[]>();

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("support_request_replies")
    .select("*")
    .in("request_id", requestIds)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingSupportReplyStorage(error)) {
      return new Map<string, SupportRequestReply[]>();
    }
    throw buildSupportError(error, DB_READ_001, "Failed to list support replies for customer support inbox", {
      requestIds,
    });
  }

  return groupReplies((data ?? []) as SupportRequestReplyRow[], false);
}

async function listSupportRepliesForCustomerService(requestIds: string[]) {
  if (!requestIds.length) return new Map<string, SupportRequestReply[]>();

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("support_request_replies")
    .select("*")
    .in("request_id", requestIds)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingSupportReplyStorage(error)) {
      return new Map<string, SupportRequestReply[]>();
    }
    throw buildSupportError(error, DB_READ_001, "Failed to list support replies for customer service queue", {
      requestIds,
    });
  }

  return groupReplies((data ?? []) as SupportRequestReplyRow[], true);
}

async function readSupportRequestRowById(requestId: string): Promise<SupportRequestRow> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("support_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (error || !data) {
    throw buildSupportError(error, DB_READ_001, `Failed to read support request ${requestId}`, { requestId });
  }

  return data as SupportRequestRow;
}

async function readCustomerServiceSupportRequestById(requestId: string): Promise<CustomerServiceSupportRequest> {
  const row = await readSupportRequestRowById(requestId);
  const repliesByRequest = await listSupportRepliesForCustomerService([requestId]);
  return mapCustomerServiceSupportRequest(row, repliesByRequest.get(requestId) ?? []);
}

export async function listSupportRequests(userId: string): Promise<SupportRequest[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("support_requests")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw buildSupportError(error, DB_READ_001, `Failed to list support requests for user ${userId}`, { userId });
  }

  const rows = (data ?? []) as SupportRequestRow[];
  const repliesByRequest = await listSupportRepliesForCustomer(rows.map((row) => row.id));
  return rows.map((row) => mapSupportRequest(row, repliesByRequest.get(row.id) ?? []));
}

export async function createSupportRequest(
  user: User,
  input: {
    kind: SupportRequestKind;
    subject: string;
    message: string;
    metadata?: Partial<SupportRequestMetadata> | null;
  }
): Promise<SupportRequest> {
  const subject = input.subject.trim();
  const message = input.message.trim();

  if (!subject || !message) {
    throw createAppError({
      code: VALIDATION_INPUT_001,
      devMessage: "Support request create called without a subject or message",
      severity: "warn",
      metadata: { userId: user.id },
    });
  }

  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    user_id: user.id,
    user_email: user.email ?? "",
    user_name:
      typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
        ? user.user_metadata.full_name.trim()
        : null,
    kind: normalizeKind(input.kind),
    subject,
    message,
    status: "pending" as const,
    metadata_json: normalizeMetadata(input.metadata),
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase.from("support_requests").insert(row).select("*").single();

  if (error || !data) {
    throw buildSupportError(error, DB_WRITE_001, `Failed to create support request for user ${user.id}`, {
      userId: user.id,
      kind: row.kind,
    });
  }

  return mapSupportRequest(data as SupportRequestRow, []);
}

export async function listCustomerServiceSupportRequests(): Promise<CustomerServiceSupportRequest[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("support_requests")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw buildSupportError(error, DB_READ_001, "Failed to list customer service support requests");
  }

  const rows = (data ?? []) as SupportRequestRow[];
  const repliesByRequest = await listSupportRepliesForCustomerService(rows.map((row) => row.id));
  return rows.map((row) => mapCustomerServiceSupportRequest(row, repliesByRequest.get(row.id) ?? []));
}

export async function updateSupportRequestStatus(
  requestId: string,
  status: SupportRequestStatus
): Promise<CustomerServiceSupportRequest> {
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("support_requests")
    .update({
      status: normalizeStatus(status),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    throw buildSupportError(error, DB_UPDATE_001, `Failed to update support request ${requestId}`, {
      requestId,
      status,
    });
  }

  return readCustomerServiceSupportRequestById(requestId);
}

export async function createCustomerServiceSupportReply(
  actor: Pick<User, "id" | "email"> & { role: BetaRole; name?: string | null },
  requestId: string,
  input: {
    body: string;
    closeRequest?: boolean;
    origin?: string | null;
  }
): Promise<{
  request: CustomerServiceSupportRequest;
  reply: SupportRequestReply;
  emailDelivered: boolean;
  emailError: string | null;
}> {
  const body = input.body.trim();
  if (!body) {
    throw createAppError({
      code: VALIDATION_INPUT_001,
      devMessage: `Customer service reply called without a message for request ${requestId}`,
      severity: "warn",
      metadata: { actorId: actor.id, requestId },
    });
  }

  const request = await readSupportRequestRowById(requestId);
  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const replyId = crypto.randomUUID();
  const authorRole: SupportReplyAuthorRole =
    actor.role === "admin" ? "admin" : actor.role === "customer_service" ? "customer_service" : "customer";
  const authorName = normalizeSupportReplyAuthorName(actor.name);

  const baseReplyInsert = {
    id: replyId,
    request_id: requestId,
    user_id: request.user_id,
    author_user_id: actor.id,
    author_role: authorRole,
    body,
    email_delivery_status: "not_requested",
    email_error: null,
    emailed_at: null,
    created_at: now,
    updated_at: now,
  };

  let insertError: SupabaseErrorLike | null = null;
  const insertWithAuthorName = authorName ? { ...baseReplyInsert, author_name: authorName } : baseReplyInsert;
  const firstInsert = await admin.from("support_request_replies").insert(insertWithAuthorName);
  insertError = firstInsert.error;

  if (insertError && authorName && isMissingSupportReplyAuthorNameColumn(insertError)) {
    const fallbackInsert = await admin.from("support_request_replies").insert(baseReplyInsert);
    insertError = fallbackInsert.error;
  }

  if (insertError) {
    if (isMissingSupportReplyStorage(insertError)) {
      throw buildMissingReplyStorageError("createCustomerServiceSupportReply");
    }
    throw buildSupportError(insertError, DB_WRITE_001, `Failed to create support reply for request ${requestId}`, {
      actorId: actor.id,
      requestId,
    });
  }

  const emailResult = await sendSupportReplyEmail({
    to: request.user_email,
    ticketNumber: typeof request.ticket_number === "number" ? request.ticket_number : null,
    requestSubject: request.subject,
    replyBody: body,
    userName: request.user_name,
    replyAuthorName: authorName,
    origin: input.origin,
  });

  const emailDeliveryStatus: SupportReplyEmailDeliveryStatus = emailResult.sent ? "sent" : "failed";
  const emailUpdatedAt = new Date().toISOString();
  const { error: replyUpdateError } = await admin
    .from("support_request_replies")
    .update({
      email_delivery_status: emailDeliveryStatus,
      email_error: emailResult.error,
      emailed_at: emailResult.sent ? emailUpdatedAt : null,
      updated_at: emailUpdatedAt,
    })
    .eq("id", replyId);

  if (replyUpdateError) {
    if (isMissingSupportReplyStorage(replyUpdateError)) {
      throw buildMissingReplyStorageError("updateCustomerServiceSupportReplyDelivery");
    }
    throw buildSupportError(
      replyUpdateError,
      DB_UPDATE_001,
      `Failed to update support reply delivery state for request ${requestId}`,
      {
        actorId: actor.id,
        requestId,
        replyId,
      }
    );
  }

  const { error: requestUpdateError } = await admin
    .from("support_requests")
    .update({
      ...(input.closeRequest ? { status: "closed" } : {}),
      ...(!input.closeRequest ? { status: "open" } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (requestUpdateError) {
    throw buildSupportError(requestUpdateError, DB_UPDATE_001, `Failed to touch support request ${requestId}`, {
      actorId: actor.id,
      requestId,
      closeRequest: Boolean(input.closeRequest),
    });
  }

  const updatedRequest = await readCustomerServiceSupportRequestById(requestId);
  const fallbackReply = mapSupportReply(
    {
      id: replyId,
      request_id: requestId,
      user_id: request.user_id,
      author_user_id: actor.id,
      author_role: authorRole,
      author_name: authorName,
      body,
      email_delivery_status: emailDeliveryStatus,
      email_error: emailResult.error,
      emailed_at: emailResult.sent ? emailUpdatedAt : null,
      created_at: now,
      updated_at: emailUpdatedAt,
    },
    true
  );
  const existingReply = updatedRequest.replies.find((item) => item.id === replyId);
  const reply =
    existingReply && !existingReply.authorName && fallbackReply.authorName
      ? { ...existingReply, authorName: fallbackReply.authorName }
      : existingReply ?? fallbackReply;
  const requestForResponse =
    existingReply && reply.authorName && !existingReply.authorName
      ? {
          ...updatedRequest,
          replies: updatedRequest.replies.map((item) => (item.id === replyId ? reply : item)),
        }
      : updatedRequest;

  return {
    request: requestForResponse,
    reply,
    emailDelivered: emailResult.sent,
    emailError: emailResult.error,
  };
}
