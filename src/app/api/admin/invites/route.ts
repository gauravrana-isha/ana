import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveAdmin } from "@/lib/session";
import { newInviteCode } from "@/lib/invites";

export const dynamic = "force-dynamic";

/** Invites, newest first, with how many have used each. */
export async function GET() {
  if (!(await resolveAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const invites = await db.inviteCode.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json(invites);
}

/** A new invite: a note for yourself, how many can use it, and for how long. */
export async function POST(req: NextRequest) {
  const admin = await resolveAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z
    .object({ note: z.string().trim().max(80).optional(), maxUses: z.number().int().min(1).max(1000).nullable(), days: z.number().int().min(1).max(365).nullable() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { note, maxUses, days } = parsed.data;
  for (let tries = 0; tries < 5; tries++) {
    try {
      const invite = await db.inviteCode.create({
        data: { code: newInviteCode(), note: note || null, maxUses, expiresAt: days ? new Date(Date.now() + days * 86400_000) : null, createdById: admin.id },
      });
      return NextResponse.json(invite, { status: 201 });
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e; // a clash of codes: draw again
    }
  }
  return NextResponse.json({ error: "Couldn't make a code. Try again." }, { status: 500 });
}

/** Revoke an invite (people who already joined with it stay). */
export async function PATCH(req: NextRequest) {
  if (!(await resolveAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ id: z.string().max(40), revoke: z.literal(true) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  await db.inviteCode.updateMany({ where: { id: parsed.data.id, revokedAt: null }, data: { revokedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
