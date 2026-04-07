import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/marketing/AuthScreen";
import { BETA_INTEREST_PATH } from "@/lib/app-routing";
import { resolveLaunchAccessForUser } from "@/lib/server/beta-access";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getPublicLaunchConfig } from "@/lib/server/launch";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { reason?: string };
}) {
  const user = await getAuthenticatedUser({ includeBlockedBeta: true });
  if (user) {
    const access = await resolveLaunchAccessForUser(user);
    redirect(access.allowed ? "/app" : BETA_INTEREST_PATH);
  }

  const launch = getPublicLaunchConfig();

  return (
    <AuthScreen
      mode="login"
      inviteOnlyBeta={launch.inviteOnlyBeta}
      supportEmail={launch.supportEmail}
      initialReason={searchParams?.reason ?? null}
    />
  );
}
