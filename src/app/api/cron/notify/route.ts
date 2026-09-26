import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { zonedParts } from "@/lib/push";
import { notify, sweepNotifications } from "@/lib/notify";
import { plainText } from "@/components/moments/RichText";

/*
 * Announces what is due (in the bell, and as a push where it's turned on): moments coming
 * back, commitment letters to read again, birthdays. Then sweeps away notifications that
 * have ended.
 * Called on a schedule (a GitHub Actions workflow every 15 minutes, plus Vercel's daily cron
 * as a backstop) with `Authorization: Bearer $CRON_SECRET`. Safe to call as often as you
 * like: each notification is claimed in the database before it is sent, so it goes out once.
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
  const sent = { moments: 0, commitments: 0, birthdays: 0, portraits: 0, swept: 0 };

  // ---- Moments coming back
  const due = await db.expression.findMany({
    where: {
      lookBackSentAt: null,
      lookBackAt: { lte: now, gte: new Date(now.getTime() - LATE_LIMIT_MS) },
      user: { status: "APPROVED" },
    },
    select: { id: true, userId: true, title: true, body: true, kind: true, occurredAt: true, date: true },
    take: 200,
  });
  for (const m of due) {
    const claimed = await db.expression.updateMany({ where: { id: m.id, lookBackSentAt: null }, data: { lookBackSentAt: now } });
    if (!claimed.count) continue;
    const when = (m.occurredAt ?? m.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const words = m.title || plainText(m.body).slice(0, 120) || (m.kind === "audio" ? "A voice note" : m.kind === "video" ? "A video" : m.kind === "photo" ? "Photos" : "A moment");
    try {
      const made = await notify({ userId: m.userId, kind: "moment", key: `moment:${m.id}`, title: "A moment is back", body: `${words} · from ${when}`, url: `/expressions?open=${m.id}` });
      if (made) sent.moments++;
    } catch (e) {
      // Give the claim back so the next run tries again.
      await db.expression.update({ where: { id: m.id }, data: { lookBackSentAt: null } }).catch(() => {});
      console.error("moment notify failed", e);
    }
  }

  // ---- Commitment letters to read again
  const letters = await db.commitment.findMany({
    where: {
      supersededAt: null,
      revisit: { in: ["monthly", "quarterly"] },
      user: { status: "APPROVED" },
    },
    select: { id: true, userId: true, revisit: true, revisitedAt: true, remindedAt: true, createdAt: true, user: { select: { timeZone: true } } },
  });
  for (const c of letters) {
    const tz = c.user.timeZone;
    const nowLocal = zonedParts(now, tz);
    if (nowLocal.hour < MORNING) continue;
    const period = periodKey(nowLocal, c.revisit);
    const lastRead = zonedParts(c.revisitedAt ?? c.createdAt, tz);
    if (periodKey(lastRead, c.revisit) === period) continue; // already read this period
    if (c.remindedAt && periodKey(zonedParts(c.remindedAt, tz), c.revisit) === period) continue; // already reminded
    const claimed = await db.commitment.updateMany({
      where: { id: c.id, OR: [{ remindedAt: null }, { remindedAt: c.remindedAt }] },
      data: { remindedAt: now },
    });
    if (!claimed.count) continue;
    try {
      const made = await notify({ userId: c.userId, kind: "commitment", key: `commitment:${c.id}:${period}`, title: "Your commitment", body: "Time to read your letter again.", url: "/commitment" });
      if (made) sent.commitments++;
    } catch (e) {
      await db.commitment.update({ where: { id: c.id }, data: { remindedAt: c.remindedAt } }).catch(() => {});
      console.error("commitment notify failed", e);
    }
  }

  // ---- Birthdays (from the morning, local time; gone the day after)
  const people = await db.person.findMany({
    where: { birthday: { not: null }, user: { status: "APPROVED" } },
    select: { id: true, name: true, userId: true, birthday: true, user: { select: { timeZone: true, features: { where: { feature: "people" } } } } },
  });
  for (const p of people) {
    const f = p.user.features[0];
    if (f && (!f.allowed || !f.enabled)) continue;
    const local = zonedParts(now, p.user.timeZone);
    if (local.hour < BIRTHDAY_HOUR) continue;
    if (p.birthday!.getUTCMonth() + 1 !== local.month || p.birthday!.getUTCDate() !== local.day) continue;
    const made = await notify({
      userId: p.userId,
      kind: "birthday",
      key: `birthday:${p.id}:${local.year}`,
      title: `${p.name}'s birthday`,
      body: `It's ${p.name}'s birthday today.`,
      url: `/people/${p.id}`,
      expiresAt: new Date(now.getTime() + (48 - local.hour) * 60 * 60 * 1000),
    });
    if (made) sent.birthdays++;
  }

  // ---- "Who are you now?" (every few months after the last portrait, from the morning)
  const sitters = await db.user.findMany({
    where: { status: "APPROVED", portraitEveryMonths: { gt: 0 }, portraits: { some: {} } },
    select: { id: true, timeZone: true, portraitEveryMonths: true, portraits: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, createdAt: true } } },
  });
  for (const u of sitters) {
    const last = u.portraits[0];
    const due = new Date(last.createdAt);
    due.setMonth(due.getMonth() + u.portraitEveryMonths);
    if (due > now || zonedParts(now, u.timeZone).hour < MORNING) continue;
    const made = await notify({
      userId: u.id,
      kind: "portrait",
      key: `portrait:${last.id}`,
      title: "Who are you now?",
      body: `It's been ${u.portraitEveryMonths === 12 ? "a year" : `${u.portraitEveryMonths} months`} since you last looked. Look at the three layers again.`,
      url: "/profile/who",
    });
    if (made) sent.portraits++;
  }

  sent.swept = await sweepNotifications(now);
  return NextResponse.json({ ok: true, sent });
}

function periodKey(p: { year: number; month: number }, revisit: string) {
  return revisit === "quarterly" ? `${p.year}-Q${Math.floor((p.month - 1) / 3)}` : `${p.year}-${p.month}`;
}

