import { NextRequest, NextResponse } from "next/server";
import { runProjectGenerationJobStep } from "@/lib/server/project-generation-runner";
import {
  API_REQUEST_002,
  AUTH_PERMISSION_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 300;

function assertWorkerSecret(req: NextRequest) {
  const configuredSecret = process.env.SITEZY_WORKER_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const providedSecret = req.headers.get("x-sitezy-worker-secret");

  if (!configuredSecret || !providedSecret || providedSecret !== configuredSecret) {
    throw createAppError({
      code: AUTH_PERMISSION_001,
      devMessage: "Invalid project generation worker secret",
      severity: "warn",
      metadata: {
        hasConfiguredSecret: Boolean(configuredSecret),
        hasProvidedSecret: Boolean(providedSecret),
      },
    });
  }
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;

  try {
    assertWorkerSecret(req);

    const body = await parseRequestBody<{ jobId?: string; workerId?: string }>(req);
    if (!body.jobId || !body.workerId) {
      throw createAppError({
        code: API_REQUEST_002,
        devMessage: "Project generation step request missing jobId or workerId",
        severity: "warn",
        metadata: { hasJobId: Boolean(body.jobId), hasWorkerId: Boolean(body.workerId) },
      });
    }

    const result = await runProjectGenerationJobStep(body.jobId, body.workerId);
    return NextResponse.json({
      job: result.job,
      continue: result.shouldContinue,
    });
  } catch (error) {
    return handleRouteError(error, requestId, AUTH_PERMISSION_001);
  }
}
