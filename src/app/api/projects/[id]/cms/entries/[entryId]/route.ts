import { NextRequest, NextResponse } from "next/server";
import {
  deleteCmsEntry,
  updateCmsEntry,
  type CmsEntryUpdateInput,
} from "@/lib/server/project-cms";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_DELETE_001,
  DB_UPDATE_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to update CMS entry ${params.entryId}`,
        severity: "warn",
      });
    }

    const body = await parseRequestBody<CmsEntryUpdateInput>(req);
    const entry = await updateCmsEntry(params.id, params.entryId, user.id, body);
    return NextResponse.json({ entry });
  } catch (error) {
    return handleRouteError(error, requestId, DB_UPDATE_001);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to delete CMS entry ${params.entryId}`,
        severity: "warn",
      });
    }

    await deleteCmsEntry(params.id, params.entryId, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, requestId, DB_DELETE_001);
  }
}
