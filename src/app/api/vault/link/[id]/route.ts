import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** The new device waits here for its answer. */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const link = await db.vaultLink.findFirst({ where: { id, userId: user.id, expiresAt: { gt: new Date() } }, select: { response: true } });
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(link);
}

/** The unlocked device answers: the journal key, wrapped for the new device's key only. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = z.object({ response: z.string().max(1000) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const done = await db.vaultLink.updateMany({ where: { id, userId: user.id, response: null, expiresAt: { gt: new Date() } }, data: { response: parsed.data.response } });
  if (!done.count) return NextResponse.json({ error: "That request has ended." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.vaultLink.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
