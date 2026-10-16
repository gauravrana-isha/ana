"use client";

import { cn } from "@/lib/utils";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
  fullScreen?: boolean;
}

const SIZE = { sm: 22, md: 34, lg: 48 };

/**
 * A line lotus drawn stroke by stroke and then let go, on a loop: the centre petal first,
 * then the pairs outward, then the water line. For the few waits a skeleton can't stand in
 * for (a search running, a panel reloading). Pages use skeletons instead.
 */
export function LotusDraw({ size = 34, className }: { size?: number; className?: string }) {
  const petals = [
    "M24 9c4.6 4.4 6.6 9.2 6 14.6-.4 3.8-2.4 7-6 9.4-3.6-2.4-5.6-5.6-6-9.4-.6-5.4 1.4-10.2 6-14.6z",
    "M17.6 20.6c-3.6-.6-7-.2-10.2 1.4 1 5.2 4.4 9 10 10.8 2 .6 4.2.8 6.6.2",
    "M30.4 20.6c3.6-.6 7-.2 10.2 1.4-1 5.2-4.4 9-10 10.8-2 .6-4.2.8-6.6.2",
    "M12.2 31.6c-2.6.6-4.8 1.8-6.6 3.6 4.8 3.4 11 4.6 18.4 4.6s13.6-1.2 18.4-4.6c-1.8-1.8-4-3-6.6-3.6",
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn("ana-draw", className)}>
      {petals.map((d, i) => (
        <path key={i} d={d} pathLength={1} style={{ animationDelay: `${i * 0.14}s` }} />
      ))}
    </svg>
  );
}

/** A waiting state for a section or panel: the drawing lotus, with an optional label. */
export function Loader({ size = "md", className, label, fullScreen = false }: LoaderProps) {
  const body = (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center gap-3 text-accent", className)}>
      <LotusDraw size={SIZE[size]} />
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
