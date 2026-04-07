"use client";

import { cn } from "@/lib/utils";
import {
  User, Layout, Sparkles, Palette, FolderCog, PackageOpen,
  Plug, CreditCard, FlaskConical, Shield, LifeBuoy, ImageIcon,
} from "lucide-react";
import { SettingsSectionKey } from "./constants";

const SECTION_ICONS: Record<SettingsSectionKey, React.ElementType> = {
  account: User,
  workspace: Layout,
  media: ImageIcon,
  ai: Sparkles,
  creative: Palette,
  "project-defaults": FolderCog,
  export: PackageOpen,
  integrations: Plug,
  billing: CreditCard,
  experimental: FlaskConical,
  security: Shield,
  support: LifeBuoy,
};

export function SettingsSidebarNav({
  sections,
  current,
  onSelect,
  title = "Settings",
  className,
}: {
  sections: readonly { key: SettingsSectionKey; label: string }[];
  current: SettingsSectionKey;
  onSelect: (key: SettingsSectionKey) => void;
  title?: string;
  body?: string;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#0B0D12] p-5",
        className
      )}
    >
      {/* Atmospheric accent */}
      <div
        className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full opacity-[0.18] blur-3xl"
        style={{ background: "radial-gradient(circle, #5B8CFF 0%, transparent 70%)" }}
      />

      <div className="relative px-1 pb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5B8CFF]">{title}</p>
      </div>

      <div className="relative h-px w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <nav className="sz-scroll-hidden relative mt-4 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
        {sections.map((section) => {
          const active = current === section.key;
          const Icon = SECTION_ICONS[section.key];
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => onSelect(section.key)}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-200",
                active
                  ? "bg-white/[0.04] text-white"
                  : "text-white/50 hover:bg-white/[0.025] hover:text-white/85"
              )}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full"
                  style={{ background: "linear-gradient(180deg, #5B8CFF 0%, #7A5CFF 100%)" }}
                />
              )}
              <Icon
                size={15}
                strokeWidth={1.75}
                className={cn(
                  "flex-shrink-0 transition-colors",
                  active ? "text-[#5B8CFF]" : "text-white/40 group-hover:text-white/70"
                )}
              />
              <span className="flex-1 tracking-[-0.005em]">{section.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
