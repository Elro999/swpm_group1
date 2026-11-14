import { firstWords, locateQuote, splitSentences } from "@/lib/text";
import { findInventions } from "@/modules/stories/guard";

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

/**
 * G-NO-INVENT for model-written feedback and follow-ups (review fix): a message must not state a number or a
 * name the user never said, or claim a bigger role ("you led", "you personally drove") in a statement.
 * `source` is everything the message may legitimately refer to: the transcript, the question and the
 * competency. Ownership verbs are allowed inside questions ("What did you lead?") because a question asks,
 * it does not claim; "your own …" is not an ownership claim.
 */
export function inventsClaims(message: string, source: string): boolean {
  const all = findInventions(message, source);
  if (all.some((i) => i.kind !== "ownership")) return true;
  for (const sentence of splitSentences(message)) {
    const text = sentence.text.trim();
    if (text.endsWith("?")) continue;
    const claims = findInventions(text.replace(/\b(your|their|my|his|her|our) own\b/gi, "$1"), source);
    if (claims.some((i) => i.kind === "ownership")) return true;
  }
  return false;
}

export const FALLBACK_FOLLOWUP = "What was the decision you made here, and why that option over the alternatives?";

/**
 * MF3: exactly one follow-up that quotes the answer. If the model's quote is not really in the answer
 * (or the question reads like a rewrite), fall back to a fixed decision probe pinned to the first sentence.
 */
export function verifyFollowup(
  answerText: string,
  out: { question: string; quote: string },
  context = "",
): { question: string; quote: string; fallback: boolean } {
  const loc = locateQuote(answerText, out.quote);
  if (loc && !looksLikeRewrite(out.question, answerText) && !inventsClaims(out.question, `${answerText}\n${context}`)) {
    return { question: out.question.trim(), quote: answerText.slice(loc.start, loc.end), fallback: false };
  }
  const first = splitSentences(answerText)[0]?.text ?? answerText;
  return { question: FALLBACK_FOLLOWUP, quote: firstWords(first, 10), fallback: true };
}
