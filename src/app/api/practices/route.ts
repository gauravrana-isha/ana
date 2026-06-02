import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";

const CreateSchema = z.object({
  name: z.string().min(1).max(50),
  iconName: z.string().min(1),
  hasDoneToggle: z.boolean(),
  fields: z.array(
    z.object({
      key: z.string(),
      kind: z.enum(["TIME", "COUNT", "MINUTES", "NUMBER", "ICONSCALE", "MOOD"]),
      label: z.string().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
    })
  ),
});

const ReorderSchema = z.object({
  reorder: z.array(z.object({ id: z.string(), order: z.number() })),
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
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Get max order
  const maxOrder = await db.practice.aggregate({
    where: { userId: user.id },
    _max: { order: true },
  });

  const practice = await db.practice.create({
    data: {
      userId: user.id,
      name: parsed.data.name.trim(),
      iconName: parsed.data.iconName,
      tier: "CUSTOM",
      hasDoneToggle: parsed.data.hasDoneToggle,
      order: (maxOrder._max.order ?? -1) + 1,
      fields: parsed.data.fields,
    },
  });

  return NextResponse.json(practice, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = ReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Update order for each practice
  await Promise.all(
    parsed.data.reorder.map((item) =>
      db.practice.updateMany({
        where: { id: item.id, userId: user.id },
        data: { order: item.order },
      })
    )
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Only allow deleting CUSTOM practices
  const practice = await db.practice.findFirst({
    where: { id, userId: user.id, tier: "CUSTOM" },
  });

  if (!practice) {
    return NextResponse.json({ error: "Cannot delete built-in practice" }, { status: 403 });
  }

  await db.practice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
