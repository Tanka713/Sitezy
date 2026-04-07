"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type OverlayDialogProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  titleId?: string;
  descriptionId?: string;
  containerClassName?: string;
  panelClassName?: string;
  backdropClassName?: string;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  lockBodyScroll?: boolean;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [] as HTMLElement[];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute("disabled")
      && element.getAttribute("aria-hidden") !== "true"
      && element.tabIndex !== -1
  );
}

export function OverlayDialog({
  open,
  onClose,
  children,
  titleId,
  descriptionId,
  containerClassName,
  panelClassName,
  backdropClassName,
  closeOnEscape = true,
  closeOnBackdrop = true,
  lockBodyScroll = true,
}: OverlayDialogProps) {
  const [mounted, setMounted] = useState(false);
  const fallbackTitleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);
  const resolvedTitleId = titleId || fallbackTitleId;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    previousActiveRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const frameId = window.requestAnimationFrame(() => {
      const focusables = getFocusableElements(dialogRef.current);
      if (focusables[0]) {
        focusables[0].focus();
      } else {
        dialogRef.current?.focus();
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      previousActiveRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !lockBodyScroll || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [lockBodyScroll, open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusables = getFocusableElements(dialogRef.current);
      if (!focusables.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === first || !dialogRef.current?.contains(activeElement)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (activeElement === last || !dialogRef.current?.contains(activeElement)) {
        event.preventDefault();
        first.focus();
      }
    }

    function handleFocusIn(event: FocusEvent) {
      if (dialogRef.current?.contains(event.target as Node)) return;
      const focusables = getFocusableElements(dialogRef.current);
      (focusables[0] ?? dialogRef.current)?.focus();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [closeOnEscape, onClose, open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[220]">
      <div
        className={cn("absolute inset-0 bg-[var(--overlay-backdrop)] backdrop-blur-xl", backdropClassName)}
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div className={cn("relative flex h-full w-full items-center justify-center p-4", containerClassName)}>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={resolvedTitleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          className={cn("outline-none", panelClassName)}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
