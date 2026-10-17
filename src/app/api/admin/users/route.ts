import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveAdmin } from "@/lib/session";

const PAGE = 30;
const STATUSES = ["PENDING", "APPROVED", "SUSPENDED"] as const;

/**
 * People, a page at a time: one status (or all), optionally matching a name or email
 * (?status=&q=&cursor=), with the count for each status.
 */
export async function GET(req: NextRequest) {
  const admin = await resolveAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const status = STATUSES.find((s) => s === sp.get("status"));
  const q = sp.get("q")?.trim().slice(0, 80);
  const cursor = sp.get("cursor");

  // Legacy rows (no Google account) are hidden; they can only be claimed.
  const base: Prisma.UserWhereInput = {
    accounts: { some: {} },
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [grouped, page] = await Promise.all([
    db.user.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    db.user.findMany({
    where: { ...base, ...(status ? { status } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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
    }),
  ]);
  const counts = { ALL: 0, PENDING: 0, APPROVED: 0, SUSPENDED: 0 } as Record<string, number>;
  for (const g of grouped) {
    counts[g.status] = g._count._all;
    counts.ALL += g._count._all;
  }
  const hasMore = page.length > PAGE;
  const users = page.slice(0, PAGE);

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
    counts,
    nextCursor: hasMore ? users[users.length - 1].id : null,
  });
}
