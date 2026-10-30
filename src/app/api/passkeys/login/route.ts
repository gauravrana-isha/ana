import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";
import { db } from "@/lib/db";
import { allow } from "@/lib/ratelimit";
import { keepChallenge, relyingParty, startSession, takeChallenge } from "@/lib/passkeys";

export const dynamic = "force-dynamic";

/** Signing in with a passkey. GET: a fresh challenge (any of your passkeys can answer it). */
export async function GET(req: NextRequest) {
  const { rpID, secure } = relyingParty(req);
  const options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
  const res = NextResponse.json(options);
  keepChallenge(res, options.challenge, secure);
  return res;
}

/** POST: the signed answer. If it checks out against the passkey's public key, you're signed in. */
export async function POST(req: NextRequest) {
  const { rpID, origin, secure } = relyingParty(req);
  const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
  // Sign-in attempts per device, so a passkey can't be guessed at.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await allow(`passkey-login:${ip}`, 20))) return fail("Too many tries. Wait a minute and try again.", 429);
  const probe = NextResponse.json({});
  const challenge = takeChallenge(req, probe);
  const body = (await req.json().catch(() => null)) as { response?: AuthenticationResponseJSON } | null;
  if (!challenge || !body?.response) return fail("That took too long. Please try again.");

  const passkey = await db.passkey.findUnique({ where: { id: body.response.id }, include: { user: { select: { id: true, status: true } } } });
  if (!passkey) {
    // Either a passkey from before passkey sign-in (it still unlocks), or one ana no longer
    // knows (removed, or after Start over) that the phone keeps offering.
    const unlocks = await db.vaultKey.findFirst({ where: { credentialId: body.response.id }, select: { id: true } });
    return unlocks
      ? NextResponse.json({ error: "This passkey unlocks your journal but can't sign you in yet. Continue with Google, unlock with it, then tap Use to sign in beside it in Profile → Privacy & keys.", code: "unlock-only" }, { status: 404 })
      : NextResponse.json({ error: "This passkey was removed from ana, so it can't sign you in. Continue with Google, then add a new passkey in Profile → Privacy & keys.", code: "unknown" }, { status: 404 });
  }
  if (passkey.user.status === "SUSPENDED") return fail("Your access is paused.", 403);

  let verified;
  try {
    verified = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      authenticator: { credentialID: isoBase64URL.toBuffer(passkey.id), credentialPublicKey: isoBase64URL.toBuffer(passkey.publicKey), counter: passkey.counter },
    });
  } catch {
    return fail("That passkey couldn't be checked. Please try again.");
  }
  if (!verified.verified) return fail("That passkey couldn't be checked.");

  await db.passkey.update({ where: { id: passkey.id }, data: { counter: verified.authenticationInfo.newCounter, lastUsedAt: new Date() } });
  const res = NextResponse.json({ ok: true, userId: passkey.userId });
  res.cookies.set("ana-webauthn", "", { path: "/api/passkeys", maxAge: 0 });
  await startSession(res, passkey.userId, secure);
  return res;
}
