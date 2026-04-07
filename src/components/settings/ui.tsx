"use client";

import { forwardRef, useEffect, useId, useRef, useState } from "react";
import type {
  HTMLAttributes,
  InputHTMLAttributes,
  MouseEvent as ReactMouseEvent,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SitezyButton, SitezyCard, SitezyInput, SitezyTextarea } from "@/components/ui/sitezy";
import { OverlayDialog } from "@/components/ui/OverlayDialog";

export function SettingsPane({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <SitezyCard className={cn("flex h-full min-h-0 flex-col overflow-hidden p-0", className)} {...props} />;
}

export function SettingsSectionHeading({
  eyebrow,
  title,
  body,
  actions,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 px-1 pb-6 md:flex-row md:items-start md:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5B8CFF]">{eyebrow}</p>
        ) : null}
        <div className="space-y-2">
          <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-white md:text-[30px]">
            {title}
          </h1>
          {body ? (
            <p className="max-w-[680px] text-[13px] leading-[1.7] text-white/55 md:text-[13.5px]">
              {body}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SettingsGroup({
  title,
  body,
  className,
  children,
}: HTMLAttributes<HTMLDivElement> & {
  title: string;
  body?: string;
}) {
  return (
    <div className={cn("space-y-5", className)}>
      <div>
        <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-white">{title}</h2>
        {body ? <p className="mt-1.5 text-[12.5px] leading-[1.65] text-white/55">{body}</p> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function SettingsStack({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-6", className)} {...props} />;
}

export function SettingsRow({
  title,
  body,
  action,
  stacked = false,
  className,
  children,
}: HTMLAttributes<HTMLDivElement> & {
  title: string;
  body?: string;
  action?: React.ReactNode;
  stacked?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-white/[0.05] bg-white/[0.015] px-5 py-4 transition-colors hover:border-white/[0.08]",
        className
      )}
    >
      <div className={cn("flex gap-4", stacked ? "flex-col" : "flex-col lg:flex-row lg:items-start lg:justify-between")}>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13.5px] font-semibold tracking-[-0.01em] text-white">{title}</h3>
          {body ? <p className="mt-1 text-[12.5px] leading-[1.6] text-white/55">{body}</p> : null}
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export function SettingsField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-white/45">{label}</span>
        {hint ? <span className="text-[11px] text-white/35">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

export function SettingsGrid({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-4 md:grid-cols-2", className)} {...props} />;
}

export function SettingsToggle({
  checked,
  onChange,
  label,
  shortcut,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  shortcut?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "group inline-flex items-center gap-3 rounded-full border border-[var(--border-softer)] bg-[var(--surface-3)] px-1.5 py-1 transition-all",
        checked && "border-[var(--border-focus)] bg-[var(--accent-subtle)]"
      )}
    >
      {label ? (
        <span className={cn("pl-2 text-[12px] font-medium text-[var(--fg-soft)]", checked && "text-[var(--text-primary)]")}>
          {label}
          {shortcut ? <span className="ml-1 text-[10px] text-[var(--fg-faint)]">({shortcut})</span> : null}
        </span>
      ) : null}
      <span
        className={cn(
          "relative flex h-8 w-[52px] items-center rounded-full border border-[var(--border-softer)] bg-[var(--surface-4)] transition-colors",
          checked && "bg-[linear-gradient(135deg,#7a85ff_0%,#5a66ff_100%)]"
        )}
      >
        <span
          className={cn(
            "absolute left-[3px] h-6 w-6 rounded-full bg-[var(--bg-elevated)] shadow-[var(--shadow-xs)] transition-transform",
            checked && "translate-x-[20px]"
          )}
        />
      </span>
    </button>
  );
}

export function SettingsSegmented<T extends string>({
  value,
  onChange,
  options,
  columns = 3,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; description?: string }>;
  columns?: 2 | 3;
}) {
  return (
    <div className={cn("grid gap-2", columns === 2 ? "grid-cols-2" : "md:grid-cols-3")}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "relative overflow-hidden rounded-[12px] border px-4 py-3 text-left transition-all",
              active
                ? "border-[#5B8CFF]/40 bg-[#5B8CFF]/[0.08] text-white"
                : "border-white/[0.06] bg-white/[0.015] text-white/65 hover:border-white/[0.12] hover:bg-white/[0.03] hover:text-white"
            )}
          >
            <div className="text-[13px] font-semibold tracking-[-0.01em]">{option.label}</div>
            {option.description ? (
              <div
                className={cn(
                  "mt-1 text-[12px] leading-[1.5]",
                  active ? "text-white/65" : "text-white/40"
                )}
              >
                {option.description}
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsSlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = "",
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[12px] text-white/45">
        <span>{min}{suffix}</span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[12px] font-medium text-white/85">
          {value}{suffix}
        </span>
        <span>{max}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.06] accent-[#5B8CFF]"
      />
    </div>
  );
}

function safeHex(value: string | null | undefined): string {
  if (!value || value === "transparent" || value === "rgba(0, 0, 0, 0)") return "#ffffff";
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    return "#" + value.slice(1).split("").map((char) => char + char).join("");
  }
  if (/^#[0-9a-fA-F]{4}$/.test(value)) {
    return "#" + value.slice(1, 4).split("").map((char) => char + char).join("");
  }
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase();
  if (/^#[0-9a-fA-F]{8}$/.test(value)) return `#${value.slice(1, 7).toLowerCase()}`;
  const rgbMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return (
      "#" +
      [rgbMatch[1], rgbMatch[2], rgbMatch[3]]
        .map((channel) => parseInt(channel, 10).toString(16).padStart(2, "0"))
        .join("")
    );
  }
  return "#888888";
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const saturation = s / 100;
  const value = v / 100;
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = value - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (h >= 0 && h < 60) [red, green, blue] = [chroma, x, 0];
  else if (h < 120) [red, green, blue] = [x, chroma, 0];
  else if (h < 180) [red, green, blue] = [0, chroma, x];
  else if (h < 240) [red, green, blue] = [0, x, chroma];
  else if (h < 300) [red, green, blue] = [x, 0, chroma];
  else [red, green, blue] = [chroma, 0, x];

  return [
    Math.round((red + match) * 255),
    Math.round((green + match) * 255),
    Math.round((blue + match) * 255),
  ];
}

function rgbToHex(red: number, green: number, blue: number): string {
  return "#" + [red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("");
}

function hexToHsv(hex: string): [number, number, number] {
  const red = parseInt(hex.slice(1, 3), 16) / 255;
  const green = parseInt(hex.slice(3, 5), 16) / 255;
  const blue = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const value = max * 100;
  const saturation = max === 0 ? 0 : (delta / max) * 100;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return [hue, saturation, value];
}

function hsvToHex(hue: number, saturation: number, value: number): string {
  const [red, green, blue] = hsvToRgb(hue, saturation, value);
  return rgbToHex(red, green, blue);
}

export function SettingsColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(safeHex(value)));
  const [hexInput, setHexInput] = useState(safeHex(value).replace("#", ""));
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const gradientRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const [hue, saturation, brightness] = hsv;
  const currentHex = hsvToHex(hue, saturation, brightness);
  const hueColor = `hsl(${hue}, 100%, 50%)`;

  useEffect(() => {
    const safe = safeHex(value);
    const nextHsv = hexToHsv(safe);
    setHsv(nextHsv);
    setHexInput(hsvToHex(...nextHsv).replace("#", ""));
  }, [value]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handlePointerMove(event: MouseEvent) {
      if (draggingRef.current) pickFromGradient(event);
    }

    function handlePointerUp() {
      draggingRef.current = false;
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("mousemove", handlePointerMove);
    document.addEventListener("mouseup", handlePointerUp);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("mousemove", handlePointerMove);
      document.removeEventListener("mouseup", handlePointerUp);
    };
  }, [open, hue]);

  function pickFromGradient(event: MouseEvent | ReactMouseEvent) {
    if (!gradientRef.current) return;
    const rect = gradientRef.current.getBoundingClientRect();
    const nextSaturation = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const nextBrightness = Math.max(0, Math.min(100, (1 - (event.clientY - rect.top) / rect.height) * 100));
    setHsv((current) => {
      const nextHsv: [number, number, number] = [current[0], nextSaturation, nextBrightness];
      const nextHex = hsvToHex(...nextHsv);
      setHexInput(nextHex.replace("#", ""));
      onChange(nextHex);
      return nextHsv;
    });
  }

  function commitHex(raw: string) {
    const normalized = raw.startsWith("#") ? raw : `#${raw}`;
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      const nextHsv = hexToHsv(normalized);
      setHsv(nextHsv);
      setHexInput(normalized.slice(1).toUpperCase());
      onChange(normalized.toLowerCase());
      return;
    }

    setHexInput(currentHex.replace("#", "").toUpperCase());
  }

  return (
    <div ref={pickerRef} className="relative">
      <div
        onClick={() => setOpen((current) => !current)}
        className="flex cursor-pointer items-center gap-2 rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-3)] p-1.5 transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-4)]"
      >
        <span
          className="block h-7 w-7 shrink-0 rounded-[10px] ring-1 ring-inset ring-[var(--border-soft)]"
          style={{ backgroundColor: currentHex }}
        />
        <span className="min-w-0 flex-1 truncate font-mono text-[12px] uppercase text-[var(--fg-soft)]">
          {currentHex}
        </span>
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-[18px] border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-[var(--shadow-xl)]">
          <div
            ref={gradientRef}
            className="relative w-full select-none"
            style={{
              height: 144,
              background: `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, ${hueColor})`,
              cursor: "crosshair",
            }}
            onMouseDown={(event) => {
              draggingRef.current = true;
              pickFromGradient(event);
            }}
          >
            <div
              className="pointer-events-none absolute h-3.5 w-3.5 rounded-full border-2 border-white shadow-lg"
              style={{
                left: `${saturation}%`,
                top: `${100 - brightness}%`,
                transform: "translate(-50%, -50%)",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.28)",
              }}
            />
          </div>

          <div className="space-y-3 p-3">
            <div>
              <style>{`.sz-settings-hue::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:999px;background:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35);cursor:pointer}.sz-settings-hue::-moz-range-thumb{width:14px;height:14px;border-radius:999px;background:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35);cursor:pointer}`}</style>
              <input
                type="range"
                min={0}
                max={360}
                value={Math.round(hue)}
                onChange={(event) => {
                  const nextHue = Number(event.target.value);
                  const nextHsv: [number, number, number] = [nextHue, saturation, brightness];
                  setHsv(nextHsv);
                  const nextHex = hsvToHex(...nextHsv);
                  setHexInput(nextHex.replace("#", "").toUpperCase());
                  onChange(nextHex);
                }}
                className="sz-settings-hue h-3 w-full cursor-pointer appearance-none rounded-full"
                style={{ background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}
              />
            </div>

            <div className="flex items-center gap-2 rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-3 py-2">
              <span className="select-none font-mono text-[12px] text-[var(--fg-faint)]">#</span>
              <input
                value={hexInput}
                onChange={(event) => setHexInput(event.target.value.toUpperCase())}
                onBlur={(event) => commitHex(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commitHex(hexInput);
                }}
                maxLength={6}
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent font-mono text-[12px] uppercase text-[var(--text-primary)] focus:outline-none"
              />
              <span
                className="h-4 w-4 shrink-0 rounded ring-1 ring-inset ring-[var(--border-soft)]"
                style={{ backgroundColor: currentHex }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const SettingsInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function SettingsInput({ className, ...props }, ref) {
    return <SitezyInput ref={ref} className={cn("text-[14px]", className)} {...props} />;
  }
);

export const SettingsTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function SettingsTextarea({ className, ...props }, ref) {
    return <SitezyTextarea ref={ref} className={cn("min-h-[120px] text-[14px]", className)} {...props} />;
  }
);

export const SettingsSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function SettingsSelect({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn("sz-select text-[14px]", className)} {...props}>
        {children}
      </select>
    );
  }
);

