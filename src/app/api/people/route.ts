import { NextRequest, NextResponse, after } from "next/server";
import { remindersChanged } from "@/lib/reminder-plan";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { MUST_SEAL, sealed } from "@/lib/sealed";

export const dynamic = "force-dynamic";

/** A person as the device sends them: everything about them sealed, except the bare day and month of a birthday. */
const PersonFields = {
  name: sealed(2_000),
  relation: sealed(2_000).nullable().optional(),
  howMet: sealed(4_000).nullable().optional(),
  birthday: sealed(500).nullable().optional(),
  /** "MM-DD" only (no year, no name), so the morning birthday note can go out. */
  birthdayMD: z.string().regex(/^\d{2}-\d{2}$/).nullable().optional(),
  notes: sealed(20_000).nullable().optional(),
  /** What it is (a person, food, water…), sealed. */
  kind: sealed(500).nullable().optional(),
  photoId: z.string().max(40).nullable().optional(),
};
const PersonSchema = z.object({ id: z.string().regex(/^[a-z0-9]{20,40}$/).optional(), ...PersonFields });

/** Anyone who can tag people (People or Expressions) can list them. */
async function peopleUser() {
  const user = await resolveUser();
  if (!user || !(user.effective.includes("people") || user.effective.includes("expressions"))) return null;
  return user;
}

export async function GET() {
  const user = await peopleUser();
  if (!user) return NextResponse.json([]);
  // Names are sealed: sorting and searching happen on the device.
  const people = await db.person.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      relation: true,
      kind: true,
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
        kind: p.kind,
        photoId: p.photoId,
        momentCount: p._count.moments,
        lastMomentAt: last ? (last.occurredAt ?? last.date).toISOString() : null,
      };
    })
  );
}

export async function POST(req: NextRequest) {
  // Reminders may have moved: the reminder job looks again on its next run.
  after(remindersChanged);
  const user = await peopleUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = PersonSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(MUST_SEAL, { status: 400 });
  const d = parsed.data;

  // Sent again after a dropped connection: already here.
  if (d.id) {
    const existing = await db.person.findFirst({ where: { id: d.id, userId: user.id }, select: { id: true, name: true, relation: true, kind: true, photoId: true } });
    if (existing) return NextResponse.json({ ...existing, momentCount: 0, lastMomentAt: null });
  }

  const photoId = d.photoId
    ? (await db.attachment.findFirst({ where: { id: d.photoId, userId: user.id, kind: "photo" }, select: { id: true } }))?.id ?? null
    : null;

  const person = await db.person.create({
    data: {
      ...(d.id ? { id: d.id } : {}),
      userId: user.id,
      name: d.name,
      relation: d.relation ?? null,
      howMet: d.howMet ?? null,
      birthdaySealed: d.birthday ?? null,
      birthdayMD: d.birthdayMD ?? null,
      notes: d.notes ?? null,
      kind: d.kind ?? null,
      photoId,
    },
    select: { id: true, name: true, relation: true, kind: true, photoId: true },
  });
  return NextResponse.json({ ...person, momentCount: 0, lastMomentAt: null }, { status: 201 });
}
