import { allow } from "@/lib/ratelimit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { NewKey, isSealed, legacyLeft } from "@/lib/sealed";

export const dynamic = "force-dynamic";

const keyFields = {
  id: true,
  kind: true,
  label: true,
  wrapped: true,
  salt: true,
  iterations: true,
  credentialId: true,
  createdAt: true,
  lastUsedAt: true,
} as const;

/** The journal's lock: whether it's set, its check value, and the wrapped keys (useless without the secret). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.status === "SUSPENDED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [keys, signIns] = await Promise.all([
    db.vaultKey.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" }, select: keyFields }),
    db.passkey.findMany({ where: { userId: user.id }, select: { id: true } }),
  ]);
  const canSignIn = new Set(signIns.map((p) => p.id));
  return NextResponse.json({
    set: !!user.vaultAt,
    check: user.vaultCheck,
    // Passkeys made before passkey sign-in only unlock; the others sign in too.
    keys: keys.map((k) => ({ ...k, signsIn: !!k.credentialId && canSignIn.has(k.credentialId) })),
    // Every passkey that still does something here (signs in or unlocks), so a device can drop the rest.
    passkeys: [...new Set([...canSignIn, ...keys.flatMap((k) => (k.credentialId ? [k.credentialId] : []))])],
    legacy: user.vaultAt ? (await legacyLeft(user.id)) > 0 : false,
  });
}

/** Lock the journal with a new key: a recovery phrase, and optionally a passkey and a passphrase. Once. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status === "SUSPENDED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await allow(`vault-setup:${user.id}`, 10))) return NextResponse.json({ error: "Too many tries. Wait a minute and try again." }, { status: 429 });
  const parsed = z.object({ check: z.string().max(400), keys: z.array(NewKey).min(1).max(4) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSealed(parsed.data.check)) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  if (!parsed.data.keys.some((k) => k.kind === "phrase")) return NextResponse.json({ error: "A recovery phrase is needed" }, { status: 400 });

  // Only the first set-up counts; a second device racing the first can't replace the key.
  const claimed = await db.user.updateMany({ where: { id: user.id, vaultAt: null }, data: { vaultAt: new Date(), vaultCheck: parsed.data.check } });
  if (!claimed.count) return NextResponse.json({ error: "Your journal already has a key. Unlock it instead." }, { status: 409 });
  await db.vaultKey.createMany({ data: parsed.data.keys.map((k) => ({ ...k, userId: user.id })) });
  return NextResponse.json({ ok: true }, { status: 201 });
}
