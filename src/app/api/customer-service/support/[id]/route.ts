import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { assertLaunchRole } from "@/lib/server/beta-access";
import { createCustomerServiceSupportReply, updateSupportRequestStatus } from "@/lib/server/support-requests";
import {
  AUTH_REQUIRED_001,
  DB_UPDATE_001,
  DB_WRITE_001,
  VALIDATION_INPUT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";
import type { SupportRequestStatus } from "@/types";

export const runtime = "nodejs";

function resolveSupportReplyAuthorName(
  user: Awaited<ReturnType<typeof getAuthenticatedUser>>,
  role: "customer_service" | "admin"
) {
  if (!user) return role === "admin" ? "Admin" : "Customer service";

  const candidates = [
    user.user_metadata?.full_name,
    user.user_metadata?.name,
    user.user_metadata?.display_name,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return role === "admin" ? "Admin" : "Customer service";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated customer service support patch request",
        severity: "warn",
      });
    }

    await assertLaunchRole(user, "customer_service");

    const body = await parseRequestBody<{ status?: SupportRequestStatus }>(req);
    if (body.status !== "pending" && body.status !== "open" && body.status !== "closed") {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: `Customer service support patch called without valid status for ${params.id}`,
        severity: "warn",
      });
    }

    return NextResponse.json({
      request: await updateSupportRequestStatus(params.id, body.status),
    });
  } catch (error) {
    return handleRouteError(error, requestId, DB_UPDATE_001);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated customer service support reply request",
        severity: "warn",
      });
    }

    const access = await assertLaunchRole(user, "customer_service");
    const body = await parseRequestBody<{ body?: string; closeRequest?: boolean }>(req);

    if (typeof body.body !== "string" || !body.body.trim()) {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: `Customer service reply called without a valid body for ${params.id}`,
        severity: "warn",
      });
    }

    const result = await createCustomerServiceSupportReply(
      {
        id: user.id,
        email: user.email,
        role: access.role ?? "customer_service",
        name: resolveSupportReplyAuthorName(
          user,
          access.role === "admin" ? "admin" : "customer_service"
        ),
      },
      params.id,
      {
        body: body.body,
        closeRequest: Boolean(body.closeRequest),
        origin: new URL(req.url).origin,
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}
