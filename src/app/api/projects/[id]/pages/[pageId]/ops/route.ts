import { NextRequest, NextResponse } from "next/server";
import {
  acquireProjectPageLock,
  applyProjectPageOperation,
  listProjectPageOperations,
} from "@/lib/server/project-collaboration";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  DB_WRITE_001,
  VALIDATION_INPUT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";
import type { PageSection, ProjectPageOperationType } from "@/types";

export const runtime = "nodejs";

async function requireUser() {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw createAppError({
      code: AUTH_REQUIRED_001,
      devMessage: "Unauthenticated page ops request",
      severity: "warn",
    });
  }
  return user;
}

function normalizeOperationType(value: unknown): ProjectPageOperationType {
  if (
    value === "replace_html" ||
    value === "replace_sections" ||
    value === "visual_edit" ||
    value === "style_edit" ||
    value === "structure_edit"
  ) {
    return value;
  }

  throw createAppError({
    code: VALIDATION_INPUT_001,
    devMessage: `Invalid project page operation type ${String(value ?? "")}`,
    severity: "warn",
    metadata: { operationType: value ?? null },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; pageId: string } }
) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await requireUser();
    const sinceRevisionParam = Number(req.nextUrl.searchParams.get("sinceRevision") ?? "");
    return NextResponse.json({
      operations: await listProjectPageOperations(
        params.id,
        params.pageId,
        user.id,
        Number.isFinite(sinceRevisionParam) ? Math.trunc(sinceRevisionParam) : undefined
      ),
    });
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; pageId: string } }
) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await requireUser();
    const body = await parseRequestBody<{
      action?: "lock" | "apply";
      lockMode?: "code" | "transform";
      ttlSeconds?: number;
      operationType?: ProjectPageOperationType;
      expectedRevision?: number;
      payload?: Record<string, unknown> | null;
      nextHtml?: string | null;
      nextSections?: PageSection[] | null;
      nextMeta?: unknown;
      requireLockMode?: "code" | "transform" | null;
    }>(req);

    if (body.action === "lock" && body.lockMode) {
      return NextResponse.json({
        lock: await acquireProjectPageLock({
          projectId: params.id,
          pageId: params.pageId,
          userId: user.id,
          mode: body.lockMode,
          ttlSeconds: body.ttlSeconds,
        }),
      });
    }

    if (typeof body.expectedRevision !== "number" || !Number.isFinite(body.expectedRevision)) {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: `Project page op missing expectedRevision for ${params.pageId}`,
        severity: "warn",
        metadata: { projectId: params.id, pageId: params.pageId, userId: user.id },
      });
    }

    return NextResponse.json({
      operation: await applyProjectPageOperation({
        projectId: params.id,
        pageId: params.pageId,
        userId: user.id,
        operationType: normalizeOperationType(body.operationType),
        expectedRevision: Math.trunc(body.expectedRevision),
        payload: body.payload ?? {},
        nextHtml: body.nextHtml ?? null,
        nextSections: body.nextSections ?? null,
        nextMeta: body.nextMeta,
        requireLockMode: body.requireLockMode ?? null,
      }),
    }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}
