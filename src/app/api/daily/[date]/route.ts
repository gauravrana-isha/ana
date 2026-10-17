import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { MUST_SEAL, sealed } from "@/lib/sealed";

const PatchSchema = z.object({
  // Each answer and each question's stamps sealed on the device (keys are prompt keys).
  answers: z.record(z.string().max(60), sealed(60_000)).optional(),
  stamps: z.record(z.string().max(60), sealed(2_000)).optional(),
  moodKey: sealed(500).nullable().optional(),
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
  if (!parsed.success) return NextResponse.json(MUST_SEAL, { status: 400 });

  const existing = await db.dailyReflection.findUnique({
    where: { userId_date: { userId: user.id, date: new Date(date) } },
  });

  const data = {
    answers: { ...(existing?.answers as Record<string, string> ?? {}), ...(parsed.data.answers ?? {}) },
    stamps: { ...(existing?.stamps as Record<string, string> ?? {}), ...(parsed.data.stamps ?? {}) },
    moodKey: parsed.data.moodKey !== undefined ? parsed.data.moodKey : (existing?.moodKey ?? null),
  };

  const reflection = await db.dailyReflection.upsert({
    where: { userId_date: { userId: user.id, date: new Date(date) } },
    create: { userId: user.id, date: new Date(date), ...data },
    update: data,
  });

  return NextResponse.json(reflection);
}
