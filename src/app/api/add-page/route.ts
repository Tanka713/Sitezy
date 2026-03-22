import { NextRequest } from "next/server";
import { generateNewPage } from "@/lib/ai/service";
import {
  handleRouteError,
  parseRequestBody,
  assertFields,
  createAppError,
  API_REQUEST_002,
  API_GENERATE_001,
} from "@/lib/errors";
import type { SiteBlueprint, SiteBrief } from "@/types";

export const runtime   = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;

  try {
    const body = await parseRequestBody<{
      blueprint?: SiteBlueprint;
      pageName?: string;
      pageDescription?: string;
      brief?: SiteBrief;
    }>(req);

    assertFields(body as Record<string, unknown>, ["blueprint", "pageName", "brief"], API_REQUEST_002);

    const { blueprint, pageName, pageDescription, brief } = body;

    const result = await generateNewPage(
      blueprint!,
      pageName!,
      pageDescription || pageName!,
      brief!
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
