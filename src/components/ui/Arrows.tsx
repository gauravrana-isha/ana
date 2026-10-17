import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { BACK_PATH } from "@/components/art/PenMarks";

/** Chevrons, pen-drawn like the tick and the cross: the back mark, turned to face each way. */
export function Chevron({ dir = "right", size = 16, className }: { dir?: "left" | "right" | "up" | "down"; size?: number; className?: string }) {
  const turn = { left: "", right: "scale(-1 1) translate(-24 0)", up: "rotate(90 12 12)", down: "rotate(-90 12 12)" }[dir];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d={BACK_PATH} transform={turn || undefined} />
    </svg>
  );
}

export function Arrow({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M4.5 12h15M13.5 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Round previous/next button: light disc, teal chevron, warm ring on focus. */
export const RoundArrowButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { dir: "left" | "right"; size?: "sm" | "md" }
>(function RoundArrowButton({ dir, size = "md", className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "press grid place-items-center rounded-full bg-bg text-accent shadow-[0_1px_2px_rgba(24,22,15,0.06)]",
        "hover:ring-2 hover:ring-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d29b3a]",
        "disabled:opacity-35 disabled:hover:ring-0 disabled:cursor-not-allowed",
        size === "md" ? "w-10 h-10" : "w-8 h-8",
        className
      )}
      {...props}
    >
      <Chevron dir={dir} size={size === "md" ? 18 : 15} />
    </button>
  );
});
