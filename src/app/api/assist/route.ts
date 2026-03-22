import { NextRequest, NextResponse } from "next/server";
import { aiAssist } from "@/lib/ai/service";
import {
  handleRouteError,
  parseRequestBody,
  createAppError,
  normalizeError,
  isAppError,
  API_REQUEST_002,
  API_UNKNOWN_001,
} from "@/lib/errors";
import { logServerError } from "@/lib/errors/logger";
import type { SiteBlueprint } from "@/types";

export const runtime   = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;

  try {
    const body = await parseRequestBody<{
      instruction?: string;
      context?: {
        projectName: string;
        blueprint?: SiteBlueprint | null;
        pageName?: string;
        pageHtml?: string;
        siteType?: string;
      };
    }>(req);

    if (!body.instruction) {
      throw createAppError({
        code: API_REQUEST_002,
        devMessage: "Assist request missing instruction",
        severity: "warn",
      });
    }

    const { instruction, context } = body;
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          await aiAssist(instruction!, context ?? { projectName: "unknown" }, (chunk) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "chunk", chunk })}\n\n`)
            );
          });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        } catch (err) {
          // Normalize and emit as structured SSE error chunk
          const appErr = isAppError(err) ? err : normalizeError(err, API_UNKNOWN_001);
          logServerError(appErr, requestId);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: appErr.userMessage,
                code: appErr.code,
                requestId,
              })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return handleRouteError(err, requestId, API_UNKNOWN_001);
  }
}
