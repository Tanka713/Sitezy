import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { deleteUserMediaAsset, renameUserMediaAsset } from "@/lib/server/user-media";
import {
  AUTH_REQUIRED_001,
  DB_DELETE_001,
  DB_UPDATE_001,
  VALIDATION_INPUT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to rename media asset ${params.id}`,
        severity: "warn",
      });
    }

    const body = await parseRequestBody<{ name?: string }>(req);
    if (typeof body.name !== "string" || !body.name.trim()) {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: `Invalid media rename payload for asset ${params.id}`,
        severity: "warn",
      });
    }

    return NextResponse.json({ media: await renameUserMediaAsset(user.id, params.id, body.name) });
  } catch (error) {
    return handleRouteError(error, requestId, DB_UPDATE_001);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to delete media asset ${params.id}`,
        severity: "warn",
      });
    }

    await deleteUserMediaAsset(user.id, params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, requestId, DB_DELETE_001);
  }
}
