import { NextRequest, NextResponse, after } from "next/server";
import { remindersChanged } from "@/lib/reminder-plan";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { removeAttachmentFiles } from "@/lib/storage";
import { MUST_SEAL, sealed } from "@/lib/sealed";

type Ctx = { params: Promise<{ id: string }> };

const PatchSchema = z.object({
  name: sealed(2_000).optional(),
  relation: sealed(2_000).nullable().optional(),
  howMet: sealed(4_000).nullable().optional(),
  birthday: sealed(500).nullable().optional(),
  birthdayMD: z.string().regex(/^\d{2}-\d{2}$/).nullable().optional(),
  notes: sealed(20_000).nullable().optional(),
  photoId: z.string().max(40).nullable().optional(),
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
    birthday: p.birthdaySealed ?? p.birthday?.toISOString().slice(0, 10) ?? null,
    notes: p.notes,
    photoId: p.photoId,
    momentCount: p._count.moments,
    lastMomentAt: last ? (last.expression.occurredAt ?? last.expression.date).toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  // Reminders may have moved: the reminder job looks again on its next run.
  after(remindersChanged);
  const user = await peopleUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const person = await db.person.findFirst({ where: { id, userId: user.id } });
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(MUST_SEAL, { status: 400 });
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
      relation: d.relation,
      howMet: d.howMet,
      ...(d.birthday !== undefined ? { birthdaySealed: d.birthday, birthday: null, birthdayMD: d.birthdayMD ?? null } : {}),
      notes: d.notes,
      photoId,
    },
  });

  // A replaced photo is deleted, not left behind.
  if (photoId !== undefined && person.photoId && person.photoId !== photoId) {
    const old = await db.attachment.findUnique({ where: { id: person.photoId } });
    if (old) {
      await db.attachment.delete({ where: { id: old.id } });
      await removeAttachmentFiles(old);
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
  await db.deletion.create({ data: { userId: user.id, kind: "person", recordId: id } });
  if (person.photoId) {
    const photo = await db.attachment.findUnique({ where: { id: person.photoId } });
    if (photo) {
      await db.attachment.delete({ where: { id: photo.id } });
      await removeAttachmentFiles(photo);
    }
  }
  return NextResponse.json({ ok: true });
}
