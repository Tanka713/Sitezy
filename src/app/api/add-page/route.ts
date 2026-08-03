import { NextRequest } from "next/server";
import { generateNewPage } from "@/lib/ai/service";
import { consumeAIUsageCredits } from "@/lib/server/launch-usage";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  handleRouteError,
  parseRequestBody,
  assertFields,
  createAppError,
  API_REQUEST_002,
  API_GENERATE_001,
} from "@/lib/errors";
import type { SiteBlueprint, SiteBrief } from "@/types";

export const runtime   = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated request to add page",
        severity: "warn",
      });
    }

    const body = await parseRequestBody<{
      blueprint?: SiteBlueprint;
      pageId?: string;
      pageName?: string;
      pageSlug?: string;
      pageDescription?: string;
      brief?: SiteBrief;
      navbarHtml?: string | null;
      footerHtml?: string | null;
    }>(req);

    assertFields(body as Record<string, unknown>, ["blueprint", "pageName", "brief"], API_REQUEST_002);
    await consumeAIUsageCredits(user.id, "add-page");

    const { blueprint, pageId, pageName, pageSlug, pageDescription, brief, navbarHtml, footerHtml } = body;

    const result = await generateNewPage(
      blueprint!,
      pageName!,
      pageDescription || pageName!,
      brief!,
      {
        pageId,
        pageSlug,
        navbarHtml: navbarHtml ?? null,
        footerHtml: footerHtml ?? null,
      }
    ).catch((err) => {
      throw createAppError({
        code: API_GENERATE_001,
        devMessage: `generateNewPage failed for "${pageName}": ${err instanceof Error ? err.message : String(err)}`,
        severity: "error",
        metadata: { pageName },
        cause: err,
      });
    });

    return Response.json(result);
  } catch (err) {
    return handleRouteError(err, requestId, API_GENERATE_001);
  }
}
