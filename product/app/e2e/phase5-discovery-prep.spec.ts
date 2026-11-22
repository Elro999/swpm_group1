import { expect, test, type Page } from "@playwright/test";
import { addStory } from "./fixtures/stories";
import { SAMPLE_JD } from "../src/lib/sample";

// Phase 5 (role page cards since 2026-11-22, design/01): every question card shows prompts from the user's CV;
// "Build story" opens My stories with a guide and links the story back when it fits; the prep list is derived
// and updates as stories become ready.

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

test("cards: CV prompts on every question, Build story → guided My stories → linked back to the question", async ({ page }) => {
  await createInterview(page);
  const hubUrl = page.url();
  const cards = page.getByTestId("question-card");
  // No CV, no stories: every card is a gap with a way to write a story.
  await expect(cards.first().getByTestId("gap")).toBeVisible();
  await expect(page.getByTestId("story-strip")).toContainText("No saved stories yet");

  // Add a CV from the strip: every card gets prompts quoting real CV lines, with no extra click.
  await page.getByText("Add your CV to see lines from it on each question").click();
  await page.getByLabel("Your CV or past roles (pasted text)").fill(CV);
  await page.getByRole("button", { name: "Save CV" }).click();
  const first = cards.first();
  await expect(first.getByTestId("cv-prompt").first()).toBeVisible();
  await expect(first.getByTestId("card-status")).toHaveText(/from your CV/);
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    const prompt = cards.nth(i).getByTestId("cv-prompt").first();
    const quoted = (await prompt.innerText()).match(/[“"]([^”"]+)[”"]/)?.[1];
    expect(quoted && CV.includes(quoted)).toBeTruthy();
  }

  // Build story → My stories with the guide; the CV line starts the story; the URL holds IDs only.
  await first.getByRole("link", { name: /Build a story for question 1/ }).first().click();
  await expect(page).toHaveURL(/\/stories\?from=[0-9a-f-]{36}&q=[0-9a-f-]{36}&prompt=[0-9a-f-]{36}$/);
  const guide = page.getByTestId("build-guide");
  await expect(guide).toContainText("Building a story for Q1");
  await expect(guide).toContainText("Situation:");
  await expect(guide).toContainText("Task:");
  const cvLine = (await guide.locator("blockquote").innerText()).replace(/^From your CV: “/, "").replace(/”$/, "");
  await expect(page.getByLabel("Your story", { exact: true })).toHaveValue(`${cvLine} `);
  await expect(page.getByRole("link", { name: "← Back to Q1" })).toBeVisible();

  // Write it so it shows the card's skill (the mock model matches on shared words).
  await page.goto(hubUrl);
  const jd = (await first.getByTestId("jd-quote").innerText()).replace(/^From the JD: “/, "").replace(/”$/, "");
  await first.getByRole("link", { name: /Build a story for question 1/ }).first().click();
  await page.getByLabel("Title", { exact: true }).fill("Pricing test");
  await page.getByLabel("Your story", { exact: true }).fill(`${ANSWER} My task was this: ${jd}`);
  await page.getByRole("button", { name: "Save story" }).click();
  const outcome = page.getByTestId("build-outcome");
  await expect(outcome).toContainText("Linked to Q1");
  const why = (await outcome.getByText(/Why it fits/).innerText()).replace(/^Why it fits: “/, "").replace(/”$/, "");
  expect(`${ANSWER} My task was this: ${jd}`).toContain(why);

  await outcome.getByRole("link", { name: "Back to Q1" }).click();
  await expect(first.getByTestId("card-status")).toHaveText("Story matched");
  await expect(first.getByTestId("mapped-story")).toContainText("Pricing test");
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
  await page.getByRole("link", { name: "Add your first story" }).click();
  await addStory(
    page,
    "Checkout drop-off",
    "Our checkout lost small merchants every month. My goal was to cut drop-off before the next quarter. I decided to run discovery interviews with merchants and turned the insights into requirements. Drop-off fell by 18% in one quarter.",
  );
  await expect(page.getByTestId("story-card")).toHaveCount(1);
  await page.goto(hubUrl); // first visit with stories: matching runs on its own
  await expect(page.getByTestId("mapped-story").first()).toBeVisible();
  await page.reload();
  await expect(prep.getByTestId("prep-item").first()).toContainText("Rehearse your story");

  // Mark it ready: the story task disappears and progress goes up (PL2).
  await page.goto("/stories");
  await page.getByRole("button", { name: /Checkout drop-off/ }).click();
  await page.getByRole("button", { name: "Mark ready" }).click();
  await expect(page.getByTestId("story-state")).toHaveText("Ready");
  await page.goto(hubUrl);
  await expect(prep.getByTestId("prep-item").filter({ hasText: "Rehearse your story" })).toHaveCount(0);
  await expect(page.getByTestId("prep-progress")).toContainText("1 of");
});
