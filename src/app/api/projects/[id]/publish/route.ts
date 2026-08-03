import { NextRequest, NextResponse } from "next/server";
import { getProjectSnapshot } from "@/lib/server/project-db";
import { recordProjectAnalyticsEvent } from "@/lib/server/project-analytics";
import {
  recordAdaptiveLearningEvent,
  summarizeAdaptivePublishAcceptance,
} from "@/lib/server/ai-learning";
import { getPublishedSiteForProject, publishProjectSnapshot } from "@/lib/server/project-publishing";
import { dispatchProjectWebhookEvent } from "@/lib/server/project-webhooks";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  DB_READ_002,
  DB_WRITE_001,
  createAppError,
  handleRouteError,
} from "@/lib/errors";
import { indexGenerationExample } from "@/lib/server/generation-knowledge";
import { maybeSchedulePatternExtraction } from "@/lib/server/pattern-extractor";
import { scoreGeneration } from "@/lib/server/generation-quality";
import { siteBriefToBusinessBrief } from "@/lib/ai/adapters/wizardAdapter";
import type { SiteGenerationPlan } from "@/lib/ai/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to read publish state for project ${params.id}`,
        severity: "warn",
      });
    }

    const publishedSite = await getPublishedSiteForProject(params.id, user.id);
    return NextResponse.json({ publishedSite });
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to publish project ${params.id}`,
        severity: "warn",
      });
    }

    const snapshot = await getProjectSnapshot(params.id, user.id);
    if (!snapshot) {
      throw createAppError({
        code: DB_READ_002,
        devMessage: `Publish requested for missing project ${params.id}`,
        severity: "warn",
        metadata: { projectId: params.id, userId: user.id },
      });
    }

    const publishedSite = await publishProjectSnapshot(snapshot, user.id);
    const acceptanceSummary = await summarizeAdaptivePublishAcceptance({
      userId: user.id,
      projectId: params.id,
      pages: snapshot.project.pages,
    });

    const brief = snapshot.project.brief;

    // Score this generation's quality for the knowledge base
    let qualityScore = 0;
    try {
      const businessBrief = siteBriefToBusinessBrief(brief);
      const scoreResult = scoreGeneration(businessBrief, snapshot.project.pages);
      qualityScore = scoreResult.total;
    } catch {
      // Non-critical — don't fail publish if scorer errors
    }

    await recordAdaptiveLearningEvent({
      userId: user.id,
      projectId: params.id,
      eventType: "project_published",
      brief,
      metadata: {
        pageCount: snapshot.project.pages.length,
        sectionTypes: snapshot.project.pages.flatMap((page) =>
          page.sections.map((section) => section.type)
        ),
        comparedPageCount: acceptanceSummary?.comparedPageCount ?? null,
        generatedPageBaselineCount: acceptanceSummary?.baselinePageCount ?? null,
        generatedSectionBaselineCount: acceptanceSummary?.baselineSectionCount ?? null,
        structurallyRetainedSectionCount: acceptanceSummary?.structurallyRetainedSectionCount ?? null,
        contentRetainedSectionCount: acceptanceSummary?.contentRetainedSectionCount ?? null,
        comparableContentSectionCount: acceptanceSummary?.comparableContentSectionCount ?? null,
        addedSectionCount: acceptanceSummary?.addedSectionCount ?? null,
        pageCoverageRatio: acceptanceSummary?.pageCoverageRatio ?? null,
        structuralRetentionRatio: acceptanceSummary?.structuralRetentionRatio ?? null,
        contentRetentionRatio: acceptanceSummary?.contentRetentionRatio ?? null,
        signalWeightMultiplier: acceptanceSummary?.signalWeightMultiplier ?? null,
        acceptedSectionTypes: acceptanceSummary?.acceptedSectionTypes ?? [],
        changedSectionTypes: acceptanceSummary?.changedSectionTypes ?? [],
        addedSectionTypes: acceptanceSummary?.addedSectionTypes ?? [],
        comparedRunIds: acceptanceSummary?.baselineRunIds ?? [],
        qualityScore,
      },
    });

    // Index this generation as a knowledge example (fire-and-forget — never blocks publish)
    if (qualityScore > 0 && acceptanceSummary) {
      const structuralRetention = acceptanceSummary.structuralRetentionRatio ?? 0;
      const generationPlan = snapshot.project.blueprint?.generationPlan as SiteGenerationPlan | undefined;
      if (generationPlan) {
        const businessBrief = siteBriefToBusinessBrief(brief);
        indexGenerationExample({
          brief: businessBrief,
          plan: generationPlan,
          qualityScore,
          structuralRetention,
          acceptedSectionTypes: acceptanceSummary.acceptedSectionTypes ?? [],
        })
          .then(() => maybeSchedulePatternExtraction(businessBrief.industry))
          .catch(() => {});
      }
    }

    await Promise.allSettled([
      recordProjectAnalyticsEvent({
        projectId: params.id,
        userId: user.id,
        eventType: "deployment_published",
        pagePath: "/",
        metadata: {
          deploymentId: publishedSite.currentDeployment?.id ?? null,
          publishedUrl: publishedSite.liveUrl,
          pageCount: snapshot.project.pages.length,
        },
      }),
      dispatchProjectWebhookEvent({
        projectId: params.id,
        userId: user.id,
        eventType: "deployment.published",
        payload: {
          projectId: params.id,
          projectName: snapshot.project.name,
          publishedSite,
        },
      }),
    ]);

    return NextResponse.json({ publishedSite });
  } catch (error) {
    return handleRouteError(error, requestId, DB_WRITE_001);
  }
}
