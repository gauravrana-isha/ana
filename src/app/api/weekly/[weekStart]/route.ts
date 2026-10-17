import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { MUST_SEAL, sealed } from "@/lib/sealed";

const PatchSchema = z.object({
  // Each answer and each question's stamps sealed on the device (keys are prompt keys).
  answers: z.record(z.string().max(60), sealed(60_000)).optional(),
  stamps: z.record(z.string().max(60), sealed(2_000)).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ weekStart: string }> }
) {
  const user = await resolveUser("weekly");
  const { weekStart } = await params;
  if (!user) return NextResponse.json({ weekStart, answers: {}, stamps: {} });

  const reflection = await db.weeklyReflection.findUnique({
    where: { userId_weekStart: { userId: user.id, weekStart: new Date(weekStart) } },
  });

  return NextResponse.json(reflection ?? { weekStart, answers: {}, stamps: {} });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ weekStart: string }> }
) {
  const user = await resolveUser("weekly");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { weekStart } = await params;
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(MUST_SEAL, { status: 400 });

  const existing = await db.weeklyReflection.findUnique({
    where: { userId_weekStart: { userId: user.id, weekStart: new Date(weekStart) } },
  });

  const data = {
    answers: { ...(existing?.answers as Record<string, string> ?? {}), ...(parsed.data.answers ?? {}) },
    stamps: { ...(existing?.stamps as Record<string, string> ?? {}), ...(parsed.data.stamps ?? {}) },
  };

  const reflection = await db.weeklyReflection.upsert({
    where: { userId_weekStart: { userId: user.id, weekStart: new Date(weekStart) } },
    create: { userId: user.id, weekStart: new Date(weekStart), ...data },
    update: data,
  });

  return NextResponse.json(reflection);
}
