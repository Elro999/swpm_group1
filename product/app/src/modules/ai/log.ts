import type { Repo } from "@/lib/db/types";

/**
 * Wraps one AI call and records it in ai_calls: purpose, provider, model, latency, tokens, status.
 * NEVER records prompts, inputs or outputs (C5). Errors are recorded and then re-thrown unchanged,
 * so callers still decide how to show the failure.
 */
export interface AiCallMeta {
  sessionId: string | null;
  purpose: string;
  provider: string;
}

export interface AiCallOutcome {
  model: string;
  usage?: { inputTokens: number | null; outputTokens: number | null };
  audioMs?: number | null;
}

/**
 * Cost and abuse control (task 7.1): at most this many AI calls (model + speech-to-text) per session in any
 * 24 hours. A full practice round is ~3 calls, so 80 allows ~25 rounds a day. Enforced here because every
 * AI call goes through withAiCall.
 */
export const DAILY_AI_CALL_LIMIT = 80;
const DAY_MS = 86_400_000;

export class AiQuotaError extends Error {
  readonly status = 429 as const;
  constructor() {
    super("You've reached today's practice limit. It resets within 24 hours. Your work so far is saved.");
    this.name = "AiQuotaError";
  }
}

export async function withAiCall<T extends AiCallOutcome>(
  repo: Repo,
  meta: AiCallMeta,
  fn: () => Promise<T>,
  now: () => number = Date.now,
  limit: number = DAILY_AI_CALL_LIMIT,
): Promise<T> {
  if (meta.sessionId) {
    const since = now() - DAY_MS;
    const recent = (await repo.aiCalls.list({ sessionId: meta.sessionId })).filter((c) => c.at.getTime() >= since).length;
    if (recent >= limit) throw new AiQuotaError();
  }
  const started = now();
  try {
    const result = await fn();
    await repo.aiCalls.insert({
      ...meta,
      model: result.model,
      latencyMs: now() - started,
      inputTokens: result.usage?.inputTokens ?? null,
      outputTokens: result.usage?.outputTokens ?? null,
      audioMs: result.audioMs ?? null,
      status: "ok",
      at: new Date(),
    });
    return result;
  } catch (err) {
    await repo.aiCalls
      .insert({ ...meta, model: "unknown", latencyMs: now() - started, status: "error", at: new Date() })
      .catch(() => undefined); // logging must never mask the original error
    throw err;
  }
}
