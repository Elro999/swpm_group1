import { describe, expect, it } from "vitest";
import { containsQuote, firstWords, locateQuote, splitSentences } from "./text";

describe("locateQuote", () => {
  it("finds an exact quote with original offsets", () => {
    const s = "Own the roadmap. Ship every sprint.";
    expect(locateQuote(s, "Ship every sprint.")).toEqual({ start: 17, end: 35 });
  });

  it("tolerates whitespace and case only, and maps back to the original text", () => {
    const s = "Use data to\n  decide what to build";
    const loc = locateQuote(s, "use data to decide what");
    expect(loc).not.toBeNull();
    expect(s.slice(loc!.start, loc!.end)).toBe("Use data to\n  decide what");
  });

  it("rejects paraphrases, extra words and empty quotes", () => {
    const s = "Lead discovery interviews with merchants";
    expect(locateQuote(s, "Lead customer interviews")).toBeNull();
    expect(locateQuote(s, "Lead discovery interviews with merchants daily")).toBeNull();
    expect(locateQuote(s, "  ")).toBeNull();
  });
});

describe("splitSentences", () => {
  it("keeps exact character offsets into the original string", () => {
    const s = "  First one. Second one!\nThird?";
    const parts = splitSentences(s);
    expect(parts.map((p) => p.text)).toEqual(["First one.", "Second one!", "Third?"]);
    for (const p of parts) expect(s.slice(p.start, p.end)).toBe(p.text);
  });

  it("returns nothing for blank input", () => {
    expect(splitSentences("   \n ")).toEqual([]);
  });
});

describe("firstWords", () => {
  it("returns a verbatim prefix", () => {
    const s = "We looked at competitors, then customers.";
    expect(firstWords(s, 3)).toBe("We looked at");
    expect(s.startsWith(firstWords(s, 3))).toBe(true);
  });
});

describe("containsQuote", () => {
  it("ignores whitespace and case differences only", () => {
    expect(containsQuote("I decided  to\nrecommend it", "i decided to recommend")).toBe(true);
    expect(containsQuote("I decided to recommend it", "I decided to cancel")).toBe(false);
    expect(containsQuote("anything", "   ")).toBe(false);
  });
});
