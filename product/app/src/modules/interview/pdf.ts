import "server-only";
import { extractText, getDocumentProxy } from "unpdf";

/**
 * Read the text out of an uploaded JD or CV PDF. The PDF itself is never stored: we extract the text, hand it
 * back to the form, and the user reviews and edits it like any pasted JD. Everything downstream
 * (validation, quote verification) is unchanged, so a bad extraction cannot sneak invented text in.
 */
export const PDF_MAX_BYTES = 5_000_000; // 5 MB: a JD is a page or two
export const PDF_MAX_PAGES = 10;

export class PdfReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfReadError";
  }
}

const isPdf = (b: Uint8Array) => b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // "%PDF"

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  if (!isPdf(bytes)) throw new PdfReadError("That file isn't a PDF. Upload a PDF, or paste the text instead.");
  let pdf;
  try {
    pdf = await getDocumentProxy(bytes);
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === "PasswordException") throw new PdfReadError("That PDF is password-protected. Remove the password, or paste the text instead.");
    throw new PdfReadError("We couldn't open that PDF. Try another copy, or paste the text instead.");
  }
  if (pdf.numPages > PDF_MAX_PAGES) {
    throw new PdfReadError(`That PDF has ${pdf.numPages} pages. Upload just the relevant pages, or paste the text.`);
  }
  let text: string;
  try {
    text = (await extractText(pdf, { mergePages: true })).text;
  } catch {
    throw new PdfReadError("We couldn't read the text in that PDF. Paste the text instead.");
  }
  text = text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) {
    throw new PdfReadError("That PDF has no selectable text (it may be a scan or an image). Paste the text instead.");
  }
  return text;
}
