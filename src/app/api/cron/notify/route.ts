import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { zonedParts } from "@/lib/push";
import { notify, sweepNotifications } from "@/lib/notify";
import { nextLocalHours, nothingDue, savePlan } from "@/lib/reminder-plan";

/*
 * Announces what is due (in the bell, and as a push where it's turned on): moments coming
 * back, commitment letters to read again, birthdays. Then sweeps away notifications that
 * have ended.
 * Called on a schedule (a GitHub Actions workflow every 15 minutes, plus Vercel's daily cron
 * as a backstop) with `Authorization: Bearer $CRON_SECRET`. Safe to call as often as you
 * like: each notification is claimed in the database before it is sent, so it goes out once.
 * Most runs don't touch the database at all: each full run notes when the next thing could
 * fall due, and runs before then (with nothing changed since) return at once, so the database
 * can sleep while the app is quiet. `?full=1` always does a full run.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Don't send look-backs that are more than this late (e.g. after an outage); Today still shows them. */
const LATE_LIMIT_MS = 2 * 24 * 60 * 60 * 1000;
/** Commitment reminders go out from this local hour. */
const MORNING = 9;
/** Birthday notes go out from this local hour. */
const BIRTHDAY_HOUR = 8;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = new Date();
  if (!req.nextUrl.searchParams.has("full") && (await nothingDue(now))) return NextResponse.json({ ok: true, skipped: true });
  const sent = { moments: 0, commitments: 0, birthdays: 0, portraits: 0, swept: 0 };
  // Anything that went wrong (or was left for later) means the next run must look again.
  let retry = false;
  // When each thing still to come falls due, for the plan.
  const upcoming: number[] = [];

  // ---- Moments coming back
  const due = await db.expression.findMany({
    where: {
      lookBackSentAt: null,
      lookBackAt: { lte: now, gte: new Date(now.getTime() - LATE_LIMIT_MS) },
      user: { status: "APPROVED" },
    },
    select: { id: true, userId: true, kind: true, occurredAt: true, date: true },
    take: 200,
  });
  await inParallel(due, async (m) => {
    const claimed = await db.expression.updateMany({ where: { id: m.id, lookBackSentAt: null }, data: { lookBackSentAt: now } });
    if (!claimed.count) return;
    const when = (m.occurredAt ?? m.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    // Its words are sealed (only the person's devices can read them), so the note says what kind it is and when.
    const words = m.kind === "audio" ? "A voice note" : m.kind === "video" ? "A video" : m.kind === "photo" ? "Photos" : "Something you wrote";
    try {
      const made = await notify({ userId: m.userId, kind: "moment", key: `moment:${m.id}`, title: "A moment is back", body: `${words} · from ${when}`, url: `/expressions/${m.id}` });
      if (made) sent.moments++;
    } catch (e) {
      // Give the claim back so the next run tries again.
      await db.expression.update({ where: { id: m.id }, data: { lookBackSentAt: null } }).catch(() => {});
      retry = true;
      console.error("moment notify failed", e);
    }
  });

  // ---- Commitment letters to read again
  const letters = await db.commitment.findMany({
    where: {
      supersededAt: null,
      revisit: { in: ["monthly", "quarterly"] },
      user: { status: "APPROVED" },
    },
    select: { id: true, userId: true, revisit: true, revisitedAt: true, remindedAt: true, createdAt: true, user: { select: { timeZone: true } } },
  });
  await inParallel(letters, async (c) => {
    const tz = c.user.timeZone;
    const nowLocal = zonedParts(now, tz);
    if (nowLocal.hour < MORNING) return;
    const period = periodKey(nowLocal, c.revisit);
    const lastRead = zonedParts(c.revisitedAt ?? c.createdAt, tz);
    if (periodKey(lastRead, c.revisit) === period) return; // already read this period
    if (c.remindedAt && periodKey(zonedParts(c.remindedAt, tz), c.revisit) === period) return; // already reminded
    const claimed = await db.commitment.updateMany({
      where: { id: c.id, OR: [{ remindedAt: null }, { remindedAt: c.remindedAt }] },
      data: { remindedAt: now },
    });
    if (!claimed.count) return;
    try {
      const made = await notify({ userId: c.userId, kind: "commitment", key: `commitment:${c.id}:${period}`, title: "Your commitment", body: "Time to read your letter again.", url: "/commitment" });
      if (made) sent.commitments++;
    } catch (e) {
      await db.commitment.update({ where: { id: c.id }, data: { remindedAt: c.remindedAt } }).catch(() => {});
      retry = true;
      console.error("commitment notify failed", e);
    }
  });

  // ---- Birthdays (from the morning, local time; gone the day after)
  // Only birthdays that fall today somewhere: local dates run from UTC-12 to UTC+14.
  const todays = [...new Set([-12, 0, 14].map((h) => new Date(now.getTime() + h * 3_600_000).toISOString().slice(5, 10)))];
  const people = await db.person.findMany({
    where: { OR: [{ birthdayMD: { in: todays } }, { birthday: { not: null }, birthdayMD: null }], user: { status: "APPROVED" } },
    select: { id: true, userId: true, birthday: true, birthdayMD: true, user: { select: { timeZone: true, features: { where: { feature: "people" } } } } },
  });
  await inParallel(people, async (p) => {
    const f = p.user.features[0];
    if (f && (!f.allowed || !f.enabled)) return;
    const local = zonedParts(now, p.user.timeZone);
    if (local.hour < BIRTHDAY_HOUR) return;
    const [bm, bd] = p.birthdayMD ? p.birthdayMD.split("-").map(Number) : [p.birthday!.getUTCMonth() + 1, p.birthday!.getUTCDate()];
    if (bm !== local.month || bd !== local.day) return;
    // Names are sealed: the note opens their page, where the device shows who.
    const made = await notify({
      userId: p.userId,
      kind: "birthday",
      key: `birthday:${p.id}:${local.year}`,
      title: "A birthday today",
      body: "Someone in your journal has a birthday today.",
      url: `/people/${p.id}`,
      expiresAt: new Date(now.getTime() + (48 - local.hour) * 60 * 60 * 1000),
    });
    if (made) sent.birthdays++;
  });

  // ---- "Who are you now?" (every few months after the last portrait, from the morning)
  const sitters = await db.user.findMany({
    where: { status: "APPROVED", portraitEveryMonths: { gt: 0 }, portraits: { some: {} } },
    select: { id: true, timeZone: true, portraitEveryMonths: true, portraits: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, createdAt: true } } },
  });
  await inParallel(sitters, async (u) => {
    const last = u.portraits[0];
    const due = new Date(last.createdAt);
    due.setMonth(due.getMonth() + u.portraitEveryMonths);
    if (due > now) return void upcoming.push(due.getTime());
    if (zonedParts(now, u.timeZone).hour < MORNING) return;
    const made = await notify({
      userId: u.id,
      kind: "portrait",
      key: `portrait:${last.id}`,
      title: "Who are you now?",
      body: `It's been ${u.portraitEveryMonths === 12 ? "a year" : `${u.portraitEveryMonths} months`} since you last reflected. Take a few minutes with body, mind and emotion again.`,
      url: "/profile/who",
    });
    if (made) sent.portraits++;
  });

  sent.swept = await sweepNotifications(now);
  // The error log keeps 30 days, deletion records 90, rate-limit windows an hour.
  await db.deletion.deleteMany({ where: { at: { lt: new Date(now.getTime() - 90 * 24 * 3600_000) } } });
  await db.errorLog.deleteMany({ where: { at: { lt: new Date(now.getTime() - 30 * 24 * 3600_000) } } });
  await db.rateLimit.deleteMany({ where: { window: { lt: new Date(now.getTime() - 3600_000) } } });

  // ---- When could anything next fall due? The next moment coming back, the next portrait,
  // the next morning (8 and 9 o'clock) wherever people are, and a day from now for the sweeps.
  if (retry || due.length === 200) {
    await savePlan(null);
  } else {
    const [nextMoment, zones] = await Promise.all([
      db.expression.findFirst({
        where: { lookBackSentAt: null, lookBackAt: { gt: now }, user: { status: "APPROVED" } },
        orderBy: { lookBackAt: "asc" },
        select: { lookBackAt: true },
      }),
      db.user.findMany({ where: { status: "APPROVED" }, distinct: ["timeZone"], select: { timeZone: true } }),
    ]);
    if (nextMoment?.lookBackAt) upcoming.push(nextMoment.lookBackAt.getTime());
    for (const z of zones) upcoming.push(...nextLocalHours(now, z.timeZone, [BIRTHDAY_HOUR, MORNING]));
    upcoming.push(now.getTime() + 24 * 3600_000);
    await savePlan({ checkedAt: now.getTime(), nextDue: Math.min(...upcoming) });
  }
  return NextResponse.json({ ok: true, sent });
}

/** Run `fn` over items, a few at a time (each item is claimed in the database before it is sent). */
async function inParallel<T>(items: T[], fn: (item: T) => Promise<void>, size = 8) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn));
}

function periodKey(p: { year: number; month: number }, revisit: string) {
  return revisit === "quarterly" ? `${p.year}-Q${Math.floor((p.month - 1) / 3)}` : `${p.year}-${p.month}`;
}

