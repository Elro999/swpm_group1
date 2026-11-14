import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Unit tests live next to the code as `*.test.ts`. E2E tests live in `e2e/` and run with Playwright.
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // `server-only` throws outside a React Server environment; unit tests import server modules directly.
    alias: { "server-only": new URL("./src/test/server-only-stub.ts", import.meta.url).pathname },
  },
});
