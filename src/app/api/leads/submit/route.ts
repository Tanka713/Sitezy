import { NextRequest, NextResponse } from "next/server";
import { getProjectSnapshot } from "@/lib/server/project-db";
import { readUserSettings } from "@/lib/server/user-settings";
import {
  createLeadSubmissionRecord,
  updateLeadSubmissionNotification,
} from "@/lib/server/lead-capture";
import { sendLeadCaptureNotificationEmail } from "@/lib/server/lead-capture-email";
import { resolvePublishedProjectByHostname } from "@/lib/server/project-publishing";
import {
  normalizeLeadSubmissionKind,
  resolveEffectiveProjectLeadCaptureSettings,
} from "@/lib/lead-capture";
import { recordProjectAnalyticsEvent } from "@/lib/server/project-analytics";
import { dispatchProjectWebhookEvent } from "@/lib/server/project-webhooks";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_READ_002,
  DB_WRITE_001,
  VALIDATION_INPUT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";
import type {
  EffectiveProjectLeadCaptureSettings,
  LeadCaptureSubmitRequest,
  LeadSubmissionKind,
  ProjectSnapshot,
} from "@/types";

export const runtime = "nodejs";

type LeadSubmissionContext = {
  snapshot: ProjectSnapshot;
  ownerUserId: string;
  effectiveSettings: EffectiveProjectLeadCaptureSettings;
  mode: "preview" | "published";
  siteUrl: string | null;
  adminWrites: boolean;
};

