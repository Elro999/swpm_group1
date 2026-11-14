import { describe, expect, it } from "vitest";
import { isUuid } from "@/lib/ids";
import { describeInterviewDate, roleTitle } from "./format";

describe("roleTitle", () => {
  it("uses the first non-empty line and drops a trailing period", () => {
    expect(roleTitle("\n  Associate Product Manager, Payments.\nYou will own…")).toBe("Associate Product Manager, Payments");
  });
  it("truncates very long first lines", () => {
    expect(roleTitle("x".repeat(200)).length).toBeLessThanOrEqual(90);
  });
});

describe("describeInterviewDate", () => {
  const today = new Date(2026, 10, 13); // 13 Nov 2026, local
  it("describes future, today and past dates", () => {
    expect(describeInterviewDate("2026-12-01", today)).toMatch(/in 18 days$/);
    expect(describeInterviewDate("2026-11-13", today)).toMatch(/today$/);
    expect(describeInterviewDate("2026-11-14", today)).toMatch(/tomorrow$/);
    expect(describeInterviewDate("2026-11-10", today)).toMatch(/was 3 days ago$/);
    expect(describeInterviewDate(null, today)).toBeNull();
  });
});

describe("isUuid", () => {
  it("accepts UUIDs and rejects anything else", () => {
    expect(isUuid("3f0c8a8e-1d2b-4c1e-9a77-1f0e2d3c4b5a")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("../etc")).toBe(false);
  });
});
