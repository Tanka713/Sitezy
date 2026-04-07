import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { assertLaunchRole } from "@/lib/server/beta-access";
import { listCustomerServiceSupportRequests } from "@/lib/server/support-requests";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  createAppError,
  handleRouteError,
} from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated customer service support queue request",
        severity: "warn",
      });
    }

    await assertLaunchRole(user, "customer_service");
    const requests = await listCustomerServiceSupportRequests();

    return NextResponse.json({
      requests,
      summary: {
        total: requests.length,
        pending: requests.filter((request) => request.status === "pending").length,
        open: requests.filter((request) => request.status === "open").length,
        closed: requests.filter((request) => request.status === "closed").length,
      },
    });
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}
