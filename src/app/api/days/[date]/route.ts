import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { Prisma } from "@prisma/client";

const PatchSchema = z.object({
  entries: z.record(
    z.string(),
    z.object({
      done: z.boolean().optional(),
      values: z.record(z.string(), z.union([z.string(), z.number()])),
    })
  ),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const user = await resolveUser("tracker");
  const { date } = await params;
  if (!user) return NextResponse.json({ date, entries: {} });

  const dayLog = await db.dayLog.findUnique({
    where: { userId_date: { userId: user.id, date: new Date(date) } },
  });

  return NextResponse.json(dayLog ?? { date, entries: {} });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const user = await resolveUser("tracker");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date } = await params;
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.dayLog.findUnique({
    where: { userId_date: { userId: user.id, date: new Date(date) } },
  });

  const mergedEntries = {
    ...(existing?.entries as Record<string, unknown> ?? {}),
    ...parsed.data.entries,
  } as Record<string, unknown>;

  const dayLog = await db.dayLog.upsert({
    where: { userId_date: { userId: user.id, date: new Date(date) } },
    create: {
      userId: user.id,
      date: new Date(date),
      entries: mergedEntries as unknown as Prisma.InputJsonValue,
    },
    update: {
      entries: mergedEntries as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json(dayLog);
}
