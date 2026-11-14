import { describe, expect, it } from "vitest";
import { synthesizeTranscript } from "@/modules/ai/mock/stt";
import { buildFeedback } from "./build";
import { looksLikeRewrite, verifyFollowup } from "./guards";
import { computeDelivery, countIWe, TOO_LONG_MS } from "./metrics";
import { buildCanonical, pinQuote } from "./transcript";

const FIRST =
  "So in my last role we were working on pricing for a new product line. " +
  "We had a lot of data and the team ran several analyses over a few weeks. " +
  "We looked at competitors and we talked to some customers. " +
  "Eventually I decided to recommend a lower entry price for the first quarter. " +
  "The result was that adoption went up in the pilot.";

const t = synthesizeTranscript(FIRST);

describe("canonical transcript and quote pinning", () => {
  it("splits sentences and maps each to word indexes", () => {
    const c = buildCanonical(t.words);
    expect(c.sentences).toHaveLength(5);
    expect(c.sentences[3].text).toMatch(/^Eventually I decided/);
    expect(t.words[c.sentences[3].firstWord].w).toBe("Eventually");
  });

  it("pins a verbatim quote to the start and end time of its words", () => {
    const c = buildCanonical(t.words);
    const pin = pinQuote(c, t.words, "i decided to recommend");
    expect(pin).not.toBeNull();
    const first = t.words.findIndex((w) => w.w === "I");
    expect(pin!.startMs).toBe(t.words[first].start);
    expect(pin!.endMs).toBe(t.words[first + 3].end);
    expect(pin!.quote).toBe("I decided to recommend");
  });

  it("refuses a quote the user never said", () => {
    expect(pinQuote(buildCanonical(t.words), t.words, "I led a team of twenty")).toBeNull();
  });

  it("chunks very long unpunctuated transcripts so pins stay specific", () => {
    const words = Array.from({ length: 60 }, (_, i) => ({ w: `word${i}`, start: i * 400, end: i * 400 + 350 }));
    expect(buildCanonical(words).sentences.length).toBeGreaterThanOrEqual(3);
  });
});

describe("delivery metrics (computed in code from timestamps)", () => {
  it("counts I-forms and we-forms, ignoring punctuation", () => {
    expect(countIWe(["I", "decided,", "we", "We're", "our", "my", "me.", "Iceland"])).toEqual({ iCount: 3, weCount: 3 });
  });

  it("time to decision = start of the decision sentence's first word", () => {
    const c = buildCanonical(t.words);
    const m = computeDelivery(c, t.words, t.durationMs, 3);
    expect(m.timeToDecisionMs).toBe(t.words[c.sentences[3].firstWord].start);
    expect(m.weCount).toBeGreaterThan(m.iCount);
    expect(computeDelivery(c, t.words, t.durationMs, null).timeToDecisionMs).toBeNull();
  });
});

describe("guards", () => {
  it("flags messages that hand the user new wording", () => {
    expect(looksLikeRewrite("Try saying: I owned the pricing decision.", FIRST)).toBe(true);
    expect(looksLikeRewrite('Instead, say "I personally drove the launch end to end".', FIRST)).toBe(true);
    expect(looksLikeRewrite("This line is general. What exactly did you do here?", FIRST)).toBe(false);
    // Quoting the user's own words back is fine.
    expect(looksLikeRewrite('You said "We looked at competitors". Which part was yours?', FIRST)).toBe(false);
  });

  it("keeps a follow-up whose quote is real, and falls back when it is invented", () => {
    const ok = verifyFollowup(FIRST, { question: 'You said "we talked to some customers". How many, and what did you learn?', quote: "we talked to some customers" });
    expect(ok).toMatchObject({ quote: "we talked to some customers", fallback: false });
    const bad = verifyFollowup(FIRST, { question: "Tell me about the twenty engineers you led.", quote: "I led twenty engineers" });
    expect(bad.fallback).toBe(true);
    expect(FIRST).toContain(bad.quote);
  });
});

describe("buildFeedback", () => {
  const llmOut = {
    answered_question: true,
    competency_shown: true,
    decision_sentence_index: 3,
    points: [
      { check_id: "vague_claim" as const, severity: "warn" as const, message: "This line is general. What exactly did you do?", quote: "We had a lot of data" },
      { check_id: "vague_claim" as const, severity: "warn" as const, message: "What did you build?", quote: "I built a pricing engine" }, // invented
      { check_id: "strong_moment" as const, severity: "info" as const, message: "Try saying: I owned it.", quote: "I decided to recommend" }, // rewrite
      { check_id: "late_decision" as const, severity: "fix" as const, message: "Too late.", quote: "Eventually I decided" }, // model may not own delivery checks
    ],
  };

  it("pins every point, drops invented quotes, rewrites and model-owned delivery checks", () => {
    const fb = buildFeedback(t.words, t.durationMs, llmOut);
    const ids = fb.points.map((p) => p.checkId);
    expect(ids).toContain("late_decision"); // from code, not from the model
    expect(ids).toContain("we_not_i");
    expect(ids.filter((i) => i === "vague_claim")).toHaveLength(1);
    expect(ids).not.toContain("strong_moment");
    expect(fb.dropped).toBe(3);
    for (const p of fb.points) {
      expect(FIRST.toLowerCase()).toContain(p.quote.toLowerCase());
      expect(p.quoteEndMs).toBeGreaterThan(p.quoteStartMs);
    }
    expect(fb.points.find((p) => p.checkId === "late_decision")!.kind).toBe("delivery");
  });

  it("reports no decision when the model finds none, and flags overly long answers", () => {
    const long = synthesizeTranscript(Array.from({ length: 40 }, () => "We worked on many things together over the year.").join(" "));
    expect(long.durationMs).toBeGreaterThan(TOO_LONG_MS);
    const fb = buildFeedback(long.words, long.durationMs, { answered_question: false, competency_shown: false, decision_sentence_index: null, points: [] });
    const ids = fb.points.map((p) => p.checkId);
    expect(ids).toEqual(expect.arrayContaining(["no_decision", "too_long", "we_not_i"]));
    expect(fb.metrics.timeToDecisionMs).toBeNull();
  });

  it("ignores an out-of-range decision index from the model", () => {
    const fb = buildFeedback(t.words, t.durationMs, { ...llmOut, decision_sentence_index: 99, points: [] });
    expect(fb.metrics.timeToDecisionMs).toBeNull();
  });
});