function normalizePagePath(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function resolveRequestHostname(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  return host.split(",")[0]?.trim().toLowerCase() ?? "";
}

function readAnalyticsHeader(req: NextRequest, name: string) {
  const value = req.headers.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function lookupOwnerEmail(userId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  return data.user.email?.trim() ?? null;
}

function assertCaptureModeEnabled(kind: LeadSubmissionKind, settings: EffectiveProjectLeadCaptureSettings) {
  const enabled = kind === "newsletter" ? settings.newsletterCapture : settings.contactCapture;
  if (enabled !== "sitezy") {
    throw createAppError({
      code: VALIDATION_INPUT_001,
      devMessage: `Lead capture is disabled for ${kind} submissions`,
      userMessage:
        kind === "newsletter"
          ? "Newsletter signup is not enabled for this site."
          : "This form is not currently accepting submissions.",
      severity: "warn",
      metadata: { kind, effectiveSettings: settings },
    });
  }
}

async function resolveSubmissionContext(
  req: NextRequest,
  body: LeadCaptureSubmitRequest
): Promise<LeadSubmissionContext> {
  if (typeof body.projectId === "string" && body.projectId.trim()) {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated preview lead submission for project ${body.projectId}`,
        severity: "warn",
      });
    }

    const snapshot = await getProjectSnapshot(body.projectId.trim(), user.id);
    if (!snapshot) {
      throw createAppError({
        code: DB_READ_002,
        devMessage: `Preview lead submission project ${body.projectId} not found for ${user.id}`,
        severity: "warn",
        metadata: { projectId: body.projectId, userId: user.id },
      });
    }

    const ownerSettings = await readUserSettings(user.id);
    const ownerEmail = user.email?.trim() ?? null;
    return {
      snapshot,
      ownerUserId: user.id,
      effectiveSettings: resolveEffectiveProjectLeadCaptureSettings(
        snapshot.project.integrationSettings,
        ownerSettings,
        ownerEmail
      ),
      mode: "preview",
      siteUrl: snapshot.project.publishedSite?.liveUrl ?? null,
      adminWrites: false,
    };
  }

  const hostname = resolveRequestHostname(req);
  if (!hostname) {
    throw createAppError({
      code: VALIDATION_INPUT_001,
      devMessage: "Lead submission could not resolve request hostname",
      severity: "warn",
    });
  }

  const resolved = await resolvePublishedProjectByHostname(hostname);

  if (!resolved) {
    throw createAppError({
      code: DB_READ_002,
      devMessage: `Lead submission could not resolve a published project for host ${hostname}`,
      userMessage: "This site is not published yet.",
      severity: "warn",
      metadata: { hostname },
    });
  }

  const snapshot = await getProjectSnapshot(resolved.project.id, resolved.ownerUserId, { admin: true });
  if (!snapshot) {
    throw createAppError({
      code: DB_READ_002,
      devMessage: `Published lead submission project ${resolved.project.id} no longer exists`,
      severity: "warn",
      metadata: { hostname, projectId: resolved.project.id, userId: resolved.ownerUserId },
    });
  }

  const [ownerSettings, ownerEmail] = await Promise.all([
    readUserSettings(resolved.ownerUserId, { admin: true }),
    lookupOwnerEmail(resolved.ownerUserId),
  ]);

  return {
    snapshot,
    ownerUserId: resolved.ownerUserId,
    effectiveSettings: resolveEffectiveProjectLeadCaptureSettings(
      snapshot.project.integrationSettings,
      ownerSettings,
      ownerEmail
    ),
    mode: "published",
    siteUrl: resolved.site.liveUrl,
    adminWrites: true,
  };
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const body = await parseRequestBody<LeadCaptureSubmitRequest>(req);
    const kind = normalizeLeadSubmissionKind(body.kind);
    const pagePath = normalizePagePath(body.pagePath);

    if (!pagePath) {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: "Lead submission request omitted a valid pagePath",
        severity: "warn",
      });
    }

    if (typeof body.honeypot === "string" && body.honeypot.trim()) {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: "Lead submission honeypot field was populated",
        severity: "warn",
      });
    }

    const context = await resolveSubmissionContext(req, body);
    assertCaptureModeEnabled(kind, context.effectiveSettings);

    let { submission, subscriber } = await createLeadSubmissionRecord({
      projectId: context.snapshot.project.id,
      userId: context.ownerUserId,
      kind,
      pagePath,
      formId: body.formId ?? null,
      fields: body.fields,
      notificationEmail: context.effectiveSettings.notificationEmail,
      options: { admin: context.adminWrites },
    });

    if (context.effectiveSettings.notificationEmail) {
      const emailResult = await sendLeadCaptureNotificationEmail({
        to: context.effectiveSettings.notificationEmail,
        kind,
        projectName: context.snapshot.project.name,
        siteUrl: context.siteUrl,
        pagePath,
        formId: body.formId ?? null,
        name: submission.name,
        email: submission.email,
        message: submission.message,
        fields: submission.fields,
      });

      submission = await updateLeadSubmissionNotification(
        submission.id,
        {
          projectId: context.snapshot.project.id,
          userId: context.ownerUserId,
          deliveryStatus: emailResult.sent ? "sent" : "failed",
          notificationError: emailResult.error,
          notifiedAt: emailResult.sent ? new Date().toISOString() : null,
        },
        { admin: context.adminWrites }
      );
    }

    await Promise.allSettled([
      recordProjectAnalyticsEvent({
        projectId: context.snapshot.project.id,
        userId: context.ownerUserId,
        eventType: kind === "newsletter" ? "subscriber_conversion" : "lead_conversion",
        pagePath,
        sessionId: readAnalyticsHeader(req, "x-sitezy-session-id"),
        visitorId: readAnalyticsHeader(req, "x-sitezy-visitor-id"),
        referrer: req.headers.get("referer") ?? null,
        metadata: {
          mode: context.mode,
          formId: body.formId ?? null,
          submissionId: submission.id,
          subscriberId: subscriber?.id ?? null,
        },
      }),
      dispatchProjectWebhookEvent({
        projectId: context.snapshot.project.id,
        userId: context.ownerUserId,
        eventType: kind === "newsletter" ? "subscriber.created" : "lead.created",
        payload: {
          mode: context.mode,
          projectId: context.snapshot.project.id,
          projectName: context.snapshot.project.name,
          pagePath,
          formId: body.formId ?? null,
          submission,
          subscriber,
        },
      }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        mode: context.mode,
        submission,
        subscriber,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}
