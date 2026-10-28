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
