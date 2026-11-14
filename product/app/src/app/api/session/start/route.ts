import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { attachSessionCookie, readSessionToken } from "@/modules/session/cookie";
import { findSessionByToken, sessionStartKey, startSession } from "@/modules/session/session";

/**
 * POST /api/session/start (PF1). Creates an anonymous session with no form, or reuses the visitor's
 * existing one. Returns the private resume path; the token itself also goes into an httpOnly cookie.
 * New sessions are throttled per (hashed) IP, so dropping cookies cannot mint unlimited fresh AI quotas
 * (review fix). The default (60/hour) lets a whole class behind one campus network start together.
 */
const DEFAULT_SESSION_STARTS_PER_HOUR = 60;

export async function POST(request: Request) {
  const repo = getRepo();
  const existingToken = await readSessionToken();
  if (existingToken && (await findSessionByToken(repo, existingToken))) {
    return NextResponse.json({ created: false, resumePath: `/r/${existingToken}` }, { headers: { "Cache-Control": "no-store" } });
  }
  const limit = getEnv().SESSION_STARTS_PER_HOUR ?? DEFAULT_SESSION_STARTS_PER_HOUR;
  if (!(await repo.rateLimits.hit(sessionStartKey(request.headers), 3_600_000, limit))) {
    return jsonError(429, "Too many new sessions from this network in the last hour. Please try again later.");
  }
  const { token } = await startSession(repo);
  const res = NextResponse.json({ created: true, resumePath: `/r/${token}` }, { status: 201, headers: { "Cache-Control": "no-store" } });
  return attachSessionCookie(res, token);
}
