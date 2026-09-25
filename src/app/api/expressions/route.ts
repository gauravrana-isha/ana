import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { MomentSchema, momentInclude, ownedIds, serializeMoment } from "@/lib/moments";

export async function GET(req: NextRequest) {
  const user = await resolveUser("expressions");
  if (!user) return NextResponse.json({ items: [], hasMore: false });

  const sp = req.nextUrl.searchParams;
  const limit = 20;
  const cursor = sp.get("cursor");
  const personId = sp.get("person");
  const kind = sp.get("kind");
  const q = sp.get("q")?.trim();

  const where = {
    userId: user.id,
    ...(personId ? { people: { some: { personId } } } : {}),
    ...(kind ? { kind: kind === "writing" ? { in: ["writing", "moment"] } : kind } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { body: { contains: q, mode: "insensitive" as const } },
            { place: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const rows = await db.expression.findMany({
    where,
    include: momentInclude,
    orderBy: [{ occurredAt: { sort: "desc", nulls: "last" } }, { date: "desc" }, { createdAt: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(serializeMoment);
  return NextResponse.json({ items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null });
}

export async function POST(req: NextRequest) {
  const user = await resolveUser("expressions");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = MomentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;
  if (!d.body.trim() && !d.title.trim() && d.attachmentIds.length === 0) {
    return NextResponse.json({ error: "Write something or add a recording" }, { status: 400 });
  }

  const owned = await ownedIds(user.id, d.personIds, d.attachmentIds);
  const occurredAt = new Date(d.occurredAt);

  const moment = await db.expression.create({
    data: {
      userId: user.id,
      title: d.title,
      kind: d.kind,
      body: d.body,
      date: new Date(occurredAt.toISOString().slice(0, 10)),
      occurredAt,
      place: d.place || null,
      stamps: d.stamps,
      lookBackOn: d.lookBackOn ? new Date(d.lookBackOn) : null,
      refDates: [],
      people: { create: owned.people.map((personId) => ({ personId })) },
    },
  });
  if (owned.attachments.length) {
    await db.attachment.updateMany({ where: { id: { in: owned.attachments }, userId: user.id }, data: { expressionId: moment.id } });
  }

  const full = await db.expression.findUniqueOrThrow({ where: { id: moment.id }, include: momentInclude });
  return NextResponse.json(serializeMoment(full), { status: 201 });
}
