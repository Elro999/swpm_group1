/**
 * Fixed-window rate limiter for the admin login (task 7.3): at most `max` failed tries per key (client IP)
 * per window. In memory, so it is per server instance: good enough to slow guessing of a long random key,
 * not a substitute for a shared store if admin is ever exposed more widely.
 */
export interface RateLimiter {
  /** True if this key may try now. */
  allowed(key: string, now?: number): boolean;
  /** Record a failed try. */
  fail(key: string, now?: number): void;
  reset(key: string): void;
}

export function createRateLimiter(max = 10, windowMs = 15 * 60_000): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();
  const current = (key: string, now: number) => {
    const h = hits.get(key);
    if (!h || now >= h.resetAt) return { count: 0, resetAt: now + windowMs };
    return h;
  };
  return {
    allowed(key, now = Date.now()) {
      return current(key, now).count < max;
    },
    fail(key, now = Date.now()) {
      const h = current(key, now);
      hits.set(key, { count: h.count + 1, resetAt: h.resetAt });
    },
    reset(key) {
      hits.delete(key);
    },
  };
}

const g = globalThis as typeof globalThis & { __ipcAdminLimiter?: RateLimiter };
export const adminLoginLimiter = (): RateLimiter => (g.__ipcAdminLimiter ??= createRateLimiter());

/** Best-effort client key from proxy headers (Vercel sets x-forwarded-for). */
export function clientKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
