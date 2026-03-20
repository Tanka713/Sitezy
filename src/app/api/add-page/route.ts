import { NextRequest, NextResponse } from "next/server";
import { generateNewPage } from "@/lib/ai/service";
import type { SiteBlueprint, SiteBrief } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { blueprint, pageName, pageDescription, brief } = body as {
      blueprint: SiteBlueprint;
      pageName: string;
      pageDescription: string;
      brief: SiteBrief;
    };
    if (!blueprint || !pageName || !brief) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const result = await generateNewPage(blueprint, pageName, pageDescription || pageName, brief);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[add-page] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
