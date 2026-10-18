import { NextRequest, NextResponse, after } from "next/server";
import { remindersChanged } from "@/lib/reminder-plan";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { MomentSchema, lookBackData, momentInclude, ownedIds, serializeMoment } from "@/lib/moments";
import { removeAttachmentFiles } from "@/lib/storage";
import { MUST_SEAL } from "@/lib/sealed";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await resolveUser("expressions");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const m = await db.expression.findFirst({ where: { id, userId: user.id }, relationLoadStrategy: "join", include: momentInclude });
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serializeMoment(m));
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  // Reminders may have moved: the reminder job looks again on its next run.
  after(remindersChanged);
  const user = await resolveUser("expressions");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  // One round: the moment (ownership), the request body, then everything it refers to.
  const [existing, body] = await Promise.all([
    db.expression.findFirst({ where: { id, userId: user.id }, select: { id: true, lookBackAt: true } }),
    req.json().catch(() => null),
  ]);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = MomentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(MUST_SEAL, { status: 400 });
  const d = parsed.data;
  const [owned, current] = await Promise.all([
    ownedIds(user.id, d.personIds, d.attachmentIds),
    db.attachment.findMany({ where: { expressionId: id, userId: user.id }, select: { id: true, storage: true, pathname: true, thumbPathname: true } }),
  ]);
  const occurredAt = new Date(d.occurredAt);

  // Media removed while editing is deleted for good.
  const dropped = current.filter((a) => !owned.attachments.includes(a.id));

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
  const [full] = await Promise.all([
    db.expression.findUniqueOrThrow({ where: { id }, relationLoadStrategy: "join", include: momentInclude }),
    ...dropped.map(removeAttachmentFiles),
  ]);
  return NextResponse.json(serializeMoment(full));
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await resolveUser("expressions");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const files = await db.attachment.findMany({ where: { expressionId: id, userId: user.id } });
  const removed = await db.expression.deleteMany({ where: { id, userId: user.id } });
  if (removed.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // So your other devices drop their copy when they next fetch what changed.
  await db.deletion.create({ data: { userId: user.id, kind: "moment", recordId: id } });
  await Promise.all(files.map(removeAttachmentFiles));
  return NextResponse.json({ ok: true });
}
