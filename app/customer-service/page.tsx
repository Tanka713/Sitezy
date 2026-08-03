import { redirect } from "next/navigation";
import { CustomerServiceDashboard } from "@/components/customer-service/CustomerServiceDashboard";
import { BETA_INTEREST_PATH, getPrimaryAppPathForAccess } from "@/lib/app-routing";
import { claimBetaAccessForUser, resolveLaunchAccessForUser } from "@/lib/server/beta-access";
import { hasMinimumBetaRole } from "@/lib/server/launch";
import { isSupportReplyEmailConfigured } from "@/lib/server/support-email";
import { listCustomerServiceSupportRequests } from "@/lib/server/support-requests";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function CustomerServicePage() {
  const user = await getAuthenticatedUser({ includeBlockedBeta: true });
  if (!user) {
    redirect("/login");
  }

  const access = await resolveLaunchAccessForUser(user);
  if (!access.allowed) {
    redirect(BETA_INTEREST_PATH);
  }

  if (!hasMinimumBetaRole(access.role, "customer_service")) {
    redirect(getPrimaryAppPathForAccess(access));
  }

  try {
    await claimBetaAccessForUser(user);
  } catch {}

  return (
    <CustomerServiceDashboard
      currentAccess={access}
      initialRequests={await listCustomerServiceSupportRequests()}
      canEmailReplies={isSupportReplyEmailConfigured()}
    />
  );
}
