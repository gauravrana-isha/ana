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
      approvedAt: true,
      approvedById: true,
      createdAt: true,
      features: { select: { feature: true, allowed: true, enabled: true } },
    },
  });

  // Admins see what they need to let people in and look after storage, never anything
  // people write or track: account facts only (activity is from sign-in sessions, to the day).
  const ids = users.map((u) => u.id);
  const [storage, sessions, pushes, approvers] = await Promise.all([
    db.attachment.groupBy({ by: ["userId"], _sum: { size: true } }),
    db.session.groupBy({ by: ["userId"], where: { userId: { in: ids }, expires: { gt: new Date() } }, _max: { updatedAt: true }, _count: { _all: true } }),
    db.pushSubscription.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _count: { _all: true } }),
    db.user.findMany({ where: { id: { in: [...new Set(users.map((u) => u.approvedById).filter(Boolean) as string[])] } }, select: { id: true, name: true, email: true } }),
  ]);
  const used = new Map(storage.map((s) => [s.userId, s._sum.size ?? 0]));
  const seen = new Map(sessions.map((s) => [s.userId, { at: s._max.updatedAt, devices: s._count._all }]));
  const push = new Map(pushes.map((p) => [p.userId, p._count._all]));
  const approver = new Map(approvers.map((a) => [a.id, a.name ?? a.email]));
  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      storageBytes: used.get(u.id) ?? 0,
      lastActiveAt: seen.get(u.id)?.at?.toISOString() ?? null,
      devices: seen.get(u.id)?.devices ?? 0,
      notifyDevices: push.get(u.id) ?? 0,
      approvedBy: u.approvedById ? approver.get(u.approvedById) ?? null : null,
    })),
    me: admin.id,
  });
}
