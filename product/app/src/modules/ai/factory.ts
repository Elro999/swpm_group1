import "server-only";
import { getEnv } from "@/lib/env";
import { createMockLlm } from "./mock/llm";
import { createMockStt } from "./mock/stt";
import type { LlmProvider, SttProvider } from "./types";

/**
 * Picks providers from AI_MODE. Live adapters (Anthropic for the LLM; OpenAI Whisper or Deepgram
 * for STT) are added in build-plan task 2.9 once the provider decision (PRD Q1) and keys exist.
 * Until then live mode fails fast with a clear message rather than pretending to work.
 */
export function getLlm(): LlmProvider {
  if (getEnv().AI_MODE === "mock") return createMockLlm();
  throw new Error("Live LLM provider not implemented yet (build-plan task 2.9). Set AI_MODE=mock.");
}

export function getStt(): SttProvider {
  if (getEnv().AI_MODE === "mock") return createMockStt();
  throw new Error("Live speech-to-text provider not implemented yet (build-plan task 2.9). Set AI_MODE=mock.");
}
