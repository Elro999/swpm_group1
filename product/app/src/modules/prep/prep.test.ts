import { describe, expect, it } from "vitest";
import type { CompetencyMapRow, StoryRow } from "@/lib/db/types";
import { buildPrepList, type PrepInput } from "./prep";

const today = new Date(2026, 10, 14); // 14 Nov 2026, local
const q = (n: number) => ({ id: `q${n}`, text: `Question ${n}?` });
const story = (id: string, state: StoryRow["state"]): PrepInput["stories"][number] => ({
  id, state, decision: { text: `Decision in ${id}`, start: 0, end: 10 }, situation: null, rawText: `Text of ${id}`,
});
const map = (competencyId: string, storyId: string | null): CompetencyMapRow => ({ competencyId, storyId, isGap: storyId === null, rationaleQuote: null });

function input(over: Partial<PrepInput> = {}): PrepInput {
  return {
    interviewId: "iv",
    interviewDate: null,
    today,
    questions: [q(1), q(2), q(3), q(4)],
    readyAttempts: new Map(),
    competencies: [{ id: "c1", label: "Roadmap" }, { id: "c2", label: "Data" }, { id: "c3", label: "Ambiguity" }],
    mapping: [map("c1", "s1"), map("c2", "s2"), map("c3", null)],
    stories: [story("s1", "structured"), story("s2", "structured")],
    ...over,
  };
}

describe("buildPrepList (PL1, PL2)", () => {
  it("gives 3–5 blocks of 20 minutes, stories and questions interleaved, story first", () => {
    const p = buildPrepList(input());
    expect(p.items.length).toBe(5);
    expect(p.items.map((i) => i.kind)).toEqual(["story", "question", "story", "question", "question"]);
    expect(p.items.every((i) => i.minutes === 20)).toBe(true);
    expect(p.items[1].href).toBe("/i/iv/mock/q1");
  });

  it("drops a story as soon as it is marked ready, and a question once it has feedback (PL2)", () => {
    const p = buildPrepList(input({ stories: [story("s1", "ready"), story("s2", "structured")], readyAttempts: new Map([["q1", 1]]) }));
    expect(p.items.some((i) => i.refId === "s1")).toBe(false);
    expect(p.items.some((i) => i.refId === "q1" && !i.retry)).toBe(false);
    expect(p.done).toBe(2);
    expect(p.total).toBe(6);
  });

  it("lists a story once even if it serves several skills, and ignores gaps", () => {
    const p = buildPrepList(input({ mapping: [map("c1", "s1"), map("c2", "s1"), map("c3", null)] }));
    expect(p.items.filter((i) => i.kind === "story")).toHaveLength(1);
  });

  it("tops up with retries when fewer than 3 tasks are open", () => {
    const p = buildPrepList(input({
      questions: [q(1), q(2), q(3)],
      readyAttempts: new Map([["q1", 1], ["q2", 1], ["q3", 2]]),
      stories: [story("s1", "ready"), story("s2", "ready")],
    }));
    expect(p.items.length).toBe(2); // only the two questions practised exactly once can be retried
    expect(p.items.every((i) => i.retry && i.title.startsWith("Try again"))).toBe(true);
  });

  it("spreads blocks over the days left, today first; 'Next up' without a date", () => {
    expect(buildPrepList(input()).items.every((i) => i.when === "Next up")).toBe(true);
    const twoDays = buildPrepList(input({ interviewDate: "2026-11-16" }));
    expect(twoDays.daysLeft).toBe(2);
    expect(twoDays.items.map((i) => i.when)).toEqual(["Today", "Today", "Today", "Tomorrow", "Tomorrow"]);
    const past = buildPrepList(input({ interviewDate: "2026-11-10" }));
    expect(past.items.every((i) => i.when === "Today")).toBe(true);
  });

  it("works with no stories at all (questions only)", () => {
    const p = buildPrepList(input({ mapping: [], stories: [] }));
    expect(p.items.map((i) => i.kind)).toEqual(["question", "question", "question", "question"]);
  });
});
