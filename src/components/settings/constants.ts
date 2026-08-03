import type { BetaRole } from "@/types";

export const SETTINGS_SECTIONS = [
  { key: "account", label: "Account" },
  { key: "workspace", label: "Workspace" },
  { key: "media", label: "Media Library" },
  { key: "ai", label: "AI Settings" },
  { key: "creative", label: "Creative Mode" },
  { key: "project-defaults", label: "Project Defaults" },
  { key: "export", label: "Export & Deployment" },
  { key: "integrations", label: "Integrations" },
  { key: "billing", label: "Billing" },
  { key: "experimental", label: "Experimental" },
  { key: "support", label: "Support" },
] as const;

export type SettingsSectionKey = typeof SETTINGS_SECTIONS[number]["key"];

export const SETTINGS_SECTION_COPY: Record<SettingsSectionKey, { title: string; body: string }> = {
  account: {
    title: "Account",
    body: "Your personal profile, identity, and how you appear inside Sitezy.",
  },
  workspace: {
    title: "Workspace",
    body: "Tune the look, density, and behavior of your editor and dashboard.",
  },
  media: {
    title: "Media Library",
    body: "Manage all uploaded images and videos. Assets are shared across every project.",
  },
  ai: {
    title: "AI Settings",
    body: "Shape how Sitezy's models think, write, and design on your behalf.",
  },
  creative: {
    title: "Creative Mode",
    body: "Loosen or tighten the design rails Sitezy follows during generation.",
  },
  "project-defaults": {
    title: "Project Defaults",
    body: "Set the starting structure and visual direction for every new project.",
  },
  export: {
    title: "Export & Deployment",
    body: "Control how your sites are bundled, exported, and shipped.",
  },
  integrations: {
    title: "Integrations",
    body: "Connect Sitezy to your tools, accounts, and external services.",
  },
  billing: {
    title: "Billing",
    body: "Plan, usage, payment method, and billing history.",
  },
  experimental: {
    title: "Experimental",
    body: "Opt in to early features. They may move, change, or disappear.",
  },
  support: {
    title: "Support",
    body: "Reach the team, report bugs, or request features.",
  },
};

export const SETTINGS_SECTION_SEARCH_TERMS: Record<SettingsSectionKey, string[]> = {
  account: ["profile", "name", "email", "avatar", "photo", "identity", "phone", "password", "2fa", "two factor", "mfa", "otp", "security", "auth"],
  workspace: ["theme", "font", "density", "animations", "scale", "appearance"],
  media: ["images", "videos", "uploads", "assets", "library"],
  ai: ["generation", "prompts", "models", "design", "content"],
  creative: ["creative", "surprise", "bold", "rules", "style"],
  "project-defaults": ["defaults", "pages", "palette", "typography", "layout", "navigation"],
  export: ["deploy", "deployment", "zip", "package", "seo", "publish"],
  integrations: ["analytics", "forms", "lead capture", "leads", "newsletter", "domain", "notifications", "tools"],
  billing: ["plan", "usage", "credits", "payment", "invoice"],
  experimental: ["beta", "labs", "preview", "early", "testing"],
  support: ["help", "bug", "feature", "inbox", "tickets"],
};

export type SettingsSearchTarget = {
  id: string;
  label: string;
  section: SettingsSectionKey;
  keywords: string[];
};

export const SETTINGS_SEARCH_TARGETS: SettingsSearchTarget[] = [
  {
    id: "account-profile",
    label: "Profile details",
    section: "account",
    keywords: ["profile", "name", "email", "avatar", "photo", "account details"],
  },
  {
    id: "change-password",
    label: "Change password",
    section: "account",
    keywords: ["password", "change password", "new password", "reset password", "login password"],
  },
  {
    id: "delete-account",
    label: "Delete account",
    section: "account",
    keywords: ["delete account", "remove account", "close account"],
  },
  {
    id: "workspace-appearance",
    label: "Workspace appearance",
    section: "workspace",
    keywords: ["theme", "font", "appearance", "light", "dark", "system", "interface scale"],
  },
  {
    id: "workspace-behavior",
    label: "Workspace behavior",
    section: "workspace",
    keywords: ["animations", "motion", "editor density", "compact", "comfortable"],
  },
  {
    id: "lead-capture",
    label: "Lead capture defaults",
    section: "integrations",
    keywords: ["lead capture", "leads", "forms", "newsletter", "submissions", "notification email"],
  },
  {
    id: "mobile-2fa",
    label: "Mobile 2FA",
    section: "account",
    keywords: ["2fa", "two factor", "mfa", "sms", "otp", "phone verification", "security code"],
  },
];

export const INTERNAL_SETTINGS_SECTIONS = [
  { key: "account", label: "Account" },
  { key: "workspace", label: "Workspace" },
] as const satisfies readonly { key: SettingsSectionKey; label: string }[];

export function getSettingsSectionsForRole(role?: BetaRole | null) {
  return role === "admin" || role === "customer_service" ? INTERNAL_SETTINGS_SECTIONS : SETTINGS_SECTIONS;
}
