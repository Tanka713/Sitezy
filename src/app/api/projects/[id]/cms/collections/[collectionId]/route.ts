import { NextRequest, NextResponse } from "next/server";
import {
  deleteCmsCollection,
  updateCmsCollection,
  type CmsCollectionUpdateInput,
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
  { params }: { params: { id: string; collectionId: string } }
) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to update CMS collection ${params.collectionId}`,
        severity: "warn",
      });
    }

    const body = await parseRequestBody<CmsCollectionUpdateInput>(req);
    const collection = await updateCmsCollection(params.id, params.collectionId, user.id, body);
    return NextResponse.json({ collection });
  } catch (error) {
    return handleRouteError(error, requestId, DB_UPDATE_001);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; collectionId: string } }
) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to delete CMS collection ${params.collectionId}`,
        severity: "warn",
      });
    }

    await deleteCmsCollection(params.id, params.collectionId, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, requestId, DB_DELETE_001);
  }
}
