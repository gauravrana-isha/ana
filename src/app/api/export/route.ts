import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";

export async function GET() {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [practices, dayLogs, dailyReflections, weeklyReflections, sevaEntries, expressions] =
    await Promise.all([
      db.practice.findMany({ where: { userId: user.id }, orderBy: { order: "asc" } }),
      db.dayLog.findMany({ where: { userId: user.id }, orderBy: { date: "desc" } }),
      db.dailyReflection.findMany({ where: { userId: user.id }, orderBy: { date: "desc" } }),
      db.weeklyReflection.findMany({ where: { userId: user.id }, orderBy: { weekStart: "desc" } }),
      db.sevaEntry.findMany({ where: { userId: user.id }, orderBy: { date: "desc" } }),
      db.expression.findMany({ where: { userId: user.id }, orderBy: { date: "desc" } }),
    ]);

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    user: { email: user.email, theme: user.theme },
    practices,
    dayLogs,
    dailyReflections,
    weeklyReflections,
    sevaEntries,
    expressions,
  });
}
