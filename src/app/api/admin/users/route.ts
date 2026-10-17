import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveAdmin } from "@/lib/session";

export async function GET() {
  const admin = await resolveAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await db.user.findMany({
    // Legacy rows (no Google account) are hidden; they can only be claimed.
    where: { accounts: { some: {} } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      status: true,
      onboardedAt: true,
      lastSeenAt: true,
      createdAt: true,
      features: { select: { feature: true, allowed: true, enabled: true } },
    },
  });

  // Admins see what they need to let people in and look after storage, never anything
  // people write or track: when they were last active, when they joined, and how much
  // storage they use, and on how many of the last 30 days they wrote anything (dates only). "Last active" is the app's own last-seen time (to ~10 minutes), or for
  // people not seen since it was added, their latest sign-in session.
  const ids = users.map((u) => u.id);
  // Active days: how many of the last 30 days they wrote anything, from entry dates alone.
  const since = new Date(Date.now() - 29 * 86400_000); // today and the 29 days before
  const [storage, sessions, active] = await Promise.all([
    db.attachment.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _sum: { size: true } }),
    db.session.groupBy({ by: ["userId"], where: { userId: { in: ids }, expires: { gt: new Date() } }, _max: { updatedAt: true } }),
    ids.length
      ? db.$queryRaw<{ userId: string; days: number }[]>`
          SELECT "userId", COUNT(DISTINCT date)::int AS days FROM (
            SELECT "userId", date FROM "DayLog" WHERE date >= ${since}::date
            UNION ALL SELECT "userId", date FROM "DailyReflection" WHERE date >= ${since}::date
            UNION ALL SELECT "userId", date FROM "SevaEntry" WHERE date >= ${since}::date
            UNION ALL SELECT "userId", date FROM "Expression" WHERE date >= ${since}::date
          ) d WHERE "userId" IN (${Prisma.join(ids)}) GROUP BY "userId"`
      : [],
  ]);
  const days = new Map(active.map((a) => [a.userId, a.days]));
  const used = new Map(storage.map((s) => [s.userId, s._sum.size ?? 0]));
  const seen = new Map(sessions.map((s) => [s.userId, s._max.updatedAt]));
  return NextResponse.json({
    users: users.map(({ lastSeenAt, ...u }) => {
      const session = seen.get(u.id) ?? null;
      const last = lastSeenAt && (!session || lastSeenAt > session) ? lastSeenAt : session;
      return { ...u, storageBytes: used.get(u.id) ?? 0, lastActiveAt: last?.toISOString() ?? null, activeDays: days.get(u.id) ?? 0 };
    }),
    me: admin.id,
  });
}
