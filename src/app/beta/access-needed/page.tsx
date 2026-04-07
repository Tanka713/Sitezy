import { redirect } from "next/navigation";
import { BETA_INTEREST_PATH } from "@/lib/app-routing";
import { BetaInterestPage } from "@/components/marketing/BetaInterestPage";
import { ensureBetaInterestForUser } from "@/lib/server/beta-interest";
import { resolveLaunchAccessForUser } from "@/lib/server/beta-access";
import { getPublicLaunchConfig } from "@/lib/server/launch";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function BetaAccessNeededPage() {
  const user = await getAuthenticatedUser({ includeBlockedBeta: true });
  if (!user) {
    redirect("/login");
  }

  const access = await resolveLaunchAccessForUser(user);
  if (access.allowed) {
    redirect("/app");
  }

  const launch = getPublicLaunchConfig();
  const interest = await ensureBetaInterestForUser(user);

  return (
    <BetaInterestPage
      email={access.email || user.email || ""}
      supportEmail={launch.supportEmail}
      initialInterest={interest}
      revoked={access.status === "revoked"}
    />
  );
}
