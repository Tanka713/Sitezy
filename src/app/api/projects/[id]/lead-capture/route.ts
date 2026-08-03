import { NextRequest, NextResponse } from "next/server";
import { getProjectSnapshot } from "@/lib/server/project-db";
import { readUserSettings } from "@/lib/server/user-settings";
import { updateProjectLeadCaptureSettings } from "@/lib/server/lead-capture";
import { resolveEffectiveProjectLeadCaptureSettings } from "@/lib/lead-capture";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_READ_002,
  DB_UPDATE_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";
import type { ProjectIntegrationSettings } from "@/types";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to update lead capture for project ${params.id}`,
        severity: "warn",
      });
    }

    const snapshot = await getProjectSnapshot(params.id, user.id);
    if (!snapshot) {
      throw createAppError({
        code: DB_READ_002,
        devMessage: `Lead capture update requested for missing project ${params.id}`,
        severity: "warn",
        metadata: { projectId: params.id, userId: user.id },
      });
    }

    const body = await parseRequestBody<Partial<ProjectIntegrationSettings>>(req);
    const integrationSettings = await updateProjectLeadCaptureSettings(params.id, user.id, body ?? {});
    const ownerSettings = await readUserSettings(user.id);

    return NextResponse.json({
      integrationSettings,
      effectiveSettings: resolveEffectiveProjectLeadCaptureSettings(
        integrationSettings,
        ownerSettings,
        user.email?.trim() ?? null
      ),
    });
  } catch (error) {
    return handleRouteError(error, requestId, DB_UPDATE_001);
  }
}
