import type { LlmTaskMap } from "@/lib/contracts";
import type { StoryActor, StoryFlag, StorySentence, StorySpan, StoryState } from "@/lib/db/types";
import { locateQuote, splitSentences } from "@/lib/text";
import { isWeForm } from "@/modules/feedback/metrics";

/**
 * Turns the model's story_structure output into stories we can store (SB1–SB3), trusting nothing:
 * - situation / decision / result must be VERBATIM slices of the pasted text (wrong offsets are repaired
 *   with locateQuote; text that is not there is dropped and counted);
 * - each story's raw text is the pasted text between its first and last verified piece, widened to whole
 *   sentences; overlapping stories are dropped;
 * - sentence labels: the model's actor is used when it lines up with a sentence; flags ("we",
 *   "no_evidence") are computed in code and never auto-fixed.
 */
export interface StructuredStory {
  rawText: string;
  state: StoryState;
  situation: StorySpan | null;
  decision: StorySpan | null;
  result: StorySpan | null;
  sentences: StorySentence[];
}

type ModelOutput = LlmTaskMap["story_structure"]["output"];
type ModelSpan = { text: string; start: number; end: number } | null;

/** A result word with no number behind it is an unsupported claim (flag only; never edited). */
const CLAIM = /\b(improved|increased|reduced|grew|boosted|saved|achieved|delivered|successful(ly)?|better|faster|significant(ly)?|huge|massive)\b/i;
const I_FORM = /\b(I|I'm|I've|I'd|me|my|myself)\b/;

function verifySpan(source: string, span: ModelSpan): { start: number; end: number } | null {
  if (!span || !span.text?.trim()) return null;
  if (span.start >= 0 && span.end <= source.length && source.slice(span.start, span.end) === span.text) return { start: span.start, end: span.end };
  return locateQuote(source, span.text);
}

function codeActor(text: string): StoryActor {
  if (text.split(/\s+/).some(isWeForm)) return "team";
  return I_FORM.test(text) ? "own" : "unclear";
}

export function labelSentences(rawText: string, modelSentences: { start: number; end: number; actor: StoryActor }[] = []): StorySentence[] {
  return splitSentences(rawText).map((s) => {
    const model = modelSentences.find((m) => m.start <= s.start + 2 && m.end >= s.end - 2);
    const flags: StoryFlag[] = [];
    if (s.text.split(/\s+/).some(isWeForm)) flags.push("we");
    if (CLAIM.test(s.text) && !/\d/.test(s.text)) flags.push("no_evidence");
    return { start: s.start, end: s.end, actor: model?.actor ?? codeActor(s.text), flags };
  });
}

export function structureFromModel(source: string, out: ModelOutput): { stories: StructuredStory[]; dropped: number } {
  const sentences = splitSentences(source);
  const widenStart = (i: number) => sentences.find((s) => s.start <= i && i < s.end)?.start ?? i;
  const widenEnd = (i: number) => sentences.find((s) => s.start < i && i <= s.end)?.end ?? i;

  let dropped = 0;
  const taken: [number, number][] = [];
  const stories: StructuredStory[] = [];

  for (const m of out.stories) {
    const fields = { situation: verifySpan(source, m.situation), decision: verifySpan(source, m.decision), result: verifySpan(source, m.result) };
    for (const k of ["situation", "decision", "result"] as const) if (m[k] && !fields[k]) dropped++;
    const verified = Object.values(fields).filter((f): f is { start: number; end: number } => Boolean(f));
    if (!verified.length) continue;

    const bs = widenStart(Math.min(...verified.map((f) => f.start)));
    const be = widenEnd(Math.max(...verified.map((f) => f.end)));
    if (taken.some(([a, b]) => bs < b && a < be)) {
      dropped++;
      continue;
    }
    taken.push([bs, be]);

    const rawText = source.slice(bs, be);
    const rebase = (f: { start: number; end: number } | null): StorySpan | null =>
      f ? { text: source.slice(f.start, f.end), start: f.start - bs, end: f.end - bs } : null;
    const modelSentences = (m.sentences ?? []).map((s) => ({ start: s.start - bs, end: s.end - bs, actor: s.actor }));
    stories.push({
      rawText,
      state: "structured",
      situation: rebase(fields.situation),
      decision: rebase(fields.decision),
      result: rebase(fields.result),
      sentences: labelSentences(rawText, modelSentences),
    });
  }

  stories.sort((a, b) => source.indexOf(a.rawText) - source.indexOf(b.rawText));

  if (!stories.length && source.trim()) {
    // Nothing verifiable: keep the user's text as one draft story rather than inventing structure.
    const rawText = source.trim();
    stories.push({ rawText, state: "draft", situation: null, decision: null, result: null, sentences: labelSentences(rawText) });
  }
  return { stories, dropped };
}
