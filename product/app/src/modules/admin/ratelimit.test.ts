import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "./ratelimit";

describe("admin login rate limit (7.3)", () => {
  it("blocks after max failures within the window, per key, and lifts after the window", () => {
    const rl = createRateLimiter(3, 1000);
    for (let i = 0; i < 3; i++) {
      expect(rl.allowed("ip1", 0)).toBe(true);
      rl.fail("ip1", 0);
    }
    expect(rl.allowed("ip1", 10)).toBe(false);
    expect(rl.allowed("ip2", 10)).toBe(true);
    expect(rl.allowed("ip1", 1001)).toBe(true);
  });

  it("reset clears a key (after a successful login)", () => {
    const rl = createRateLimiter(1, 1000);
    rl.fail("ip", 0);
    rl.reset("ip");
    expect(rl.allowed("ip", 1)).toBe(true);
  });

  it("reads the first forwarded address", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
    expect(clientKey(new Headers())).toBe("unknown");
  });
});
