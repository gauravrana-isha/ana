import { cn } from "@/lib/utils";

/*
 * Skeleton building blocks. Every bone shares one light sweep that travels across the whole
 * screen (the gradient is pinned to the viewport), so a screen of placeholders shimmers as one
 * surface instead of each block blinking on its own. Still for reduced motion.
 */

export function Bone({ className, style, round = false }: { className?: string; style?: React.CSSProperties; round?: boolean }) {
  return <span aria-hidden="true" className={cn("ana-bone block", round ? "rounded-full" : "rounded-[8px]", className)} style={style} />;
}

/** A line of text: a bone at text height, optionally shorter. */
export function TextBone({ w = "100%", h = 12, className }: { w?: number | string; h?: number; className?: string }) {
  return <Bone className={className} style={{ width: w, height: h }} />;
}

/** A card the shape of the real one (cream surface), with bones inside. */
export function SkeletonCard({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn("rounded-[18px] bg-surface", className)}>{children}</div>;
}

/** Wrapper: marks the region busy for assistive tech and fades the skeleton in after a beat,
 *  so very fast loads never flash placeholders. */
export function Skeleton({ label = "Loading", className, children }: { label?: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={cn("ana-skeleton-in", className)}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}
