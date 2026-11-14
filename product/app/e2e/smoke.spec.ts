import { expect, test } from "@playwright/test";

// Phase 0 smoke test: the app boots in mock + memory mode, sessions start with no form,
// resume links work, bad links 404, and security headers are present.

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

test("a session starts without a form, is reused, and resumes on another device", async ({ request, browser }) => {
  const first = await request.post("/api/session/start");
  expect(first.status()).toBe(201);
  const { resumePath } = await first.json();
  expect(resumePath).toMatch(/^\/r\/[A-Za-z0-9_-]{43}$/);
  expect(first.headers()["set-cookie"]).toMatch(/ipc_session=.*HttpOnly/i);

  // Same client again: no duplicate session.
  const again = await request.post("/api/session/start");
  expect(again.status()).toBe(200);
  expect((await again.json()).created).toBe(false);

  // "Another device": a fresh browser context with no cookies follows the resume link.
  const other = await browser.newContext();
  const page = await other.newPage();
  await page.goto(resumePath);
  await expect(page).toHaveURL("/");
  const cookies = await other.cookies();
  expect(cookies.find((c) => c.name === "ipc_session")?.httpOnly).toBe(true);
  await other.close();
});

test("an unknown or malformed resume link is a 404", async ({ request }) => {
  expect((await request.get(`/r/${"A".repeat(43)}`, { maxRedirects: 0 })).status()).toBe(404);
  expect((await request.get("/r/not-a-token", { maxRedirects: 0 })).status()).toBe(404);
});
