import "server-only";
import { cookies } from "next/headers";
import { connection, type NextResponse } from "next/server";
import { getRepo } from "@/lib/db";
import type { SessionRow } from "@/lib/db/types";
import { findSessionByToken, noteVisit } from "./session";

/**
 * Cookie glue between HTTP and the session service. Next 16: cookies() is async, and cookies can
 * only be SET in Route Handlers or Server Functions, never during Server Component rendering.
 */
export const SESSION_COOKIE = "ipc_session";
const NINETY_DAYS_S = 60 * 60 * 24 * 90;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: NINETY_DAYS_S,
  };
}

export function attachSessionCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}

/**
 * The current visitor's session, or null. Safe to call from Server Components and Route Handlers.
 * Also notes the visit (session_returned after a 12 h+ gap; throttled last_seen_at). A failure to
 * record the visit never blocks the page.
 */
export async function getCurrentSession(): Promise<SessionRow | null> {
  const repo = getRepo();
  const session = await findSessionByToken(repo, await readSessionToken());
  if (!session) return null;
  await connection(); // noteVisit reads the clock; Next 16 rejects new Date() during prerender without this
  return noteVisit(repo, session).catch(() => session);
}
