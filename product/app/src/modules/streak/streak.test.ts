import { describe, expect, it } from "vitest";
import { computeStreak, localDay, MAX_REVIVE_DAYS, safeTimeZone, weekOf } from "./streak";

// Week of Mon 16 Nov 2026 to Sun 22 Nov 2026. Times are India time unless stated.
const at = (day: string, time = "10:00") => new Date(`${day}T${time}:00+05:30`);
const ev = (name: string, day: string, time?: string) => ({ name, at: at(day, time), props: {} });
type Iv = { id: string; date: string | null; addedAt: Date };
const iv = (id: string, date: string | null, addedDay: string): Iv => ({ id, date, addedAt: at(addedDay) });
const run = (events: ReturnType<typeof ev>[], today: string, extra: { interviews?: Iv[]; timeZone?: string; time?: string } = {}) =>
  computeStreak({ events, now: at(today, extra.time ?? "12:00"), timeZone: extra.timeZone ?? "Asia/Kolkata", interviews: extra.interviews });

describe("computeStreak", () => {
  it("is empty before any prep", () => {
    const s = run([], "2026-11-21");
    expect(s.status).toBe("none");
    expect(s.current).toBe(0);
    expect(s.week).toHaveLength(7);
    expect(s.week.find((d) => d.date === "2026-11-21")?.state).toBe("today");
  });

  it("counts any prep action, including adding an interview", () => {
    const s = run([ev("interview_added", "2026-11-19"), ev("story_added", "2026-11-20"), ev("recording_started", "2026-11-21")], "2026-11-21");
    expect(s.status).toBe("active_today");
    expect(s.current).toBe(3);
    expect(s.best).toBe(3);
  });

  it("does not count automatic page views or system steps", () => {
    const s = run([ev("questions_shown", "2026-11-21"), ev("prep_list_viewed", "2026-11-21"), ev("session_started", "2026-11-21"), ev("attempt_transcribed", "2026-11-21")], "2026-11-21");
    expect(s.status).toBe("none");
  });

  it("keeps the streak alive when today has nothing yet", () => {
    const s = run([ev("interview_added", "2026-11-19"), ev("interview_added", "2026-11-20")], "2026-11-21");
    expect(s.status).toBe("pending_today");
    expect(s.current).toBe(2);
  });

  it("forgives one missed day per week as a rest day", () => {
    const s = run([ev("story_added", "2026-11-17"), ev("story_added", "2026-11-18"), ev("story_added", "2026-11-20")], "2026-11-21");
    expect(s.status).toBe("pending_today");
    expect(s.current).toBe(3); // the rest day bridges the run but does not add to it
    expect(s.restUsedThisWeek).toBe(true);
    expect(s.week.find((d) => d.date === "2026-11-19")?.state).toBe("rest");
  });

  it("gives a fresh rest day each Monday", () => {
    // Missed Fri 13 (week 1) and Wed 18 (week 2): both forgiven.
    const days = ["2026-11-11", "2026-11-12", "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-19", "2026-11-20", "2026-11-21"];
    const s = run(days.map((d) => ev("story_added", d)), "2026-11-21");
    expect(s.status).toBe("active_today");
    expect(s.current).toBe(9);
  });

  it("breaks on a second missed day in a week, but offers a revive", () => {
    // Active Mon–Tue; Wed rest; Thu missed (lost); Fri missed (lost); today Sat nothing yet.
    const s = run([ev("story_added", "2026-11-16"), ev("story_added", "2026-11-17")], "2026-11-21");
    expect(s.status).toBe("revivable");
    expect(s.current).toBe(0);
    expect(s.revive).toMatchObject({ lostDays: 2, repsNeeded: 2, repsDone: 0, streakToRestore: 2, deadline: null });
    expect(s.week.find((d) => d.date === "2026-11-19")?.state).toBe("missed");
  });

  it("restores the old run once the revive's practice reps are done", () => {
    const base = [ev("story_added", "2026-11-16"), ev("story_added", "2026-11-17"), ev("story_added", "2026-11-18")];
    // Thu rest, Fri lost. Back on Sat: any action starts the comeback; one rep is due by Sunday.
    const reviving = run([...base, ev("interview_added", "2026-11-21")], "2026-11-21");
    expect(reviving.status).toBe("reviving");
    expect(reviving.current).toBe(1);
    expect(reviving.revive).toMatchObject({ lostDays: 1, repsNeeded: 1, repsDone: 0, deadline: "2026-11-22", streakToRestore: 3 });

    const revived = run([...base, ev("interview_added", "2026-11-21"), ev("feedback_viewed", "2026-11-21", "23:50")], "2026-11-21", { time: "23:55" });
    expect(revived.status).toBe("active_today");
    expect(revived.current).toBe(4);
    expect(revived.week.find((d) => d.date === "2026-11-20")?.state).toBe("revived");
  });

  it("lets the revive finish on the day after the comeback", () => {
    const events = [ev("story_added", "2026-11-16"), ev("story_added", "2026-11-17"), ev("interview_added", "2026-11-20"), ev("story_marked_ready", "2026-11-21"), ev("gap_story_filled", "2026-11-21")];
    // Wed rest, Thu lost. Back Fri, reps Sat.
    const s = run(events, "2026-11-21");
    expect(s.status).toBe("active_today");
    expect(s.current).toBe(4);
  });

  it("drops the old run when the revive window closes", () => {
    const events = [ev("story_added", "2026-11-09"), ev("story_added", "2026-11-10"), ev("interview_added", "2026-11-13"), ev("interview_added", "2026-11-14"), ev("story_added", "2026-11-15")];
    // Wed 11 rest, Thu 12 lost. Back Fri 13 with no reps by Sat 14: Mon–Tue are gone.
    const s = run(events, "2026-11-15");
    expect(s.status).toBe("active_today");
    expect(s.current).toBe(3);
    expect(s.best).toBe(3);
  });

  it(`cannot revive a gap longer than ${MAX_REVIVE_DAYS} days`, () => {
    const s = run([ev("story_added", "2026-11-14"), ev("story_added", "2026-11-15")], "2026-11-21");
    // Mon 16 rest, Tue–Fri = 4 lost days.
    expect(s.status).toBe("broken");
    expect(s.current).toBe(0);
    expect(s.best).toBe(2);
    expect(s.revive).toBeNull();
  });

  it("uses the user's own calendar day (00:30 in India is the next day)", () => {
    const late = { name: "feedback_viewed", at: new Date("2026-11-20T19:00:00Z"), props: {} }; // 00:30 IST on the 21st
    expect(localDay(late.at, "Asia/Kolkata")).toBe("2026-11-21");
    expect(localDay(late.at, "Europe/Berlin")).toBe("2026-11-20");
    const india = computeStreak({ events: [late], now: new Date("2026-11-21T06:00:00Z"), timeZone: "Asia/Kolkata" });
    expect(india.status).toBe("active_today");
    const berlin = computeStreak({ events: [late], now: new Date("2026-11-21T06:00:00Z"), timeZone: "Europe/Berlin" });
    expect(berlin.status).toBe("pending_today");
  });

  it("falls back to India time for a bad timezone", () => {
    expect(safeTimeZone("Not/AZone")).toBe("Asia/Kolkata");
    expect(safeTimeZone(42)).toBe("Asia/Kolkata");
    expect(safeTimeZone("Europe/Berlin")).toBe("Europe/Berlin");
  });

  it("counts this week's prep days and practice reps", () => {
    const s = run([ev("story_added", "2026-11-15"), ev("feedback_viewed", "2026-11-16"), ev("feedback_viewed", "2026-11-16"), ev("story_marked_ready", "2026-11-17")], "2026-11-17");
    expect(s.weekDays).toBe(2);
    expect(s.weekReps).toBe(3);
    expect(weekOf("2026-11-22")).toBe("2026-11-16");
    expect(s.week.map((d) => d.state)).toEqual(["active", "active", "future", "future", "future", "future", "future"]);
  });

  it("counts down to the nearest interview that has not passed", () => {
    const s = run([ev("interview_added", "2026-11-21")], "2026-11-21", {
      interviews: [iv("a", "2026-11-10", "2026-11-01"), iv("b", "2026-11-27", "2026-11-21"), iv("c", "2026-12-05", "2026-11-21"), iv("d", null, "2026-11-21")],
    });
    expect(s.daysToInterview).toBe(6);
    expect(s.milestones.map((m) => m.interviewId)).toEqual(["a", "b", "c"]); // no date, no milestone
    expect(run([], "2026-11-21", { interviews: [] }).daysToInterview).toBeNull();
  });
});

