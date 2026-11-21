import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { installFakeMic } from "./fixtures/fake-mic";

// Task 7.2: automated accessibility scan (axe-core, WCAG 2.1 A/AA rules) of every main screen.
// Fails on serious or critical violations. Automated checks catch roughly a third of real issues;
// a manual keyboard and screen-reader pass is still needed before user testing.

async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} × e.g. ${v.nodes[0]?.target.join(" ")}`);
  expect(summary, `${label}: serious/critical accessibility violations`).toEqual([]);
}

test("every main screen passes the automated accessibility scan", async ({ page }) => {
  await installFakeMic(page);

  await page.goto("/");
  await scan(page, "landing");

  await page.getByRole("button", { name: "Try with a sample JD" }).click();
  await expect(page.getByLabel(/Job description/)).not.toHaveValue("");
  await scan(page, "add interview");

  await page.getByRole("button", { name: "Create my questions" }).click();
  await expect(page).toHaveURL(/\/i\/[0-9a-f-]{36}$/);
  await scan(page, "interview hub (before consent)");
  await page.getByRole("button", { name: "I agree, let me practise" }).click();
  await page.getByRole("button", { name: "Find stories for this role" }).click();
  await expect(page.getByTestId("gap").first()).toBeVisible();
  await scan(page, "interview hub (gaps, prep list)");

  await page.getByRole("link", { name: "Practise question 1" }).click();
  await page.getByRole("button", { name: "Start practising" }).click();
  await scan(page, "practice: ready to record");
  for (let i = 0; i < 2; i++) {
    if (i === 1) await page.getByRole("button", { name: "Try this question again" }).click();
    await page.getByRole("button", { name: /Start recording/ }).click();
    await page.getByRole("button", { name: /Stop/ }).click();
    await page.getByRole("button", { name: "Use this answer" }).click();
    if (i === 0) await scan(page, "practice: follow-up");
    await page.getByRole("button", { name: "Skip the follow-up and get feedback" }).click();
    await expect(page.getByTestId("feedback")).toBeVisible();
  }
  await scan(page, "practice: feedback");

  await page.getByRole("link", { name: "Compare with attempt 1" }).click();
  await expect(page.getByTestId("compare-table")).toBeVisible();
  await scan(page, "compare");

  await page.goto("/stories");
  await page.getByLabel("Paste one or more stories").fill(
    "Our checkout lost small merchants every month. I decided to run discovery interviews with merchants. Drop-off fell by 18% in one quarter.",
  );
  await page.getByRole("button", { name: "Add to my stories" }).click();
  await expect(page.getByTestId("story-card")).toHaveCount(1);
  await scan(page, "stories");

  await page.goto("/privacy");
  await scan(page, "privacy");

  await page.goto("/admin");
  await scan(page, "admin login");
});
