import { NextRequest, NextResponse } from "next/server";
import { createCmsEntry, type CmsEntryCreateInput } from "@/lib/server/project-cms";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_WRITE_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; collectionId: string } }
) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to create CMS entry for collection ${params.collectionId}`,
        severity: "warn",
      });
    }

    const body = await parseRequestBody<CmsEntryCreateInput>(req);
    const entry = await createCmsEntry(params.id, params.collectionId, user.id, body);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}
