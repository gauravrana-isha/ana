import { cn } from "@/lib/utils";

/** The five moods, drawn in the journal's line style. MoodBadge sets one on its own tile. */
export type MoodKey = "low" | "agitated" | "neutral" | "content" | "blissful";

const TONES: Record<MoodKey, { tile: string; ink: string }> = {
  low: { tile: "#DDE3EC", ink: "#4A5E78" },
  agitated: { tile: "#F3DED3", ink: "#9A4B2E" },
  neutral: { tile: "#EFE6D2", ink: "#7A6A45" },
  content: { tile: "#E1ECD6", ink: "#4E7A3A" },
  blissful: { tile: "#FBE3CC", ink: "#C8672F" },
};

function Face({ k }: { k: MoodKey }) {
  const eye = (cx: number) => <circle cx={cx} cy="10.2" r="1.15" fill="currentColor" stroke="none" />;
  return (
    <>
      <circle cx="12" cy="12" r="8.6" />
      {k === "low" && (
        <>
          <path d="M7.6 9.4c.8.7 1.8.9 2.6.6M16.4 9.4c-.8.7-1.8.9-2.6.6" />
          <path d="M8.8 16.2c1.9-1.6 4.5-1.6 6.4 0" />
        </>
      )}
      {k === "agitated" && (
        <>
          <path d="M7.8 8.4 10.2 9.4M16.2 8.4 13.8 9.4" />
          {eye(9.2)}
          {eye(14.8)}
          <path d="M8.3 15.4c.6-.7 1.2-.7 1.8 0s1.2.7 1.9 0 1.2-.7 1.9 0 1.2.7 1.8 0" />
        </>
      )}
      {k === "neutral" && (
        <>
          {eye(9.2)}
          {eye(14.8)}
          <path d="M9 15h6" />
        </>
      )}
      {k === "content" && (
        <>
          {eye(9.2)}
          {eye(14.8)}
          <path d="M8.7 13.8c1.8 2 4.8 2 6.6 0" />
        </>
      )}
      {k === "blissful" && (
        <>
          <path d="M7.7 10.4c.7-.9 2.1-.9 2.8 0M13.5 10.4c.7-.9 2.1-.9 2.8 0" />
          <path d="M8 13.2c1.3 3.2 6.7 3.2 8 0z" fill="currentColor" fillOpacity=".15" />
          <circle cx="12" cy="6.6" r=".9" fill="currentColor" stroke="none" />
        </>
      )}
    </>
  );
}

export function MoodFace({ k, size = 24, className }: { k: MoodKey; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn("shrink-0", className)}>
      <Face k={k} />
    </svg>
  );
}

export function MoodBadge({ k, size = 40, className }: { k: MoodKey; size?: number; className?: string }) {
  const { tile, ink } = TONES[k];
  return (
    <span
      aria-hidden="true"
      className={cn("feature-badge grid place-items-center shrink-0 rounded-[12px]", className)}
      style={{ width: size, height: size, background: "var(--fb-tile-now)", color: "var(--fb-ink-now)", ["--fb-tile" as string]: tile, ["--fb-ink" as string]: ink }}
    >
      <MoodFace k={k} size={Math.round(size * 0.66)} />
    </span>
  );
}
