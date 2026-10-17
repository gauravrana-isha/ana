import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { MomentSchema, lookBackData, momentInclude, ownedIds, serializeMoment } from "@/lib/moments";
import { MUST_SEAL } from "@/lib/sealed";

/** All of the caller's moments, newest first. Words are sealed, so searching and filtering happen on the device. */
export async function GET() {
  const user = await resolveUser("expressions");
  if (!user) return NextResponse.json({ items: [], hasMore: false });

  const rows = await db.expression.findMany({
    where: { userId: user.id },
    relationLoadStrategy: "join",
    include: momentInclude,
    orderBy: [{ occurredAt: { sort: "desc", nulls: "last" } }, { date: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ items: rows.map(serializeMoment), hasMore: false, nextCursor: null });
}

export async function POST(req: NextRequest) {
  const user = await resolveUser("expressions");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = MomentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(MUST_SEAL, { status: 400 });
  const d = parsed.data;

  // Sent again after a dropped connection: it's already here.
  if (d.id) {
    const existing = await db.expression.findFirst({ where: { id: d.id, userId: user.id }, relationLoadStrategy: "join", include: momentInclude });
    if (existing) return NextResponse.json(serializeMoment(existing), { status: 200 });
  }

  const owned = await ownedIds(user.id, d.personIds, d.attachmentIds);
  const occurredAt = new Date(d.occurredAt);

  const moment = await db.expression.create({
    data: {
      ...(d.id ? { id: d.id } : {}),
      userId: user.id,
      title: d.title,
      kind: d.kind,
      body: d.body,
      date: new Date(occurredAt.toISOString().slice(0, 10)),
      occurredAt,
      place: d.place || null,
      stamps: d.stamps,
      ...lookBackData(d),
      refDates: [],
      people: { create: owned.people.map((personId) => ({ personId })) },
    },
  });
  if (owned.attachments.length) {
    await db.attachment.updateMany({ where: { id: { in: owned.attachments }, userId: user.id }, data: { expressionId: moment.id } });
  }

  const full = await db.expression.findUniqueOrThrow({ where: { id: moment.id }, relationLoadStrategy: "join", include: momentInclude });
  return NextResponse.json(serializeMoment(full), { status: 201 });
}
