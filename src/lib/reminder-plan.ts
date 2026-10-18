import "server-only";
import { getCache } from "@vercel/functions";

/*
 * Lets the reminder job skip the database when nothing can be due, so the database can sleep
 * while the app is quiet. After a full run the job notes when the next thing could fall due;
 * runs before then return at once. Saving anything that moves a reminder (a moment coming back,
 * a commitment, a birthday, a portrait, a time zone) marks the plan stale, so the next run looks
 * again. Kept in Vercel's runtime cache: if it's ever lost, the job simply does a full run.
 */

const PLAN = "reminders:plan";
const CHANGED = "reminders:changed";
const KEEP = 3 * 24 * 3600; // seconds

interface Plan {
  /** When the last full run started (ms). */
  checkedAt: number;
  /** The earliest moment anything could fall due after it (ms). */
  nextDue: number;
}

/** Something that moves a reminder was saved: the next run looks at the database again. */
export async function remindersChanged() {
  try {
    await getCache().set(CHANGED, Date.now(), { ttl: KEEP, name: "reminders-changed" });
  } catch {
    // No cache: every run is a full run anyway.
  }
}

/** True when the plan says nothing can be due yet and nothing has changed since it was made. */
export async function nothingDue(now: Date) {
  try {
    const cache = getCache();
    const [plan, changed] = await Promise.all([cache.get(PLAN) as Promise<Plan | undefined>, cache.get(CHANGED) as Promise<number | undefined>]);
    if (!plan || typeof plan.nextDue !== "number") return false;
    if (typeof changed === "number" && changed >= plan.checkedAt) return false;
    return now.getTime() < plan.nextDue;
  } catch {
    return false;
  }
}

/** Note when the next thing could fall due (or forget the plan, so the next run is a full one). */
export async function savePlan(plan: Plan | null) {
  try {
    const cache = getCache();
    if (plan) await cache.set(PLAN, plan, { ttl: KEEP, name: "reminders-plan" });
    else await cache.delete(PLAN);
  } catch {
    // No cache: nothing to save.
  }
}

/**
 * The next times (after `from`, within two days) that the local clock in `timeZone` reads one
 * of `hours` o'clock. Works for half-hour zones like India's too.
 */
export function nextLocalHours(from: Date, timeZone: string | null | undefined, hours: number[]) {
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat("en-US", { timeZone: timeZone || "UTC", hour: "numeric", minute: "numeric", hourCycle: "h23" });
  } catch {
    fmt = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour: "numeric", minute: "numeric", hourCycle: "h23" });
  }
  const step = 15 * 60_000;
  const out: number[] = [];
  // Zone offsets are whole quarter hours, so checking every quarter hour finds each o'clock.
  for (let t = Math.floor(from.getTime() / step) * step + step; t < from.getTime() + 48 * 3600_000; t += step) {
    const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
    if (Number(p.minute) === 0 && hours.includes(Number(p.hour))) out.push(t);
  }
  return out;
}
