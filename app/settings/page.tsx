import { redirect } from "next/navigation";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { BETA_INTEREST_PATH } from "@/lib/app-routing";
import { claimBetaAccessForUser, resolveLaunchAccessForUser } from "@/lib/server/beta-access";
import { getUserSettingsPayload } from "@/lib/server/user-settings";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsRoutePage() {
  const user = await getAuthenticatedUser({ includeBlockedBeta: true });
  if (!user) {
    redirect("/login");
  }

  const access = await resolveLaunchAccessForUser(user);
  if (!access.allowed) {
    redirect(BETA_INTEREST_PATH);
  }

  try {
    await claimBetaAccessForUser(user);
  } catch {}
  const payload = await getUserSettingsPayload(user);

  return <SettingsPage userId={user.id} initialPayload={payload} currentAccess={access} />;
}
