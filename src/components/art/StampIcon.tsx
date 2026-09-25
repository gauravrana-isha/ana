import { cn } from "@/lib/utils";

/**
 * The five reflection stamps, drawn in the journal's line style (24 grid, one round stroke).
 * StampIcon is the bare glyph (chips); StampBadge sets it on a pastel tile (guide).
 */
export type StampKey = "growth" | "struggle" | "insight" | "stillness" | "devotion";

const TONES: Record<StampKey, { tile: string; ink: string }> = {
  growth: { tile: "#E1ECD6", ink: "#4E7A3A" },
  struggle: { tile: "#F3DED3", ink: "#9A4B2E" },
  insight: { tile: "#F6E7C1", ink: "#9A6B12" },
  stillness: { tile: "#DCEAF0", ink: "#3E6B7A" },
  devotion: { tile: "#FBE3CC", ink: "#C8672F" },
};

function Glyph({ k }: { k: StampKey }) {
  switch (k) {
    case "growth": // a sprout reaching up
      return (
        <>
          <path d="M12 20.5V11" />
          <path d="M12 12.5c0-4 2.8-6.5 7-6.5 0 4-2.8 6.5-7 6.5z" />
          <path d="M12 15c0-3-2.4-5-6-5 0 3 2.4 5 6 5z" />
          <path d="M8 20.5h8" />
        </>
      );
    case "struggle": // a mountain, and the path up it
      return (
        <>
          <path d="M2.5 19.5 9 9.5l3.5 5 2.5-3.5 6.5 8.5z" />
          <path d="M9 9.5V4.5l3 1.2-3 1.2" />
          <path d="M8 19.5c1.2-1.6 2-2.4 3.5-2.4" strokeDasharray="1.2 2" />
        </>
      );
    case "insight": // the sun rising over the line
      return (
        <>
          <path d="M7.5 16.5a4.5 4.5 0 0 1 9 0" />
          <path d="M3.5 19.5h17" />
          <path d="M12 5v3M5.9 8.4l2 2M18.1 8.4l-2 2M3.5 13.5h2.5M18 13.5h2.5" />
        </>
      );
    case "stillness": // a drop over still water
      return (
        <>
          <path d="M12 3.8c2.6 3.3 3.8 5.3 3.8 7a3.8 3.8 0 0 1-7.6 0c0-1.7 1.2-3.7 3.8-7z" />
          <path d="M3.5 18c1.8-1.2 3.6-1.2 5.4 0s3.6 1.2 5.4 0 3.6-1.2 5.4 0" />
          <path d="M6.5 21h11" />
        </>
      );
    case "devotion": // a diya
      return (
        <>
          <path d="M4 14h16c0 3.4-3.6 6-8 6s-8-2.6-8-6z" />
          <path d="M12 4.5c1.9 2.2 2.4 4 0 6.5-2.4-2.5-1.9-4.3 0-6.5z" />
          <path d="M3 14h1.5M19.5 14H21" />
        </>
      );
  }
}

export function StampIcon({ k, size = 16, className }: { k: StampKey; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn("shrink-0", className)}>
      <Glyph k={k} />
    </svg>
  );
}

export function StampBadge({ k, size = 36, className }: { k: StampKey; size?: number; className?: string }) {
  const { tile, ink } = TONES[k];
  return (
    <span
      aria-hidden="true"
      className={cn("feature-badge grid place-items-center shrink-0 rounded-[11px]", className)}
      style={{ width: size, height: size, background: "var(--fb-tile-now)", color: "var(--fb-ink-now)", ["--fb-tile" as string]: tile, ["--fb-ink" as string]: ink }}
    >
      <StampIcon k={k} size={Math.round(size * 0.58)} />
    </span>
  );
}
