import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_JD } from "../src/lib/sample";

// Phase 1: landing → add interview (sample JD) → hub with JD-grounded questions → consent gate → resume.
// Runs in mock AI + memory mode (see playwright.config.ts).

async function createSampleInterview(page: Page): Promise<string> {
  await page.goto("/");
  await page.getByRole("button", { name: "Try with a sample JD" }).click();
  await expect(page).toHaveURL(/\/interviews\/new\?sample=1$/);
  await expect(page.getByLabel(/Job description/)).toHaveValue(SAMPLE_JD);
  await page.getByRole("button", { name: "Create my questions" }).click();
  await expect(page).toHaveURL(/\/i\/[0-9a-f-]{36}$/);
  return page.url();
}

test("sample JD → hub shows 3–5 questions, each quoting the JD verbatim", async ({ page }) => {
  await createSampleInterview(page);
  await expect(page.getByRole("heading", { level: 1, name: "Associate Product Manager, Payments" })).toBeVisible();

  const items = page.getByTestId("question-list").getByRole("listitem");
  const count = await items.count();
  expect(count).toBeGreaterThanOrEqual(3);
  expect(count).toBeLessThanOrEqual(5);

  for (const quote of await page.getByTestId("jd-quote").allInnerTexts()) {
    const inner = quote.replace(/^From the JD: “/, "").replace(/”$/, "");
    expect(SAMPLE_JD.replace(/\s+/g, " ")).toContain(inner.replace(/\s+/g, " "));
  }
});

test("a too-short JD shows a specific message and does not create an interview", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start with my job description" }).click();
  await expect(page).toHaveURL(/\/interviews\/new$/);
  await page.getByLabel(/Job description/).fill("PM role, good pay.");
  await page.getByRole("button", { name: "Create my questions" }).click();
  // Filter by text: Next's route announcer is also role="alert".
  await expect(page.getByRole("alert").filter({ hasText: "at least 150 characters" })).toBeVisible();
  await expect(page).toHaveURL(/\/interviews\/new$/);
});

test("recording controls stay hidden until the user agrees, and consent persists", async ({ page }) => {
  await createSampleInterview(page);
  await expect(page.getByTestId("practice-ready")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "how we handle your data" })).toBeVisible();

  await page.getByRole("button", { name: "I agree, let me practise" }).click();
  await expect(page.getByTestId("practice-ready")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("practice-ready")).toBeVisible();
  await expect(page.getByRole("button", { name: "I agree, let me practise" })).toHaveCount(0);
});

test("another visitor cannot open my interview, but my private link brings it to a new device", async ({ page, browser }) => {
  const hubUrl = await createSampleInterview(page);
  await page.getByText("Continue on another device").click();
  const resumeUrl = await page.getByLabel("Your private link").inputValue();
  expect(resumeUrl).toMatch(/\/r\/[A-Za-z0-9_-]{43}$/);

  const stranger = await browser.newContext();
  const strangerPage = await stranger.newPage();
  await strangerPage.goto(hubUrl);
  await expect(strangerPage.getByText("could not be found")).toBeVisible();
  await expect(strangerPage.getByTestId("question-list")).toHaveCount(0);
  await stranger.close();

  const otherDevice = await browser.newContext();
  const devicePage = await otherDevice.newPage();
  await devicePage.goto(resumeUrl);
  await expect(devicePage.getByRole("heading", { name: "Continue where you left off" })).toBeVisible();
  await devicePage.getByRole("link", { name: /Associate Product Manager, Payments/ }).first().click();
  await expect(devicePage.getByTestId("question-list")).toBeVisible();
  await otherDevice.close();
});

test("privacy page explains storage, processing and retention, marked as a draft", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "How we handle your data" })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("Draft for team review");
  await expect(page.getByText("Audio recordings: deleted after 30 days.")).toBeVisible();
});

test("API: events endpoint only accepts client events and rejects free text", async ({ page }) => {
  await createSampleInterview(page);
  const post = (body: unknown) => page.request.post("/api/events", { data: body });
  expect((await post({ name: "prep_list_viewed", props: {} })).status()).toBe(202);
  expect((await post({ name: "first_feedback_viewed", props: {} })).status()).toBe(400);
  expect((await post({ name: "error_shown", props: { note: "my whole story here" } })).status()).toBe(400);
});
