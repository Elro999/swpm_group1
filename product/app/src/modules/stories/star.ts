import { STAR_PARTS, type StarPart, type StoryRow, type StorySentence } from "@/lib/db/types";
import { firstWords } from "@/lib/text";

/** Pure helpers shared by the server and the browser (no server-only imports). */

export const STAR_LABEL: Record<StarPart, string> = { situation: "Situation", task: "Task", action: "Action", result: "Result" };

/** What each part should answer (the team's STAR rule), shown as a question when a part is missing. */
export const STAR_QUESTION: Record<StarPart, string> = {
  situation: "What was the backdrop, and what challenge or opportunity were you facing?",
  task: "What did you need to accomplish? What were your responsibilities or goals?",
  action: "What specific steps did you take, and what skills did you use?",
  result: "What was achieved, and what impact did your actions have?",
};

type StarInput = Pick<StoryRow, "format" | "rawText" | "sentences">;

export type StarGroups = Record<StarPart, (StorySentence & { text: string })[]>;

/** Sentences of a STAR story grouped by part, each with its verbatim text. */
export function starGroups(story: StarInput): StarGroups {
  const groups = Object.fromEntries(STAR_PARTS.map((p) => [p, []])) as unknown as StarGroups;
  if (story.format !== "star") return groups;
  for (const s of story.sentences) if (s.part) groups[s.part].push({ ...s, text: story.rawText.slice(s.start, s.end) });
  return groups;
}

export function missingParts(story: StarInput): StarPart[] {
  const g = starGroups(story);
  return STAR_PARTS.filter((p) => g[p].length === 0);
}

/** The name shown for a story: the user's title, or the first words of their own text. */
export function storyName(story: Pick<StoryRow, "title" | "rawText">): string {
  if (story.title?.trim()) return story.title.trim();
  const words = firstWords(story.rawText, 8);
  return words.length < story.rawText.trim().length ? `${words}…` : words;
}

/** A short verbatim piece that best shows what the user did: first Action sentence (STAR) or the decision (older stories). */
export function keySentence(story: StoryRow): string | null {
  if (story.format === "star") return starGroups(story).action[0]?.text ?? null;
  return story.decision?.text ?? story.situation?.text ?? null;
}
