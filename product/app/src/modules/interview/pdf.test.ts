import { describe, expect, it } from "vitest";
import { extractPdfText, PdfReadError } from "./pdf";

/** Builds a minimal one-page text PDF in memory (synthetic; no real document involved). */
function makePdf(lines: string[]): Uint8Array {
  const content = `BT /F1 12 Tf 14 TL 50 740 Td ${lines.map((l) => `(${l}) Tj T*`).join(" ")} ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(out);
}

describe("extractPdfText", () => {
  it("returns the PDF's text, one line per line, in order", async () => {
    const text = await extractPdfText(makePdf(["Associate Product Manager, Payments", "You will own the roadmap.", "Work with engineering."]));
    expect(text).toBe("Associate Product Manager, Payments\nYou will own the roadmap.\nWork with engineering.");
  });

  it("rejects a file that is not a PDF", async () => {
    await expect(extractPdfText(new TextEncoder().encode("just some text, not a pdf"))).rejects.toThrow(PdfReadError);
  });

  it("rejects a corrupt PDF with a plain message", async () => {
    await expect(extractPdfText(new TextEncoder().encode("%PDF-1.4\nthis is broken"))).rejects.toThrow(/couldn't open/i);
  });

  it("says so when the PDF has no selectable text", async () => {
    await expect(extractPdfText(makePdf([]))).rejects.toThrow(/no selectable text/i);
  });
});