describe("interview milestones", () => {
  it("shows the road to an upcoming interview", () => {
    const events = [ev("interview_added", "2026-11-18"), ev("story_added", "2026-11-19"), ev("feedback_viewed", "2026-11-21")];
    const s = run(events, "2026-11-21", { interviews: [iv("x", "2026-11-27", "2026-11-18")] });
    expect(s.milestones[0]).toMatchObject({ status: "upcoming", daysToGo: 6, addedOn: "2026-11-18", windowDays: 9, elapsedDays: 4, preppedDays: 3 });
    const track = s.milestones[0].track;
    expect(track).toHaveLength(9); // 18th to 26th: the road ends the day before the interview
    expect(track.slice(0, 4).map((d) => d.state)).toEqual(["prepped", "prepped", "missed", "prepped"]);
    expect(track.at(-1)).toEqual({ date: "2026-11-26", state: "future" });
    expect(s.week.find((d) => d.date === "2026-11-27")).toBeUndefined(); // next week
  });

  it("does not count today against the road until the day is over", () => {
    const s = run([ev("interview_added", "2026-11-20")], "2026-11-21", { interviews: [iv("x", "2026-11-25", "2026-11-20")] });
    expect(s.milestones[0]).toMatchObject({ elapsedDays: 1, preppedDays: 1 });
    expect(s.milestones[0].track[1]).toEqual({ date: "2026-11-21", state: "today" });
  });

  it("never breaks the streak on the interview day, and keeps the weekly rest day", () => {
    const events = [ev("story_added", "2026-11-16"), ev("story_added", "2026-11-17"), ev("story_added", "2026-11-19"), ev("story_added", "2026-11-21")];
    // Wed 18 is the interview (no prep); Fri 20 missed and uses the rest day.
    const s = run(events, "2026-11-21", { interviews: [iv("x", "2026-11-18", "2026-11-16")] });
    expect(s.status).toBe("active_today");
    expect(s.current).toBe(4);
    expect(s.week.find((d) => d.date === "2026-11-18")).toMatchObject({ state: "interview", interview: true });
    expect(s.week.find((d) => d.date === "2026-11-20")?.state).toBe("rest");
  });

  it("marks the interview day in the week strip before it comes", () => {
    const s = run([ev("interview_added", "2026-11-17")], "2026-11-17", { interviews: [iv("x", "2026-11-20", "2026-11-17")] });
    expect(s.week.find((d) => d.date === "2026-11-20")).toMatchObject({ state: "future", interview: true });
  });

  it("reports the result once the interview has passed", () => {
    const events = [ev("interview_added", "2026-11-16"), ev("story_added", "2026-11-17"), ev("feedback_viewed", "2026-11-19")];
    const s = run(events, "2026-11-21", { interviews: [iv("x", "2026-11-20", "2026-11-16")] });
    expect(s.milestones[0]).toMatchObject({ status: "done", daysToGo: 0, windowDays: 4, elapsedDays: 4, preppedDays: 3 });
    const today = run(events, "2026-11-20", { interviews: [iv("x", "2026-11-20", "2026-11-16")] });
    expect(today.milestones[0].status).toBe("today");
    expect(today.daysToInterview).toBe(0);
  });

  it("has an empty road for an interview added on or after its date", () => {
    const s = run([ev("interview_added", "2026-11-21")], "2026-11-21", { interviews: [iv("x", "2026-11-19", "2026-11-21")] });
    expect(s.milestones[0]).toMatchObject({ status: "done", windowDays: 0, elapsedDays: 0, preppedDays: 0, track: [] });
  });
});
