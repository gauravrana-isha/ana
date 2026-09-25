import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";

/** Everything in your journal, as JSON (format 2). Recordings and photos are listed, not included. */
export async function GET() {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const where = { userId: user.id };

  const [practices, dayLogs, dailyReflections, weeklyReflections, sevaEntries, expressions, people, commitments] = await Promise.all([
    db.practice.findMany({ where, orderBy: { order: "asc" } }),
    db.dayLog.findMany({ where, orderBy: { date: "desc" } }),
    db.dailyReflection.findMany({ where, orderBy: { date: "desc" } }),
    db.weeklyReflection.findMany({ where, orderBy: { weekStart: "desc" } }),
    db.sevaEntry.findMany({ where, orderBy: { date: "desc" } }),
    db.expression.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        people: { select: { personId: true } },
        attachments: { select: { id: true, kind: true, contentType: true, size: true, durationSec: true } },
      },
    }),
    db.person.findMany({ where, orderBy: { name: "asc" } }),
    db.commitment.findMany({ where, orderBy: { createdAt: "desc" } }),
  ]);

  /** Drop account-internal fields from a row. */
  const strip = <T extends object>(row: T, ...keys: string[]) =>
    Object.fromEntries(Object.entries(row).filter(([k]) => k !== "userId" && !keys.includes(k)));

  const body = {
    format: 2,
    app: "ana",
    exportedAt: new Date().toISOString(),
    user: { name: user.name, email: user.email, theme: user.theme, intention: user.intention },
    practices: practices.map((p) => strip(p)),
    dayLogs: dayLogs.map((l) => strip(l)),
    dailyReflections: dailyReflections.map((r) => strip(r)),
    weeklyReflections: weeklyReflections.map((r) => strip(r)),
    sevaEntries: sevaEntries.map((r) => strip(r)),
    people: people.map((p) => strip(p, "photoId")),
    expressions: expressions.map((e) => ({ ...strip(e, "people"), personIds: e.people.map((t) => t.personId) })),
    commitments: commitments.map((c) => strip(c)),
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="ana-journal-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
