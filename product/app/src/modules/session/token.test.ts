import { describe, expect, it } from "vitest";
import { hashToken, isWellFormedToken, newToken } from "./token";

describe("session tokens", () => {
  it("are 256-bit, url-safe and unique", () => {
    const a = newToken();
    const b = newToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("hash deterministically to 64 hex chars that do not reveal the token", () => {
    const t = newToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).not.toContain(t);
  });

  it("reject malformed tokens before any lookup", () => {
    expect(isWellFormedToken(newToken())).toBe(true);
    expect(isWellFormedToken("")).toBe(false);
    expect(isWellFormedToken("short")).toBe(false);
    expect(isWellFormedToken("../../etc/passwd-padding-to-reach-43-chars-xx")).toBe(false);
  });
});
