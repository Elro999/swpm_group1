import { expect, test, type Page } from "@playwright/test";
import { installFakeMic } from "./fixtures/fake-mic";

// Phase 2: consented user records an answer (microphone test double) → one follow-up → pinned feedback →
// not useful → retry shows the improved (mock) answer. Mock STT returns a synthetic answer with word timings.

test.beforeEach(async ({ page }) => {
  await installFakeMic(page);
});

async function createInterviewAndConsent(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try with a sample JD" }).click();
  await page.getByRole("button", { name: "Create my questions" }).click();
  await expect(page).toHaveURL(/\/i\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "I agree, let me practise" }).click();
  await expect(page.getByRole("link", { name: "Practise question 1" })).toBeVisible();
}

async function recordFor(page: Page, startName: RegExp, ms = 1200) {
  await page.getByRole("button", { name: startName }).click();
  await expect(page.getByRole("button", { name: /Stop/ })).toBeVisible();
  await page.waitForTimeout(ms);
  await page.getByRole("button", { name: /Stop/ }).click();
  await expect(page.getByLabel("Your recording")).toBeVisible();
}

test("record → follow-up → pinned feedback → not useful → retry", async ({ page }) => {
  await createInterviewAndConsent(page);
  await page.getByRole("link", { name: "Practise question 1" }).click();
  await expect(page).toHaveURL(/\/mock\/[0-9a-f-]{36}$/);

  await page.getByRole("button", { name: "Start practising" }).click();
  await recordFor(page, /Start recording/);
  await page.getByRole("button", { name: "Use this answer" }).click();

  // Exactly one follow-up, quoting the answer.
  await expect(page.getByTestId("followup-question")).toBeVisible();
  await page.getByRole("button", { name: "Skip the follow-up and get feedback" }).click();

  // Feedback: metrics + points, each with a time and a quote that appears in the transcript.
  const feedback = page.getByTestId("feedback");
  await expect(feedback).toBeVisible();
  await expect(page.getByTestId("metrics")).toContainText("Time to your decision");
  const transcript = (await page.getByTestId("transcript").innerText()).replace(/\s+/g, " ").toLowerCase();
  const points = page.getByTestId("point");
  expect(await points.count()).toBeGreaterThanOrEqual(2);
  for (const q of await page.getByTestId("point-quote").allInnerTexts()) {
    expect(transcript).toContain(q.replace(/^“|”$/g, "").replace(/\s+/g, " ").toLowerCase());
  }
  await expect(page.locator("#point-late_decision")).toBeVisible();
  await expect(page.locator("#point-we_not_i")).toBeVisible();
  await expect(points.first().getByRole("button", { name: /Play from \d+:\d{2}/ })).toBeVisible();

  // MF7: mark a point not useful, with a reason.
  await points.first().getByRole("button", { name: "Not useful?" }).click();
  await expect(points.first()).toContainText("Marked not useful.");
  await points.first().getByPlaceholder("Why? (optional)").fill("Not relevant to my role");
  const saved = page.waitForResponse((r) => r.url().includes("/api/points/") && r.request().method() === "POST");
  await points.first().getByRole("button", { name: "Send" }).click();
  expect((await saved).status()).toBe(204);

  // Reload: the feedback (and the rating) persist.
  await page.reload();
  await expect(page.getByTestId("feedback")).toBeVisible();
  await expect(page.getByTestId("point").first()).toContainText("Marked not useful.");

  // Retry: attempt 2, answer the follow-up this time; the mock "improved" answer states the decision first.
  await page.getByRole("button", { name: "Try this question again" }).click();
  await recordFor(page, /Start recording/);
  await page.getByRole("button", { name: "Use this answer" }).click();
  await expect(page.getByTestId("followup-question")).toBeVisible();
  await recordFor(page, /Answer the follow-up/);
  await page.getByRole("button", { name: "Send and get feedback" }).click();
  await expect(page.getByRole("heading", { name: "Feedback · attempt 2" })).toBeVisible();
  await expect(page.locator("#point-late_decision")).toHaveCount(0);
});

test("a blocked microphone shows how to fix it", async ({ page, context }) => {
  await createInterviewAndConsent(page);
  await page.getByRole("link", { name: "Practise question 1" }).click();
  const denied = await context.newPage();
  await installFakeMic(denied, "deny");
  await denied.goto(page.url());
  await denied.getByRole("button", { name: "Start practising" }).click();
  await denied.getByRole("button", { name: /Start recording/ }).click();
  await expect(denied.getByRole("alert").filter({ hasText: "Microphone access is blocked" })).toBeVisible();
  await expect(denied.getByRole("button", { name: /Stop/ })).toHaveCount(0);
});

test("API refuses recording before consent and for someone else's attempt", async ({ page, browser }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try with a sample JD" }).click();
  await page.getByRole("button", { name: "Create my questions" }).click();
  await expect(page).toHaveURL(/\/i\/[0-9a-f-]{36}$/);
  const href = await page.getByRole("link", { name: "Practise question 1" }).count();
  expect(href).toBe(0); // no practise links before consent

  // Find a question id via the hub after consent, then try with a stranger.
  await page.getByRole("button", { name: "I agree, let me practise" }).click();
  const link = await page.getByRole("link", { name: "Practise question 1" }).getAttribute("href");
  const questionId = link!.split("/").at(-1)!;

  const created = await page.request.post("/api/attempts", { data: { questionId } });
  expect(created.status()).toBe(201);
  const attemptId = (await created.json()).id as string;

  const stranger = await browser.newContext();
  await stranger.request.post("/api/session/start");
  expect((await stranger.request.post("/api/attempts", { data: { questionId } })).status()).toBe(403); // no consent
  await stranger.request.post("/api/session/consent");
  expect((await stranger.request.post("/api/attempts", { data: { questionId } })).status()).toBe(404); // not theirs
  expect((await stranger.request.get(`/api/attempts/${attemptId}`)).status()).toBe(404);
  expect((await stranger.request.get(`/api/attempts/${attemptId}/audio?part=answer`)).status()).toBe(404);
  await stranger.close();
});
