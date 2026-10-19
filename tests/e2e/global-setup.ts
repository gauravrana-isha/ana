import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { generateMnemonic, mnemonicToEntropy } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import * as crypto from "../../src/lib/vault/crypto";
import { SESSION_TOKEN, USER_ID, PHRASE_FILE } from "./fixtures";

/*
 * A fresh test database with one member: approved, onboarded, with a journal key set up (the
 * recovery phrase is written for the tests to unlock with) and a session cookie to sign in.
 */
export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Set TEST_DATABASE_URL to a database on this machine (it's wiped).");
  const host = new URL(url).hostname;
  if (!["127.0.0.1", "localhost", "postgres"].includes(host)) throw new Error(`Refusing to wipe a database on ${host}.`);

  execSync("npx prisma db push --force-reset --skip-generate --accept-data-loss", { env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url }, stdio: "inherit" });

  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    const phrase = generateMnemonic(wordlist, 128);
    const journal = crypto.newJournalKey();
    const salt = crypto.randomBytes(16);
    const wrappingKey = await crypto.wrappingKeyFromSecret(new Uint8Array(mnemonicToEntropy(phrase, wordlist)), salt, "ana phrase v1");
    const key = await crypto.importAesKey(journal);
    const now = new Date();
    await db.user.create({
      data: {
        id: USER_ID,
        email: "e2e@example.com",
        name: "Test Member",
        status: "APPROVED",
        role: "ADMIN",
        timeZone: "Asia/Kolkata",
        onboardedAt: now,
        vaultAt: now,
        vaultSealedAt: now,
        vaultCheck: await crypto.sealValue(key, `ana:${USER_ID}`),
        features: { create: ["sadhana", "reflection", "expressions"].map((feature) => ({ feature })) },
        vaultKeys: { create: { kind: "phrase", wrapped: await crypto.wrap(wrappingKey, journal), salt: crypto.toB64(salt) } },
        // Signed up with Google (Access lists only people who have).
        accounts: { create: { type: "oidc", provider: "google", providerAccountId: "e2e-google-id" } },
        sessions: { create: { sessionToken: SESSION_TOKEN, expires: new Date(Date.now() + 7 * 864e5) } },
      },
    });
    mkdirSync(PHRASE_FILE.replace(/\/[^/]+$/, ""), { recursive: true });
    writeFileSync(PHRASE_FILE, phrase);
  } finally {
    await db.$disconnect();
  }
}
