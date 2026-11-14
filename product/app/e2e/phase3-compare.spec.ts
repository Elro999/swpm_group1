import { expect, test, type Page } from "@playwright/test";
import { installFakeMic } from "./fixtures/fake-mic";

// Phase 3: two attempts at one question → compare page shows the same checks side by side, what was fixed,
// what is still there. Mock STT: attempt 1 states the decision late with lots of "we"; attempt 2 leads with it.

test.beforeEach(async ({ page }) => {
  await installFakeMic(page);
});

async function answerOnce(page: Page) {
  await page.getByRole("button", { name: /Start recording/ }).click();
  await page.getByRole("button", { name: /Stop/ }).click();
  await page.getByRole("button", { name: "Use this answer" }).click();
  await page.getByRole("button", { name: "Skip the follow-up and get feedback" }).click();
  await expect(page.getByTestId("feedback")).toBeVisible();
}

test("retry → compare shows before vs after on the same checks", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try with a sample JD" }).click();
  await page.getByRole("button", { name: "Create my questions" }).click();
  await page.getByRole("button", { name: "I agree, let me practise" }).click();
  await page.getByRole("link", { name: "Practise question 1" }).click();
  await expect(page).toHaveURL(/\/mock\/[0-9a-f-]{36}$/); // wait for navigation before reading the URL
  const practiceUrl = page.url();

  // Compare before a second attempt exists: a clear message, no table.
  await page.goto(`${practiceUrl}/compare`);
  await expect(page.getByText("Answer this question at least twice to compare attempts.")).toBeVisible();
  await page.goto(practiceUrl);

  await page.getByRole("button", { name: "Start practising" }).click();
  await answerOnce(page);
  await expect(page.getByRole("link", { name: /Compare with attempt/ })).toHaveCount(0); // only one attempt yet

  await page.getByRole("button", { name: "Try this question again" }).click();
  await answerOnce(page);
  await page.getByRole("link", { name: "Compare with attempt 1" }).click();
  await expect(page).toHaveURL(/\/compare$/);

  await expect(page.getByTestId("compare-summary")).toContainText("Attempt 1 → attempt 2");
  await expect(page.getByTestId("compare-summary")).toContainText(/You fixed \d+ of \d+ issue/);
  await expect(page.getByTestId("metric-timeToDecision")).toContainText("Better");
  await expect(page.getByTestId("metric-ownership")).toContainText("Better");
  await expect(page.getByTestId("resolved-late_decision")).toBeVisible();
  await expect(page.getByTestId("resolved-we_not_i")).toBeVisible();

  // Every check appears for both attempts (G6: same checks).
  const rows = page.getByTestId("compare-table").locator("tbody tr");
  expect(await rows.count()).toBe(5);

  // A third attempt adds a pair picker; an invalid ?from falls back to the previous attempt.
  await page.getByRole("link", { name: "Practise again" }).click();
  await page.getByRole("button", { name: "Try this question again" }).click();
  await answerOnce(page);
  await page.goto(`${practiceUrl}/compare?from=9&to=3`);
  await expect(page.getByTestId("compare-summary")).toContainText("Attempt 2 → attempt 3");
  await page.getByRole("link", { name: "1 → 2" }).click();
  await expect(page.getByTestId("compare-summary")).toContainText("Attempt 1 → attempt 2");
});

test("another visitor cannot open my comparison", async ({ page, browser }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try with a sample JD" }).click();
  await page.getByRole("button", { name: "Create my questions" }).click();
  await page.getByRole("button", { name: "I agree, let me practise" }).click();
  await page.getByRole("link", { name: "Practise question 1" }).click();
  await expect(page).toHaveURL(/\/mock\/[0-9a-f-]{36}$/);
  const compareUrl = `${page.url()}/compare`;
  // Sanity check: the owner can open it (so the stranger's 404 below means "not yours", not "no such page").
  await page.goto(compareUrl);
  await expect(page.getByRole("heading", { name: "Before vs after" })).toBeVisible();

  const stranger = await browser.newContext();
  const sp = await stranger.newPage();
  await sp.goto(compareUrl);
  await expect(sp.getByText("could not be found")).toBeVisible();
  await expect(sp.getByRole("heading", { name: "Before vs after" })).toHaveCount(0);
  await stranger.close();
});
