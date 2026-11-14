import type { Repo } from "@/lib/db/types";
import { getEnv } from "@/lib/env";

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
 * Cost and abuse control (task 7.1, hardened after the 2026-11-14 review):
 * - per session: at most DAILY_AI_CALL_LIMIT AI calls (model + speech-to-text) in any 24 hours
 *   (a full practice round is ~4 calls, so 80 allows ~20 rounds a day);
 * - deployment-wide: at most AI_GLOBAL_DAILY_LIMIT calls in 24 hours, so creating fresh sessions
 *   cannot run up an unbounded bill.
 * Capacity is RESERVED atomically before the provider is called (repo.aiCalls.reserve), so concurrent
 * requests cannot overshoot either limit. Enforced here because every AI call goes through withAiCall.
 */
export const DAILY_AI_CALL_LIMIT = 80;
export const DEFAULT_GLOBAL_DAILY_LIMIT = 1500;
const DAY_MS = 86_400_000;

export class AiQuotaError extends Error {
  readonly status = 429 as const;
  constructor(readonly scope: "session" | "global" = "session") {
    super(
      scope === "global"
        ? "Practice is paused for today because the demo reached its daily limit. Please try again tomorrow. Your work so far is saved."
        : "You've reached today's practice limit. It resets within 24 hours. Your work so far is saved.",
    );
    this.name = "AiQuotaError";
  }
}

export interface AiLimits {
  session: number;
  global: number;
}

export async function withAiCall<T extends AiCallOutcome>(
  repo: Repo,
  meta: AiCallMeta,
  fn: () => Promise<T>,
  now: () => number = Date.now,
  limits: AiLimits = { session: DAILY_AI_CALL_LIMIT, global: globalLimitFromEnv() },
): Promise<T> {
  const reservation = await repo.aiCalls.reserve({
    ...meta,
    sessionLimit: limits.session,
    globalLimit: limits.global,
    since: new Date(now() - DAY_MS),
  });
  if ("denied" in reservation) throw new AiQuotaError(reservation.denied);
  const started = now();
  try {
    const result = await fn();
    await repo.aiCalls.complete(reservation.id, {
      model: result.model,
      latencyMs: now() - started,
      inputTokens: result.usage?.inputTokens ?? null,
      outputTokens: result.usage?.outputTokens ?? null,
      audioMs: result.audioMs ?? null,
      status: "ok",
    });
    return result;
  } catch (err) {
    await repo.aiCalls
      .complete(reservation.id, { model: "unknown", latencyMs: now() - started, inputTokens: null, outputTokens: null, audioMs: null, status: "error" })
      .catch(() => undefined); // logging must never mask the original error
    throw err;
  }
}

function globalLimitFromEnv(): number {
  return getEnv().AI_GLOBAL_DAILY_LIMIT ?? DEFAULT_GLOBAL_DAILY_LIMIT;
}
