import { expect, test, type Page } from "@playwright/test";
import { installFakeMic } from "./fixtures/fake-mic";

// Phase 6: team review (admin key → metrics + review queue + one session's transcript, quotes and flags)
// and "Delete my data" (recordings and rows gone; private link stops working).
// ADMIN_KEY for E2E is set in playwright.config.ts.

const ADMIN_KEY = "e2e-admin-key-not-secret";

async function practiseAndFlag(page: Page) {
  await installFakeMic(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Try with a sample JD" }).click();
  await page.getByRole("button", { name: "Create my questions" }).click();
  await page.getByRole("button", { name: "I agree, let me practise" }).click();
  await page.getByRole("link", { name: "Practise question 1" }).click();
  await page.getByRole("button", { name: "Start practising" }).click();
  await page.getByRole("button", { name: /Start recording/ }).click();
  await page.getByRole("button", { name: /Stop/ }).click();
  await page.getByRole("button", { name: "Use this answer" }).click();
  await page.getByRole("button", { name: "Skip the follow-up and get feedback" }).click();
  const point = page.getByTestId("point").first();
  await point.getByRole("button", { name: "Not useful?" }).click();
  await point.getByPlaceholder("Why? (optional)").fill("Points at the wrong sentence");
  const saved = page.waitForResponse((r) => r.url().includes("/api/points/") && r.request().method() === "POST");
  await point.getByRole("button", { name: "Send" }).click();
  await saved;
}

test("admin: locked without the key; with it, metrics and a reviewable session", async ({ page, browser, request }) => {
  await practiseAndFlag(page);

  // Locked: API 401 and a key form on the page.
  expect((await request.get("/api/admin/metrics")).status()).toBe(401);
  const admin = await browser.newContext();
  const ap = await admin.newPage();
  await ap.goto("/admin");
  await ap.getByLabel("Team key").fill("wrong-key-wrong-key");
  await ap.getByRole("button", { name: "Open the review page" }).click();
  await expect(ap.getByRole("alert").filter({ hasText: "That key is not right." })).toBeVisible();

  await ap.getByLabel("Team key").fill(ADMIN_KEY);
  await ap.getByRole("button", { name: "Open the review page" }).click();
  await expect(ap.getByTestId("admin-metrics")).toBeVisible();
  expect(await ap.getByTestId("admin-metrics").locator("tbody tr").count()).toBe(6);
  await expect(ap.getByTestId("admin-metric-first_feedback_5min")).toContainText(/\d+ \/ \d+/);
  expect((await ap.request.get("/api/admin/metrics")).status()).toBe(200);

  // Newest session first: the one we just created. Its transcript, quotes and the not-useful reason are visible.
  await ap.getByTestId("admin-sessions").getByRole("link").first().click();
  await expect(ap.getByTestId("review-transcript").first()).toBeVisible();
  const transcript = (await ap.getByTestId("review-transcript").first().innerText()).toLowerCase();
  const points = ap.getByTestId("review-point");
  expect(await points.count()).toBeGreaterThan(0);
  for (const q of await points.locator("blockquote").allInnerTexts()) {
    expect(transcript).toContain(q.replace(/^“|”$/g, "").toLowerCase());
  }
  await expect(ap.getByTestId("review-not-useful").first()).toContainText("Points at the wrong sentence");

  // Sign out → locked again.
  await ap.goto("/admin");
  await ap.getByRole("button", { name: "Sign out of admin" }).click();
  await expect(ap.getByLabel("Team key")).toBeVisible();
  expect((await ap.request.get("/api/admin/metrics")).status()).toBe(401);
  await admin.close();
});

test("delete my data: two-step confirm, everything gone, private link stops working", async ({ page }) => {
  await practiseAndFlag(page);
  const practiceUrl = page.url();
  const hubUrl = practiceUrl.replace(/\/mock\/.*$/, "");
  await page.goto(hubUrl);
  await page.getByText("Continue on another device").click();
  const resumeUrl = await page.getByLabel("Your private link").inputValue();

  await page.goto("/privacy");
  await expect(page.getByText("A member of our small student team may read your transcripts")).toBeVisible();
  await page.getByRole("button", { name: "Delete my data" }).click();
  await page.getByRole("button", { name: "Keep my data" }).click(); // cancel works
  await page.getByRole("button", { name: "Delete my data" }).click();
  await page.getByRole("button", { name: "Yes, delete everything" }).click();
  await expect(page.getByTestId("data-deleted")).toBeVisible();

  // The resume link no longer works, and the old pages show nothing.
  const res = await page.request.get(resumeUrl, { maxRedirects: 0 });
  expect(res.status()).toBe(404);
  await page.goto(hubUrl);
  await expect(page.getByText("could not be found")).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Continue where you left off" })).toHaveCount(0);
});
