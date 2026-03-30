import { NextRequest } from "next/server";
import { generateNewBlock } from "@/lib/ai/service";
import {
  handleRouteError,
  parseRequestBody,
  assertFields,
  createAppError,
  API_REQUEST_001,
  API_REQUEST_002,
  API_GENERATE_001,
  API_GENERATE_002,
} from "@/lib/errors";
import type { BlueprintPage, SiteBlueprint, SiteBrief } from "@/types";

const VALID_SECTION_TYPES = new Set([
  "navbar", "hero", "features", "testimonial", "gallery", "logos",
  "cta", "footer", "faq", "pricing", "team", "stats", "contact", "about", "section",
]);

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;

  try {
    const body = await parseRequestBody<{
      blueprint?: SiteBlueprint;
      brief?: SiteBrief;
      page?: Pick<BlueprintPage, "name" | "purpose">;
      block?: {
        type?: string;
        label?: string;
        placement?: string;
      };
      context?: {
        existingSections?: string[];
        previousSectionName?: string | null;
        nextSectionName?: string | null;
        selectedSectionName?: string | null;
        selectedNodeLabel?: string | null;
        navbarHtml?: string | null;
      };
    }>(req);

    assertFields(body as Record<string, unknown>, ["blueprint", "brief", "page", "block", "context"], API_REQUEST_002);
    assertFields((body.page ?? {}) as Record<string, unknown>, ["name", "purpose"], API_REQUEST_002);
    assertFields((body.block ?? {}) as Record<string, unknown>, ["type", "label", "placement"], API_REQUEST_002);

    if (!VALID_SECTION_TYPES.has(body.block!.type!)) {
      throw createAppError({
        code: API_REQUEST_001,
        devMessage: `Invalid block type "${body.block!.type}" — must be one of: ${[...VALID_SECTION_TYPES].join(", ")}`,
        severity: "error",
        metadata: { blockType: body.block!.type },
      });
    }

    const html = await generateNewBlock(
      body.blueprint!,
      body.brief!,
      body.page!,
      {
        type: body.block!.type!,
        label: body.block!.label!,
        placement: body.block!.placement!,
      },
      {
        existingSections: body.context!.existingSections ?? [],
        previousSectionName: body.context!.previousSectionName ?? null,
        nextSectionName: body.context!.nextSectionName ?? null,
        selectedSectionName: body.context!.selectedSectionName ?? null,
        selectedNodeLabel: body.context!.selectedNodeLabel ?? null,
        navbarHtml: body.context!.navbarHtml ?? null,
      }
    ).catch((err) => {
      throw createAppError({
        code: API_GENERATE_001,
        devMessage: `generateNewBlock failed for "${body.page?.name}" / "${body.block?.label}": ${err instanceof Error ? err.message : String(err)}`,
        severity: "error",
        metadata: { pageName: body.page?.name, blockType: body.block?.type, blockLabel: body.block?.label },
        cause: err,
      });
    });

    if (!html) {
      throw createAppError({
        code: API_GENERATE_002,
        devMessage: `generateNewBlock returned invalid result for "${body.page?.name}" / "${body.block?.label}"`,
        severity: "error",
        metadata: { pageName: body.page?.name, blockType: body.block?.type, hasHtml: !!html },
      });
    }

    return Response.json({ html });
  } catch (err) {
    return handleRouteError(err, requestId, API_GENERATE_001);
  }
}
