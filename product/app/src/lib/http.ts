import "server-only";
import { NextResponse } from "next/server";
import type { SessionRow } from "@/lib/db/types";
import { getCurrentSession } from "@/modules/session/cookie";

/** Small helpers so route handlers stay thin: parse → call a module → respond. */

const NO_STORE = { "Cache-Control": "no-store" };

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: NO_STORE });
}

export function jsonError(status: number, error: string, extra: Record<string, unknown> = {}): NextResponse {
  return NextResponse.json({ error, ...extra }, { status, headers: NO_STORE });
}

/** The visitor's session, or a 401 response to return as-is. */
export async function requireSession(): Promise<SessionRow | NextResponse> {
  const session = await getCurrentSession();
  return session ?? jsonError(401, "Your session has ended. Start again from the home page.");
}

/** Parse a JSON body with a size cap (C5: input caps). Returns a 4xx response on bad input. */
export async function readJson(request: Request, maxBytes = 64_000): Promise<unknown | NextResponse> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) return jsonError(413, "That is too much text to send at once.");
  const raw = await request.text();
  if (raw.length > maxBytes) return jsonError(413, "That is too much text to send at once.");
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return jsonError(400, "The request was not valid JSON.");
  }
}

export const isResponse = (v: unknown): v is NextResponse => v instanceof NextResponse;

/** Read a raw audio request body (Content-Type: audio/*) with a size cap. */
export async function readAudio(request: Request, maxBytes: number): Promise<{ bytes: Uint8Array; mime: string } | NextResponse> {
  const mime = (request.headers.get("content-type") ?? "").trim();
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) return jsonError(413, "That recording is too long. Keep answers under three minutes.");
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > maxBytes) return jsonError(413, "That recording is too long. Keep answers under three minutes.");
  return { bytes, mime };
}
