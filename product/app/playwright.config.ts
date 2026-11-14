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
  },
  // Microphone: specs that record install a test double (e2e/fixtures/fake-mic.ts). Chromium's own
  // --use-fake-device-for-media-stream hung on the build machine (sandboxed audio), so it is not relied on.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Production build, not `next dev`: dev compiles each route on first request, which made early clicks
  // land before hydration and aborted requests mid-test. A build is deterministic and matches Vercel.
  webServer: {
    command: `npx next build && npx next start --port ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: { AI_MODE: "mock", DATA_MODE: "memory", ADMIN_KEY: "e2e-admin-key-not-secret" },
  },
});
