import { cn } from "@/lib/utils";
import { CalendarMark, TimeMark } from "./PenMarks";

/*
 * ana's line icons, drawn in the same hand as the navigation and moment glyphs: a 48-unit
 * grid (cropped to 7–41), soft round strokes in the current text colour. Media controls
 * (play, pause, stop) are solid. The pen-drawn action marks (tick, cross, back…) live in
 * PenMarks; these are for things and states.
 */

export type GlyphKey =
  | "calendar" | "clock" | "pin" | "cake" | "handshake" | "crown" | "storage" | "hourglass"
  | "returns" | "images" | "camera-flip" | "upload" | "download" | "play" | "pause" | "stop"
  | "offline" | "sync" | "copy" | "info" | "sidebar" | "more" | "eye" | "eye-off" | "key"
  | "lock" | "password" | "fingerprint" | "phone" | "words" | "shield" | "sunrise" | "person"
  | "cards" | "list" | "check-circle" | "warning" | "spinner" | "save";

const SOLID = new Set<GlyphKey>(["play", "pause", "stop"]);

const DOT = (x: number, y: number) => <path d={`M${x} ${y}h.01`} strokeWidth={3.4} />;

function Drawing({ k }: { k: GlyphKey }) {
  switch (k) {
    case "calendar":
      return (<><rect x="11.5" y="13.5" width="25" height="23" rx="4.5" /><path d="M11.5 20.5h25M18 10v6M30 10v6" />{DOT(18.5, 27.5)}{DOT(24, 27.5)}{DOT(29.5, 27.5)}</>);
    case "clock":
      return (<><circle cx="24" cy="24" r="13" /><path d="M24 16.5V24l5.5 3.2" /></>);
    case "pin":
      return (<><path d="M24 37.5s-10.5-8.8-10.5-16.5a10.5 10.5 0 0 1 21 0c0 7.7-10.5 16.5-10.5 16.5z" /><circle cx="24" cy="21" r="3.6" /></>);
    case "cake":
      return (<><path d="M24 12.5V17" /><path d="M24 8.6c1.5 1.4 1.5 2.7 0 3.6-1.5-.9-1.5-2.2 0-3.6z" /><rect x="13.5" y="20.5" width="21" height="15" rx="3.5" /><path d="M13.5 26.5c2.6 2 4.6 2 7 0s4.6-2 7 0 4.4 2 7 0M10.5 38.5h27" /></>);
    case "handshake":
      return (<><path d="M8.5 23 15 17l5 1.6" /><path d="M39.5 23 33 17h-6l-7.4 6.8a2.6 2.6 0 0 0 3.7 3.6l3.7-3.3 7.3 6.6" /><path d="M14.5 26.2l9.4 9a2.2 2.2 0 0 0 3.1-3.1M27 32.1l1.2 1.1a2.2 2.2 0 0 0 3.1-3.1" /></>);
    case "crown":
      return (<><path d="M12.5 30.5 10 16.5l8.5 6.5L24 13.5l5.5 9.5 8.5-6.5-2.5 14z" /><path d="M13 35.5h22" /></>);
    case "storage":
      return (<><rect x="11.5" y="12.5" width="25" height="10" rx="3.5" /><rect x="11.5" y="25.5" width="25" height="10" rx="3.5" />{DOT(30.5, 17.5)}{DOT(30.5, 30.5)}</>);
    case "hourglass":
      return (<><path d="M15 11.5h18M15 36.5h18" /><path d="M17.5 11.5c0 7 6.5 8.5 6.5 12.5s-6.5 5.5-6.5 12.5M30.5 11.5c0 7-6.5 8.5-6.5 12.5s6.5 5.5 6.5 12.5" /><path d="M20.5 33h7" /></>);
    case "returns":
      return (<><path d="M14.2 20.5a11 11 0 1 1 1.6 10.3" /><path d="M13.5 13.5v7.4h7.4" /></>);
    case "images":
      return (<><rect x="12.5" y="16.5" width="21" height="18" rx="3.5" /><path d="M17 12.5h17.5a3.5 3.5 0 0 1 3.5 3.5v14" /><path d="m12.5 30 5.5-5.5 4.5 4.5 3-3 7 7" /><circle cx="27.5" cy="22" r="1.8" /></>);
    case "camera-flip":
      return (<><path d="M11.5 19a3.5 3.5 0 0 1 3.5-3.5h3l2.5-3.5h7l2.5 3.5h3a3.5 3.5 0 0 1 3.5 3.5v13.5A3.5 3.5 0 0 1 33 36H15a3.5 3.5 0 0 1-3.5-3.5z" /><path d="M18.8 26a5.3 5.3 0 0 1 9.4-3.3M29.2 26a5.3 5.3 0 0 1-9.4 3.3" /><path d="M28.6 19.5v3.4h-3.4M19.4 32.5v-3.4h3.4" /></>);
    case "upload":
      return (<><path d="M24 30V13.5M17.5 20 24 13.5 30.5 20" /><path d="M12.5 29.5v4a3 3 0 0 0 3 3h17a3 3 0 0 0 3-3v-4" /></>);
    case "download":
      return (<><path d="M24 12.5V29M17.5 22.5 24 29l6.5-6.5" /><path d="M12.5 29.5v4a3 3 0 0 0 3 3h17a3 3 0 0 0 3-3v-4" /></>);
    case "play":
      return <path d="M17.5 13.9v20.2c0 1.2 1.3 1.9 2.3 1.3l15.9-10.1c.9-.6.9-2 0-2.6L19.8 12.6c-1-.6-2.3.1-2.3 1.3z" />;
    case "pause":
      return (<><rect x="15" y="13" width="6.5" height="22" rx="2.2" /><rect x="26.5" y="13" width="6.5" height="22" rx="2.2" /></>);
    case "stop":
      return <rect x="14" y="14" width="20" height="20" rx="4.5" />;
    case "offline":
      return (<><path d="M10.5 19.5a20 20 0 0 1 27 0M15 24.8a13.2 13.2 0 0 1 18 0M19.6 30a6.6 6.6 0 0 1 8.8 0" />{DOT(24, 35)}<path d="m11.5 11.5 25 25" /></>);
    case "sync":
      return (<><path d="M35 19a12 12 0 0 0-21.5-1.5M13 29a12 12 0 0 0 21.5 1.5" /><path d="M35.5 12v7h-7M12.5 36v-7h7" /></>);
    case "copy":
      return (<><rect x="18.5" y="18.5" width="18" height="18" rx="3.5" /><path d="M29.5 14.5v-.5a3 3 0 0 0-3-3h-12a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h.5" /></>);
    case "info":
      return (<><circle cx="24" cy="24" r="13" /><path d="M24 22.5v8" />{DOT(24, 17)}</>);
    case "sidebar":
      return (<><rect x="10.5" y="12.5" width="27" height="23" rx="4.5" /><path d="M20 12.5v23" /></>);
    case "more":
      return (<><circle cx="24" cy="24" r="13" />{DOT(18, 24)}{DOT(24, 24)}{DOT(30, 24)}</>);
    case "eye":
      return (<><path d="M8.5 24S14 13.5 24 13.5 39.5 24 39.5 24 34 34.5 24 34.5 8.5 24 8.5 24z" /><circle cx="24" cy="24" r="4.5" /></>);
    case "eye-off":
      return (<><path d="M17.5 15.4A15.5 15.5 0 0 1 24 13.5C34 13.5 39.5 24 39.5 24a26 26 0 0 1-4.3 5.6M30.4 32.7A15.6 15.6 0 0 1 24 34.5C14 34.5 8.5 24 8.5 24a26.6 26.6 0 0 1 4.6-5.9" /><path d="M20.8 20.8a4.5 4.5 0 0 0 6.4 6.4" /><path d="m11.5 11.5 25 25" /></>);
    case "key":
      return (<><circle cx="17" cy="31" r="6.5" /><path d="M21.6 26.4 35.5 12.5M30.5 17.5l4 4M34 14l3 3" /></>);
    case "lock":
      return (<><rect x="13.5" y="21.5" width="21" height="15" rx="4" /><path d="M17.5 21.5v-4a6.5 6.5 0 0 1 13 0v4" /><path d="M24 27.5v3" /></>);
    case "password":
      return (<><path d="M11.5 17v14" /><path d="M20.5 20.5v7M17.5 22.3l6 3.4M17.5 25.7l6-3.4M31.5 20.5v7M28.5 22.3l6 3.4M28.5 25.7l6-3.4" /></>);
    case "fingerprint":
      return (<><path d="M12.8 21.5C14.6 15.9 19 12 24 12s9.4 3.9 11.2 9.5" /><path d="M15.5 30c0-6.5 3.6-11.5 8.5-11.5S32.5 23.5 32.5 30" /><path d="M19.5 35c-.7-1.9-1-3.9-1-6 0-3.8 2.4-6.3 5.5-6.3s5.5 2.5 5.5 6.3c0 2.7-.4 5.1-1.3 7.2" /><path d="M24 28.5c0 3.4-.6 6.4-1.9 8.8" /></>);
    case "phone":
      return (<><rect x="16" y="9.5" width="16" height="29" rx="4" /><path d="M21.5 34h5" /></>);
    case "words":
      return (<><path d="M16.5 11.5h15a3 3 0 0 1 3 3v21.5a1.5 1.5 0 0 1-2.4 1.2L29.5 35l-2.8 2.2a1.5 1.5 0 0 1-1.9 0L22 35l-2.8 2.2a1.5 1.5 0 0 1-1.9 0L14.6 35a1.5 1.5 0 0 1-1.1-1.4V14.5a3 3 0 0 1 3-3z" /><path d="M19 18.5h10M19 23.5h10M19 28.5h6" /></>);
    case "shield":
      return (<><path d="M24 10.5 36 15v8.5c0 7.2-5 12.3-12 14.5-7-2.2-12-7.3-12-14.5V15z" /><path d="m18.5 24 4 4 7.5-8" /></>);
    case "sunrise":
      return (<><path d="M9.5 31.5h29M16 31.5a8 8 0 0 1 16 0M24 13v4.5M13.6 18.6l3 3M34.4 18.6l-3 3M17.5 36.5h13" /></>);
    case "person":
      return (<><circle cx="24" cy="24" r="13" /><circle cx="24" cy="21" r="4.6" /><path d="M15.8 33.6c1.8-3.6 4.8-5.6 8.2-5.6s6.4 2 8.2 5.6" /></>);
    case "cards":
      return (<><rect x="12" y="17.5" width="24" height="18" rx="4" /><path d="M15.5 12.5h17" /></>);
    case "list":
      return (<><path d="M18 15.5h18M18 24h18M18 32.5h18" />{DOT(12.5, 15.5)}{DOT(12.5, 24)}{DOT(12.5, 32.5)}</>);
    case "check-circle":
      return (<><circle cx="24" cy="24" r="13" /><path d="m18 24.5 4 4 8-8.5" /></>);
    case "warning":
      return (<><circle cx="24" cy="24" r="13" /><path d="M24 16.5v9" />{DOT(24, 31)}</>);
    case "spinner":
      return <path d="M24 11a13 13 0 1 1-13 13" />;
    case "save":
      return (<><path d="M14.5 11.5h15.2l5.8 5.8v17.2a3 3 0 0 1-3 3h-18a3 3 0 0 1-3-3v-20a3 3 0 0 1 3-3z" /><path d="M18 11.5v6.5h10v-6.5M17.5 37.5v-8.5h13v8.5" /></>);
  }
}

export function Glyph({ k, size = 18, className, strokeWidth = 2.6 }: { k: GlyphKey; size?: number; className?: string; strokeWidth?: number }) {
  // Dates and times are pen-drawn, like the tick and the other marks.
  if (k === "calendar") return <CalendarMark size={size} className={cn("shrink-0", className)} />;
  if (k === "clock") return <TimeMark size={size} className={cn("shrink-0", className)} />;
  const solid = SOLID.has(k);
  return (
    <svg
      width={size}
      height={size}
      viewBox="7 7 34 34"
      fill={solid ? "currentColor" : "none"}
      stroke={solid ? "none" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <Drawing k={k} />
    </svg>
  );
}
