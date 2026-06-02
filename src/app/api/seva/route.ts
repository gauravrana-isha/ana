import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";

const CreateSchema = z.object({
  s1: z.string().max(2000),
  s2: z.string().max(2000),
  s3: z.string().max(2000),
});

export async function GET() {
  const user = await resolveUser();
  if (!user) return NextResponse.json([]);

  const entries = await db.sevaEntry.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!parsed.data.s1.trim() && !parsed.data.s2.trim() && !parsed.data.s3.trim()) {
    return NextResponse.json({ error: "At least one answer required" }, { status: 400 });
  }

  const entry = await db.sevaEntry.create({
    data: {
      userId: user.id,
      date: new Date(),
      s1: parsed.data.s1,
      s2: parsed.data.s2,
      s3: parsed.data.s3,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
