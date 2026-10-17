import { cn } from "@/lib/utils";

/**
 * The close (✕) button for sheets, panels and viewers. A pen-drawn cross to match the tick
 * (each stroke heavy where the pen lands, tapering off), in a quiet circle with a hairline edge
 * that firms up on hover, where the cross gives a small ink-like turn and settles (devices that
 * can hover). `onDark` is for photos and video.
 */
export function CloseButton({
  onClick,
  disabled,
  label = "Close",
  size = "md",
  onDark = false,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "md";
  onDark?: boolean;
  className?: string;
}) {
  const px = size === "sm" ? 32 : 36;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "press group grid place-items-center shrink-0 rounded-full border transition-colors disabled:opacity-40",
        onDark
          ? "bg-white/12 border-white/20 text-white hover:bg-white/20 hover:border-white/35"
          : "bg-surface border-line/70 text-ink-soft hover:text-ink hover:border-ink-soft/40 hover:bg-surface-2",
        className
      )}
      style={{ width: px, height: px }}
    >
      <CrossMark size={size === "sm" ? 16 : 18} className="ana-x" />
    </button>
  );
}

/** The pen-drawn cross, as a drawing (in the current text colour). */
export function CrossMark({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M5.4 5.2c1-.6 2-.2 2.8.5 3.1 2.8 6.4 6.9 10.3 12 .3.4 0 .8-.4.6-3.5-2.6-7.9-6.6-11.6-9.7-1.2-1-1.9-2.6-1.1-3.4zM18.9 5.1c.3.3.2.8-.1 1.1-4 3.9-7.6 7.9-10.8 12-.6.8-1.7.9-2.3.3-.5-.5-.4-1.3.1-1.8 3.7-3.8 8.2-7.9 12.4-11.6.2-.2.5-.2.7 0z"
      />
    </svg>
  );
}
