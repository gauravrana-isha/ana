import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { NewKey } from "@/lib/sealed";

/** Add a way to unlock (made on an unlocked device). A new recovery phrase replaces the old one. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.vaultAt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = NewKey.extend({ replace: z.array(z.string().max(40)).max(4).optional() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { replace, ...k } = parsed.data;
  if ((await db.vaultKey.count({ where: { userId: user.id } })) >= 12) return NextResponse.json({ error: "That's a lot of keys. Remove one first." }, { status: 400 });
  const [created] = await db.$transaction([
    db.vaultKey.create({ data: { ...k, userId: user.id }, select: { id: true } }),
    ...(replace?.length && k.kind === "phrase" ? [db.vaultKey.deleteMany({ where: { userId: user.id, kind: "phrase", id: { in: replace } } })] : []),
  ]);
  return NextResponse.json(created, { status: 201 });
}

/** Note when a key was last used. */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ id: z.string().max(40) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  await db.vaultKey.updateMany({ where: { id: parsed.data.id, userId: user.id }, data: { lastUsedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

/** Remove a passkey or passphrase. The recovery phrase can only be replaced, never removed. */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ id: z.string().max(40) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const key = await db.vaultKey.findFirst({ where: { id: parsed.data.id, userId: user.id, kind: { not: "phrase" } }, select: { credentialId: true } });
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // A removed passkey stops signing in too.
  await db.$transaction([
    db.vaultKey.deleteMany({ where: { id: parsed.data.id, userId: user.id } }),
    ...(key.credentialId ? [db.passkey.deleteMany({ where: { id: key.credentialId, userId: user.id } })] : []),
  ]);
  return NextResponse.json({ ok: true });
}
