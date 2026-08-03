import { Loader2 } from "lucide-react";

export function AppRouteLoading({
  eyebrow = "Loading",
  title,
}: {
  eyebrow?: string;
  title: string;
}) {
  return (
    <div className="sz-page-shell bg-[var(--surface-shell)] text-[var(--text-primary)]">
      <div className="sz-topbar sz-page-header">
        <div className="sz-grid-shell flex h-16 items-center">
          <span className="text-[15px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Sitezy</span>
        </div>
      </div>

      <div className="sz-page-scroll">
        <div className="sz-grid-shell flex min-h-full items-center justify-center py-16">
          <div className="w-full max-w-[440px] rounded-[30px] border border-[var(--border-soft)] bg-[var(--surface-3)] p-8 text-center shadow-[var(--shadow-lg)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] border border-[var(--border-default)] bg-[rgba(107,119,255,0.12)] text-[var(--text-accent)] shadow-[0_18px_44px_rgba(84,96,255,0.18)]">
              <Loader2 size={20} className="animate-spin" />
            </div>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
              {title}
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}
