import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_JD } from "../src/lib/sample";

// Phase 5: a user with no stories finds gaps → CV → prompts that point at their CV → answer → a draft story
// in their words fills the gap; the prep list is derived and updates as stories become ready.

const CV = `Business analyst, retail analytics team, 2021–2024
Built a weekly sales dashboard for regional managers
Led a pricing experiment across 40 stores`;
const ANSWER = "The pricing experiment hit a supplier delay in two regions. I decided to move the test to other stores in the same week. The results arrived on time for the quarterly review.";

async function createInterview(page: Page, date?: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try with a sample JD" }).click();
  await expect(page.getByLabel(/Job description/)).toHaveValue(SAMPLE_JD);
  if (date) await page.getByLabel(/Interview date/).fill(date);
  await page.getByRole("button", { name: "Create my questions" }).click();
  await expect(page).toHaveURL(/\/i\/[0-9a-f-]{36}$/);
}

test("no stories → gaps → CV → prompts from the CV → draft story fills the gap", async ({ page }) => {
  await createInterview(page);
  await page.getByRole("button", { name: "Find stories for this role" }).click();
  const gaps = page.getByTestId("gap");
  await expect(gaps.first()).toBeVisible();
  const gapCount = await gaps.count();
  expect(gapCount).toBeGreaterThanOrEqual(4); // every competency is a gap with no stories (G3)

  const first = page.getByTestId("competency").first();
  await first.getByRole("button", { name: "Find a story for this" }).click();
  await first.getByLabel(/Paste your CV or list your past roles/).fill(CV);
  await first.getByRole("button", { name: "Save and show prompts" }).click();

  const prompts = first.getByTestId("gap-prompt");
  await expect(prompts.first()).toBeVisible();
  expect(await prompts.count()).toBeGreaterThanOrEqual(3);
  // Each prompt points at a real line of the CV (quoted inside the prompt).
  for (const text of await prompts.allInnerTexts()) {
    const quoted = text.match(/[“"]([^”"]+)[”"]/)?.[1];
    expect(quoted && CV.includes(quoted)).toBeTruthy();
  }

  await prompts.first().click();
  await first.getByLabel("Your answer, in your own words").fill(ANSWER);
  await first.getByRole("button", { name: "Turn into a draft story" }).click();

  // The gap is filled with a draft story built from the user's own words.
  await expect(first.getByTestId("mapped-story")).toBeVisible();
  await expect(first.getByTestId("mapped-story")).toContainText("Draft, from your answer");
  const reason = (await first.getByText(/Why it fits/).innerText()).replace(/^Why it fits: “/, "").replace(/”$/, "");
  expect(ANSWER).toContain(reason);
  await expect(page.getByTestId("gap")).toHaveCount(gapCount - 1);

  // The draft appears in the story bank, flagged by source, and nothing was added to it.
  await page.goto("/stories");
  const decision = await page.getByTestId("story-card").first().getByTestId("field-decision").locator("q").innerText();
  expect(ANSWER).toContain(decision.trim());
});

test("prep list: 20-minute blocks spread over the days left, updating as stories become ready", async ({ page }) => {
  const inThreeDays = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  await createInterview(page, inThreeDays);
  const hubUrl = page.url();

  // Questions only at first.
  const prep = page.getByTestId("prep-list");
  await expect(prep).toContainText("0 of");
  await expect(prep.getByTestId("prep-item").first()).toContainText("Today · 20 min");
  expect(await prep.getByTestId("prep-item").count()).toBeGreaterThanOrEqual(3);

  // Add a story that matches, match it: a story task appears first.
  await page.getByRole("link", { name: "Add my stories" }).click();
  await page.getByLabel("Paste one or more stories").fill(
    "Our checkout lost small merchants every month. I decided to run discovery interviews with merchants and turned the insights into requirements. Drop-off fell by 18% in one quarter.",
  );
  await page.getByRole("button", { name: "Add to my stories" }).click();
  await expect(page.getByTestId("story-card")).toHaveCount(1);
  await page.goto(hubUrl);
  await page.getByRole("button", { name: "Match my stories to this role" }).click();
  await expect(page.getByTestId("mapped-story").first()).toBeVisible();
  await expect(prep.getByTestId("prep-item").first()).toContainText("Rehearse your story");

  // Mark it ready: the story task disappears and progress goes up (PL2).
  await page.goto("/stories");
  await page.getByRole("button", { name: "Mark ready" }).click();
  await expect(page.getByTestId("story-state")).toHaveText("Ready");
  await page.goto(hubUrl);
  await expect(prep.getByTestId("prep-item").filter({ hasText: "Rehearse your story" })).toHaveCount(0);
  await expect(page.getByTestId("prep-progress")).toContainText("1 of");
});
