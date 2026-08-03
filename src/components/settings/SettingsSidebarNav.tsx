"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  User, Layout, Sparkles, Palette, FolderCog, PackageOpen,
  Plug, CreditCard, FlaskConical, LifeBuoy, ImageIcon, ArrowUpRight,
} from "lucide-react";
import { SitezyInput } from "@/components/ui/sitezy";
import {
  SETTINGS_SECTION_COPY,
  SETTINGS_SECTION_SEARCH_TERMS,
  SETTINGS_SEARCH_TARGETS,
  type SettingsSearchTarget,
  SettingsSectionKey,
} from "./constants";

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
  support: LifeBuoy,
};

type SearchResult = {
  kind: "target" | "section";
  key: string;
  label: string;
  meta: string;
  section: SettingsSectionKey;
  focusId?: string;
  score: number;
};

export function SettingsSidebarNav({
  sections,
  current,
  onSelect,
  onNavigate,
  title = "Settings",
  className,
}: {
  sections: readonly { key: SettingsSectionKey; label: string }[];
  current: SettingsSectionKey;
  onSelect: (key: SettingsSectionKey) => void;
  onNavigate: (target: { section: SettingsSectionKey; focusId?: string | null }) => void;
  title?: string;
  body?: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const searchResults = useMemo<SearchResult[]>(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];

    const allowedSections = new Set(sections.map((section) => section.key));

    const sectionResults = sections
      .map((section) => {
        const keywords = SETTINGS_SECTION_SEARCH_TERMS[section.key] ?? [];
        const titleText = SETTINGS_SECTION_COPY[section.key]?.title ?? section.label;
        const bodyText = SETTINGS_SECTION_COPY[section.key]?.body ?? "";
        const haystack = [section.label, titleText, bodyText, ...keywords].join(" ").toLowerCase();

        let score = 0;
        if (section.label.toLowerCase().startsWith(normalizedQuery)) score += 100;
        if (titleText.toLowerCase().startsWith(normalizedQuery)) score += 90;
        if (keywords.some((keyword) => keyword.toLowerCase().startsWith(normalizedQuery))) score += 80;
        if (haystack.includes(normalizedQuery)) score += 40;

        return score > 0
          ? {
              kind: "section" as const,
              key: `section-${section.key}`,
              label: section.label,
              meta: "Section",
              section: section.key,
              focusId: undefined,
              score,
            }
          : null;
      })
      .filter(Boolean) as SearchResult[];

    const targetResults = SETTINGS_SEARCH_TARGETS
      .filter((target) => allowedSections.has(target.section))
      .map((target: SettingsSearchTarget) => {
        const keywords = target.keywords.map((keyword) => keyword.toLowerCase());
        const label = target.label.toLowerCase();
        let score = 0;

        if (label === normalizedQuery) score += 140;
        if (label.startsWith(normalizedQuery)) score += 120;
        if (keywords.some((keyword) => keyword === normalizedQuery)) score += 110;
        if (keywords.some((keyword) => keyword.startsWith(normalizedQuery))) score += 100;
        if (label.includes(normalizedQuery)) score += 70;
        if (keywords.some((keyword) => keyword.includes(normalizedQuery))) score += 60;

        return score > 0
          ? {
              kind: "target" as const,
              key: `target-${target.id}`,
              label: target.label,
              meta: SETTINGS_SECTION_COPY[target.section]?.title ?? target.section,
              section: target.section,
              focusId: target.id,
              score,
            }
          : null;
      })
      .filter(Boolean) as SearchResult[];

    return [...targetResults, ...sectionResults]
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, 8);
  }, [query, sections]);

  const filteredSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return sections;
    return sections.filter((section) =>
      searchResults.some((result) => result.section === section.key)
    );
  }, [query, searchResults, sections]);

  function handleNavigate(section: SettingsSectionKey, focusId?: string | null) {
    onNavigate({ section, focusId });
    setQuery("");
  }

  return (
    <aside
      className={cn(
        "sz-card relative flex h-full min-h-0 flex-col overflow-hidden rounded-[20px] border-[var(--border-default)] bg-[var(--surface-1)] p-5",
        className
      )}
    >
      {/* Atmospheric accent */}
      <div
        className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full opacity-[0.18] blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(94,105,244,0.55) 0%, transparent 70%)" }}
      />

      <div className="relative pb-5">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--text-accent)]">
          {title}
        </p>
        <SitezyInput
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && searchResults[0]) {
              event.preventDefault();
              handleNavigate(searchResults[0].section, searchResults[0].focusId ?? null);
            }
          }}
          placeholder="Search settings"
          className="min-h-[44px] border-[var(--border-soft)] bg-[var(--surface-3)] px-4 text-[13px]"
        />
      </div>

      <nav className="sz-scroll-hidden relative min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-y-contain pr-1">
        {query.trim() ? (
          searchResults.length === 0 ? (
            <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-3 py-3 text-[12px] leading-6 text-[var(--text-secondary)]">
              No settings matched “{query.trim()}”.
            </div>
          ) : (
            <div className="space-y-1">
              {searchResults.map((result) => {
                const Icon = SECTION_ICONS[result.section];
                const active = current === result.section;
                return (
                  <button
                    key={result.key}
                    type="button"
                    onClick={() => handleNavigate(result.section, result.focusId ?? null)}
                    className={cn(
                      "group relative flex w-full items-start gap-3 rounded-[12px] px-3 py-2.5 text-left transition-all duration-200",
                      active
                        ? "bg-[var(--accent-subtle)] text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <Icon
                      size={15}
                      strokeWidth={1.75}
                      className={cn(
                        "mt-0.5 flex-shrink-0 transition-colors",
                        active ? "text-[var(--text-accent)]" : "text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium tracking-[-0.005em]">{result.label}</span>
                      <span className="mt-0.5 block text-[11px] text-[var(--text-tertiary)]">
                        {result.kind === "target" ? `${result.meta} · direct match` : result.meta}
                      </span>
                    </span>
                    <ArrowUpRight size={13} className="mt-0.5 flex-shrink-0 text-[var(--text-tertiary)] transition-colors group-hover:text-[var(--text-primary)]" />
                  </button>
                );
              })}
            </div>
          )
        ) : filteredSections.map((section) => {
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
                  ? "bg-[var(--accent-subtle)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon
                size={15}
                strokeWidth={1.75}
                className={cn(
                  "flex-shrink-0 transition-colors",
                  active ? "text-[var(--text-accent)]" : "text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"
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
