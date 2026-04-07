import { redirect } from "next/navigation";

export default async function LegacyCustomerServiceRedirectPage() {
  redirect("/customer-service");
}
