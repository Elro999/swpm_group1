import type { TimedWord } from "@/lib/db/types";
import { locateQuote, splitSentences } from "@/lib/text";

/**
 * The canonical transcript: the words joined by single spaces. Every quote is checked against THIS
 * text and mapped back to word indexes, so a quote always resolves to exact start/end times (MF4, G2).
 */
export interface CanonicalSentence {
  text: string;
  start: number; // char offsets in canonical text
  end: number;
  firstWord: number; // word indexes, inclusive
  lastWord: number;
}

export interface Canonical {
  text: string;
  /** Character range of each word in `text`. */
  wordSpans: { start: number; end: number }[];
  sentences: CanonicalSentence[];
}

const CHUNK_WORDS = 20;
const LONG_SENTENCE_WORDS = 40;

function wordRangeFor(spans: Canonical["wordSpans"], start: number, end: number): [number, number] | null {
  let first = -1;
  let last = -1;
  for (let i = 0; i < spans.length; i++) {
    if (spans[i].end > start && spans[i].start < end) {
      if (first < 0) first = i;
      last = i;
    }
  }
  return first < 0 ? null : [first, last];
}

export function buildCanonical(words: TimedWord[]): Canonical {
  const wordSpans: Canonical["wordSpans"] = [];
  let text = "";
  for (const w of words) {
    if (text) text += " ";
    wordSpans.push({ start: text.length, end: text.length + w.w.length });
    text += w.w;
  }

  let sentences: CanonicalSentence[] = splitSentences(text).flatMap((s) => {
    const r = wordRangeFor(wordSpans, s.start, s.end);
    return r ? [{ text: s.text, start: s.start, end: s.end, firstWord: r[0], lastWord: r[1] }] : [];
  });

  // Speech-to-text without punctuation yields one huge "sentence"; chunk it so pins stay specific.
  sentences = sentences.flatMap((s) => {
    if (s.lastWord - s.firstWord + 1 <= LONG_SENTENCE_WORDS) return [s];
    const out: CanonicalSentence[] = [];
    for (let i = s.firstWord; i <= s.lastWord; i += CHUNK_WORDS) {
      const j = Math.min(s.lastWord, i + CHUNK_WORDS - 1);
      const start = wordSpans[i].start;
      const end = wordSpans[j].end;
      out.push({ text: text.slice(start, end), start, end, firstWord: i, lastWord: j });
    }
    return out;
  });

  return { text, wordSpans, sentences };
}

export interface Pin {
  /** The user's own words at that place (canonical text), not the model's copy. */
  quote: string;
  startMs: number;
  endMs: number;
  firstWord: number;
  lastWord: number;
}

/** Locate a quote in the canonical transcript and turn it into times. Null if the user never said it. */
export function pinQuote(c: Canonical, words: TimedWord[], quote: string): Pin | null {
  const loc = locateQuote(c.text, quote);
  if (!loc) return null;
  const r = wordRangeFor(c.wordSpans, loc.start, loc.end);
  if (!r) return null;
  return { quote: c.text.slice(loc.start, loc.end), startMs: words[r[0]].start, endMs: words[r[1]].end, firstWord: r[0], lastWord: r[1] };
}

/** Pin the first `n` words of a sentence (used for code-generated points). */
export function pinSentence(c: Canonical, words: TimedWord[], index: number, n = 12): Pin {
  const s = c.sentences[index];
  const last = Math.min(s.lastWord, s.firstWord + n - 1);
  return {
    quote: c.text.slice(c.wordSpans[s.firstWord].start, c.wordSpans[last].end),
    startMs: words[s.firstWord].start,
    endMs: words[last].end,
    firstWord: s.firstWord,
    lastWord: last,
  };
}

export function formatMs(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
