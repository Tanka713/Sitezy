import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function StudioPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  return <AppShell />;
}
