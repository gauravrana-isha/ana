import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { removeStored } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  relation: z.string().trim().max(60).nullable().optional(),
  howMet: z.string().trim().max(300).nullable().optional(),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  photoId: z.string().nullable().optional(),
});

async function peopleUser() {
  const user = await resolveUser();
  if (!user || !(user.effective.includes("people") || user.effective.includes("expressions"))) return null;
  return user;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await peopleUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const p = await db.person.findFirst({
    where: { id, userId: user.id },
    include: { _count: { select: { moments: true } } },
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const last = await db.expressionPerson.findFirst({
    where: { personId: id },
    orderBy: { expression: { occurredAt: { sort: "desc", nulls: "last" } } },
    select: { expression: { select: { occurredAt: true, date: true } } },
  });
  return NextResponse.json({
    id: p.id,
    name: p.name,
    relation: p.relation,
    howMet: p.howMet,
    birthday: p.birthday?.toISOString().slice(0, 10) ?? null,
    notes: p.notes,
    photoId: p.photoId,
    momentCount: p._count.moments,
    lastMomentAt: last ? (last.expression.occurredAt ?? last.expression.date).toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await peopleUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const person = await db.person.findFirst({ where: { id, userId: user.id } });
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const d = parsed.data;

  let photoId: string | null | undefined = undefined;
  if (d.photoId !== undefined) {
    photoId = d.photoId
      ? (await db.attachment.findFirst({ where: { id: d.photoId, userId: user.id, kind: "photo" }, select: { id: true } }))?.id ?? null
      : null;
  }

  await db.person.update({
    where: { id },
    data: {
      name: d.name,
      relation: d.relation === undefined ? undefined : d.relation || null,
      howMet: d.howMet === undefined ? undefined : d.howMet || null,
      birthday: d.birthday === undefined ? undefined : d.birthday ? new Date(d.birthday) : null,
      notes: d.notes === undefined ? undefined : d.notes || null,
      photoId,
    },
  });

  // A replaced photo is deleted, not left behind.
  if (photoId !== undefined && person.photoId && person.photoId !== photoId) {
    const old = await db.attachment.findUnique({ where: { id: person.photoId } });
    if (old) {
      await db.attachment.delete({ where: { id: old.id } });
      await removeStored(old.storage, old.pathname);
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await peopleUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const person = await db.person.findFirst({ where: { id, userId: user.id } });
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Moments stay; they just no longer mention this person.
  await db.person.delete({ where: { id } });
  if (person.photoId) {
    const photo = await db.attachment.findUnique({ where: { id: person.photoId } });
    if (photo) {
      await db.attachment.delete({ where: { id: photo.id } });
      await removeStored(photo.storage, photo.pathname);
    }
  }
  return NextResponse.json({ ok: true });
}
