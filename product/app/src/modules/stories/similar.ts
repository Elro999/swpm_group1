/**
 * "Is this practice answer a story the user already has?" (2026-11-27). Code-owned and deterministic: the
 * share of distinctive words (4+ letters, not common filler) that the shorter text has in common with the
 * other (overlap coefficient). Spoken answers and written stories about the same event share their nouns
 * (the product, the customer, the metric), so this catches retries and re-tellings without an extra AI call.
 */
const STOP = new Set(
  (
    "about after again also because been before being could did does doing down during each even every from have having here " +
    "into just like made make many more most much must only other over really said same should since some such than that their " +
    "them then there these they thing things this those through very want was were what when where which while will with would " +
    "your yours ours mine myself team time times work worked working took tell told know knew think thought going went able"
  ).split(" "),
);

export function distinctiveWords(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of text.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? []) {
    const word = w.replace(/'s$/, "");
    if (!STOP.has(word)) out.add(word);
  }
  return out;
}

export function similarity(a: string, b: string): number {
  const A = distinctiveWords(a);
  const B = distinctiveWords(b);
  const small = Math.min(A.size, B.size);
  if (small === 0) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return shared < MIN_SHARED ? 0 : shared / small;
}

/** Proposed thresholds: at least 6 distinctive words in common, and 40% of the shorter text's. */
export const SIMILAR_AT = 0.4;
const MIN_SHARED = 6;

/** The most similar story, if any reaches the threshold. */
export function mostSimilar<T extends { rawText: string }>(text: string, stories: T[]): T | null {
  let best: T | null = null;
  let bestScore = SIMILAR_AT;
  for (const s of stories) {
    const score = similarity(text, s.rawText);
    if (score >= bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}
