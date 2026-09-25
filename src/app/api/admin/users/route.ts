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
      intention: true,
      onboardedAt: true,
      approvedAt: true,
      createdAt: true,
      features: { select: { feature: true, allowed: true, enabled: true } },
      _count: { select: { dayLogs: true, dailyReflections: true, expressions: true } },
    },
  });

  return NextResponse.json({ users, me: admin.id });
}
