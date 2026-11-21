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
  it("skips a company name or header above the title", () => {
    expect(roleTitle("Acme Corp\nJob Description\nAssociate Product Manager, Payments\nYou will own the roadmap.")).toBe("Associate Product Manager, Payments");
  });
  it("skips posting metadata (LinkedIn-style)", () => {
    expect(roleTitle("Acme Payments\nPosted 3 days ago\nSenior Data Analyst\nLocation: Bengaluru\nAbout us\nWe build things.")).toBe("Senior Data Analyst");
  });
  it("prefers a labelled title", () => {
    expect(roleTitle("Acme Corp is a leading firm.\nJob Title: Strategy Consultant\nLocation: Mumbai")).toBe("Strategy Consultant");
    expect(roleTitle("Growth Ninja\nPosition - Marketing Associate\nBlah")).toBe("Marketing Associate");
  });
  it("reads a label whose value is on the next line", () => {
    expect(roleTitle("Acme\nJob Title\nProduct Operations Manager\nLocation\nPune")).toBe("Product Operations Manager");
  });
  it("reads 'we are hiring' phrasing", () => {
    expect(roleTitle("Acme Corp\nWe are hiring a Business Analyst to join our team in Pune.\nDetails below.")).toBe("Business Analyst");
    expect(roleTitle("🚀 Hiring: Software Engineer Intern\nApply now")).toBe("Software Engineer Intern");
  });
  it("strips bullets, markdown and trailing punctuation", () => {
    expect(roleTitle("**Associate Product Manager (Payments):**\nText")).toBe("Associate Product Manager (Payments)");
  });
  it("does not mistake a duty sentence or a bullet for the title", () => {
    expect(roleTitle("Acme\nLead discovery interviews with merchants and turn insights into requirements.\nProduct Manager")).toBe("Product Manager");
    expect(roleTitle("Acme\n• Lead the team\nFinance Associate")).toBe("Finance Associate");
  });
  it("falls back to the first non-header line when no role word is found", () => {
    expect(roleTitle("Job Description\nGrowth Ninja\nYou will grow things.")).toBe("Growth Ninja");
    expect(roleTitle("")).toBe("Interview");
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
