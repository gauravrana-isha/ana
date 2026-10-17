import { allow } from "@/lib/ratelimit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
const LIFE_MS = 10 * 60 * 1000;

/** A new device asks to be let in: it leaves its public key here for an unlocked device to answer. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.vaultAt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await allow(`vault-link:${user.id}`, 10))) return NextResponse.json({ error: "Too many tries. Wait a minute and try again." }, { status: 429 });
  const parsed = z.object({ publicKey: z.string().min(80).max(120) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const now = new Date();
  await db.vaultLink.deleteMany({ where: { userId: user.id, expiresAt: { lt: now } } });
  if ((await db.vaultLink.count({ where: { userId: user.id } })) >= 5) {
    return NextResponse.json({ error: "Too many devices are waiting. Try again in a few minutes." }, { status: 429 });
  }
  const link = await db.vaultLink.create({
    data: { userId: user.id, publicKey: parsed.data.publicKey, expiresAt: new Date(now.getTime() + LIFE_MS) },
    select: { id: true },
  });
  return NextResponse.json(link, { status: 201 });
}

/** Devices waiting to be let in (for an unlocked device to match against the code shown). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user?.vaultAt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requests = await db.vaultLink.findMany({
    where: { userId: user.id, response: null, expiresAt: { gt: new Date() } },
    select: { id: true, publicKey: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ requests });
}
