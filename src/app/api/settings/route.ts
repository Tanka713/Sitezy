import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getUserSettingsPayload, resetUserSettings, upsertUserSettings } from "@/lib/server/user-settings";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  DB_UPDATE_001,
  DB_WRITE_001,
  VALIDATION_INPUT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";
import type { UserSettings } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated request to load user settings",
        severity: "warn",
      });
    }

    return NextResponse.json(await getUserSettingsPayload(user));
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}

export async function PUT(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated request to update user settings",
        severity: "warn",
      });
    }

    const body = await parseRequestBody<{ settings?: Partial<UserSettings> }>(req);
    if (!body.settings || typeof body.settings !== "object") {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: "Settings update called without a settings payload",
        severity: "warn",
      });
    }

    const settings = await upsertUserSettings(user.id, body.settings);
    return NextResponse.json({
      account: (await getUserSettingsPayload(user)).account,
      settings,
    });
  } catch (error) {
    return handleRouteError(error, requestId, DB_UPDATE_001);
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated request to reset user settings",
        severity: "warn",
      });
    }

    const settings = await resetUserSettings(user.id);
    return NextResponse.json({
      account: (await getUserSettingsPayload(user)).account,
      settings,
    });
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}
