import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { MomentSchema, lookBackData, momentInclude, ownedIds, serializeMoment } from "@/lib/moments";
import { removeStored } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await resolveUser("expressions");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const m = await db.expression.findFirst({ where: { id, userId: user.id }, include: momentInclude });
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serializeMoment(m));
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await resolveUser("expressions");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await db.expression.findFirst({ where: { id, userId: user.id }, select: { id: true, lookBackAt: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = MomentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;
  const owned = await ownedIds(user.id, d.personIds, d.attachmentIds);
  const occurredAt = new Date(d.occurredAt);

  // Media removed while editing is deleted for good.
  const dropped = await db.attachment.findMany({
    where: { expressionId: id, userId: user.id, id: { notIn: owned.attachments } },
  });

  await db.$transaction([
    db.expressionPerson.deleteMany({ where: { expressionId: id } }),
    db.expression.update({
      where: { id },
      data: {
        title: d.title,
        kind: d.kind,
        body: d.body,
        date: new Date(occurredAt.toISOString().slice(0, 10)),
        occurredAt,
        place: d.place || null,
        stamps: d.stamps,
        ...lookBackData(d, existing),
        people: { create: owned.people.map((personId) => ({ personId })) },
      },
    }),
    db.attachment.updateMany({ where: { id: { in: owned.attachments }, userId: user.id }, data: { expressionId: id } }),
    db.attachment.deleteMany({ where: { id: { in: dropped.map((a) => a.id) } } }),
  ]);
  await Promise.all(dropped.map((a) => removeStored(a.storage, a.pathname)));

  const full = await db.expression.findUniqueOrThrow({ where: { id }, include: momentInclude });
  return NextResponse.json(serializeMoment(full));
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await resolveUser("expressions");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const files = await db.attachment.findMany({ where: { expressionId: id, userId: user.id } });
  const removed = await db.expression.deleteMany({ where: { id, userId: user.id } });
  if (removed.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await Promise.all(files.map((a) => removeStored(a.storage, a.pathname)));
  return NextResponse.json({ ok: true });
}
