import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const PersonSchema = z.object({
  name: z.string().trim().min(1).max(80),
  relation: z.string().trim().max(60).optional().nullable(),
  howMet: z.string().trim().max(300).optional().nullable(),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
  photoId: z.string().optional().nullable(),
});

/** Anyone who can tag people (People or Expressions) can list them. */
async function peopleUser() {
  const user = await resolveUser();
  if (!user || !(user.effective.includes("people") || user.effective.includes("expressions"))) return null;
  return user;
}

export async function GET(req: NextRequest) {
  const user = await peopleUser();
  if (!user) return NextResponse.json([]);
  const q = req.nextUrl.searchParams.get("q")?.trim();

  const people = await db.person.findMany({
    where: { userId: user.id, ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      relation: true,
      photoId: true,
      _count: { select: { moments: true } },
      moments: {
        take: 1,
        orderBy: { expression: { occurredAt: { sort: "desc", nulls: "last" } } },
        select: { expression: { select: { occurredAt: true, date: true } } },
      },
    },
  });

  return NextResponse.json(
    people.map((p) => {
      const last = p.moments[0]?.expression;
      return {
        id: p.id,
        name: p.name,
        relation: p.relation,
        photoId: p.photoId,
        momentCount: p._count.moments,
        lastMomentAt: last ? (last.occurredAt ?? last.date).toISOString() : null,
      };
    })
  );
}

export async function POST(req: NextRequest) {
  const user = await peopleUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = PersonSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const d = parsed.data;

  const photoId = d.photoId
    ? (await db.attachment.findFirst({ where: { id: d.photoId, userId: user.id, kind: "photo" }, select: { id: true } }))?.id ?? null
    : null;

  const person = await db.person.create({
    data: {
      userId: user.id,
      name: d.name,
      relation: d.relation || null,
      howMet: d.howMet || null,
      birthday: d.birthday ? new Date(d.birthday) : null,
      notes: d.notes || null,
      photoId,
    },
    select: { id: true, name: true, relation: true, photoId: true },
  });
  return NextResponse.json({ ...person, momentCount: 0, lastMomentAt: null }, { status: 201 });
}
