import { isResponse, json, jsonError, requireSession } from "@/lib/http";
import { extractPdfText, PDF_MAX_BYTES, PdfReadError } from "@/modules/interview/pdf";

/**
 * POST /api/interviews/pdf-text. Body: the raw PDF bytes (Content-Type: application/pdf).
 * 200 { text } · 400 not a readable PDF / no text · 401 no session · 413 too big.
 * The PDF is not stored; only the extracted text goes back to the form for the user to review.
 */
export async function POST(request: Request) {
  const session = await requireSession();
  if (isResponse(session)) return session;

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > PDF_MAX_BYTES) return jsonError(413, "That PDF is too large. Keep it under 5 MB.");
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > PDF_MAX_BYTES) return jsonError(413, "That PDF is too large. Keep it under 5 MB.");

  try {
    return json({ text: await extractPdfText(bytes) });
  } catch (err) {
    if (err instanceof PdfReadError) return jsonError(400, err.message);
    console.error("POST /api/interviews/pdf-text failed", { name: (err as Error)?.name }); // no user text in logs
    return jsonError(500, "Something went wrong while reading that PDF. Paste the text instead.");
  }
}
