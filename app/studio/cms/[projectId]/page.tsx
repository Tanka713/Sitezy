import { redirect } from "next/navigation";
import { ProjectCmsPage } from "@/components/cms/ProjectCmsPage";
import { BETA_INTEREST_PATH, getPrimaryAppPathForAccess } from "@/lib/app-routing";
import { claimBetaAccessForUser, resolveLaunchAccessForUser } from "@/lib/server/beta-access";
import { listCmsCollectionsForProject } from "@/lib/server/project-cms";
import { getProjectSnapshot } from "@/lib/server/project-db";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function StudioCmsProjectPage({
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

  const cms = await listCmsCollectionsForProject(params.projectId, user.id);

  return (
    <ProjectCmsPage
      project={snapshot.project}
      initialCollections={cms.collections}
      storageReady={cms.storageReady}
    />
  );
}
