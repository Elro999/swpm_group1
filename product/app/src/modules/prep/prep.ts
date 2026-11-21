import type { CompetencyMapRow, StoryRow } from "@/lib/db/types";

/**
 * Light prep list (PRD PL1, PL2). Deterministic and DERIVED, not stored: it is rebuilt from the current
 * state every time, so it updates the moment a story is marked ready or a question is practised (PL2)
 * and can never go stale. (The `prep_items` table from migration 0001 is therefore unused.)
 *
 * Rules (proposed; tune with users):
 * - Tasks: rehearse each matched story until it is marked ready; practise each question until it has feedback.
 * - Order: open story and question tasks interleaved, story first (you need the story before you say it).
 * - 3–5 blocks of 20 minutes. If fewer than 3 are open, add "retry" blocks for questions practised once.
 * - With an interview date, blocks are spread over the days left (today first); without one, "Next up".
 */
export const BLOCK_MINUTES = 20;
export const MIN_ITEMS = 3;
export const MAX_ITEMS = 5;

export interface PrepItem {
  kind: "story" | "question";
  refId: string;
  title: string;
  detail: string | null;
  href: string;
  minutes: number;
  when: string;
  retry: boolean;
}

export interface PrepInput {
  interviewId: string;
  interviewDate: string | null; // YYYY-MM-DD
  today: Date;
  questions: { id: string; text: string }[];
  /** Number of finished (feedback ready) attempts per question id. */
  readyAttempts: Map<string, number>;
  competencies: { id: string; label: string }[];
  mapping: CompetencyMapRow[];
  stories: Pick<StoryRow, "id" | "state" | "decision" | "situation" | "rawText">[];
}

export interface PrepList {
  items: PrepItem[];
  done: number;
  total: number;
  daysLeft: number | null;
}

const DAY_MS = 86_400_000;

function daysUntil(date: string, today: Date): number {
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((new Date(`${date}T00:00:00Z`).getTime() - t) / DAY_MS);
}

function dayLabel(offset: number, today: Date): string {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) + offset * DAY_MS);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

const snippet = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function buildPrepList(input: PrepInput): PrepList {
  const labelOf = new Map(input.competencies.map((c) => [c.id, c.label]));
  const storyById = new Map(input.stories.map((s) => [s.id, s]));

  // Story tasks: one per matched story (a story may serve several competencies; list it once).
  const storyTasks: { item: PrepItem; done: boolean }[] = [];
  const seen = new Set<string>();
  for (const m of input.mapping) {
    if (m.isGap || !m.storyId || seen.has(m.storyId)) continue;
    const story = storyById.get(m.storyId);
    if (!story) continue;
    seen.add(story.id);
    storyTasks.push({
      done: story.state === "ready",
      item: {
        kind: "story",
        refId: story.id,
        title: `Rehearse your story for “${labelOf.get(m.competencyId) ?? "this skill"}”, then mark it ready`,
        detail: snippet(story.decision?.text ?? story.situation?.text ?? story.rawText),
        href: `/stories?from=${input.interviewId}`,
        minutes: BLOCK_MINUTES,
        when: "",
        retry: false,
      },
    });
  }

  const questionTasks = input.questions.map((q) => ({
    done: (input.readyAttempts.get(q.id) ?? 0) >= 1,
    q,
    item: {
      kind: "question" as const,
      refId: q.id,
      title: "Practise out loud and get feedback",
      detail: q.text,
      href: `/i/${input.interviewId}/mock/${q.id}`,
      minutes: BLOCK_MINUTES,
      when: "",
      retry: false,
    },
  }));

  const openStories = storyTasks.filter((t) => !t.done).map((t) => t.item);
  const openQuestions = questionTasks.filter((t) => !t.done).map((t) => t.item);
  const open: PrepItem[] = [];
  for (let i = 0; open.length < MAX_ITEMS && (i < openStories.length || i < openQuestions.length); i++) {
    if (openStories[i]) open.push(openStories[i]);
    if (open.length < MAX_ITEMS && openQuestions[i]) open.push(openQuestions[i]);
  }

  // Top up with retries of questions practised exactly once, so there is always something useful to do.
  for (const t of questionTasks) {
    if (open.length >= MIN_ITEMS) break;
    if ((input.readyAttempts.get(t.q.id) ?? 0) === 1) {
      open.push({ ...t.item, title: "Try again and compare with your last attempt", retry: true });
    }
  }

  const daysLeft = input.interviewDate ? daysUntil(input.interviewDate, input.today) : null;
  const perDay = daysLeft === null || daysLeft <= 0 ? open.length || 1 : Math.ceil(open.length / daysLeft);
  const items = open.map((item, i) => ({
    ...item,
    when: daysLeft === null ? "Next up" : dayLabel(Math.floor(i / perDay), input.today),
  }));

  const all = [...storyTasks, ...questionTasks];
  return { items, done: all.filter((t) => t.done).length, total: all.length, daysLeft };
}
