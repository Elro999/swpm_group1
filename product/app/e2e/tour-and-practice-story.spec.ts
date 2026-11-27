import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { installFakeMic } from "./fixtures/fake-mic";

// 2026-11-27: the first-visit guided tour of the role page (My stories → questions → streak), and the practice
// screen's STAR check plus "saved to My stories" (new story saved automatically; a similar retry offers to combine).

async function createInterview(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try with a sample JD" }).click();
  await page.getByRole("button", { name: "Create my questions" }).click();
  await expect(page).toHaveURL(/\/i\/[0-9a-f-]{36}$/);
}

test.describe("guided tour", () => {
  // A fresh browser: the tour has not been seen (the config marks it seen for every other spec).
  test.use({ storageState: { cookies: [], origins: [] } });

  test("shows once on the role page, steps through three parts, and can be replayed", async ({ page }) => {
    await createInterview(page);
    const card = page.getByTestId("tour-card");
    await expect(card).toBeVisible();
    await expect(page.getByTestId("tour-spotlight")).toBeVisible();
    await expect(card).toHaveAttribute("data-step", "my-stories");
    await expect(card).toContainText("Step 1 of 3");
    await expect(card).toContainText("STAR");
    await expect(page.getByTestId("tour-next")).toBeFocused();
    const a11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(a11y.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);

    await page.getByTestId("tour-next").click();
    await expect(card).toHaveAttribute("data-step", "question");
    await expect(card).toContainText("job description and your CV");
    await page.getByRole("button", { name: "Back" }).click();
    await expect(card).toHaveAttribute("data-step", "my-stories");
    await page.getByTestId("tour-next").click();
    await page.getByTestId("tour-next").click();
    await expect(card).toHaveAttribute("data-step", "streak");
    await expect(page.getByTestId("tour-next")).toHaveText("Done");
    await page.getByTestId("tour-next").click();
    await expect(card).toHaveCount(0);

    // Seen: not shown again on reload; "Take the tour" replays it and Esc skips.
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(card).toHaveCount(0);
    await page.getByTestId("tour-replay").click();
    await expect(card).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(card).toHaveCount(0);
  });

  test("Skip ends the tour at any step", async ({ page }) => {
    await createInterview(page);
    await page.getByTestId("tour-next").click();
    await page.getByTestId("tour-skip").click();
    await expect(page.getByTestId("tour-card")).toHaveCount(0);
    await expect(page.getByTestId("tour-shield")).toHaveCount(0);
  });
});

test.describe("practice answer: STAR and My stories", () => {
  test.beforeEach(async ({ page }) => {
    await installFakeMic(page);
  });

  async function practise(page: Page, first: boolean) {
    if (first) await page.getByRole("button", { name: "Start practising" }).click();
    else await page.getByRole("button", { name: "Try this question again" }).click();
    await page.getByRole("button", { name: /Start recording/ }).click();
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /Stop/ }).click();
    await page.getByRole("button", { name: "Use this answer" }).click();
    await page.getByRole("button", { name: "Skip the follow-up and get feedback" }).click();
    await expect(page.getByTestId("feedback")).toBeVisible();
  }

  test("STAR sits with the other checks; a new story is saved; a retry offers to combine", async ({ page }) => {
    await createInterview(page);
    await page.getByRole("button", { name: "I agree, let me practise" }).click();
    await page.getByRole("link", { name: "Practise question 1" }).click();
    await practise(page, true);

    // STAR is one tile among the checks, and its gap is a pinned point in the same list.
    const tile = page.getByTestId("metrics").getByTestId("star-tile");
    await expect(tile).toContainText("No Task: see where");
    await expect(page.locator("#point-star_missing_task")).toBeVisible();
    await expect(page.getByTestId("transcript-sentence").first()).toHaveAttribute("data-part", "situation");

    // The new story was saved to My stories, with a way to fill its gaps.
    const saved = page.getByTestId("story-saved");
    await expect(saved).toContainText("Added to My stories.");
    await expect(saved).toContainText("Fill in the Task there");
    await saved.getByTestId("open-saved-story").click();
    await expect(page).toHaveURL(/\/stories\?open=/);
    await expect(page.getByTestId("story-card")).toHaveCount(1);
    await page.goBack();
    await expect(page.getByTestId("feedback")).toBeVisible();

    // Retry: the same story told again is not saved twice; combine adds only what is new.
    await practise(page, false);
    await expect(page.getByTestId("star-tile")).toContainText("All four, in order");
    const similar = page.getByTestId("story-similar");
    await expect(similar).toContainText("This sounds like your story");
    await similar.getByRole("button", { name: "Combine with this story" }).click();
    await expect(page.getByTestId("story-saved")).toContainText(/Combined: \d+ new sentences? added/);

    await page.goto("/stories");
    await expect(page.getByTestId("story-card")).toHaveCount(1);
  });
});
