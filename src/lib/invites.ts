import "server-only";
import { randomInt } from "node:crypto";
import { db } from "./db";

/*
 * Invites: an admin shares a link (/join/CODE); whoever signs up with it is let in as
 * soon as they finish onboarding, without waiting for approval. A code can be limited
 * in uses and time, and revoked.
 */

export const INVITE_COOKIE = "ana-invite";
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

export function newInviteCode() {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

export function normaliseInvite(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
}

/** The invite if it can still be used. */
export async function usableInvite(code: string) {
  const row = await db.inviteCode.findUnique({ where: { code: normaliseInvite(code) } });
  if (!row || row.revokedAt || (row.expiresAt && row.expiresAt < new Date()) || (row.maxUses !== null && row.uses >= row.maxUses)) return null;
  return row;
}

/**
 * Use an invite for this person: one use is taken (only while uses remain), and they're let
 * in. Returns true if it worked.
 */
export async function claimInvite(userId: string, code: string) {
  const rows = await db.$queryRaw<{ id: string; createdById: string }[]>`
    UPDATE "InviteCode" SET uses = uses + 1
    WHERE code = ${normaliseInvite(code)} AND "revokedAt" IS NULL
      AND ("expiresAt" IS NULL OR "expiresAt" > now())
      AND ("maxUses" IS NULL OR uses < "maxUses")
    RETURNING id, "createdById"`;
  const invite = rows[0];
  if (!invite) return false;
  await db.user.update({
    where: { id: userId },
    data: { status: "APPROVED", approvedAt: new Date(), approvedById: invite.createdById, inviteCodeId: invite.id },
  });
  return true;
}
