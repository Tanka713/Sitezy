import { NextRequest, NextResponse } from "next/server";
import { getProjectSnapshot } from "@/lib/server/project-db";
import { readUserSettings, upsertUserSettings } from "@/lib/server/user-settings";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  DB_READ_002,
  DB_UPDATE_001,
  VALIDATION_INPUT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";
import type { UserSettings } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated analytics settings request for ${params.id}`,
        severity: "warn",
      });
    }

    const snapshot = await getProjectSnapshot(params.id, user.id);
    if (!snapshot) {
      throw createAppError({
        code: DB_READ_002,
        devMessage: `Project ${params.id} not found while reading analytics settings`,
        severity: "warn",
        metadata: { projectId: params.id, userId: user.id },
      });
    }

    const settings = await readUserSettings(user.id);
    return NextResponse.json({ analytics: settings.integrations.analytics });
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated analytics settings update for ${params.id}`,
        severity: "warn",
      });
    }

    const snapshot = await getProjectSnapshot(params.id, user.id);
    if (!snapshot) {
      throw createAppError({
        code: DB_READ_002,
        devMessage: `Project ${params.id} not found while updating analytics settings`,
        severity: "warn",
        metadata: { projectId: params.id, userId: user.id },
      });
    }

    const body = await parseRequestBody<{
      analytics?: Partial<UserSettings["integrations"]["analytics"]>;
    }>(req);

    if (!body.analytics || typeof body.analytics !== "object") {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: `Analytics settings update missing analytics payload for ${params.id}`,
        severity: "warn",
        metadata: { projectId: params.id, userId: user.id },
      });
    }

    const currentSettings = await readUserSettings(user.id);
    const measurementId = String(
      body.analytics.ga4?.measurementId ??
        currentSettings.integrations.analytics.ga4.measurementId ??
        currentSettings.integrations.analyticsId ??
        ""
    ).trim();

    const settings = await upsertUserSettings(user.id, {
      integrations: {
        ...currentSettings.integrations,
        analyticsId: measurementId,
        analytics: {
          enableSitezyAnalytics:
            body.analytics.enableSitezyAnalytics ??
            currentSettings.integrations.analytics.enableSitezyAnalytics,
          ...body.analytics,
          ga4: {
            enabled:
              body.analytics.ga4?.enabled ??
              currentSettings.integrations.analytics.ga4.enabled ??
              Boolean(measurementId),
            ...body.analytics.ga4,
            measurementId,
          },
          metaPixel: {
            enabled:
              body.analytics.metaPixel?.enabled ??
              currentSettings.integrations.analytics.metaPixel.enabled,
            pixelId:
              body.analytics.metaPixel?.pixelId ??
              currentSettings.integrations.analytics.metaPixel.pixelId,
          },
        },
      },
    });

    return NextResponse.json({ analytics: settings.integrations.analytics });
  } catch (error) {
    return handleRouteError(error, requestId, DB_UPDATE_001);
  }
}
