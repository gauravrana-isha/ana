import "server-only";
import { z } from "zod";
import { db } from "./db";

/*
 * The server's side of end-to-end encryption: it stores sealed values ("e1:…", made on the
 * person's device) and can't open them. Once someone's journal is locked with their key,
 * writes must arrive sealed; plain text is refused, so a mistake can't leak words to the server.
 */

const SEALED = /^e1:[A-Za-z0-9_-]+$/;

export function isSealed(v: unknown): v is string {
  return typeof v === "string" && SEALED.test(v);
}

/** A sealed value (any JSON, encrypted). */
export const sealed = (max = 100_000) => z.string().max(max).regex(SEALED);

/** Plain (before the journal is locked) or sealed. */
export function plainOrSealed<T extends z.ZodTypeAny>(plain: T, max = 100_000) {
  return z.union([sealed(max), plain]);
}

/** True when something meant to be sealed arrived plain from someone whose journal is locked. */
export function plainLeaks(user: { vaultAt: Date | null }, values: unknown[]) {
  if (!user.vaultAt) return false;
  return values.some((v) => {
    if (v === null || v === undefined || v === "") return false;
    if (Array.isArray(v)) return v.some((x) => !isSealed(x));
    if (typeof v === "object") return Object.values(v as Record<string, unknown>).some((x) => x !== null && x !== undefined && !isSealed(x));
    return !isSealed(v);
  });
}

/** A wrapped journal key, as a device sends it. */
export const NewKey = z.object({
  kind: z.enum(["phrase", "passphrase", "passkey"]),
  label: z.string().max(60).nullable().optional(),
  wrapped: z.string().min(40).max(400),
  salt: z.string().max(64).nullable().optional(),
  iterations: z.number().int().min(100_000).max(10_000_000).nullable().optional(),
  credentialId: z.string().max(1400).nullable().optional(),
});

export const MUST_SEAL = { error: "This needs to be encrypted on your device first. Reload ana and try again." };

/** Whether any of this person's journal is still stored unencrypted (from before the key). */
export async function legacyLeft(userId: string) {
  const [row] = await db.$queryRaw<{ n: bigint }[]>`
    SELECT (
      (SELECT COUNT(*) FROM "Expression" WHERE "userId" = ${userId} AND (("title" <> '' AND "title" NOT LIKE 'e1:%') OR ("body" <> '' AND "body" NOT LIKE 'e1:%') OR ("place" IS NOT NULL AND "place" NOT LIKE 'e1:%') OR ("stamps" IS NOT NULL AND jsonb_typeof("stamps") <> 'string'))) +
      (SELECT COUNT(*) FROM "Person" WHERE "userId" = ${userId} AND (("name" <> '' AND "name" NOT LIKE 'e1:%') OR ("relation" IS NOT NULL AND "relation" NOT LIKE 'e1:%') OR ("howMet" IS NOT NULL AND "howMet" NOT LIKE 'e1:%') OR ("notes" IS NOT NULL AND "notes" NOT LIKE 'e1:%') OR "birthday" IS NOT NULL)) +
      (SELECT COUNT(*) FROM "Practice" WHERE "userId" = ${userId} AND ("name" NOT LIKE 'e1:%' OR jsonb_typeof("fields") <> 'string')) +
      (SELECT COUNT(*) FROM "DayLog" WHERE "userId" = ${userId} AND EXISTS (SELECT 1 FROM jsonb_each("entries") e WHERE jsonb_typeof(e.value) <> 'string')) +
      (SELECT COUNT(*) FROM "DailyReflection" WHERE "userId" = ${userId} AND (EXISTS (SELECT 1 FROM jsonb_each("answers") e WHERE jsonb_typeof(e.value) <> 'string' OR e.value #>> '{}' NOT LIKE 'e1:%') OR EXISTS (SELECT 1 FROM jsonb_each("stamps") e WHERE jsonb_typeof(e.value) <> 'string') OR ("moodKey" IS NOT NULL AND "moodKey" NOT LIKE 'e1:%'))) +
      (SELECT COUNT(*) FROM "WeeklyReflection" WHERE "userId" = ${userId} AND (EXISTS (SELECT 1 FROM jsonb_each("answers") e WHERE jsonb_typeof(e.value) <> 'string' OR e.value #>> '{}' NOT LIKE 'e1:%') OR EXISTS (SELECT 1 FROM jsonb_each("stamps") e WHERE jsonb_typeof(e.value) <> 'string'))) +
      (SELECT COUNT(*) FROM "SevaEntry" WHERE "userId" = ${userId} AND ("s1" NOT LIKE 'e1:%' OR "s2" NOT LIKE 'e1:%' OR "s3" NOT LIKE 'e1:%')) +
      (SELECT COUNT(*) FROM "Commitment" WHERE "userId" = ${userId} AND "body" NOT LIKE 'e1:%') +
      (SELECT COUNT(*) FROM "Portrait" WHERE "userId" = ${userId} AND ("weights" IS NOT NULL AND jsonb_typeof("weights") <> 'string' OR ("bodyNote" IS NOT NULL AND "bodyNote" NOT LIKE 'e1:%') OR ("mindNote" IS NOT NULL AND "mindNote" NOT LIKE 'e1:%') OR ("emotionNote" IS NOT NULL AND "emotionNote" NOT LIKE 'e1:%') OR EXISTS (SELECT 1 FROM unnest("bodyWords" || "mindWords" || "emotionWords") w WHERE w NOT LIKE 'e1:%'))) +
      (SELECT COUNT(*) FROM "Attachment" WHERE "userId" = ${userId} AND NOT "sealed") +
      (SELECT COUNT(*) FROM "User" WHERE "id" = ${userId} AND (("intention" IS NOT NULL AND "intention" NOT LIKE 'e1:%') OR ("place" IS NOT NULL AND "place" NOT LIKE 'e1:%') OR "birthday" IS NOT NULL))
    ) AS n`;
  return Number(row?.n ?? 0);
}
