import { NextRequest, NextResponse } from "next/server";
import { handleStripeWebhook } from "@/lib/server/billing";
import { DB_WRITE_001, handleRouteError } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");
    const summary = await handleStripeWebhook(rawBody, signature);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}
