import { cn } from "@/lib/utils";

/**
 * The close (✕) button for sheets, panels and viewers. A drawn cross (round-ended strokes,
 * inset so it reads light), in a quiet circle with a hairline edge that firms up on hover,
 * and a quarter turn on hover (devices that can hover). `onDark` is for photos and video.
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
      <svg
        width={size === "sm" ? 14 : 15}
        height={size === "sm" ? 14 : 15}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-90"
      >
        <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    </button>
  );
}
