"use client";

import { cn } from "@/lib/utils";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
  fullScreen?: boolean;
}

export function Loader({ size = "md", className, label, fullScreen = false }: LoaderProps) {
  const sizes = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const spinner = (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className={cn("relative", sizes[size])}>
        {/* Outer ring */}
        <div className={cn(
          "absolute inset-0 rounded-full border-2 border-line opacity-30",
          sizes[size]
        )} />
        {/* Spinning arc */}
        <div className={cn(
          "absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin",
          sizes[size]
        )} />
        {/* Inner dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            "rounded-full bg-accent/40 animate-pulse",
            size === "sm" ? "w-1.5 h-1.5" : size === "md" ? "w-2 h-2" : "w-3 h-3"
          )} />
        </div>
      </div>
      {label && (
        <span className="font-ui text-xs text-ink-soft animate-pulse">{label}</span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
}

/** Inline loader for buttons */
export function ButtonLoader() {
  return (
    <div className="w-4 h-4 rounded-full border-2 border-transparent border-t-current animate-spin" />
  );
}

/** Overlay loader — covers a container */
export function OverlayLoader({ label }: { label?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/60 backdrop-blur-[2px] rounded-14">
      <Loader size="md" label={label} />
    </div>
  );
}
