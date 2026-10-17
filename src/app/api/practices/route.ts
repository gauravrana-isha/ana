import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { sealed, MUST_SEAL } from "@/lib/sealed";

/*
 * Practices. Name, icon, library id and fields arrive sealed (only the person's device can
 * read them); order, tier and the done-toggle stay plain so the list can be kept in order.
 * Edits replace the sealed values whole: the device merges, since the server can't.
 */

const ID = z.string().regex(/^[a-z0-9]{20,40}$/);

const CreateSchema = z.object({
  /** Made on the device (so a save retried after a dropped connection isn't doubled). */
  id: ID.optional(),
  name: sealed(2000),
  iconName: sealed(2000),
  catalogId: sealed(2000).nullable().optional(),
  tier: z.enum(["FIXED", "CUSTOM"]),
  hasDoneToggle: z.boolean(),
  fields: sealed(40_000),
});

const ReorderSchema = z.object({
  reorder: z.array(z.object({ id: z.string(), order: z.number() })),
});

const EditSchema = z.object({
  id: z.string(),
  name: sealed(2000).optional(),
  iconName: sealed(2000).optional(),
  fields: sealed(40_000).optional(),
});

export async function GET() {
  const user = await resolveUser();
  if (!user) return NextResponse.json([]);

  const practices = await db.practice.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(practices);
}

export async function POST(req: NextRequest) {
  const user = await resolveUser("tracker");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(MUST_SEAL, { status: 400 });
  const d = parsed.data;

  if (d.id) {
    const existing = await db.practice.findFirst({ where: { id: d.id, userId: user.id } });
    if (existing) return NextResponse.json(existing, { status: 200 });
  }

  const maxOrder = await db.practice.aggregate({
    where: { userId: user.id },
    _max: { order: true },
  });

  const practice = await db.practice.create({
    data: {
      ...(d.id ? { id: d.id } : {}),
      userId: user.id,
      name: d.name,
      iconName: d.iconName,
      catalogId: d.catalogId ?? null,
      tier: d.tier,
      hasDoneToggle: d.hasDoneToggle,
      order: (maxOrder._max.order ?? -1) + 1,
      fields: d.fields as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json(practice, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const user = await resolveUser("tracker");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);

  const order = ReorderSchema.safeParse(body);
  if (order.success) {
    await Promise.all(
      order.data.reorder.map((item) =>
        db.practice.updateMany({
          where: { id: item.id, userId: user.id },
          data: { order: item.order },
        })
      )
    );
    return NextResponse.json({ ok: true });
  }

  const edit = EditSchema.safeParse(body);
  if (!edit.success) return NextResponse.json(MUST_SEAL, { status: 400 });
  const { id, name, iconName, fields } = edit.data;
  const updated = await db.practice.updateMany({
    where: { id, userId: user.id },
    data: { ...(name ? { name } : {}), ...(iconName ? { iconName } : {}), ...(fields ? { fields: fields as Prisma.InputJsonValue } : {}) },
  });
  if (!updated.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await resolveUser("tracker");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Removing a practice keeps past day logs intact; they simply stop showing it.
  const removed = await db.practice.deleteMany({ where: { id, userId: user.id } });
  if (removed.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
