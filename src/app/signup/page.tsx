import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/marketing/AuthScreen";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function SignupPage() {
  const user = await getAuthenticatedUser();
  if (user) {
    redirect("/studio");
  }

  return <AuthScreen mode="signup" />;
}
