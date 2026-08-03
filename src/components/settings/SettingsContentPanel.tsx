"use client";

import { cn } from "@/lib/utils";

export function SettingsContentPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sz-scroll-hidden relative min-h-0 overflow-y-auto overscroll-y-contain px-1 pb-2 pr-2",
        className
      )}
    >
      {children}
    </div>
  );
}
