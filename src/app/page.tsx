import { redirect } from "next/navigation";
import { LandingPage } from "@/components/marketing/LandingPage";
import { BETA_INTEREST_PATH } from "@/lib/app-routing";
import { resolveLaunchAccessForUser } from "@/lib/server/beta-access";
import { getPublicLaunchConfig } from "@/lib/server/launch";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function Home() {
  const user = await getAuthenticatedUser({ includeBlockedBeta: true });
  if (user) {
    const access = await resolveLaunchAccessForUser(user);
    redirect(access.allowed ? "/app" : BETA_INTEREST_PATH);
  }
  const launch = getPublicLaunchConfig();

  return (
    <LandingPage
      initialAccount={null}
      inviteOnlyBeta={launch.inviteOnlyBeta}
      supportEmail={launch.supportEmail}
    />
  );
}
