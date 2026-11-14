import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db";
import { attachSessionCookie, readSessionToken } from "@/modules/session/cookie";
import { findSessionByToken, startSession } from "@/modules/session/session";

/**
 * POST /api/session/start (PF1). Creates an anonymous session with no form, or reuses the visitor's
 * existing one. Returns the private resume path; the token itself also goes into an httpOnly cookie.
 */
export async function POST() {
  const repo = getRepo();
  const existingToken = await readSessionToken();
  if (existingToken && (await findSessionByToken(repo, existingToken))) {
    return NextResponse.json({ created: false, resumePath: `/r/${existingToken}` }, { headers: { "Cache-Control": "no-store" } });
  }
  const { token } = await startSession(repo);
  const res = NextResponse.json({ created: true, resumePath: `/r/${token}` }, { status: 201, headers: { "Cache-Control": "no-store" } });
  return attachSessionCookie(res, token);
}
