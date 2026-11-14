import { firstWords, locateQuote, splitSentences } from "@/lib/text";

/**
 * Guards for constraint C1: the AI points and asks, it never hands the user new wording.
 */

const REWRITE_PHRASES = /\b(try saying|you could say|you might say|instead,? say|say something like|rephrase (it |this )?(as|to)|reword (it |this )?(as|to)|a better (answer|version|line) (is|would be)|change (it|this) to)\b/i;

/**
 * True if a feedback message looks like suggested wording: a "try saying"-style phrase, or a quoted
 * passage of 4+ words that the user never said (quoting their own words back is allowed).
 */
export function looksLikeRewrite(message: string, transcript: string): boolean {
  if (REWRITE_PHRASES.test(message)) return true;
  for (const m of message.matchAll(/["“]([^"”]{1,400})["”]/g)) {
    const quoted = m[1].trim();
    if (quoted.split(/\s+/).length >= 4 && !locateQuote(transcript, quoted)) return true;
  }
  return false;
}

export const FALLBACK_FOLLOWUP = "What was the decision you made here, and why that option over the alternatives?";

/**
 * MF3: exactly one follow-up that quotes the answer. If the model's quote is not really in the answer
 * (or the question reads like a rewrite), fall back to a fixed decision probe pinned to the first sentence.
 */
export function verifyFollowup(answerText: string, out: { question: string; quote: string }): { question: string; quote: string; fallback: boolean } {
  const loc = locateQuote(answerText, out.quote);
  if (loc && !looksLikeRewrite(out.question, answerText)) {
    return { question: out.question.trim(), quote: answerText.slice(loc.start, loc.end), fallback: false };
  }
  const first = splitSentences(answerText)[0]?.text ?? answerText;
  return { question: FALLBACK_FOLLOWUP, quote: firstWords(first, 10), fallback: true };
}
