import { NextResponse } from "next/server";
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
      createdAt: true,
      features: { select: { feature: true, allowed: true, enabled: true } },
    },
  });

  // Admins see what they need to let people in and look after storage, never anything
  // people write or track: when they were last active (from sign-in sessions), when they
  // joined, and how much storage they use.
  const ids = users.map((u) => u.id);
  const [storage, sessions] = await Promise.all([
    db.attachment.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _sum: { size: true } }),
    db.session.groupBy({ by: ["userId"], where: { userId: { in: ids }, expires: { gt: new Date() } }, _max: { updatedAt: true } }),
  ]);
  const used = new Map(storage.map((s) => [s.userId, s._sum.size ?? 0]));
  const seen = new Map(sessions.map((s) => [s.userId, s._max.updatedAt]));
  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      storageBytes: used.get(u.id) ?? 0,
      lastActiveAt: seen.get(u.id)?.toISOString() ?? null,
    })),
    me: admin.id,
  });
}
