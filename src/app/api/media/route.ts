import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { listUserMedia, upsertUserMediaAssets } from "@/lib/server/user-media";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  DB_WRITE_001,
  VALIDATION_INPUT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";
import type { ProjectMediaAsset } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated request to list user media",
        severity: "warn",
      });
    }

    return NextResponse.json({ media: await listUserMedia(user.id) });
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated request to upsert user media",
        severity: "warn",
      });
    }

    const body = await parseRequestBody<{ assets?: ProjectMediaAsset[] }>(req);
    if (!Array.isArray(body.assets) || body.assets.length === 0) {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: "User media upsert called without assets",
        severity: "warn",
      });
    }

    return NextResponse.json({ media: await upsertUserMediaAssets(user.id, body.assets) });
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}
