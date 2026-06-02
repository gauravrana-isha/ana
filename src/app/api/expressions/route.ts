import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";

const CreateSchema = z.object({
  title: z.string().max(150),
  date: z.string(),
  kind: z.enum(["moment", "writing"]),
  body: z.string().max(10000),
  refDates: z.array(z.string()).max(10),
});

export async function GET(req: NextRequest) {
  const user = await resolveUser();
  if (!user) return NextResponse.json([]);

  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const [expressions, total] = await Promise.all([
    db.expression.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.expression.count({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({ items: expressions, total, page, hasMore: skip + limit < total });
}

export async function POST(req: NextRequest) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!parsed.data.body.trim()) {
    return NextResponse.json({ error: "Body is required" }, { status: 400 });
  }

  const expression = await db.expression.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      date: new Date(parsed.data.date),
      kind: parsed.data.kind,
      body: parsed.data.body,
      refDates: parsed.data.refDates,
    },
  });

  return NextResponse.json(expression, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const expression = await db.expression.updateMany({
    where: { id, userId: user.id },
    data: {
      title: parsed.data.title,
      date: new Date(parsed.data.date),
      kind: parsed.data.kind,
      body: parsed.data.body,
      refDates: parsed.data.refDates,
    },
  });

  return NextResponse.json({ ok: true, updated: expression.count });
}

export async function DELETE(req: NextRequest) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.expression.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
