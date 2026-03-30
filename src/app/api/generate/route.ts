import { NextRequest } from "next/server";
import { generatePage } from "@/lib/ai/service";
import {
  handleRouteError,
  parseRequestBody,
  assertFields,
  createAppError,
  API_REQUEST_002,
  API_GENERATE_001,
  API_GENERATE_002,
} from "@/lib/errors";
import type { SiteBlueprint, BlueprintPage, SiteBrief } from "@/types";

export const runtime   = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;

  try {
    const body = await parseRequestBody<{
      blueprint?: SiteBlueprint;
      page?: BlueprintPage;
      brief?: SiteBrief;
      navbarHtml?: string | null;
    }>(req);

    assertFields(body as Record<string, unknown>, ["blueprint", "page", "brief"], API_REQUEST_002);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

        try {
          let charsSent = 0;
          const result = await generatePage(
            body.blueprint!,
            body.page!,
            body.brief!,
            (chunk) => {
              charsSent += chunk.length;
              // Throttle: only emit every ~500 chars to avoid flooding the client
              if (charsSent % 500 < chunk.length) {
                send({ type: "chars", count: charsSent });
              }
            },
            body.navbarHtml ?? null
          ).catch((err) => {
            throw createAppError({
              code: API_GENERATE_001,
              devMessage: `generatePage failed for "${body.page?.name}": ${err instanceof Error ? err.message : String(err)}`,
              severity: "error",
              metadata: { pageName: body.page?.name, pageId: body.page?.id },
              cause: err,
            });
          });

          if (!result?.html) {
            throw createAppError({
              code: API_GENERATE_002,
              devMessage: `generatePage returned invalid result for "${body.page?.name}"`,
              severity: "error",
              metadata: { pageName: body.page?.name, hasHtml: !!result?.html },
            });
          }

          send({ type: "done", html: result.html, sections: result.sections });
        } catch (err) {
          const response = handleRouteError(err, requestId, API_GENERATE_001);
          const body = await response.json().catch(() => ({ error: "Generation failed" }));
          send({ type: "error", ...body });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Request-Id": requestId ?? "",
      },
    });
  } catch (err) {
    return handleRouteError(err, requestId, API_GENERATE_001);
  }
}
