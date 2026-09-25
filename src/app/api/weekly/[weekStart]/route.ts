import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";

const PatchSchema = z.object({
  answers: z.record(z.string(), z.string()).optional(),
  stamps: z.record(z.string(), z.array(z.string())).optional(),
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
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.weeklyReflection.findUnique({
    where: { userId_weekStart: { userId: user.id, weekStart: new Date(weekStart) } },
  });

  const data = {
    answers: { ...(existing?.answers as Record<string, string> ?? {}), ...(parsed.data.answers ?? {}) },
    stamps: { ...(existing?.stamps as Record<string, string[]> ?? {}), ...(parsed.data.stamps ?? {}) },
  };

  const reflection = await db.weeklyReflection.upsert({
    where: { userId_weekStart: { userId: user.id, weekStart: new Date(weekStart) } },
    create: { userId: user.id, weekStart: new Date(weekStart), ...data },
    update: data,
  });

  return NextResponse.json(reflection);
}
