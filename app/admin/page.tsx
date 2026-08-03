import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { BETA_INTEREST_PATH, getPrimaryAppPathForAccess } from "@/lib/app-routing";
import {
  claimBetaAccessForUser,
  isInviteDispatchConfigured,
  listBetaAccessRecords,
  resolveLaunchAccessForUser,
} from "@/lib/server/beta-access";
import { listBetaInterestRequestsForAdmin } from "@/lib/server/beta-interest";
import { hasMinimumBetaRole } from "@/lib/server/launch";
import { readUserBillingSnapshots } from "@/lib/server/user-settings";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function AdminPage() {
  const user = await getAuthenticatedUser({ includeBlockedBeta: true });
  if (!user) {
    redirect("/login");
  }

  const access = await resolveLaunchAccessForUser(user);
  if (!access.allowed) {
    redirect(BETA_INTEREST_PATH);
  }

  if (!hasMinimumBetaRole(access.role, "admin")) {
    redirect(getPrimaryAppPathForAccess(access));
  }

  try {
    await claimBetaAccessForUser(user);
  } catch {}

  const betaInterest = await listBetaInterestRequestsForAdmin();
  const members = await listBetaAccessRecords();
  const billingByUserId = await readUserBillingSnapshots(
    members.map((member) => member.userId).filter((userId): userId is string => Boolean(userId)),
    { admin: true }
  );

  return (
    <AdminDashboard
      currentAccess={access}
      initialMembers={members.map((member) => ({
        ...member,
        billing: member.userId ? billingByUserId.get(member.userId) ?? null : null,
      }))}
      canEmailInvites={isInviteDispatchConfigured()}
      initialInterestRequests={betaInterest.requests}
      betaInterestStorageReady={betaInterest.storageReady}
    />
  );
}
