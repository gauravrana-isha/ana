import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/** Chevrons and arrows drawn like the reference journal: 24-grid, 2px round strokes. */
export function Chevron({ dir = "right", size = 16, className }: { dir?: "left" | "right" | "up" | "down"; size?: number; className?: string }) {
  const d = { left: "M15 5L8 12L15 19", right: "M9 5L16 12L9 19", up: "M5 15L12 8L19 15", down: "M5 9L12 16L19 9" }[dir];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
