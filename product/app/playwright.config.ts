import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

// E2E always runs with mock AI and in-memory data, so it needs no keys or accounts.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1, // all specs share one in-memory dev server; serial runs are deterministic
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // The role page's first-visit tour would cover the page in every spec; mark it seen (tour.spec.ts clears it).
    storageState: {
      cookies: [],
      origins: [{ origin: `http://localhost:${PORT}`, localStorage: [{ name: "tour:role-page:v1", value: "done" }] }],
    },
  },
  // Microphone: specs that record install a test double (e2e/fixtures/fake-mic.ts). Chromium's own
  // --use-fake-device-for-media-stream hung on the build machine (sandboxed audio), so it is not relied on.
  // PW_CHROMIUM_PATH: use a preinstalled browser when the bundled build does not match (e.g. a cloud container).
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], ...(process.env.PW_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } } : {}) },
    },
  ],
  // Production build, not `next dev`: dev compiles each route on first request, which made early clicks
  // land before hydration and aborted requests mid-test. A build is deterministic and matches Vercel.
  webServer: {
    command: `npx next build && npx next start --port ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: { AI_MODE: "mock", DATA_MODE: "memory", ADMIN_KEY: "e2e-admin-key-not-secret", SESSION_STARTS_PER_HOUR: "100000" },
  },
});
