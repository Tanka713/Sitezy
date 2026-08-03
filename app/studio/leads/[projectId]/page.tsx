import { redirect } from "next/navigation";
import { ProjectLeadsPage } from "@/components/leads/ProjectLeadsPage";
import { BETA_INTEREST_PATH, getPrimaryAppPathForAccess } from "@/lib/app-routing";
import { claimBetaAccessForUser, resolveLaunchAccessForUser } from "@/lib/server/beta-access";
import { DB_SCHEMA_001, isAppError } from "@/lib/errors";
import { getProjectSnapshot } from "@/lib/server/project-db";
import { getProjectLeadSummary, listLeadSubmissionsForProject } from "@/lib/server/lead-capture";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type { ProjectLeadSummary } from "@/types";

const EMPTY_SUMMARY: ProjectLeadSummary = {
  totalSubmissions: 0,
  totalContactSubmissions: 0,
  totalNewsletterSubmissions: 0,
  totalSubscribers: 0,
  latestSubmissionAt: null,
};

export default async function StudioLeadsProjectPage({
  params,
}: {
  params: { projectId: string };
}) {
  const user = await getAuthenticatedUser({ includeBlockedBeta: true });
  if (!user) {
    redirect("/login");
  }

  const access = await resolveLaunchAccessForUser(user);
  if (!access.allowed) {
    redirect(BETA_INTEREST_PATH);
  }

  const primaryPath = getPrimaryAppPathForAccess(access);
  if (primaryPath !== "/studio") {
    redirect(primaryPath);
  }

  try {
    await claimBetaAccessForUser(user);
  } catch {}

  const snapshot = await getProjectSnapshot(params.projectId, user.id);
  if (!snapshot) {
    redirect("/studio");
  }

  let storageReady = true;
  let summary = EMPTY_SUMMARY;
  let submissions = [] as Awaited<ReturnType<typeof listLeadSubmissionsForProject>>;

  try {
    [summary, submissions] = await Promise.all([
      getProjectLeadSummary(params.projectId, user.id),
      listLeadSubmissionsForProject(params.projectId, user.id),
    ]);
  } catch (error) {
    if (isAppError(error) && error.code === DB_SCHEMA_001) {
      storageReady = false;
    } else {
      throw error;
    }
  }

  return (
    <ProjectLeadsPage
      project={snapshot.project}
      initialSummary={summary}
      initialSubmissions={submissions}
      storageReady={storageReady}
    />
  );
}
