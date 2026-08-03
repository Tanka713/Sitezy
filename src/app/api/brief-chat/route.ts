import { NextRequest, NextResponse } from "next/server";
import { conductBriefInterview, type BriefChatMessage } from "@/lib/ai/service";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  handleRouteError,
  parseRequestBody,
  createAppError,
} from "@/lib/errors";
import type { SiteBrief } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated request to brief chat",
        severity: "warn",
      });
    }

    const body = await parseRequestBody<{
      messages?: BriefChatMessage[];
      currentBrief?: Partial<SiteBrief>;
      skipResearch?: boolean;
    }>(req);

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const currentBrief = body.currentBrief ?? {};

    const result = await conductBriefInterview(messages, currentBrief, {
      skipResearch: Boolean(body.skipResearch),
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, "brief-chat");
  }
}
