import { NextRequest, NextResponse } from "next/server";
import {
  createProjectPreviewShare,
  listProjectPreviewShares,
} from "@/lib/server/project-collaboration";
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

async function requireUser() {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw createAppError({
      code: AUTH_REQUIRED_001,
      devMessage: "Unauthenticated preview share request",
      severity: "warn",
    });
  }
  return user;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await requireUser();
    return NextResponse.json({
      shares: await listProjectPreviewShares(params.id, user.id, req.nextUrl.origin),
    });
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await requireUser();
    const body = await parseRequestBody<{
      pageId?: string | null;
      label?: string | null;
      expiresAt?: string | null;
    }>(req);

    return NextResponse.json({
      share: await createProjectPreviewShare({
        projectId: params.id,
        userId: user.id,
        pageId: body.pageId ?? null,
        label: body.label ?? null,
        expiresAt: body.expiresAt ?? null,
        origin: req.nextUrl.origin,
      }),
    }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}
