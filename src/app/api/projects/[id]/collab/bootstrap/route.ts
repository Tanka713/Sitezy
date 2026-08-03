import { NextRequest, NextResponse } from "next/server";
import { readProjectCollaborationBootstrap } from "@/lib/server/project-collaboration";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  createAppError,
  handleRouteError,
} from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated collaboration bootstrap request for ${params.id}`,
        severity: "warn",
      });
    }

    return NextResponse.json(
      await readProjectCollaborationBootstrap(params.id, user.id, req.nextUrl.origin)
    );
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}
