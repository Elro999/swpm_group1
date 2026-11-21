import { expect, test } from "@playwright/test";
import { SAMPLE_JD } from "../src/lib/sample";
import { makePdf } from "./fixtures/make-pdf";

// "Upload a PDF" on the add-interview form: JD and CV text are read from the PDF into the boxes.
// Runs in mock AI + memory mode (see playwright.config.ts).

const CV_LINES = ["Product Analyst at a synthetic fintech, 2023 to 2025", "Led a pricing experiment with two engineers", "MBA candidate"];

test("upload a JD PDF and a CV PDF: text lands in the boxes and the interview is created", async ({ page }) => {
  await page.goto("/interviews/new");
  await page.getByLabel("PDF file to read", { exact: true }).setInputFiles({ name: "jd.pdf", mimeType: "application/pdf", buffer: makePdf(SAMPLE_JD.split("\n")) });
  await expect(page.getByRole("textbox", { name: /Job description/ })).toHaveValue(SAMPLE_JD);
  await expect(page.getByText("Text read from your PDF")).toBeVisible();

  await page.getByText("Add your CV or a list of past roles").click();
  await page.getByLabel("CV PDF file to read").setInputFiles({ name: "cv.pdf", mimeType: "application/pdf", buffer: makePdf(CV_LINES) });
  await expect(page.getByRole("textbox", { name: "CV or past roles" })).toHaveValue(CV_LINES.join("\n"));

  await page.getByRole("button", { name: "Create my questions" }).click();
  await expect(page).toHaveURL(/\/i\/[0-9a-f-]{36}$/);
  await expect(page.getByTestId("question-list")).toBeVisible();
});

test("a file that is not a PDF, or a PDF with no text, shows a plain message and keeps what was typed", async ({ page }) => {
  await page.goto("/interviews/new");
  await page.getByRole("textbox", { name: /Job description/ }).fill("Typed by hand");

  await page.getByLabel("PDF file to read", { exact: true }).setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await expect(page.getByRole("alert").filter({ hasText: "Upload a PDF" })).toBeVisible();

  await page.getByLabel("PDF file to read", { exact: true }).setInputFiles({ name: "empty.pdf", mimeType: "application/pdf", buffer: makePdf([]) });
  await expect(page.getByRole("alert").filter({ hasText: "no selectable text" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /Job description/ })).toHaveValue("Typed by hand");
});
