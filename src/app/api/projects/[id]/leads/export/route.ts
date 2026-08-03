import { NextRequest, NextResponse } from "next/server";
import { getProjectSnapshot } from "@/lib/server/project-db";
import {
  buildLeadExportCsv,
  listLeadSubmissionsForProject,
  listNewsletterSubscribersForProject,
} from "@/lib/server/lead-capture";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  DB_READ_002,
  VALIDATION_INPUT_001,
  createAppError,
  handleRouteError,
} from "@/lib/errors";
import type { LeadCaptureExportKind } from "@/types";

export const runtime = "nodejs";

function normalizeExportKind(value: string | null): LeadCaptureExportKind {
  return value === "subscribers" ? "subscribers" : "submissions";
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? null;
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: `Unauthenticated request to export leads for project ${params.id}`,
        severity: "warn",
      });
    }

    const snapshot = await getProjectSnapshot(params.id, user.id);
    if (!snapshot) {
      throw createAppError({
        code: DB_READ_002,
        devMessage: `Lead export requested for missing project ${params.id}`,
        severity: "warn",
        metadata: { projectId: params.id, userId: user.id },
      });
    }

    const rawKind = req.nextUrl.searchParams.get("kind");
    if (rawKind && rawKind !== "submissions" && rawKind !== "subscribers") {
      throw createAppError({
        code: VALIDATION_INPUT_001,
        devMessage: `Invalid lead export kind ${rawKind} for project ${params.id}`,
        severity: "warn",
        metadata: { projectId: params.id, userId: user.id, rawKind },
      });
    }

    const kind = normalizeExportKind(rawKind);
    const csv =
      kind === "subscribers"
        ? buildLeadExportCsv(kind, await listNewsletterSubscribersForProject(params.id, user.id))
        : buildLeadExportCsv(kind, await listLeadSubmissionsForProject(params.id, user.id));

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${snapshot.project.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "sitezy"}-${kind}.csv"`,
        "cache-control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}
