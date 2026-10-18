import { defineConfig, devices } from "@playwright/test";

/*
 * End-to-end tests (tests/e2e): a production build with its service worker, against its own
 * test database (TEST_DATABASE_URL, which must be on this machine: setup wipes it).
 *
 *   TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:54329/ana_e2e npm run test:e2e
 *
 * The app is opened at ana.localhost: the service worker stays off on plain localhost, and
 * *.localhost counts as a secure origin, so it can run.
 */
const PORT = 3105;
const DB = process.env.TEST_DATABASE_URL ?? "";

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://ana.localhost:${PORT}`,
    ...devices["Pixel 7"],
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 600_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: DB,
      NEXT_DIST_DIR: ".next-e2e",
      AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-secret-not-for-production",
      AUTH_TRUST_HOST: "true",
      ANA_E2E_LOCAL_STORAGE: "1",
    },
  },
});
