import type { LlmTask, LlmTaskMap, Transcript } from "@/lib/contracts";

/**
 * Provider interfaces (A3). Feature code depends only on these, never on a vendor SDK, so the
 * provider can change (Q1 is still open) and AI_MODE=mock can run everything without keys.
 */

export interface LlmUsage {
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface LlmResult<K extends LlmTask> {
  data: LlmTaskMap[K]["output"]; // already validated against LLM_TASKS[K].schema
  model: string;
  usage: LlmUsage;
}

export interface LlmProvider {
  readonly name: string;
  run<K extends LlmTask>(task: K, input: LlmTaskMap[K]["input"]): Promise<LlmResult<K>>;
}

export interface SttRequest {
  audio: Uint8Array;
  mimeType: string;
  /** Mock-only hint so demos show improvement on a retry; real providers ignore it. */
  attemptNo?: number;
}

export interface SttResult {
  transcript: Transcript;
  model: string;
}

export interface SttProvider {
  readonly name: string;
  transcribe(req: SttRequest): Promise<SttResult>;
}
