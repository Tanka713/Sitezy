import { NextRequest, NextResponse } from "next/server";
import {
  createCmsCollection,
  listCmsCollectionsForProject,
  type CmsCollectionCreateInput,
} from "@/lib/server/project-cms";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  DB_WRITE_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to list CMS collections for project ${params.id}`,
        severity: "warn",
      });
    }

    const result = await listCmsCollectionsForProject(params.id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to create CMS collection for project ${params.id}`,
        severity: "warn",
      });
    }

    const body = await parseRequestBody<CmsCollectionCreateInput>(req);
    const collection = await createCmsCollection(params.id, user.id, body);
    return NextResponse.json({ collection }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}
