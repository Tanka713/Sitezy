import { NextRequest, NextResponse } from "next/server";
import {
  createProjectComment,
  listProjectComments,
  updateProjectCommentStatus,
} from "@/lib/server/project-collaboration";
import { getAuthenticatedUser } from "@/lib/supabase/server";
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

export const runtime = "nodejs";

async function requireUser() {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw createAppError({
      code: AUTH_REQUIRED_001,
      devMessage: "Unauthenticated project comments request",
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
      comments: await listProjectComments(params.id, user.id),
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
      body?: string;
      pageId?: string | null;
      sectionId?: string | null;
      authorName?: string | null;
    }>(req);

    return NextResponse.json({
      comment: await createProjectComment({
        projectId: params.id,
        userId: user.id,
        authorName: body.authorName ?? null,
        body: String(body.body ?? ""),
        pageId: body.pageId ?? null,
        sectionId: body.sectionId ?? null,
      }),
    }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await requireUser();
    const body = await parseRequestBody<{
      commentId?: string;
      status?: "open" | "resolved";
    }>(req);

    if (!body.commentId || (body.status !== "open" && body.status !== "resolved")) {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: `Invalid project comment patch payload for ${params.id}`,
        severity: "warn",
        metadata: { projectId: params.id, userId: user.id, body },
      });
    }

    return NextResponse.json({
      comment: await updateProjectCommentStatus({
        projectId: params.id,
        userId: user.id,
        commentId: body.commentId,
        status: body.status,
      }),
    });
  } catch (error) {
    return handleRouteError(error, requestId, DB_UPDATE_001);
  }
}
