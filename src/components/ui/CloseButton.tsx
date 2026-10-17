import { cn } from "@/lib/utils";
import { CrossMark } from "@/components/art/PenMarks";

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
          ? "bg-black/45 backdrop-blur-md border-white/25 text-white hover:bg-black/60 hover:border-white/40"
          : "bg-surface border-line/70 text-ink-soft hover:text-ink hover:border-ink-soft/40 hover:bg-surface-2",
        className
      )}
      style={{ width: px, height: px }}
    >
      <CrossMark size={size === "sm" ? 16 : 18} className="ana-x" />
    </button>
  );
}

