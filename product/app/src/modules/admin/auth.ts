import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Admin access for the teammate review page and metrics (PF4, PF5). One shared ADMIN_KEY (env, ≥16 chars).
 * The cookie holds an HMAC derived from the key, never the key itself; all comparisons are timing-safe.
 * If ADMIN_KEY is not set, admin is OFF (every check fails).
 */
export const ADMIN_COOKIE = "ipc_admin";
const COOKIE_CONTEXT = "ipc-admin-v1";

const sha = (s: string) => createHash("sha256").update(s).digest();

export function adminCookieValue(adminKey: string): string {
  return createHmac("sha256", adminKey).update(COOKIE_CONTEXT).digest("base64url");
}

export function keyMatches(input: unknown, adminKey: string | undefined): boolean {
  if (!adminKey || typeof input !== "string" || !input) return false;
  return timingSafeEqual(sha(input), sha(adminKey));
}

export function cookieGrantsAdmin(cookieValue: string | undefined, adminKey: string | undefined): boolean {
  if (!adminKey || !cookieValue) return false;
  return timingSafeEqual(sha(cookieValue), sha(adminCookieValue(adminKey)));
}
