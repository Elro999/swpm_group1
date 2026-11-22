import type { LlmTaskMap } from "@/lib/contracts";
import { STAR_PARTS, type StarPart, type StoryActor, type StoryFlag, type StorySentence, type StoryState } from "@/lib/db/types";
import { locateQuote, splitSentences } from "@/lib/text";
import { isWeForm } from "@/modules/feedback/metrics";

/**
 * Turns the model's STAR labels into a story we can store (SB1–SB3, STAR since 2026-11-22), trusting nothing:
 * - code splits the user's text into sentences itself; the model only LABELS them (part + actor). A model
 *   sentence counts only where its text is really in the story (offsets checked, else re-found with
 *   locateQuote); anything else is dropped and counted;
 * - LOSSLESS: every sentence of the user's text lands in exactly one STAR part. A sentence the model skipped
 *   joins the part of the sentence before it (the first one defaults to Situation);
 * - flags are computed in code, never auto-fixed: "we" on Action sentences, "no_evidence" (a result word
 *   with no number) on Result sentences;
 * - a part that is missing stays missing: the UI asks the user for it; nothing is invented.
 */
export interface StarStructure {
  sentences: StorySentence[];
  /** STAR parts with no sentence, in S-T-A-R order. */
  missing: StarPart[];
  /** "structured" when all four parts are there; otherwise "draft" (cannot be marked ready yet). */
  state: Extract<StoryState, "draft" | "structured">;
  /** Model sentences whose text was not in the story. */
  dropped: number;
}

type ModelOutput = LlmTaskMap["story_structure"]["output"];

/** A result word with no number behind it is an unsupported claim (flag only; never edited). */
const CLAIM = /\b(improved|increased|reduced|grew|boosted|saved|achieved|delivered|successful(ly)?|better|faster|significant(ly)?|huge|massive)\b/i;
const I_FORM = /\b(I|I'm|I've|I'd|me|my|myself)\b/;

function codeActor(text: string): StoryActor {
  if (text.split(/\s+/).some(isWeForm)) return "team";
  return I_FORM.test(text) ? "own" : "unclear";
}

function flagsFor(text: string, part: StarPart): StoryFlag[] {
  const flags: StoryFlag[] = [];
  if (part === "action" && text.split(/\s+/).some(isWeForm)) flags.push("we");
  if (part === "result" && CLAIM.test(text) && !/\d/.test(text)) flags.push("no_evidence");
  return flags;
}

export function structureStar(source: string, out: ModelOutput): StarStructure {
  let dropped = 0;
  const labelled: { start: number; end: number; part: StarPart; actor: StoryActor }[] = [];
  for (const m of out.sentences) {
    const exact = m.start >= 0 && m.end <= source.length && m.end > m.start && source.slice(m.start, m.end) === m.text;
    const loc = exact ? { start: m.start, end: m.end } : locateQuote(source, m.text);
    if (!loc) {
      dropped++;
      continue;
    }
    labelled.push({ ...loc, part: m.part, actor: m.actor });
  }

  let previous: StarPart = "situation";
  const sentences: StorySentence[] = splitSentences(source).map((s) => {
    // The model label that covers most of this sentence (at least half of it), if any.
    let best: (typeof labelled)[number] | null = null;
    let bestOverlap = 0;
    for (const l of labelled) {
      const overlap = Math.min(l.end, s.end) - Math.max(l.start, s.start);
      if (overlap > bestOverlap) {
        best = l;
        bestOverlap = overlap;
      }
    }
    const model = best && bestOverlap * 2 >= s.end - s.start ? best : null;
    const part = model?.part ?? previous;
    previous = part;
    return { start: s.start, end: s.end, part, actor: model?.actor ?? codeActor(s.text), flags: flagsFor(s.text, part) };
  });

  const missing = STAR_PARTS.filter((p) => !sentences.some((s) => s.part === p));
  return { sentences, missing, state: missing.length ? "draft" : "structured", dropped };
}
