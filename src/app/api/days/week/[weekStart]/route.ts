import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { addDays } from "@/lib/dates";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ weekStart: string }> }
) {
  const user = await resolveUser();
  const { weekStart } = await params;

  if (!user) return NextResponse.json({});

  const weekEnd = addDays(weekStart, 6);
  const dayLogs = await db.dayLog.findMany({
    where: {
      userId: user.id,
      date: { gte: new Date(weekStart), lte: new Date(weekEnd) },
    },
  });

  // Return as Record<date, entries>
  const result: Record<string, Record<string, unknown>> = {};
  for (const log of dayLogs) {
    const dateStr = log.date.toISOString().slice(0, 10);
    result[dateStr] = log.entries as Record<string, unknown>;
  }

  return NextResponse.json(result);
}
