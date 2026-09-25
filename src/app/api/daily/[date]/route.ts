import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";

const PatchSchema = z.object({
  answers: z.record(z.string(), z.string()).optional(),
  stamps: z.record(z.string(), z.array(z.string())).optional(),
  moodKey: z.string().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const user = await resolveUser("daily");
  const { date } = await params;
  if (!user) return NextResponse.json({ date, answers: {}, stamps: {}, moodKey: null });

  const reflection = await db.dailyReflection.findUnique({
    where: { userId_date: { userId: user.id, date: new Date(date) } },
  });

  return NextResponse.json(reflection ?? { date, answers: {}, stamps: {}, moodKey: null });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const user = await resolveUser("daily");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date } = await params;
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.dailyReflection.findUnique({
    where: { userId_date: { userId: user.id, date: new Date(date) } },
  });

  const data = {
    answers: { ...(existing?.answers as Record<string, string> ?? {}), ...(parsed.data.answers ?? {}) },
    stamps: { ...(existing?.stamps as Record<string, string[]> ?? {}), ...(parsed.data.stamps ?? {}) },
    moodKey: parsed.data.moodKey !== undefined ? parsed.data.moodKey : (existing?.moodKey ?? null),
  };

  const reflection = await db.dailyReflection.upsert({
    where: { userId_date: { userId: user.id, date: new Date(date) } },
    create: { userId: user.id, date: new Date(date), ...data },
    update: data,
  });

  return NextResponse.json(reflection);
}
