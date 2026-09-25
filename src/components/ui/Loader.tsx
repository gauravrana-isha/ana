"use client";

import { Lotus } from "@/components/art/Lotus";
import { cn } from "@/lib/utils";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
  fullScreen?: boolean;
}

const LOTUS = { sm: 22, md: 32, lg: 44 };

/** The lotus, breathing. Used wherever a section or page is waiting on data. */
export function Loader({ size = "md", className, label, fullScreen = false }: LoaderProps) {
  const body = (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center gap-3 text-accent", className)}>
      <span className="relative grid place-items-center">
        <span className="absolute inset-[-40%] rounded-full bg-accent-soft ana-breathe-halo" aria-hidden="true" />
        <Lotus size={LOTUS[size]} className="relative ana-breathe" />
      </span>
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
