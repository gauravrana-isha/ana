import { cn } from "@/lib/utils";

/**
 * Coloured feature badges from the reference journal (48-unit grid, pastel tile, one ink
 * stroke). In dark mode the tile sinks into the surface and the stroke lifts, so the set
 * stays calm at night.
 */
type Key = "today" | "tracker" | "daily" | "weekly" | "expressions" | "people" | "commitment" | "insights";
type GlyphKey = Key | "profile" | "admin" | "search" | "bell";

const TONES: Record<Key, { tile: string; ink: string }> = {
  today: { tile: "#FBE3CC", ink: "#C8672F" },
  tracker: { tile: "#F3DADB", ink: "#7A2E33" },
  daily: { tile: "#F6E7C1", ink: "#9A6B12" },
  weekly: { tile: "#DCEAF0", ink: "#3E6B7A" },
  expressions: { tile: "#E7E4F3", ink: "#5B4F8C" },
  people: { tile: "#E6EAD7", ink: "#56662C" },
  commitment: { tile: "#EFE3D0", ink: "#8A6A3F" },
  insights: { tile: "#DCEBE5", ink: "#2F6B5E" },
};

function Drawing({ k, ink }: { k: GlyphKey; ink: string }) {
  const dot = (cx: number, cy: number, r = 1.2) => <circle cx={cx} cy={cy} r={r} fill={ink} stroke="none" />;
  switch (k) {
    case "today":
      return (
        <>
          <circle cx="24" cy="24" r="8.5" />
          <path d="M24 9.5v3M24 35.5v3M9.5 24h3M35.5 24h3M13.7 13.7l2.1 2.1M32.2 32.2l2.1 2.1M13.7 34.3l2.1-2.1M32.2 15.8l2.1-2.1" />
          <path d="M20.6 26.2c1.9 2 4.9 2 6.8 0" />
          {dot(21, 21.8, 0.9)}
          {dot(27, 21.8, 0.9)}
        </>
      );
    case "tracker":
      return (
        <>
          <path d="M12 15.5l2.3 2.3 4.2-4.6M23 16h13" />
          <path d="M12 24.5l2.3 2.3 4.2-4.6M23 25h13" />
          <circle cx="15" cy="33.5" r="2.6" />
          <path d="M23 34h9" />
        </>
      );
    case "daily":
      return (
        <>
          <path d="M11 27h26c0 6-6 10-13 10s-13-4-13-10z" />
          <path d="M24 10.5c3.2 3.6 4 6.7 0 10.5c-4-3.8-3.2-6.9 0-10.5z" fill={ink} strokeWidth={1.6} />
          <path d="M24 21v3" />
          <path d="M19 40h10" />
        </>
      );
    case "weekly":
      return (
        <>
          <rect x="11" y="13" width="26" height="24" rx="4" />
          <path d="M11 20h26M18 10v6M30 10v6" />
          {dot(18, 26)}
          {dot(24, 26)}
          {dot(30, 26)}
          {dot(18, 31.5)}
          {dot(24, 31.5)}
        </>
      );
    case "expressions":
      return (
        <>
          <path d="M35 11c-12.5 2-19.5 11.5-20.5 24 10-2 18.5-10 20.5-24z" />
          <path d="M14.5 35L27 22.5" />
          <path d="M11 39h11" />
        </>
      );
    case "people":
      return (
        <>
          <circle cx="19" cy="18" r="4.5" />
          <path d="M10.5 35c.8-5.3 4.3-8.5 8.5-8.5s7.7 3.2 8.5 8.5" />
          <circle cx="30.5" cy="19.5" r="3.6" />
          <path d="M29.5 26.8c4.3-.4 7.4 2.6 8 7.7" />
        </>
      );
    case "commitment":
      return (
        <>
          <rect x="14" y="9.5" width="20" height="29" rx="3" />
          <path d="M19 16h10M19 21h10M19 26h6" />
          <path d="M18.5 33c1.6-2.6 3.2 2.3 5 0s3.3 2.2 5.5 0" />
        </>
      );
    case "profile":
      return (
        <>
          <circle cx="24" cy="24" r="14" />
          <circle cx="24" cy="20.5" r="4.8" />
          <path d="M15.2 34.2c1.8-4 5-6 8.8-6s7 2 8.8 6" />
        </>
      );
    case "admin":
      return (
        <>
          <path d="M24 9.5 36 14v9.5c0 7.5-5.2 12.8-12 15-6.8-2.2-12-7.5-12-15V14z" />
          <path d="m18.5 24 4 4 7.5-8" />
        </>
      );
    case "bell":
      return (
        <>
          <path d="M24 12c-5.4 0-9.2 4.1-9.2 9.4v5.2c0 1.7-.7 3.3-1.9 4.5L11.5 32.5h25l-1.4-1.4a6.4 6.4 0 0 1-1.9-4.5v-5.2c0-5.3-3.8-9.4-9.2-9.4z" />
          <path d="M20.4 36.5a3.8 3.8 0 0 0 7.2 0" />
          <path d="M24 8.8V12" />
        </>
      );
    case "search":
      return (
        <>
          <circle cx="21.5" cy="21.5" r="9.5" />
          <path d="m28.5 28.5 8 8" />
        </>
      );
    case "insights":
      return (
        <>
          <path d="M13.2 27.5A11.5 11.5 0 1 0 16.4 16" />
          <path d="M15.8 10.8v5.6h5.6" />
          <path d="M25 18.5v6.5l4.5 2.8" />
        </>
      );
  }
}

export function FeatureBadge({ k, size = 40, className }: { k: string; size?: number; className?: string }) {
  if (!(k in TONES)) return null;
  const key = k as Key;
  const { tile, ink } = TONES[key];
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
        <Drawing k={key} ink="var(--fb-ink-now)" />
      </g>
    </svg>
  );
}

/**
 * The same drawings as the badges, as plain line icons for navigation. Cropped to the
 * drawing's area and stroked in the current text colour.
 */
export function FeatureGlyph({ k, size = 22, className }: { k: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="7 7 34 34" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn("shrink-0", className)}>
      <Drawing k={k as GlyphKey} ink="currentColor" />
    </svg>
  );
}

export function hasBadge(k: string) {
  return k in TONES;
}

/** The bell on its own (for badges built elsewhere, e.g. the notifications badge). */
export function BellDrawing() {
  return <Drawing k="bell" ink="currentColor" />;
}
