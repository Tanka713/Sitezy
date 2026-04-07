import { NextRequest } from "next/server";
import { regenerateSection } from "@/lib/ai/service";
import { consumeAIUsageCredits } from "@/lib/server/launch-usage";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  handleRouteError,
  parseRequestBody,
  assertFields,
  createAppError,
  API_REQUEST_002,
  API_GENERATE_001,
  API_GENERATE_002,
} from "@/lib/errors";
import type { BlueprintPage, SiteBlueprint, SiteBrief } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated request to regenerate section",
        severity: "warn",
      });
    }

    const body = await parseRequestBody<{
      blueprint?: SiteBlueprint;
      brief?: SiteBrief;
      page?: Pick<BlueprintPage, "name" | "purpose">;
      section?: {
        id?: string;
        type?: string;
        name?: string;
        html?: string;
        previousSectionName?: string | null;
        nextSectionName?: string | null;
      };
      instruction?: string;
    }>(req);

    assertFields(body as Record<string, unknown>, ["blueprint", "brief", "page", "section"], API_REQUEST_002);
    assertFields((body.page ?? {}) as Record<string, unknown>, ["name", "purpose"], API_REQUEST_002);
    assertFields((body.section ?? {}) as Record<string, unknown>, ["type", "name", "html"], API_REQUEST_002);
    await consumeAIUsageCredits(user.id, "regenerate-section");

    if (!body.section!.type || !/^[a-z0-9_-]{1,64}$/i.test(body.section!.type)) {
      throw createAppError({
        code: API_REQUEST_002,
        devMessage: `Invalid section type "${body.section!.type}" — must be a non-empty alphanumeric string`,
        severity: "error",
        metadata: { sectionType: body.section!.type },
      });
    }

    const html = await regenerateSection(
      body.blueprint!,
      body.brief!,
      body.page!,
      {
        id: body.section!.id,
        type: body.section!.type!,
        name: body.section!.name!,
        html: body.section!.html!,
        previousSectionName: body.section?.previousSectionName ?? null,
        nextSectionName: body.section?.nextSectionName ?? null,
      },
      body.instruction?.trim() || undefined
    ).catch((err) => {
      throw createAppError({
        code: API_GENERATE_001,
        devMessage: `regenerateSection failed for "${body.page?.name}" / "${body.section?.name}": ${err instanceof Error ? err.message : String(err)}`,
        severity: "error",
        metadata: { pageName: body.page?.name, sectionName: body.section?.name, sectionType: body.section?.type },
        cause: err,
      });
    });

    if (!html) {
      throw createAppError({
        code: API_GENERATE_002,
        devMessage: `regenerateSection returned invalid result for "${body.page?.name}" / "${body.section?.name}"`,
        severity: "error",
        metadata: { pageName: body.page?.name, sectionName: body.section?.name, hasHtml: !!html },
      });
    }

    return Response.json({ html });
  } catch (err) {
    return handleRouteError(err, requestId, API_GENERATE_001);
  }
}
