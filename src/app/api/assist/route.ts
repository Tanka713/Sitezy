import { NextRequest, NextResponse } from "next/server";
import { aiAssist } from "@/lib/ai/service";
import type { SiteBlueprint } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { instruction, context } = body as {
      instruction: string;
      context: {
        projectName: string;
        blueprint?: SiteBlueprint | null;
        pageName?: string;
        pageHtml?: string;
        siteType?: string;
      };
    };
    if (!instruction) return NextResponse.json({ error: "Missing instruction" }, { status: 400 });
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          await aiAssist(instruction, context, (chunk) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", chunk })}\n\n`));
          });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });
    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
