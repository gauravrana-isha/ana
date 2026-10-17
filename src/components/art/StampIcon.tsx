import { cn } from "@/lib/utils";

/**
 * The five reflection stamps, each a small drawing with its own colour. StampIcon is the bare
 * drawing; StampBadge sets it on a pastel tile (guide); StampChip is the pill used to choose
 * and to show stamps.
 */
export type StampKey = "growth" | "struggle" | "insight" | "stillness" | "devotion";

export const STAMP_TONES: Record<StampKey, { tile: string; ink: string }> = {
  growth: { tile: "#E1ECD6", ink: "#4E7A3A" },
  struggle: { tile: "#F3DED3", ink: "#9A4B2E" },
  insight: { tile: "#F6E7C1", ink: "#9A6B12" },
  stillness: { tile: "#DCEAF0", ink: "#3E6B7A" },
  devotion: { tile: "#FBE3CC", ink: "#C8672F" },
};

/* Line drawings with a soft wash of their own colour under the main shape, so they read
   as small illustrations rather than outline icons. Named parts (st-*) are what moves when
   a stamp is chosen; see globals.css. */
const WASH = { fill: "currentColor", fillOpacity: 0.16 } as const;

function Glyph({ k }: { k: StampKey }) {
  switch (k) {
    case "growth": // a seedling; the second leaf unfolds when chosen
      return (
        <>
          <path d="M12 21v-9.5" />
          <path className="st-leaf-a" d="M12 13c0-4.2 2.9-6.9 7.4-6.9 0 4.2-2.9 6.9-7.4 6.9z" {...WASH} />
          <path className="st-leaf-b" d="M12 15.6c0-3.1-2.5-5.2-6.3-5.2 0 3.1 2.5 5.2 6.3 5.2z" {...WASH} />
          <path d="M7.5 21h9" />
        </>
      );
    case "struggle": // the hill, and the path drawing itself up it
      return (
        <>
          <path d="M2.5 19.5 9 9.4l3.4 4.9 2.6-3.6 6.5 8.8z" {...WASH} />
          <path d="M9 9.4V4.4l3.1 1.3L9 7" />
          <path className="st-path" pathLength={1} d="M6.2 19.5c1.4-1.5 2.4-2.4 4-2.6 1.3-.2 2-1 2.6-2.4" />
        </>
      );
    case "insight": // the sun rising over the line, rays flicking on
      return (
        <>
          <g className="st-sun">
            <path d="M7.4 16.6a4.6 4.6 0 0 1 9.2 0z" {...WASH} />
            <path d="M7.4 16.6a4.6 4.6 0 0 1 9.2 0" />
          </g>
          <path className="st-rays" d="M12 4.6v2.8M5.8 8l2 2M18.2 8l-2 2M3.4 13.4h2.6M18 13.4h2.6" />
          <path d="M3.4 19.6h17.2" />
        </>
      );
    case "stillness": // a drop over still water; one ripple spreads when chosen
      return (
        <>
          <path d="M12 3.6c2.7 3.4 3.9 5.4 3.9 7.2a3.9 3.9 0 0 1-7.8 0c0-1.8 1.2-3.8 3.9-7.2z" {...WASH} />
          <ellipse className="st-ripple" cx="12" cy="18.2" rx="4.5" ry="1.4" />
          <path d="M3.4 18.2c1.8-1.1 3.6-1.1 5.4 0M15.2 18.2c1.8-1.1 3.6-1.1 5.4 0" />
          <path d="M6.5 21.2h11" />
        </>
      );
    case "devotion": // a diya; the flame flickers up when chosen
      return (
        <>
          <path d="M3.8 14h16.4c0 3.5-3.7 6.1-8.2 6.1S3.8 17.5 3.8 14z" {...WASH} />
          <path className="st-flame" d="M12 4.2c2 2.3 2.5 4.2 0 6.8-2.5-2.6-2-4.5 0-6.8z" fill="currentColor" fillOpacity={0.35} />
          <path d="M2.8 14h1M20.2 14h1" />
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
  const { tile, ink } = STAMP_TONES[k];
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

export const STAMP_LABELS: Record<StampKey, string> = {
  growth: "Growth", struggle: "Struggle", insight: "Insight", stillness: "Stillness", devotion: "Devotion",
};

export function isStampKey(s: string): s is StampKey {
  return s in STAMP_LABELS;
}

/**
 * A stamp as a pill, in its own colour. As a control (onToggle) it is quiet until chosen,
 * then fills with its colour's wash and its drawing acts once (a leaf unfolds, the sun rises,
 * a ripple spreads...). As a label (no onToggle) it simply shows the stamp, tinted.
 */
export function StampChip({ k, selected = false, onToggle, size = "md", className }: { k: string; selected?: boolean; onToggle?: () => void; size?: "sm" | "md"; className?: string }) {
  const key = isStampKey(k) ? k : null;
  const { tile, ink } = key ? STAMP_TONES[key] : { tile: "transparent", ink: "currentColor" };
  const label = key ? STAMP_LABELS[key] : k;
  const filled = onToggle ? selected : true;
  const body = (
    <>
      {/* Re-mounted on selection so its little action plays once. */}
      {key && <StampIcon key={selected ? "on" : "off"} k={key} size={size === "sm" ? 14 : 15} className={cn("stamp-glyph", onToggle && selected && "stamp-play")} />}
      <span className="font-ui truncate">{label}</span>
    </>
  );
  const look = cn(
    "feature-badge inline-flex items-center justify-center gap-1.5 min-w-0 rounded-full border font-medium transition-[background-color,border-color,color] duration-200",
    size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3 text-[12.5px]",
    filled
      ? "bg-[color-mix(in_srgb,var(--fb-tile-now)_80%,transparent)] border-[color-mix(in_srgb,var(--fb-ink-now)_35%,transparent)] text-[var(--fb-ink-now)]"
      : "border-line text-ink-soft hover:text-ink hover:border-ink-soft/40 [&_.stamp-glyph]:text-[var(--fb-ink-now)] [&_.stamp-glyph]:opacity-80",
    className
  );
  const style = { ["--fb-tile" as string]: tile, ["--fb-ink" as string]: ink };
  if (!onToggle) return <span className={look} style={style}>{body}</span>;
  return (
    <button type="button" onClick={onToggle} aria-pressed={selected} aria-label={label} title={label} className={cn("press stamp-chip", look)} style={style}>
      {body}
    </button>
  );
}
