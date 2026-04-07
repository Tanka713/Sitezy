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
  { key: "security", label: "Security" },
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
  security: {
    title: "Security",
    body: "Password, sessions, and account protection.",
  },
  support: {
    title: "Support",
    body: "Reach the team, report bugs, or request features.",
  },
};

export const INTERNAL_SETTINGS_SECTIONS = [
  { key: "account", label: "Account" },
  { key: "workspace", label: "Workspace" },
  { key: "security", label: "Security" },
] as const satisfies readonly { key: SettingsSectionKey; label: string }[];

export function getSettingsSectionsForRole(role?: BetaRole | null) {
  return role === "admin" || role === "customer_service" ? INTERNAL_SETTINGS_SECTIONS : SETTINGS_SECTIONS;
}
