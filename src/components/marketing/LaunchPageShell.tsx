import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { SitezyBadge, SitezyButton, SitezyCard } from "@/components/ui/sitezy";

export function LaunchPageShell({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="sz-topbar sticky top-0 z-40">
        <div className="sz-grid-shell flex h-20 items-center justify-between gap-5">
          <Link href="/" className="flex items-center gap-3 text-[15px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            <ArrowLeft size={14} />
            Sitezy
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <SitezyButton variant="ghost" size="sm">Log in</SitezyButton>
            </Link>
            <Link href="/signup">
              <SitezyButton variant="primary" size="sm">Join beta</SitezyButton>
            </Link>
          </div>
        </div>
      </header>

      <main className="sz-grid-shell py-10 md:py-14">
        <div className="mx-auto w-full max-w-[920px] space-y-8">
          <div className="space-y-4">
            <SitezyBadge>{eyebrow}</SitezyBadge>
            <div className="space-y-3">
              <h1 className="text-[38px] font-semibold leading-[1.02] tracking-[-0.05em] text-[var(--text-primary)] md:text-[56px]">
                {title}
              </h1>
              <p className="max-w-[760px] text-[15px] leading-8 text-[var(--text-secondary)] md:text-[17px]">
                {body}
              </p>
            </div>
          </div>

          <SitezyCard className="p-6 md:p-8">
            <div className="prose max-w-none text-[var(--text-secondary)] prose-headings:text-[var(--text-primary)] prose-p:text-[var(--text-secondary)] prose-li:text-[var(--text-secondary)] prose-strong:text-[var(--text-primary)] prose-a:text-[var(--text-primary)] prose-a:no-underline hover:prose-a:text-[var(--text-accent)] prose-ul:pl-5 prose-ol:pl-5 prose-hr:border-[var(--border-soft)]">
              {children}
            </div>
          </SitezyCard>
        </div>
      </main>
    </div>
  );
}
