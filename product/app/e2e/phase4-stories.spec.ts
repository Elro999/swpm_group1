import { expect, test } from "@playwright/test";
import { addStory } from "./fixtures/stories";

// Phase 4 (STAR since 2026-11-22): one story per save, with a title → sorted into Situation, Task, Action,
// Result using only the user's words → collapsed cards → ready / edit / rename → delete with confirmation →
// match to an interview so every competency shows a story or a gap (G3).

const MATCHING_STORY =
  "Our checkout lost small merchants every month. My goal was to cut drop-off before the next quarter. I decided to run discovery interviews with merchants and turned the insights into requirements. Drop-off fell by 18% in one quarter.";
const NO_TASK_STORY = "In a college project the team could not agree on a topic for a week. We ran a quick vote. Sales improved a lot after that.";

test("one story → STAR from the user's words → collapsed card → ready → edit and rename", async ({ page }) => {
  await page.goto("/stories");
  await expect(page.getByRole("heading", { name: "My stories" })).toBeVisible();

  // Empty bank: the form is open; save stays disabled until there is enough text; a title is required.
  const save = page.getByRole("button", { name: "Save story" });
  await page.getByLabel("Your story", { exact: true }).fill("Too short.");
  await expect(save).toBeDisabled();
  await page.getByLabel("Your story", { exact: true }).fill(MATCHING_STORY);
  await save.click();
  await expect(page.getByRole("alert").filter({ hasText: "short title" })).toBeVisible();
  await expect(page.getByLabel("Title", { exact: true })).toBeFocused();

  // A blank line no longer splits: this is ONE story.
  await page.getByLabel("Title", { exact: true }).fill("Checkout drop-off");
  await page.getByLabel("Your story", { exact: true }).fill(`${MATCHING_STORY}\n\nAnd I shared the findings with sales.`);
  await save.click();
  const cards = page.getByTestId("story-card");
  await expect(cards).toHaveCount(1);
  const card = cards.first();

  // Opened after saving; STAR parts quote the user's text exactly.
  await expect(card.getByTestId("story-title")).toHaveText("Checkout drop-off");
  await expect(card.getByTestId("story-state")).toHaveText("Complete");
  await expect(card.getByTestId("star-task")).toContainText("My goal was to cut drop-off before the next quarter.");
  await expect(card.getByTestId("star-action")).toContainText("I decided to run discovery interviews");
  await expect(card.getByTestId("star-result")).toContainText("Drop-off fell by 18% in one quarter.");

  // Collapse and expand.
  const header = card.getByRole("button", { name: /Checkout drop-off/ });
  await expect(header).toHaveAttribute("aria-expanded", "true");
  await header.click();
  await expect(header).toHaveAttribute("aria-expanded", "false");
  await expect(card.getByTestId("star-task")).toBeHidden();
  await header.click();

  // Ready, then edit text and title → re-sorted, back to not ready.
  await card.getByRole("button", { name: "Mark ready" }).click();
  await expect(card.getByTestId("story-state")).toHaveText("Ready");
  await expect(page.getByTestId("bank-summary")).toHaveText("1 of 1 ready");
  await card.getByRole("button", { name: "Edit" }).click();
  await card.getByLabel("Title", { exact: true }).fill("Faster search");
  await card.getByLabel("Your story", { exact: true }).fill("Our search was slow for merchants. My task was to speed it up. I chose to cache the queries. Load time dropped by 40%.");
  await card.getByRole("button", { name: "Save" }).click();
  await expect(card.getByTestId("story-title")).toHaveText("Faster search");
  await expect(card.getByTestId("story-state")).toHaveText("Complete");
  await expect(card.getByTestId("star-action")).toContainText("I chose to cache the queries.");

  // Persisted across reload; cards load collapsed.
  await page.reload();
  await expect(page.getByTestId("story-card")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Faster search/ })).toHaveAttribute("aria-expanded", "false");
});

test("missing STAR parts become questions, flags point at sentences, and ready waits for all four", async ({ page }) => {
  await page.goto("/stories");
  await addStory(page, "Topic vote", NO_TASK_STORY);
  const card = page.getByTestId("story-card").first();
  await expect(card.getByTestId("story-state")).toHaveText("Missing Task");
  await expect(card.getByTestId("star-task")).toContainText("What did you need to accomplish?");
  await expect(card.getByTestId("star-action")).toContainText("Says “we”: which part was yours?");
  await expect(card.getByTestId("star-result")).toContainText("A result without evidence: how do you know?");
  await expect(card.getByRole("button", { name: "Mark ready" })).toHaveCount(0);
  await card.getByRole("button", { name: "Add the missing part" }).click();
  await expect(card.getByLabel("Title", { exact: true })).toBeFocused();
});

test("delete asks first; cancel keeps the story, confirm removes it", async ({ page }) => {
  await page.goto("/stories");
  await addStory(page, "Checkout drop-off", MATCHING_STORY);
  await addStory(page, "Topic vote", NO_TASK_STORY);
  await expect(page.getByTestId("story-card")).toHaveCount(2);

  // Newest first.
  const top = page.getByTestId("story-card").first();
  await expect(top.getByTestId("story-title")).toHaveText("Topic vote");

  await top.getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete “Topic vote”?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("story-card")).toHaveCount(2);

  await top.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete story" }).click();
  await expect(page.getByTestId("story-card")).toHaveCount(1);
  await expect(page.getByRole("status").filter({ hasText: "Deleted" })).toHaveText("Deleted “Topic vote”.");
  await page.reload();
  await expect(page.getByTestId("story-card")).toHaveCount(1);
});

