/**
 * Small, dependency-free text helpers shared by mocks (now) and verifiers (Phase 1+).
 * Offsets are character offsets into the ORIGINAL string so quotes can be highlighted in place.
 */

export interface Sentence {
  text: string;
  start: number;
  end: number; // exclusive
}

/** Split into sentences on . ! ? or newlines, keeping exact offsets. Empty pieces are dropped. */
export function splitSentences(input: string): Sentence[] {
  const out: Sentence[] = [];
  const re = /[^.!?\n]+[.!?]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) {
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const text = raw.trim();
    if (!text) continue;
    const start = m.index + lead;
    out.push({ text, start, end: start + text.length });
  }
  return out;
}

/** First `n` words of a string, as a verbatim prefix (keeps original spacing and punctuation). */
export function firstWords(s: string, n: number): string {
  const m = s.match(new RegExp(`^\\s*(?:\\S+\\s+){0,${Math.max(0, n - 1)}}\\S+`));
  return (m ? m[0] : s).trim();
}

/** Whitespace-normalised, case-insensitive containment, the basis of the quote verifier. */
export function containsQuote(haystack: string, quote: string): boolean {
  return locateQuote(haystack, quote) !== null;
}

/**
 * Where a quote sits in the original text, tolerating ONLY differences in whitespace and letter case.
 * Returns offsets into the original string (end exclusive), or null if the quote is not really there.
 * This is the core of "no quote, no claim" (G2): anything a model says the user wrote must pass this.
 */
export function locateQuote(haystack: string, quote: string): { start: number; end: number } | null {
  const q = quote.trim();
  if (!q) return null;
  const exact = haystack.indexOf(q);
  if (exact >= 0) return { start: exact, end: exact + q.length };

  // Normalise both sides (collapse whitespace runs, lower-case) while remembering original positions.
  const map: number[] = [];
  let norm = "";
  let inSpace = false;
  for (let i = 0; i < haystack.length; i++) {
    const ch = haystack[i];
    if (/\s/.test(ch)) {
      if (!inSpace && norm.length) {
        norm += " ";
        map.push(i);
      }
      inSpace = true;
    } else {
      norm += ch.toLowerCase();
      map.push(i);
      inSpace = false;
    }
  }
  const nq = q.replace(/\s+/g, " ").toLowerCase();
  const idx = norm.indexOf(nq);
  if (idx < 0) return null;
  return { start: map[idx], end: map[idx + nq.length - 1] + 1 };
}
