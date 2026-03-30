"use client";

interface EditorSwitchProps {
  checked: boolean;
  onChange: () => void;
  title?: string;
  disabled?: boolean;
  className?: string;
}

export function EditorSwitch({
  checked,
  onChange,
  title,
  disabled = false,
  className = "",
}: EditorSwitchProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      title={title}
      aria-pressed={checked}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center overflow-hidden rounded-full border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/45 disabled:cursor-not-allowed disabled:opacity-45 ${
        checked
          ? "border-accent-400/32 bg-[linear-gradient(135deg,rgba(129,140,255,0.92),rgba(92,104,255,0.96))] shadow-[0_12px_28px_rgba(83,97,255,0.24)]"
          : "border-white/[0.08] bg-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.12]"
      } ${className}`}
    >
      <span
        className={`pointer-events-none absolute left-0.5 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white shadow-[0_8px_18px_rgba(0,0,0,0.24)] transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
