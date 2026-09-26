"use client";

import { cn } from "@/lib/utils";

/** On/off switch. `busy` shows a small spinner in the knob while a change is saving. */
export function Switch({
  checked,
  disabled,
  busy,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  busy?: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      aria-busy={busy || undefined}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-11 h-[26px] rounded-full shrink-0 transition-colors duration-200 disabled:cursor-not-allowed",
        disabled && !busy && "opacity-60",
        checked ? "bg-accent" : "bg-line"
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          checked && "translate-x-[18px]"
        )}
      >
        {busy && <span className="absolute inset-[5px] rounded-full border-2 border-accent/30 border-t-accent animate-spin" aria-hidden="true" />}
      </span>
    </button>
  );
}
