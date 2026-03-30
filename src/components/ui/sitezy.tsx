"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const sizeMap: Record<ButtonSize, string> = {
  sm: "min-h-[36px] px-4 text-[12px]",
  md: "min-h-[44px] px-5 text-[13px]",
  lg: "min-h-[52px] px-6 text-[14px]",
};

export function SitezyButton({
  className,
  variant = "secondary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cn(
        "sz-button",
        variant === "primary" && "sz-button-primary",
        variant === "secondary" && "sz-button-secondary",
        variant === "ghost" && "sz-button-ghost",
        sizeMap[size],
        className
      )}
      {...props}
    />
  );
}

export function SitezyPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("sz-panel rounded-[24px]", className)} {...props} />;
}

export function SitezyCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("sz-card", className)} {...props} />;
}

export function SitezyBadge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("sz-badge", className)} {...props} />;
}

export const SitezyInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function SitezyInput({ className, ...props }, ref) {
    return <input ref={ref} className={cn("sz-input", className)} {...props} />;
  }
);

export const SitezyTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function SitezyTextarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn("sz-textarea", className)} {...props} />;
  }
);

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  align?: "left" | "center";
}) {
  const centered = align === "center";
  return (
    <div className={cn("flex flex-col gap-4", centered && "items-center text-center")}>
      {eyebrow ? (
        <span className="sz-badge w-fit">{eyebrow}</span>
      ) : null}
      <div className="space-y-4">
        <h2 className="text-[36px] leading-[1.08] tracking-[-0.04em] font-semibold text-[var(--text-primary)] md:text-[48px]">
          {title}
        </h2>
        {body ? (
          <p className="max-w-[680px] text-[15px] leading-8 text-[var(--text-secondary)] md:text-[17px]">
            {body}
          </p>
        ) : null}
      </div>
    </div>
  );
}
