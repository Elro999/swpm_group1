import type { Transcript, Word } from "@/lib/contracts";
import type { SttProvider } from "../types";

/**
 * Deterministic mock speech-to-text (AI_MODE=mock). Ignores the audio and returns a SYNTHETIC answer
 * (no participant data) with realistic word timings. First attempts have the two most common defects
 * from the research (decision arrives late; "we" instead of "I"); retries return an improved answer,
 * so the before-vs-after screen has something to show in demos and E2E tests.
 */

const FIRST_ATTEMPT =
  "So in my last role we were working on pricing for a new product line. " +
  "We had a lot of data and the team ran several analyses over a few weeks. " +
  "We looked at competitors and we talked to some customers. " +
  "Eventually I decided to recommend a lower entry price for the first quarter. " +
  "The result was that adoption went up in the pilot.";

const RETRY =
  "I decided to recommend a lower entry price for the first quarter of the launch. " +
  "The situation was a new product line where the team was split on pricing. " +
  "I ran the competitor comparison myself and I spoke to six customers. " +
  "Because of that, the pilot reached its adoption target in eight weeks.";

const MS_PER_WORD = 380;
const SENTENCE_PAUSE_MS = 450;

export function synthesizeTranscript(text: string): Transcript {
  const words: Word[] = [];
  let t = 300; // small lead-in silence
  for (const token of text.split(/\s+/).filter(Boolean)) {
    const start = t;
    const end = start + MS_PER_WORD - 40;
    words.push({ w: token, start, end });
    t = end + 40 + (/[.!?]$/.test(token) ? SENTENCE_PAUSE_MS : 0);
  }
  return { words, text, durationMs: t + 200 };
}

export function createMockStt(): SttProvider {
  return {
    name: "mock",
    async transcribe({ attemptNo }) {
      return { transcript: synthesizeTranscript((attemptNo ?? 1) > 1 ? RETRY : FIRST_ATTEMPT), model: "mock" };
    },
  };
}
