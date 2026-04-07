import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BETA_INTEREST_PATH, getPrimaryAppPathForAccess } from "@/lib/app-routing";
import { claimBetaAccessForUser, resolveLaunchAccessForUser } from "@/lib/server/beta-access";
import { getUserSettingsPayload } from "@/lib/server/user-settings";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function StudioPage() {
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

  const settingsPayload = await getUserSettingsPayload(user);

  return <AppShell userId={user.id} currentAccess={access} initialAccount={settingsPayload.account} />;
}
