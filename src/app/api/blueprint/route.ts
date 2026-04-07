import { NextRequest } from "next/server";
import { generateBlueprint } from "@/lib/ai/service";
import { consumeAIUsageCredits } from "@/lib/server/launch-usage";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  handleRouteError,
  parseRequestBody,
  createAppError,
  API_REQUEST_002,
  API_GENERATE_001,
} from "@/lib/errors";
import type { SiteBrief } from "@/types";

export const runtime   = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated request to generate blueprint",
        severity: "warn",
      });
    }

    const body = await parseRequestBody<{ brief?: SiteBrief }>(req);
    const brief = body.brief;

    if (!brief?.siteName || !brief?.description) {
      throw createAppError({
        code: API_REQUEST_002,
        devMessage: "Blueprint request missing siteName or description",
        severity: "warn",
        metadata: { hasSiteName: !!brief?.siteName, hasDescription: !!brief?.description },
      });
    }

    await consumeAIUsageCredits(user.id, "blueprint");

    const blueprint = await generateBlueprint(brief).catch((err) => {
      throw createAppError({
        code: API_GENERATE_001,
        devMessage: `generateBlueprint failed: ${err instanceof Error ? err.message : String(err)}`,
        severity: "error",
        metadata: { siteName: brief.siteName },
        cause: err,
      });
    });

    return Response.json({ blueprint });
  } catch (err) {
    return handleRouteError(err, requestId, API_GENERATE_001);
  }
}
