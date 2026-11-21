import { describe, expect, it } from "vitest";
import { createMemoryAudioStore } from "@/lib/audio";
import { createMemoryRepo } from "@/lib/db/memory";
import type { EventRow } from "@/lib/db/types";
import { createMockLlm } from "@/modules/ai/mock/llm";
import { createMockStt } from "@/modules/ai/mock/stt";
import { ratePoint, skipFollowup, startAttempt, submitAnswerAudio } from "@/modules/attempt/service";
import { createInterview } from "@/modules/interview/service";
import { startSession } from "@/modules/session/session";
import { SAMPLE_JD } from "@/test/fixtures";
import { adminCookieValue, cookieGrantsAdmin, keyMatches } from "./auth";
import { computeMetrics } from "./metrics";
import { buildAdminOverview, buildSessionReview } from "./review";

const KEY = "a-long-random-admin-key-123";

describe("admin auth", () => {
  it("accepts only the exact key; off when no key is configured", () => {
    expect(keyMatches(KEY, KEY)).toBe(true);
    expect(keyMatches("wrong", KEY)).toBe(false);
    expect(keyMatches("", KEY)).toBe(false);
    expect(keyMatches(KEY, undefined)).toBe(false);
  });
  it("the cookie is derived from the key, never the key itself", () => {
    const v = adminCookieValue(KEY);
    expect(v).not.toContain(KEY);
    expect(cookieGrantsAdmin(v, KEY)).toBe(true);
    expect(cookieGrantsAdmin(v, "another-key-entirely-xx")).toBe(false);
    expect(cookieGrantsAdmin(KEY, KEY)).toBe(false); // the raw key is not a valid cookie
    expect(cookieGrantsAdmin(undefined, KEY)).toBe(false);
  });
});

const day = 86_400_000;
const now = new Date("2026-12-01T12:00:00Z");
const ev = (sessionId: string, name: string, props: EventRow["props"] = {}): EventRow => ({ sessionId, name, props, at: now });

describe("computeMetrics (PF5: the five MVP hypotheses + counter-metric)", () => {
  const sessions = [
    { id: "a", createdAt: new Date(now.getTime() - 10 * day) },
    { id: "b", createdAt: new Date(now.getTime() - 9 * day) },
    { id: "c", createdAt: new Date(now.getTime() - 1 * day) },
  ];
  const events: EventRow[] = [
    ...sessions.map((s) => ev(s.id, "interview_added")),
    ev("a", "first_feedback_viewed", { ms_since_start: 120_000 }),
    ev("b", "first_feedback_viewed", { ms_since_start: 420_000 }),
    ev("a", "feedback_viewed"),
    ev("b", "feedback_viewed"),
    ev("a", "retry_started"),
    ev("a", "gap_story_filled"),
    ev("a", "gap_story_filled"),
    ev("b", "gap_story_filled"),
    ev("a", "session_returned", { days_since_start: 8 }),
    ev("b", "session_returned", { days_since_start: 2 }), // week 1, does not count
  ];
  const m = Object.fromEntries(
    computeMetrics({ sessions, events, stories: [{ state: "ready" }, { state: "structured" }], feedbackPoints: 10, notUsefulPoints: 1, now }).map((r) => [r.key, r]),
  );

  it("time to first feedback: share within 5 minutes among sessions that got feedback", () => {
    expect(m.first_feedback_5min).toMatchObject({ numerator: 1, denominator: 2, display: "50%", status: "fail" });
    expect(m.first_feedback_5min.note).toMatch(/Median/);
  });
  it("retry after feedback", () => expect(m.retry_after_feedback).toMatchObject({ numerator: 1, denominator: 2, status: "fail" }));
  it("stories ready", () => expect(m.stories_ready).toMatchObject({ numerator: 1, denominator: 2, display: "50%" }));
  it("gaps filled per user", () => expect(m.gaps_filled).toMatchObject({ numerator: 3, denominator: 3, display: "1.0 per user", status: "pass" }));
  it("week-2 return counts only day 7–14 returns among sessions ≥ 7 days old", () =>
    expect(m.week2_return).toMatchObject({ numerator: 1, denominator: 2, status: "pass" }));
  it("counter-metric: lower is better", () => expect(m.not_useful_rate).toMatchObject({ display: "10%", status: "pass" }));

  it("says 'no data yet' instead of a fake 0%", () => {
    const empty = computeMetrics({ sessions: [], events: [], stories: [], feedbackPoints: 0, notUsefulPoints: 0, now });
    expect(empty.every((r) => r.status === "no_data")).toBe(true);
  });
});

describe("admin review data", () => {
  it("shows a session's transcript, pinned points with quotes, and not-useful flags with reasons", async () => {
    const repo = createMemoryRepo();
    const llm = createMockLlm();
    const { session } = await startSession(repo);
    await repo.sessions.setConsent(session.id, new Date());
    const s = (await repo.sessions.findById(session.id))!;
    const { questions } = await createInterview({ repo, llm }, s.id, { jd: SAMPLE_JD, cv: null, interviewDate: null });
    const deps = { repo, llm, stt: createMockStt(), audio: createMemoryAudioStore() };
    const a = await startAttempt(deps, s, questions[0].id);
    await submitAnswerAudio(deps, s, a.id, new Uint8Array([1]), "audio/webm");
    await skipFollowup(deps, s, a.id);
    const [p] = (await repo.feedback.get(a.id)).points;
    await ratePoint(deps, s, p.id, { notUseful: true, reason: "wrong moment" });

    const review = (await buildSessionReview(repo, s.id))!;
    const att = review.interviews[0].questions[0].attempts[0];
    expect(att.transcript).toMatch(/I decided/);
    expect(att.points.length).toBeGreaterThan(0);
    for (const pt of att.points) expect(att.transcript!.toLowerCase()).toContain(pt.quote.toLowerCase());
    expect(att.points.find((x) => x.notUseful)?.reason).toBe("wrong moment");

    const overview = await buildAdminOverview(repo);
    expect(overview.sessions[0]).toMatchObject({ id: s.id, consented: true, interviews: 1, attempts: 1, notUseful: 1 });
    expect(overview.metrics).toHaveLength(6);
    expect(await buildSessionReview(repo, "00000000-0000-4000-8000-000000000000")).toBeNull();
  });
});
