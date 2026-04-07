import type { BetaRole, CurrentBetaAccess } from "@/types";

export const BETA_INTEREST_PATH = "/beta/access-needed";

export function getPrimaryAppPathForRole(role?: BetaRole | null) {
  if (role === "admin") return "/admin";
  if (role === "customer_service") return "/customer-service";
  return "/studio";
}

export function getPrimaryAppPathForAccess(access?: Pick<CurrentBetaAccess, "role"> | null) {
  return getPrimaryAppPathForRole(access?.role ?? null);
}

export function getPrimaryAppLabelForRole(role?: BetaRole | null) {
  if (role === "admin") return "Admin";
  if (role === "customer_service") return "Customer Service";
  return "Workspace";
}
