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
      createdAt: true,
      features: { select: { feature: true, allowed: true, enabled: true } },
    },
  });

  // Admins see what they need to let people in and look after storage, nothing of what
  // people write or track.
  const storage = await db.attachment.groupBy({ by: ["userId"], _sum: { size: true } });
  const used = new Map(storage.map((s) => [s.userId, s._sum.size ?? 0]));
  return NextResponse.json({ users: users.map((u) => ({ ...u, storageBytes: used.get(u.id) ?? 0 })), me: admin.id });
}
