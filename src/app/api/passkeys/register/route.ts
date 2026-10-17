import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { keepChallenge, relyingParty, takeChallenge } from "@/lib/passkeys";

export const dynamic = "force-dynamic";

/**
 * Making a passkey that can sign in. GET: the options (with a fresh challenge). POST: the new
 * passkey, checked, and its public key kept. Signed in already (Google, or another passkey).
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status === "SUSPENDED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { rpID, secure } = relyingParty(req);
  const existing = await db.passkey.findMany({ where: { userId: user.id }, select: { id: true } });
  const options = await generateRegistrationOptions({
    rpName: "ana",
    rpID,
    userID: user.id,
    userName: user.email ?? user.name ?? "ana",
    userDisplayName: user.name ?? user.email ?? "ana",
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({ id: isoBase64URL.toBuffer(p.id), type: "public-key" as const })),
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
  const res = NextResponse.json(options);
  keepChallenge(res, options.challenge, secure);
  return res;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status === "SUSPENDED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { rpID, origin } = relyingParty(req);
  const res = NextResponse.json({ ok: true });
  const challenge = takeChallenge(req, res);
  const body = (await req.json().catch(() => null)) as { response?: RegistrationResponseJSON } | null;
  if (!challenge || !body?.response) return NextResponse.json({ error: "That took too long. Please try again." }, { status: 400 });

  let verified;
  try {
    verified = await verifyRegistrationResponse({ response: body.response, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true });
  } catch {
    return NextResponse.json({ error: "That passkey couldn't be checked. Please try again." }, { status: 400 });
  }
  if (!verified.verified || !verified.registrationInfo) return NextResponse.json({ error: "That passkey couldn't be checked." }, { status: 400 });
  const { credentialID, credentialPublicKey, counter } = verified.registrationInfo;
  const id = isoBase64URL.fromBuffer(credentialID);
  await db.passkey.upsert({
    where: { id },
    create: { id, userId: user.id, publicKey: isoBase64URL.fromBuffer(credentialPublicKey), counter, transports: body.response.response.transports?.join(",") ?? null },
    update: { userId: user.id, publicKey: isoBase64URL.fromBuffer(credentialPublicKey), counter },
  });
  return res;
}
