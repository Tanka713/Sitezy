import { redirect } from "next/navigation";
import { SupportInboxPage } from "@/components/support/SupportInboxPage";
import { BETA_INTEREST_PATH } from "@/lib/app-routing";
import { claimBetaAccessForUser, resolveLaunchAccessForUser } from "@/lib/server/beta-access";
import { listSupportRequests } from "@/lib/server/support-requests";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function SupportInboxRoutePage() {
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

  return <SupportInboxPage initialRequests={await listSupportRequests(user.id)} />;
}
