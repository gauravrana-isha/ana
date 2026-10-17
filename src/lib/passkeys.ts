import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "./db";

/*
 * Signing in with a passkey (WebAuthn). The challenge lives in a short-lived, signed,
 * http-only cookie (no table); a successful sign-in makes the same database session that
 * Google sign-in makes, so the rest of the app can't tell the difference.
 */

const CHALLENGE_COOKIE = "ana-webauthn";
const CHALLENGE_LIFE_MS = 5 * 60 * 1000;
const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

/** The site's relying-party id (its host name) and origin, from the request. */
export function relyingParty(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  return { rpID: host.split(":")[0], origin: `${proto}://${host}`, secure: proto === "https" };
}

export function keepChallenge(res: NextResponse, challenge: string, secure: boolean) {
  const exp = Date.now() + CHALLENGE_LIFE_MS;
  const value = `${challenge}.${exp}`;
  res.cookies.set(CHALLENGE_COOKIE, `${value}.${sign(value)}`, { httpOnly: true, secure, sameSite: "strict", path: "/api/passkeys", maxAge: CHALLENGE_LIFE_MS / 1000 });
}

/** The challenge this browser was given, if it's genuine and fresh. Used once. */
export function takeChallenge(req: NextRequest, res: NextResponse): string | null {
  const raw = req.cookies.get(CHALLENGE_COOKIE)?.value;
  res.cookies.set(CHALLENGE_COOKIE, "", { path: "/api/passkeys", maxAge: 0 });
  if (!raw) return null;
  const at = raw.lastIndexOf(".");
  const value = raw.slice(0, at);
  const mac = Buffer.from(raw.slice(at + 1));
  const want = Buffer.from(sign(value));
  if (mac.length !== want.length || !timingSafeEqual(mac, want)) return null;
  const [challenge, exp] = value.split(".");
  return Number(exp) > Date.now() ? challenge : null;
}

/** Start a session for this person, exactly as Auth.js does for Google sign-in. */
export async function startSession(res: NextResponse, userId: string, secure: boolean) {
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_MAX_AGE_S * 1000);
  await db.session.create({ data: { sessionToken, userId, expires } });
  res.cookies.set(secure ? "__Secure-authjs.session-token" : "authjs.session-token", sessionToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires,
  });
}
