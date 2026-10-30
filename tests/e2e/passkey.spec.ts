import { PrismaClient } from "@prisma/client";
import type { Page } from "@playwright/test";
import { test, expect, USER_ID } from "./fixtures";

/*
 * A passkey is only kept for signing in once it can also unlock the journal: otherwise it would
 * sign someone in to a journal it can't open.
 */

async function authenticator(page: Page, hasPrf: boolean) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true, hasPrf },
  });
}

async function counts() {
  const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
  const [signIn, unlock] = await Promise.all([db.passkey.count({ where: { userId: USER_ID } }), db.vaultKey.count({ where: { userId: USER_ID, kind: "passkey" } })]);
  await db.passkey.deleteMany({ where: { userId: USER_ID } });
  await db.vaultKey.deleteMany({ where: { userId: USER_ID, kind: "passkey" } });
  await db.$disconnect();
  return { signIn, unlock };
}

test("a passkey that can hold the key is added for both signing in and unlocking", async ({ page }) => {
  await authenticator(page, true);
  await page.goto("/profile/privacy");
  await page.getByRole("button", { name: "Add a passkey" }).click();
  await expect(page.getByText("Passkey added")).toBeVisible();
  expect(await counts()).toEqual({ signIn: 1, unlock: 1 });
});

test("a passkey whose secret never comes (the second prompt dismissed) isn't kept for signing in", async ({ page }) => {
  await authenticator(page, true);
  // Says it can hold the key, but gives no secret when made, and the prompt asking for it is dismissed.
  await page.addInitScript(() => {
    const create = navigator.credentials.create.bind(navigator.credentials);
    navigator.credentials.create = async (o) => {
      const cred = (await create(o)) as PublicKeyCredential;
      cred.getClientExtensionResults = () => ({ prf: { enabled: true } }) as AuthenticationExtensionsClientOutputs;
      return cred;
    };
    navigator.credentials.get = () => Promise.reject(new DOMException("dismissed", "NotAllowedError"));
  });
  await page.goto("/profile/privacy");
  await page.getByRole("button", { name: "Add a passkey" }).click();
  await expect(page.getByText("No passkey was made.")).toBeVisible();
  expect(await counts()).toEqual({ signIn: 0, unlock: 0 });
});

test("a passkey ana no longer knows says why, and the device is told to stop offering it", async ({ page }) => {
  await authenticator(page, true);
  // Record what the passkey manager is told (the Signal API), across reloads.
  await page.addInitScript(() => {
    const keep = (kind: string, o: unknown) => {
      localStorage.setItem("test:signals", JSON.stringify([...JSON.parse(localStorage.getItem("test:signals") ?? "[]"), [kind, o]]));
    };
    for (const [name, kind] of [["signalUnknownCredential", "unknown"], ["signalAllAcceptedCredentials", "accepted"]])
      Object.defineProperty(PublicKeyCredential, name, { configurable: true, writable: true, value: async (o: unknown) => keep(kind, o) });
  });
  // Signing in (the fixture) already told the device once today; let it tell again.
  await page.evaluate(() => localStorage.removeItem("ana:passkeys-tidied"));
  const signals = () => page.evaluate(() => JSON.parse(localStorage.getItem("test:signals") ?? "[]") as [string, { allAcceptedCredentialIds?: string[]; userId?: string }][]);
  await page.goto("/profile/privacy");
  // Opening the journal tells the device which passkeys still work (none yet).
  await expect.poll(async () => (await signals()).find((s) => s[0] === "accepted")?.[1]).toEqual({ rpId: "ana.localhost", userId: Buffer.from(USER_ID).toString("base64url"), allAcceptedCredentialIds: [] });
  await page.getByRole("button", { name: "Add a passkey" }).click();
  await expect(page.getByText("Passkey added")).toBeVisible();

  const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
  try {
    // A passkey from before passkey sign-in: it unlocks, but has no sign-in record.
    await db.passkey.deleteMany({ where: { userId: USER_ID } });
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in with passkey" }).click();
    await expect(page.getByText("This passkey unlocks your journal but can't sign you in yet.")).toBeVisible();

    // Removed altogether (or wiped by Start over): the device is asked to forget it.
    await db.vaultKey.deleteMany({ where: { userId: USER_ID, kind: "passkey" } });
    await page.getByRole("button", { name: "Sign in with passkey" }).click();
    await expect(page.getByText("This passkey was removed from ana")).toBeVisible();
    expect((await signals()).some((s) => s[0] === "unknown")).toBe(true);
  } finally {
    await db.passkey.deleteMany({ where: { userId: USER_ID } });
    await db.vaultKey.deleteMany({ where: { userId: USER_ID, kind: "passkey" } });
    await db.$disconnect();
  }
});
