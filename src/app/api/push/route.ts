import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { pushConfigured } from "@/lib/push";

const Subscribe = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(2000),
    keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  }),
  timeZone: z.string().max(64).optional(),
});

/** How many devices this person has turned notifications on for. */
export async function GET() {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const devices = await db.pushSubscription.count({ where: { userId: user.id } });
  return NextResponse.json({ configured: pushConfigured(), devices });
}

/** Remember this device. An endpoint belongs to one person: signing in as someone else moves it. */
export async function POST(req: NextRequest) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!pushConfigured()) return NextResponse.json({ error: "Notifications aren't set up on this server yet" }, { status: 503 });
  const parsed = Subscribe.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad subscription" }, { status: 400 });
  const { subscription: s, timeZone } = parsed.data;
  const data = { userId: user.id, p256dh: s.keys.p256dh, auth: s.keys.auth, userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null };
  try {
    await db.pushSubscription.upsert({ where: { endpoint: s.endpoint }, create: { endpoint: s.endpoint, ...data }, update: data });
  } catch {
    // Two saves of the same device at once (turning on + the freshness check): the other one created it.
    await db.pushSubscription.update({ where: { endpoint: s.endpoint }, data });
  }
  if (timeZone && isZone(timeZone)) await db.user.update({ where: { id: user.id }, data: { timeZone } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ endpoint: z.string().max(2000) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  await db.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint, userId: user.id } });
  return NextResponse.json({ ok: true });
}

function isZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
