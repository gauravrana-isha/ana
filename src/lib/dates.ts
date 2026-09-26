/**
 * Convert a Date to YYYY-MM-DD string.
 */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Get today as YYYY-MM-DD in local timezone.
 */
export function today(): string {
  return toISODate(new Date());
}

/**
 * Get the Monday of the week containing the given date.
 */
export function weekStart(date: string): string {
  const d = new Date(date + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toISODate(d);
}

/**
 * Compute sleep minutes from bedtime (previous day) to wake (current day).
 * Handles midnight crossing.
 */
export function computeSleepMinutes(bedtimeHHMM: string, wakeHHMM: string): number {
  const [bh, bm] = bedtimeHHMM.split(":").map(Number);
  const [wh, wm] = wakeHHMM.split(":").map(Number);
  const bedMin = bh * 60 + bm;
  const wakeMin = wh * 60 + wm;
  const diff = wakeMin >= bedMin
    ? wakeMin - bedMin
    : (1440 - bedMin) + wakeMin;
  return diff;
}

/**
 * Format minutes into a readable sleep duration string.
 */
export function formatSleepDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `≈ ${h}h ${m}m`;
}

/**
 * Format HH:MM (24h) to 12h display.
 */
export function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Add days to a date string.
 */
export function addDays(date: string, days: number): string {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/**
 * Format a date as "Today · Tue, Jun 2" style.
 */
export function formatDateDisplay(date: string): string {
  const d = new Date(date + "T12:00:00");
  const todayStr = today();
  const prefix = date === todayStr ? "Today · " : "";
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${prefix}${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`;
}

/**
 * Format a date for the topbar handwritten display.
 */
export function formatDateHand(date: string): string {
  const d = new Date(date + "T12:00:00");
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${dayNames[d.getDay()]} · ${monthNames[d.getMonth()]} ${d.getDate()}`;
}

const rtf = typeof Intl !== "undefined" ? new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }) : null;

/** "today", "yesterday", "3 weeks ago", "2 months ago". */
export function timeAgo(iso: string | Date, now = new Date()): string {
  const then = typeof iso === "string" ? new Date(iso) : iso;
  const days = Math.round((startOfDay(now).getTime() - startOfDay(then).getTime()) / 86_400_000);
  if (!rtf) return then.toLocaleDateString();
  if (days < 7) return rtf.format(-days, "day");
  if (days < 30) return rtf.format(-Math.round(days / 7), "week");
  if (days < 365) return rtf.format(-Math.round(days / 30), "month");
  return rtf.format(-Math.round(days / 365), "year");
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Heading for a day in a timeline: Today, Yesterday, or "Tue 14 Sep" (with year if not this year). */
export function dayHeading(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff === -1) return "Tomorrow";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

/** Value for <input type="datetime-local"> in local time. */
export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
