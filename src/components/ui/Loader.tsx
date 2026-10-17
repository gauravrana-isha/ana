"use client";

import { cn } from "@/lib/utils";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
  fullScreen?: boolean;
}

const SIZE = { sm: 22, md: 44, lg: 56 };

/**
 * The coiled snake from the splash, turning slowly around its own coil, inked in the accent.
 * For the waits a skeleton can't stand in for (opening the journal, a panel reloading).
 * Below about 32px the drawing turns to mush, so small waits use the dots instead.
 */
export function SnakeLoader({ size = 48, className }: { size?: number; className?: string }) {
  // The drawing is 608 × 768; the box keeps that shape so the turning point lands on the coil.
  return <span aria-hidden="true" className={cn("ana-coil block shrink-0", className)} style={{ width: size, height: Math.round(size * 1.2632) }} />;
}

/** A waiting state for a section or panel: the turning snake (dots when small), with an optional label. */
export function Loader({ size = "md", className, label, fullScreen = false }: LoaderProps) {
  const body = (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center gap-3 text-accent", className)}>
      {size === "sm" ? <ButtonLoader /> : <SnakeLoader size={SIZE[size]} />}
      {label ? (
        <span className="font-ui text-[13px] text-ink-soft">{label}</span>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );

  if (fullScreen) {
    return <div className="fixed inset-0 z-50 grid place-items-center bg-bg/80 backdrop-blur-sm">{body}</div>;
  }
  return body;
}

/** Three breathing dots in the button's own colour. */
export function ButtonLoader({ className }: { className?: string }) {
  return (
    <span role="status" aria-label="Working" className={cn("inline-flex items-center gap-[5px]", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-[6px] h-[6px] rounded-full bg-current ana-dot"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </span>
  );
}

/** Covers a container while it reloads. */
export function OverlayLoader({ label }: { label?: string }) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-bg/60 backdrop-blur-[2px] rounded-14">
      <Loader size="md" label={label} />
    </div>
  );
}
