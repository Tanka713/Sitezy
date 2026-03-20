import { NextRequest, NextResponse } from "next/server";
import { generateBlueprint } from "@/lib/ai/service";
import type { SiteBrief } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const brief: SiteBrief = body.brief;
    if (!brief?.description || !brief?.siteName) {
      return NextResponse.json({ error: "Missing required fields: siteName and description" }, { status: 400 });
    }
    const blueprint = await generateBlueprint(brief);
    return NextResponse.json({ blueprint });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[blueprint] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