test("role page: stories match on the first visit; Open, Change, Unlink and Match again on a card", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try with a sample JD" }).click();
  await page.getByRole("button", { name: "Create my questions" }).click();
  await expect(page).toHaveURL(/\/i\/[0-9a-f-]{36}$/);
  const hubUrl = page.url();

  await page.getByRole("link", { name: "Add your first story" }).click();
  await expect(page.getByRole("link", { name: /Back to Associate Product Manager/ })).toBeVisible();
  await addStory(page, "Checkout drop-off", MATCHING_STORY);
  await addStory(page, "Topic vote", NO_TASK_STORY);

  await page.getByRole("link", { name: "Match them to the interview →" }).click();
  await expect(page).toHaveURL(hubUrl);
  // Matching runs by itself on the first visit; every card shows a story or its suggestions / a gap.
  const matched = page.getByTestId("mapped-story").first();
  await expect(matched).toBeVisible();
  await expect(page.getByTestId("strip-note")).toContainText(/Matched \d+ of \d+ questions/);
  const cards = page.getByTestId("question-card");
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    const c = cards.nth(i);
    expect((await c.getByTestId("mapped-story").count()) + (await c.getByTestId("gap").count()) + (await c.getByTestId("saved-suggestion").count())).toBe(1);
  }
  // The reason shown for a match is the user's own words.
  const why = await matched.getByText(/Why it fits/).innerText();
  expect(MATCHING_STORY).toContain(why.replace(/^Why it fits: “/, "").replace(/”$/, ""));

  // Change → pick the other story: "Chosen by you".
  let at = 0;
  while ((await cards.nth(at).getByTestId("mapped-story").count()) === 0) at++;
  const card = cards.nth(at); // fixed position: a filter would move to another card once this one is unlinked
  await card.getByRole("button", { name: "Change" }).click();
  await expect(card.getByText("In use")).toBeVisible();
  await card.getByRole("button", { name: "Topic vote" }).click();
  await expect(card.getByTestId("mapped-story")).toContainText("Chosen by you");
  await expect(card.getByTestId("mapped-story")).toContainText("Topic vote");

  // Unlink: the story stays saved and comes back as a suggestion; the strip offers Match again.
  await card.getByRole("button", { name: "Change" }).click();
  await card.getByRole("button", { name: "Unlink this story" }).click();
  await expect(card.getByTestId("mapped-story")).toHaveCount(0);
  await expect(card.getByTestId("saved-suggestion")).toContainText("Topic vote");
  await expect(page.getByTestId("story-strip")).toContainText("Unlinked “Topic vote”.");

  // Use this story links it back by hand.
  await card.getByRole("button", { name: "Use this story" }).click();
  await expect(card.getByTestId("mapped-story")).toContainText("Topic vote");

  // Unlink again, then Match again checks just that story (it may link it to whichever question it fits).
  await card.getByRole("button", { name: "Change" }).click();
  await card.getByRole("button", { name: "Unlink this story" }).click();
  await expect(card.getByTestId("saved-suggestion")).toContainText("Topic vote");
  await page.getByRole("button", { name: "Match again" }).click();
  await expect(page.getByTestId("strip-note")).toContainText("Checked again");
  await expect(page.getByTestId("story-strip")).not.toContainText("Unlinked “Topic vote”.");

  // Open goes to a matched story on My stories, opened.
  const open = page.getByTestId("mapped-story").first();
  const name = (await open.locator("span.font-medium").first().innerText()).trim();
  await open.getByRole("link", { name: "Open" }).click();
  await expect(page).toHaveURL(/\/stories\?from=[0-9a-f-]{36}&open=[0-9a-f-]{36}$/);
  await expect(page.getByRole("button", { name: new RegExp(name) })).toHaveAttribute("aria-expanded", "true");

  // A story added later shows "Match new story" instead of re-matching everything.
  await addStory(page, "Search speed", "Our search was slow for merchants. My task was to speed it up. I chose to cache the queries. Load time dropped by 40%.");
  await page.goto(hubUrl);
  await expect(page.getByTestId("story-strip")).toContainText("1 new story since the last match.");
  await page.getByRole("button", { name: "Match new story" }).click();
  await expect(page.getByTestId("strip-note")).toContainText("Checked your new story");
});

test("another visitor cannot change or delete my story", async ({ page, browser }) => {
  await page.goto("/stories");
  await page.getByLabel("Title", { exact: true }).fill("Checkout drop-off");
  await page.getByLabel("Your story", { exact: true }).fill(MATCHING_STORY);
  const created = page.waitForResponse((r) => r.url().endsWith("/api/stories") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Save story" }).click();
  const storyId = ((await (await created).json()).story as { id: string }).id;

  const stranger = await browser.newContext();
  await stranger.request.post("/api/session/start");
  expect((await stranger.request.patch(`/api/stories/${storyId}`, { data: { ready: true } })).status()).toBe(404);
  expect((await stranger.request.delete(`/api/stories/${storyId}`)).status()).toBe(404);
  await stranger.close();
  await page.reload();
  await expect(page.getByTestId("story-card")).toHaveCount(1);
});
