import { NextRequest, NextResponse } from "next/server";
import { assertLaunchRole } from "@/lib/server/beta-access";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  AUTH_REQUIRED_001,
  DB_READ_001,
  createAppError,
  handleRouteError,
} from "@/lib/errors";
import {
  exportTrainingData,
  getTrainingDataStats,
} from "@/lib/server/training-data-exporter";

export const runtime = "nodejs";

/** GET /api/admin/training-data — returns JSONL file or stats */
export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw createAppError({
        code: AUTH_REQUIRED_001,
        devMessage: "Unauthenticated request to admin training-data endpoint",
        severity: "warn",
      });
    }

    await assertLaunchRole(user, "admin");

    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "jsonl";
    const minQuality = parseFloat(url.searchParams.get("minQuality") ?? "0.70");
    const minRetention = parseFloat(url.searchParams.get("minRetention") ?? "0.65");
    const industry = url.searchParams.get("industry") ?? undefined;
    const limit = parseInt(url.searchParams.get("limit") ?? "1000", 10);

    if (format === "stats") {
      const stats = await getTrainingDataStats();
      return NextResponse.json(stats);
    }

    const jsonl = await exportTrainingData({
      minQualityScore: minQuality,
      minStructuralRetention: minRetention,
      industry,
      limit,
    });

    const filename = `sitezy-training-${new Date().toISOString().slice(0, 10)}.jsonl`;

    return new NextResponse(jsonl, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleRouteError(error, requestId, DB_READ_001);
  }
}
