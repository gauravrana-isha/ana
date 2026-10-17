import { cn } from "@/lib/utils";

/*
 * The icons a practice can be shown with (the custom-practice picker's, the tracking types',
 * catalog practices without a picture, and older names already saved on practices), drawn in
 * the same hand as ana's other line icons: a 48-unit grid (cropped to 7–41) and soft round
 * strokes in the current colour. Saved practices keep their icon names (the old Phosphor
 * names), so nothing stored changes.
 */

const DOT = (x: number, y: number) => <path d={`M${x} ${y}h.01`} strokeWidth={3.4} />;

const BOWL = "M10.5 25.5h27c0 6.5-5.5 11.5-13.5 11.5S10.5 32 10.5 25.5z";
const HEART = "M24 35.5S11 28 11 19.5A6.5 6.5 0 0 1 24 17a6.5 6.5 0 0 1 13 2.5C37 28 24 35.5 24 35.5z";
const RAYS = "M24 10.5v3M24 34.5v3M10.5 24h3M34.5 24h3M14.5 14.5l2.1 2.1M31.4 31.4l2.1 2.1M14.5 33.5l2.1-2.1M31.4 16.6l2.1-2.1";

const DRAWINGS: Record<string, React.ReactNode> = {
  Leaf: (<><path d="M13 35c0-13 8-22 23-23-1 15-10 23-23 23z" /><path d="M13 35 27.5 20.5" /></>),
  Flower: (<><circle cx="24" cy="20.5" r="3" /><circle cx="24" cy="13.3" r="4.2" /><circle cx="30.9" cy="18.3" r="4.2" /><circle cx="28.2" cy="26.4" r="4.2" /><circle cx="19.8" cy="26.4" r="4.2" /><circle cx="17.1" cy="18.3" r="4.2" /><path d="M24 31v7" /></>),
  FlowerLotus: (<><path d="M24 13c3.5 3.5 5 7.5 5 11.5S27 32 24 34c-3-2-5-5.5-5-9.5S20.5 16.5 24 13z" /><path d="M19.4 20.6C15 20 11.6 21.5 10 24c1.5 5.5 7 10 14 10s12.5-4.5 14-10c-1.6-2.5-5-4-9.4-3.4" /></>),
  Sun: (<><circle cx="24" cy="24" r="6" /><path d={RAYS} /></>),
  SunDim: (<><circle cx="24" cy="24" r="6.5" />{DOT(24, 12.5)}{DOT(24, 35.5)}{DOT(12.5, 24)}{DOT(35.5, 24)}{DOT(15.9, 15.9)}{DOT(32.1, 32.1)}{DOT(15.9, 32.1)}{DOT(32.1, 15.9)}</>),
  SunHorizon: (<><path d="M16 30a8 8 0 0 1 16 0" /><path d="M10 30h28M16 36h16" /><path d="M24 13.5v3.5M13.6 19l2.4 2.4M34.4 19 32 21.4" /></>),
  Moon: <path d="M33.5 28.5A11.5 11.5 0 0 1 19.5 14.5a11.5 11.5 0 1 0 14 14z" />,
  Star: <path d="m24 11.5 3.9 7.9 8.7 1.3-6.3 6.1 1.5 8.7L24 31.4l-7.8 4.1 1.5-8.7-6.3-6.1 8.7-1.3z" />,
  Sparkle: (<><path d="M21.5 11.5c.9 6 3.5 8.6 9.5 9.5-6 .9-8.6 3.5-9.5 9.5-.9-6-3.5-8.6-9.5-9.5 6-.9 8.6-3.5 9.5-9.5z" /><path d="M33 28.5c.4 2.4 1.4 3.4 3.8 3.8-2.4.4-3.4 1.4-3.8 3.8-.4-2.4-1.4-3.4-3.8-3.8 2.4-.4 3.4-1.4 3.8-3.8z" /></>),
  Fire: (<><path d="M24 37.5c-5.5 0-9.5-3.8-9.5-9 0-6 5-8.5 6-15 4 2.5 6.5 6 6.5 10 1.5-1 2.5-2.5 2.8-4.5 2.5 2.5 3.7 5.7 3.7 9.5 0 5.2-4 9-9.5 9z" /><path d="M24 37.5c-2.4 0-4-1.7-4-4 0-2.6 2.2-4 4-6.5 1.8 2.5 4 3.9 4 6.5 0 2.3-1.6 4-4 4z" /></>),
  Drop: (<><path d="M24 11.5s-10 10.6-10 17a10 10 0 0 0 20 0c0-6.4-10-17-10-17z" /><path d="M19 29.5a5 5 0 0 0 4 4.5" /></>),
  Wind: (<><path d="M10 19.5h17.5a4 4 0 1 0-4-4" /><path d="M10 25.5h23.5a4 4 0 1 1-4 4" /><path d="M10 31.5h11" /></>),
  Mountains: (<><path d="M8.5 35.5 19 17.5l6 10 3.5-5 11 13z" /><path d="m15.8 23 3.2 2.5 3.2-2.5" /></>),
  Tree: (<><path d="M24 11c-5 0-8.5 3.8-8.5 8.3 0 4.2 3.5 7.2 8.5 7.2s8.5-3 8.5-7.2C32.5 14.8 29 11 24 11z" /><path d="M24 37V26.5M19.5 37h9" /></>),
  Plant: (<><path d="M24 37V22" /><path d="M24 24.5c-6.5 0-10-3.5-10-9.5 6.5 0 10 3.5 10 9.5zM24 21c0-5.5 3-8.5 9-8.5 0 5.5-3 8.5-9 8.5z" /><path d="M17 37h14" /></>),
  Heart: <path d={HEART} />,
  Heartbeat: (<><path d={HEART} /><path d="M14 25h5l2.5-4 4 7.5 2.5-3.5h6" /></>),
  HandHeart: (<><path d="M24 26s-7-4-7-8.6a3.5 3.5 0 0 1 7-1.2 3.5 3.5 0 0 1 7 1.2C31 22 24 26 24 26z" /><path d="M10.5 29c3.5 5 8.5 8 13.5 8s10-3 13.5-8" /></>),
  HandsPraying: (<><path d="M24 11.5c-3.6 4-6.2 9-6.2 14.5v10.5h12.4V26c0-5.5-2.6-10.5-6.2-14.5z" /><path d="M24 14v22.5M14.5 36.5h19" /></>),
  Person: (<><circle cx="24" cy="16" r="4.5" /><path d="M14.5 37v-3.5a9.5 9.5 0 0 1 19 0V37" /></>),
  PersonSimple: (<><circle cx="24" cy="13.5" r="3.3" /><path d="M24 19v9M16 22.5h16M24 28l-5 8.5M24 28l5 8.5" /></>),
  PersonSimpleWalk: (<><circle cx="26.5" cy="12.5" r="3.3" /><path d="M25 18.5 22 27l5 4 1.5 6M22 27l-4.5 9.5M24.5 19.5 18 22.5l-1.5 5M25 19.5l3.5 5 5 1.5" /></>),
  PersonSimpleTaiChi: (<><circle cx="24" cy="12.5" r="3.3" /><path d="M24 18.5V28M12.5 18.5l5.5 4h12l5.5-4M24 28l-7 8.5M24 28l7 8.5" /></>),
  Waveform: <path d="M11 22v4M16 17v14M21 12.5v23M26 18v12M31 14.5v19M36 21v6" />,
  MusicNotes: (<><path d="M19 32V15.5l15-3.5V28M19 20.5 34 17" /><circle cx="15.5" cy="32" r="3.5" /><circle cx="30.5" cy="28" r="3.5" /></>),
  BookOpen: (<><path d="M24 16.5c-3.5-3-8-3.5-13-2.5v20c5-1 9.5-.5 13 2.5 3.5-3 8-3.5 13-2.5V14c-5-1-9.5-.5-13 2.5z" /><path d="M24 16.5v20" /></>),
  PencilSimple: (<><path d="m14 34 1.2-5.4L30 13.8a2.8 2.8 0 0 1 4 4L19.2 32.6z" /><path d="m27.5 16.3 4 4" /></>),
  BowlSteam: (<><path d={BOWL} /><path d="M19.5 20.5c-1.5-1.8-1.5-3.6 0-5.4s1.5-3.6 0-5M28.5 20.5c-1.5-1.8-1.5-3.6 0-5.4s1.5-3.6 0-5" /></>),
  BowlFood: (<><path d={BOWL} /><path d="M15.5 25.5c1-4.5 4.5-7 8.5-7s7.5 2.5 8.5 7" /></>),
  Coffee: (<><path d="M13 20.5h17v8a7 7 0 0 1-7 7h-3a7 7 0 0 1-7-7z" /><path d="M30 22.5h2a3.5 3.5 0 0 1 0 7h-2.4" /><path d="M18.5 16c-1-1.2-1-2.4 0-3.5M24.5 16c-1-1.2-1-2.4 0-3.5" /></>),
  Bed: (<><path d="M9.5 34V15M9.5 28.5h29V34" /><path d="M38.5 28.5V24a4.5 4.5 0 0 0-4.5-4.5H21.5v9" /><circle cx="15.5" cy="22.5" r="2.8" /></>),
  Bicycle: (<><circle cx="15" cy="29" r="6" /><circle cx="33" cy="29" r="6" /><path d="M15 29l5.5-10H29l4 10M20.5 19 24 29l5-10M18.5 15H23M27 14.5h3.5L29 19" /></>),
  Barbell: (<><path d="M16.5 24h15M9 20.5v7M39 20.5v7" /><rect x="11.5" y="16.5" width="5" height="15" rx="1.8" /><rect x="31.5" y="16.5" width="5" height="15" rx="1.8" /></>),
  Brain: (<><path d="M24 14v21" /><path d="M24 15.5a5 5 0 0 0-9.5.5 5 5 0 0 0-3 8.5 5 5 0 0 0 2.5 7.5 5.5 5.5 0 0 0 10 2.5" /><path d="M24 15.5a5 5 0 0 1 9.5.5 5 5 0 0 1 3 8.5 5 5 0 0 1-2.5 7.5 5.5 5.5 0 0 1-10 2.5" /><path d="M17.5 22c2 0 3.5 1 4 2.5M30.5 22c-2 0-3.5 1-4 2.5" /></>),
  Eye: (<><path d="M8.5 24S14 13.5 24 13.5 39.5 24 39.5 24 34 34.5 24 34.5 8.5 24 8.5 24z" /><circle cx="24" cy="24" r="4.5" /></>),
  EyeClosed: (<><path d="M9 21c3.5 5 8.5 7.5 15 7.5S35.5 26 39 21" /><path d="m14 26.5-2.5 3.5M24 28.5V33M34 26.5l2.5 3.5" /></>),
  Bell: (<><path d="M24 12c-5.4 0-9.2 4.1-9.2 9.4v5.2c0 1.7-.7 3.3-1.9 4.5l-1.4 1.4h25l-1.4-1.4a6.4 6.4 0 0 1-1.9-4.5v-5.2c0-5.3-3.8-9.4-9.2-9.4z" /><path d="M20.4 36.5a3.8 3.8 0 0 0 7.2 0M24 8.8V12" /></>),
  ChartBar: (<><path d="M11 36.5h26" /><rect x="13.5" y="24" width="5" height="9" rx="1.5" /><rect x="21.5" y="17" width="5" height="16" rx="1.5" /><rect x="29.5" y="11.5" width="5" height="21.5" rx="1.5" /></>),
  CheckCircle: (<><circle cx="24" cy="24" r="13" /><path d="m18 24.5 4 4 8-8.5" /></>),
  Circle: <circle cx="24" cy="24" r="12" />,
  CircleNotch: <path d="M33 15.5a12.5 12.5 0 1 1-18 0" />,
  Clock: (<><circle cx="24" cy="24" r="13" /><path d="M24 16.5V24l5.5 3.2" /></>),
  Hash: <path d="M19.5 12 17 36M31 12l-2.5 24M12 19.5h25M11 28.5h25" />,
  Smiley: (<><circle cx="24" cy="24" r="13" /><path d="M18.5 27.5c1.4 2.2 3.3 3.3 5.5 3.3s4.1-1.1 5.5-3.3" />{DOT(19.5, 20.5)}{DOT(28.5, 20.5)}</>),
  Timer: (<><circle cx="24" cy="26.5" r="11" /><path d="M24 26.5V20M20.5 11.5h7M24 11.5v4M33 17.5l2-2" /></>),
  Triangle: <path d="M24 12 37 35H11z" />,
};

/** Older saved names that map onto a current icon. */
const ALIASES: Record<string, string> = { Pyramid: "Triangle", Bowl: "BowlFood" };

/** Every icon name a practice can use. */
export const PRACTICE_ICON_NAMES = Object.keys(DRAWINGS);

export function hasPracticeIcon(name: string) {
  return (ALIASES[name] ?? name) in DRAWINGS;
}

/** A practice icon by its saved name (a leaf for anything unknown). */
export function PracticeGlyph({ name, size = 20, className, strokeWidth = 2.6 }: { name: string; size?: number | string; className?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="7 7 34 34"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      {DRAWINGS[ALIASES[name] ?? name] ?? DRAWINGS.Leaf}
    </svg>
  );
}
