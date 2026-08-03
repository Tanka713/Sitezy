import { redirect } from "next/navigation";
import { BETA_INTEREST_PATH, getPrimaryAppPathForAccess } from "@/lib/app-routing";
import { claimBetaAccessForUser, resolveLaunchAccessForUser } from "@/lib/server/beta-access";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function AppEntryPage() {
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

  redirect(getPrimaryAppPathForAccess(access));
}
