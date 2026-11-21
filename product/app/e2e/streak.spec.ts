import { expect, test } from "@playwright/test";
import { installFakeMic } from "./fixtures/fake-mic";

// Prep streak: adding an interview starts the streak (any prep action counts); watching feedback shows the
// "streak kept" confirmation; the header chip and the hub card agree. Rest days and revives are unit-tested
// (src/modules/streak/streak.test.ts) because they need several calendar days.

test.beforeEach(async ({ page }) => {
  await installFakeMic(page);
});

test("adding an interview starts the streak; feedback confirms the day", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try with a sample JD" }).click();
  await page.getByRole("button", { name: "Create my questions" }).click();
  await expect(page).toHaveURL(/\/i\/[0-9a-f-]{36}$/);
  const hubUrl = page.url();

  const card = page.getByTestId("streak-card");
  await expect(card).toHaveAttribute("data-status", "active_today");
  await expect(card.getByRole("heading", { name: "1-day streak" })).toBeVisible();
  await expect(card).toContainText("Today counts.");
  await expect(card.getByTestId("streak-rest")).toHaveText("1 rest day left this week");
  await expect(card.getByTestId("streak-week")).toHaveText("This week: 1 prep day · 0 practice reps");
  await expect(page.getByTestId("streak-chip")).toHaveText("1");
  await expect(page.getByTestId("streak-chip")).toHaveAttribute("aria-label", "Prep streak: 1 day, today counts");

  // Practise one question to feedback: the confirmation appears and the rep is counted.
  await page.getByRole("button", { name: "I agree, let me practise" }).click();
  await page.getByRole("link", { name: "Practise question 1" }).click();
  await page.getByRole("button", { name: "Start practising" }).click();
  await page.getByRole("button", { name: /Start recording/ }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /Stop/ }).click();
  await page.getByRole("button", { name: "Use this answer" }).click();
  await page.getByRole("button", { name: "Skip the follow-up and get feedback" }).click();
  await expect(page.getByTestId("feedback")).toBeVisible();
  await expect(page.getByTestId("streak-toast")).toHaveText("Day 1. Your prep streak has started.");

  await page.goto(hubUrl);
  await expect(page.getByTestId("streak-week")).toHaveText("This week: 1 prep day · 1 practice rep");
});

test("a new visitor sees no streak chip", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/privacy");
  await expect(page.getByRole("link", { name: "My stories" })).toBeVisible();
  await expect(page.getByTestId("streak-chip")).toHaveCount(0);
});
