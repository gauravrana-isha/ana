import { cn } from "@/lib/utils";

/**
 * The four kinds of moment, drawn like the feature badges (48-unit grid, pastel tile, one
 * ink stroke). `MomentBadge` is the tile; `MomentGlyph` is the bare line drawing for tabs,
 * chips and buttons.
 */
export type MomentIconKind = "writing" | "audio" | "video" | "photo";

const TONES: Record<MomentIconKind, { tile: string; ink: string }> = {
  writing: { tile: "#E7E4F3", ink: "#5B4F8C" },
  audio: { tile: "#F6DFD4", ink: "#A64B32" },
  video: { tile: "#DCEAF0", ink: "#3E6B7A" },
  photo: { tile: "#F6E7C1", ink: "#8F6310" },
};

function norm(k: string): MomentIconKind {
  return k === "audio" || k === "video" || k === "photo" ? k : "writing";
}

function Drawing({ k, ink }: { k: MomentIconKind; ink: string }) {
  switch (k) {
    case "writing":
      return (
        <>
          {/* quill */}
          <path d="M35.5 9.5c-9.8 1.6-16.2 8.6-18 18.6l3.4 3.4c10-1.8 17-8.2 14.6-22z" />
          <path d="M31 14.5 17.5 28" />
          <path d="M20.9 31.5 15 37.5" />
          {/* the line it writes */}
          <path d="M11 39.5c2.2-1.6 4.2-1.6 6 0s4 1.6 6 0 4-1.6 6 0" />
        </>
      );
    case "audio":
      return (
        <>
          <rect x="19.5" y="9.5" width="9" height="17" rx="4.5" />
          <path d="M14.5 22.5c0 5.5 4.3 9.5 9.5 9.5s9.5-4 9.5-9.5" />
          <path d="M24 32v6M19 38.5h10" />
          <path d="M9.5 17.5c-1.4 2.8-1.4 6.2 0 9M38.5 17.5c1.4 2.8 1.4 6.2 0 9" />
        </>
      );
    case "video":
      return (
        <>
          <rect x="8.5" y="15" width="22" height="18" rx="4.5" />
          <path d="M30.5 21.5 39.5 16.5v15l-9-5z" />
          <circle cx="15" cy="21" r="1.5" fill={ink} stroke="none" />
        </>
      );
    case "photo":
      return (
        <>
          <path d="M9.5 18.5a3.5 3.5 0 0 1 3.5-3.5h4.5l2.5-4h8l2.5 4H35a3.5 3.5 0 0 1 3.5 3.5V33a3.5 3.5 0 0 1-3.5 3.5H13A3.5 3.5 0 0 1 9.5 33z" />
          <circle cx="24" cy="25.5" r="6" />
          <circle cx="33.5" cy="20" r="1.3" fill={ink} stroke="none" />
        </>
      );
  }
}

export function MomentBadge({ kind, size = 40, className }: { kind: string; size?: number; className?: string }) {
  const k = norm(kind);
  const { tile, ink } = TONES[k];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("shrink-0 feature-badge", className)}
      style={{ ["--fb-tile" as string]: tile, ["--fb-ink" as string]: ink }}
    >
      <rect width="48" height="48" rx="13" fill="var(--fb-tile-now)" />
      <g stroke="var(--fb-ink-now)" strokeWidth={2.4}>
        <Drawing k={k} ink="var(--fb-ink-now)" />
      </g>
    </svg>
  );
}

export function MomentGlyph({ kind, size = 18, className, strokeWidth = 2.6 }: { kind: string; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="7 7 34 34" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn("shrink-0", className)}>
      <Drawing k={norm(kind)} ink="currentColor" />
    </svg>
  );
}

/** The ink colour of a kind, for small accents next to its badge. */
export function momentInk(kind: string) {
  return TONES[norm(kind)].ink;
}
