import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { isResponse, jsonError, readJson } from "@/lib/http";
import { ADMIN_COOKIE, adminCookieValue, keyMatches } from "@/modules/admin/auth";
import { adminLoginLimiter, clientKey } from "@/modules/admin/ratelimit";
import { adminCookieOptions } from "@/modules/admin/server";

/**
 * POST /api/admin/login { key } → 204 + admin cookie (12 h). 401 on a wrong key; 404 when ADMIN_KEY is not set.
 * The cookie value is an HMAC of the key, never the key. No rate limit: the key is long and random (≥16 chars,
 * see .env.example); add one before any wider release (task 7.3).
 */
export async function POST(request: Request) {
  const adminKey = getEnv().ADMIN_KEY;
  if (!adminKey) return jsonError(404, "Admin is not enabled on this deployment.");
  const limiter = adminLoginLimiter();
  const who = clientKey(request.headers);
  if (!limiter.allowed(who)) return jsonError(429, "Too many tries. Wait 15 minutes and try again.");
  const body = await readJson(request, 1_000);
  if (isResponse(body)) return body;
  if (!keyMatches((body as { key?: unknown })?.key, adminKey)) {
    limiter.fail(who);
    return jsonError(401, "That key is not right.");
  }
  limiter.reset(who);
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(ADMIN_COOKIE, adminCookieValue(adminKey), adminCookieOptions());
  return res;
}
