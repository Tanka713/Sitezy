import { NextRequest, NextResponse } from "next/server";
import {
  getAdaptiveProfileStatus,
  readAdaptiveFeedbackPromptState,
  readAdaptiveLearningDiagnostics,
  readAdaptiveLearningProfile,
  recordAdaptiveLearningEvent,
  resetAdaptiveLearningProfile,
  submitAdaptiveFeedback,
  type AdaptiveFeedbackTone,
  type AdaptiveLearningEventType,
} from "@/lib/server/ai-learning";
import { readUserSettings } from "@/lib/server/user-settings";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_DELETE_001,
  DB_READ_001,
  DB_WRITE_001,
  VALIDATION_INPUT_001,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";
import type { SiteBrief } from "@/types";
import { getKnowledgeBaseStats } from "@/lib/server/generation-knowledge";

const IMPLICIT_EVENT_TYPES: AdaptiveLearningEventType[] = [
  "section_deleted",
  "section_reordered",
  "section_edited",
];

export const runtime = "nodejs";

function buildAdaptiveLearningPayload(
  adaptiveGenerationEnabled: boolean,
  profile: Awaited<ReturnType<typeof readAdaptiveLearningProfile>>,
  diagnostics: Awaited<ReturnType<typeof readAdaptiveLearningDiagnostics>>,
  feedbackPromptState: Awaited<ReturnType<typeof readAdaptiveFeedbackPromptState>> | null
) {
  const status = getAdaptiveProfileStatus(profile, { adaptiveGenerationEnabled });

  return {
    adaptiveGenerationEnabled,
    state: status.state,
    stateReason: status.reason,
    globalKillSwitchEnabled: status.globalKillSwitchEnabled,
    profile,
    diagnostics,
    feedbackPromptState,
  };
}

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated request to read adaptive learning state",
        severity: "warn",
      });
    }

    const searchParams = new URL(req.url).searchParams;
    const projectId = searchParams.get("projectId");
    const industry = searchParams.get("industry");

    const [settings, profile, diagnostics] = await Promise.all([
      readUserSettings(user.id),
      readAdaptiveLearningProfile(user.id),
      readAdaptiveLearningDiagnostics(user.id),
    ]);
    const [feedbackPromptState, knowledgeBaseStats] = await Promise.all([
      projectId ? readAdaptiveFeedbackPromptState(user.id, projectId) : Promise.resolve(null),
      industry ? getKnowledgeBaseStats(industry) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      ...buildAdaptiveLearningPayload(
        settings.ai.adaptiveGenerationEnabled,
        profile,
        diagnostics,
        feedbackPromptState
      ),
      knowledgeBase: knowledgeBaseStats,
    });
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated request to submit adaptive learning feedback",
        severity: "warn",
      });
    }

    const body = await parseRequestBody<{
      tone?: AdaptiveFeedbackTone;
      eventType?: AdaptiveLearningEventType;
      projectId?: string | null;
      brief?: SiteBrief;
      source?: string | null;
      metadata?: Record<string, unknown> | null;
    }>(req);

    // Implicit section signals (delete / reorder / edit) — fire-and-forget, no full payload needed
    if (body.eventType && IMPLICIT_EVENT_TYPES.includes(body.eventType)) {
      await recordAdaptiveLearningEvent({
        userId: user.id,
        projectId: body.projectId ?? null,
        eventType: body.eventType,
        metadata: body.metadata ?? null,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.tone !== "positive" && body.tone !== "negative") {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: "Adaptive learning feedback route received an invalid tone",
        severity: "warn",
        metadata: { tone: body.tone ?? null },
      });
    }

    const profile = await submitAdaptiveFeedback({
      userId: user.id,
      tone: body.tone,
      projectId: body.projectId ?? null,
      brief: body.brief,
      source: body.source ?? null,
      metadata: body.metadata ?? null,
    });
    const [settings, diagnostics, feedbackPromptState] = await Promise.all([
      readUserSettings(user.id),
      readAdaptiveLearningDiagnostics(user.id),
      body.projectId
        ? readAdaptiveFeedbackPromptState(user.id, body.projectId)
        : Promise.resolve(null),
    ]);

    return NextResponse.json(
      buildAdaptiveLearningPayload(
        settings.ai.adaptiveGenerationEnabled,
        profile,
        diagnostics,
        feedbackPromptState
      )
    );
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated request to reset adaptive learning state",
        severity: "warn",
      });
    }

    const profile = await resetAdaptiveLearningProfile(user.id);
    const [settings, diagnostics] = await Promise.all([
      readUserSettings(user.id),
      readAdaptiveLearningDiagnostics(user.id),
    ]);

    return NextResponse.json(
      buildAdaptiveLearningPayload(
        settings.ai.adaptiveGenerationEnabled,
        profile,
        diagnostics,
        null
      )
    );
  } catch (error) {
    return handleRouteError(error, requestId, DB_DELETE_001);
  }
}
