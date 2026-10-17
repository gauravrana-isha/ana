import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { MomentSchema, lookBackData, momentInclude, ownedIds, serializeMoment } from "@/lib/moments";
import { MUST_SEAL } from "@/lib/sealed";

const KEEP_DELETIONS_MS = 90 * 24 * 3600_000;

/**
 * The caller's moments, newest first. Words are sealed, so searching and filtering happen on
 * the device, which keeps its own (encrypted) copy. With ?since=<time from the last reply>, only
 * what changed since: moments edited or added (or whose people changed), and what was deleted.
 * A copy older than the deletion record gets everything again (`full: true`).
 */
export async function GET(req: NextRequest) {
  const user = await resolveUser("expressions");
  if (!user) return NextResponse.json({ items: [], deleted: [], full: true, now: new Date().toISOString() });

  const now = new Date();
  const sinceParam = req.nextUrl.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : null;
  const full = !since || isNaN(since.getTime()) || now.getTime() - since.getTime() > KEEP_DELETIONS_MS;
  // A little overlap, so nothing saved at the same moment as the last reply is missed.
  const after = full ? null : new Date(since!.getTime() - 5_000);

  const [rows, deletions] = await Promise.all([
    db.expression.findMany({
      where: {
        userId: user.id,
        ...(after ? { OR: [{ updatedAt: { gt: after } }, { people: { some: { person: { updatedAt: { gt: after } } } } }] } : {}),
      },
      relationLoadStrategy: "join",
      include: momentInclude,
      orderBy: [{ occurredAt: { sort: "desc", nulls: "last" } }, { date: "desc" }, { createdAt: "desc" }],
    }),
    after ? db.deletion.findMany({ where: { userId: user.id, at: { gt: after } }, select: { kind: true, recordId: true } }) : [],
  ]);
  return NextResponse.json({
    items: rows.map(serializeMoment),
    deleted: deletions.filter((d) => d.kind === "moment").map((d) => d.recordId),
    deletedPeople: deletions.filter((d) => d.kind === "person").map((d) => d.recordId),
    full,
    now: now.toISOString(),
  });
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
