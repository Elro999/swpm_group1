import "server-only";
import { getEnv } from "@/lib/env";
import { createOpenAiLlm, createOpenAiStt } from "./live/openai";
import { createMockLlm } from "./mock/llm";
import { createMockStt } from "./mock/stt";
import type { LlmProvider, SttProvider } from "./types";

/**
 * Picks providers from AI_MODE (task 2.9). Live mode uses OpenAI for both the model and speech-to-text
 * (team decision 2026-11-14). Model defaults per provider; override with LLM_MODEL_JUDGE / LLM_MODEL_FAST.
 * Anthropic and Deepgram are allowed by env.ts but not implemented: they fail fast with a clear message.
 */
export const OPENAI_DEFAULT_MODELS = { judge: "gpt-6.1-sol", fast: "gpt-6-luna" } as const;

/**
 * AI time budget per HTTP request. Routes run with maxDuration = 60 s; every provider call and retry in one
 * request shares this budget, leaving ~15 s to save a "failed, try again" state if the AI is slow.
 */
export const REQUEST_AI_BUDGET_MS = 45_000;
export const requestDeadline = (now = Date.now()) => now + REQUEST_AI_BUDGET_MS;

export function getLlm(deadline: number = requestDeadline()): LlmProvider {
  const env = getEnv();
  if (env.AI_MODE === "mock") return createMockLlm();
  if (env.LLM_PROVIDER !== "openai") throw new Error("Only LLM_PROVIDER=openai is implemented. Set LLM_PROVIDER=openai.");
  return createOpenAiLlm({
    apiKey: env.OPENAI_API_KEY!,
    judgeModel: env.LLM_MODEL_JUDGE ?? OPENAI_DEFAULT_MODELS.judge,
    fastModel: env.LLM_MODEL_FAST ?? OPENAI_DEFAULT_MODELS.fast,
    deadline,
  });
}

export function getStt(deadline: number = requestDeadline()): SttProvider {
  const env = getEnv();
  if (env.AI_MODE === "mock") return createMockStt();
  if (env.STT_PROVIDER !== "openai") throw new Error("Only STT_PROVIDER=openai is implemented. Set STT_PROVIDER=openai.");
  return createOpenAiStt({ apiKey: env.OPENAI_API_KEY!, deadline });
}
