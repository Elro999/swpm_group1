import { expect, type Page } from "@playwright/test";

/** Write and save one story on /stories (opens the form first when the bank already has stories). */
export async function addStory(page: Page, title: string, text: string) {
  const add = page.getByRole("button", { name: "Add a story" });
  if (await add.isVisible()) await add.click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Your story", { exact: true }).fill(text);
  await page.getByRole("button", { name: "Save story" }).click();
  await expect(page.getByRole("button", { name: "Add a story" })).toBeVisible();
}