export function SettingsStatus({
  tone,
  children,
}: {
  tone: "success" | "error" | "muted";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "border-[rgba(49,196,141,0.22)] bg-[rgba(49,196,141,0.1)] text-[var(--success-fg)]"
      : tone === "error"
        ? "border-[rgba(240,106,116,0.22)] bg-[rgba(240,106,116,0.1)] text-[var(--danger-fg)]"
        : "border-[var(--border-soft)] bg-[var(--surface-3)] text-[var(--fg-soft)]";

  return <div className={cn("rounded-[16px] border px-4 py-3 text-[13px]", toneClass)}>{children}</div>;
}

export function SettingsModal({
  open,
  title,
  body,
  onClose,
  actions,
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  onClose: () => void;
  actions: React.ReactNode;
}) {
  const titleId = useId();
  if (!open) return null;
  return (
    <OverlayDialog open={open} onClose={onClose} titleId={titleId} panelClassName="w-full max-w-[520px] rounded-[28px] border border-[var(--border-softer)] bg-[var(--bg-elevated)] shadow-[var(--shadow-xl)]">
      <div>
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] px-6 py-5">
          <div>
            <h2 id={titleId} className="text-[24px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-3)] text-[var(--fg-faint)] transition-all hover:bg-[var(--surface-4)] hover:text-[var(--fg-soft)]"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-6 py-6">{body}</div>
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border-soft)] px-6 py-5">
          {actions}
        </div>
      </div>
    </OverlayDialog>
  );
}

export function SettingsPlaceholder({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-dashed border-white/[0.08] bg-white/[0.015] px-6 py-7">
      <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-white">{title}</h3>
      <p className="mt-2 max-w-[560px] text-[12.5px] leading-[1.65] text-white/55">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SettingsActionRow({
  children,
  className,
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-[14px] border border-white/[0.05] bg-white/[0.015] px-4 py-3.5 md:px-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SettingsPrimaryAction(props: React.ComponentProps<typeof SitezyButton>) {
  return <SitezyButton variant="primary" size="sm" {...props} />;
}

export function SettingsSecondaryAction(props: React.ComponentProps<typeof SitezyButton>) {
  return <SitezyButton variant="secondary" size="sm" {...props} />;
}

export function SettingsResetRow({
  onReset,
  disabled = false,
  label = "Reset to defaults",
  className,
}: {
  onReset: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <SettingsActionRow className={cn("justify-start", className)}>
      <SettingsSecondaryAction type="button" onClick={onReset} disabled={disabled}>
        <RotateCcw size={14} />
        {label}
      </SettingsSecondaryAction>
    </SettingsActionRow>
  );
}
