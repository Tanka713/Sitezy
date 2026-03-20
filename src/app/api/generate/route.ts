import { NextRequest, NextResponse } from "next/server";
import { generatePage } from "@/lib/ai/service";
import type { SiteBlueprint, BlueprintPage, SiteBrief } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const blueprint: SiteBlueprint = body.blueprint;
    const page:      BlueprintPage = body.page;
    const brief:     SiteBrief     = body.brief;
    if (!blueprint || !page || !brief) {
      return NextResponse.json({ error: "Missing required fields: blueprint, page, brief" }, { status: 400 });
    }
    const result = await generatePage(blueprint, page, brief);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
