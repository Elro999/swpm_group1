import { describe, expect, it } from "vitest";
import { createMemoryRepo } from "@/lib/db/memory";
import { EVENT_NAMES, EventPropsError, isEventName, recordEvent, validateProps } from "./events";

describe("event props guard (PF3: no user text in analytics)", () => {
  it("accepts small primitives and ids", () => {
    expect(validateProps({ attempt_no: 2, retry: true, question_id: "3f0c8a8e-1d2b-4c1e-9a77-1f0e2d3c4b5a", x: null })).toBeTruthy();
  });

  it("rejects free text (anything with whitespace)", () => {
    expect(() => validateProps({ note: "I led the pricing project" })).toThrow(EventPropsError);
  });

  it("rejects long strings even without spaces", () => {
    expect(() => validateProps({ blob: "x".repeat(41) })).toThrow(EventPropsError);
  });

  it("rejects nested objects, arrays, non-finite numbers and too many keys", () => {
    expect(() => validateProps({ a: { b: 1 } } as never)).toThrow(EventPropsError);
    expect(() => validateProps({ a: [1] } as never)).toThrow(EventPropsError);
    expect(() => validateProps({ a: Number.NaN })).toThrow(EventPropsError);
    const many = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`k${i}`, i]));
    expect(() => validateProps(many)).toThrow(EventPropsError);
  });

  it("rejects badly named keys", () => {
    expect(() => validateProps({ "Bad Key": 1 })).toThrow(EventPropsError);
  });
});

describe("recordEvent", () => {
  it("stores a known event", async () => {
    const repo = createMemoryRepo();
    await recordEvent(repo, "s1", "feedback_viewed", { attempt_no: 1 });
    const [e] = await repo.events.list();
    expect(e).toMatchObject({ sessionId: "s1", name: "feedback_viewed", props: { attempt_no: 1 } });
  });

  it("knows the three Session 4/6 events and refuses unknown names", () => {
    for (const n of ["session_started", "first_feedback_viewed", "session_returned"]) expect(EVENT_NAMES).toContain(n);
    expect(isEventName("made_up_event")).toBe(false);
  });
});
