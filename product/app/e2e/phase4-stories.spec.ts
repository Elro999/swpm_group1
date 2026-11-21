import { expect, test } from "@playwright/test";

// Phase 4: paste stories → decision-first cards built only from the user's words → ready / edit →
// match to an interview so every competency shows a story or a gap (G3).

const MATCHING_STORY =
  "Our checkout lost small merchants every month. I decided to run discovery interviews with merchants and turned the insights into requirements. Drop-off fell by 18% in one quarter.";
const OTHER_STORY = "In a college project we could not agree on a topic for a week. I chose to run a quick vote. We improved a lot after that.";

test("paste → decision-first cards with flags → ready → edit", async ({ page }) => {
  await page.goto("/stories");
  await expect(page.getByRole("heading", { name: "My stories" })).toBeVisible();

  // Too short: specific message, nothing added.
  await page.getByLabel("Paste one or more stories").fill("Too short.");
  await page.getByRole("button", { name: "Add to my stories" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "at least 40 characters" })).toBeVisible();

  await page.getByLabel("Paste one or more stories").fill(`${MATCHING_STORY}\n\n${OTHER_STORY}`);
  await page.getByRole("button", { name: "Add to my stories" }).click();
  const cards = page.getByTestId("story-card");
  await expect(cards).toHaveCount(2);

  // Decision first, verbatim from the pasted text.
  const first = cards.first();
  const decision = (await first.getByTestId("field-decision").locator("q").innerText()).trim();
  expect(MATCHING_STORY).toContain(decision);
  expect(decision).toMatch(/^I decided/);

  // Team vs own split with flags; nothing auto-fixed.
  const second = cards.nth(1);
  await second.getByText(/Who did what/).click();
  await expect(second.getByTestId("sentences")).toContainText("Says “we”: which part was yours?");
  await expect(second.getByTestId("sentences")).toContainText("A result without evidence: how do you know?");

  // Ready toggle, then edit → back to structured with the new decision.
  await first.getByRole("button", { name: "Mark ready" }).click();
  await expect(first.getByTestId("story-state")).toHaveText("Ready");
  await first.getByRole("button", { name: "Edit" }).click();
  await first.getByLabel("Edit your story").fill("Our search was slow for merchants. I chose to cache the results. Load time dropped by 40%.");
  await first.getByRole("button", { name: "Save" }).click();
  await expect(first.getByTestId("story-state")).toHaveText("Structured");
  await expect(first.getByTestId("field-decision")).toContainText("I chose to cache the results.");

  // Persisted across reload.
  await page.reload();
  await expect(page.getByTestId("story-card")).toHaveCount(2);
});

test("hub: match stories so every competency has a story or a gap", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try with a sample JD" }).click();
  await page.getByRole("button", { name: "Create my questions" }).click();
  await expect(page).toHaveURL(/\/i\/[0-9a-f-]{36}$/);
  const hubUrl = page.url();

  await page.getByRole("link", { name: "Add my stories" }).click();
  await expect(page.getByRole("link", { name: /Back to Associate Product Manager/ })).toBeVisible();
  await page.getByLabel("Paste one or more stories").fill(`${MATCHING_STORY}\n\n${OTHER_STORY}`);
  await page.getByRole("button", { name: "Add to my stories" }).click();
  await expect(page.getByTestId("story-card")).toHaveCount(2);

  await page.getByRole("link", { name: "Match them to the interview →" }).click();
  await expect(page).toHaveURL(hubUrl);
  await page.getByRole("button", { name: "Match my stories to this role" }).click();

  const comps = page.getByTestId("competency");
  await expect(page.getByTestId("mapped-story").first()).toBeVisible();
  const n = await comps.count();
  for (let i = 0; i < n; i++) {
    const c = comps.nth(i);
    // G3: every competency shows a mapped story or a flagged gap; none left "not matched".
    expect((await c.getByTestId("mapped-story").count()) + (await c.getByTestId("gap").count())).toBe(1);
  }
  // The reason shown for a match is the user's own words.
  const why = await page.getByTestId("mapped-story").first().getByText(/Why it fits/).innerText();
  expect(MATCHING_STORY).toContain(why.replace(/^Why it fits: “/, "").replace(/”$/, ""));
});

test("another visitor cannot change my story", async ({ page, browser }) => {
  await page.goto("/stories");
  await page.getByLabel("Paste one or more stories").fill(MATCHING_STORY);
  const created = page.waitForResponse((r) => r.url().endsWith("/api/stories") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Add to my stories" }).click();
  const storyId = ((await (await created).json()).stories[0] as { id: string }).id;

  const stranger = await browser.newContext();
  await stranger.request.post("/api/session/start");
  const res = await stranger.request.patch(`/api/stories/${storyId}`, { data: { ready: true } });
  expect(res.status()).toBe(404);
  await stranger.close();
});
