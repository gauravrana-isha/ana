import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { READ_KEEP_MS } from "@/lib/notify";

/** The bell: what hasn't ended yet, newest first. */
export async function GET() {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ items: [], unread: 0 });
  const now = new Date();
  const where = {
    userId: user.id,
    expiresAt: { gt: now },
    OR: [{ readAt: null }, { readAt: { gt: new Date(now.getTime() - READ_KEEP_MS) } }],
  };
  const [items, unread] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, kind: true, title: true, body: true, url: true, readAt: true, createdAt: true },
    }),
    db.notification.count({ where: { ...where, readAt: null } }),
  ]);
  return NextResponse.json({ items, unread });
}

/** Mark some (or all) as read. */
export async function POST(req: NextRequest) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z
    .union([z.object({ ids: z.array(z.string().max(40)).min(1).max(100) }), z.object({ all: z.literal(true) })])
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const r = await db.notification.updateMany({
    where: { userId: user.id, readAt: null, ...("ids" in parsed.data ? { id: { in: parsed.data.ids } } : {}) },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true, updated: r.count });
}
