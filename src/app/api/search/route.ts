import { allow } from "@/lib/ratelimit";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** What search looks through, all sealed: the search itself runs on the device (lib/compute/search). */
export async function GET() {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await allow(`search:${user.id}`, 40))) return NextResponse.json({ error: "Too many tries. Wait a minute and try again." }, { status: 429 });
  const has = (f: Parameters<typeof user.effective.includes>[0]) => user.effective.includes(f);

  const [moments, people, daily, weekly] = await Promise.all([
    has("expressions")
      ? db.expression.findMany({
          where: { userId: user.id },
          select: { id: true, title: true, body: true, kind: true, occurredAt: true, date: true, place: true, people: { select: { person: { select: { name: true } } } } },
        })
      : [],
    has("people") || has("expressions")
      ? db.person.findMany({ where: { userId: user.id }, select: { id: true, name: true, relation: true, notes: true, howMet: true, photoId: true } })
      : [],
    has("daily") ? db.dailyReflection.findMany({ where: { userId: user.id }, select: { date: true, answers: true } }) : [],
    has("weekly") ? db.weeklyReflection.findMany({ where: { userId: user.id }, select: { weekStart: true, answers: true } }) : [],
  ]);

  return NextResponse.json({ moments, people, daily, weekly });
}
