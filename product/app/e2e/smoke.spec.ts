import { expect, test } from "@playwright/test";

// Phase 0 smoke test: the app boots in mock + memory mode, sessions start with no form,
// the same browser reuses its session, and security headers are present.

test("health reports mock AI and in-memory data", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  expect(await res.json()).toMatchObject({ ok: true, aiMode: "mock", dataMode: "memory" });
});

test("home page renders with security headers", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Interview Prep Companion" })).toBeVisible();
});

test("a session starts without a form and is reused by the same browser", async ({ request }) => {
  const first = await request.post("/api/session/start");
  expect(first.status()).toBe(201);
  expect(await first.json()).toEqual({ created: true }); // the token is never returned in the body
  expect(first.headers()["set-cookie"]).toMatch(/ipc_session=.*HttpOnly/i);

  // Same client again: no duplicate session.
  const again = await request.post("/api/session/start");
  expect(again.status()).toBe(200);
  expect(await again.json()).toEqual({ created: false });
});

test("there is no resume-link route in v1", async ({ request }) => {
  expect((await request.get(`/r/${"A".repeat(43)}`, { maxRedirects: 0 })).status()).toBe(404);
});
