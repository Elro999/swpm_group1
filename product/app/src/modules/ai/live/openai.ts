import { z } from "zod";
import { LLM_TASKS, type LlmTask, type LlmTaskMap, type Word } from "@/lib/contracts";
import type { LlmProvider, LlmResult, SttProvider } from "../types";
import { systemPrompt, userMessage } from "./prompts";

/**
 * Live OpenAI adapters (task 2.9). No SDK: plain fetch, so tests can inject a fake fetch and nothing
 * leaves the machine. Logs never include request or response content.
 * - LLM: Chat Completions with JSON output, validated against our Zod contract; one corrective retry.
 * - STT: whisper-1 with word timestamps (verbose_json). Whisper's word list has no punctuation, so it is
 *   re-attached from the full text (alignPunctuation): our sentence splitting depends on it.
 *   whisper-1 is deprecated but supports word timestamps until 26 Feb 2027 (OpenAI docs, Nov 2026).
 */
const API = "https://api.openai.com/v1";
type Fetch = typeof fetch;

export interface OpenAiOptions {
  apiKey: string;
  judgeModel: string;
  fastModel: string;
  fetchImpl?: Fetch;
  /** Cap for one HTTP call. */
  timeoutMs?: number;
  /**
   * Request-wide deadline (epoch ms) shared by every call AND retry this provider makes in one request,
   * so a chain of slow-but-successful calls cannot run past the route's maxDuration (review fix).
   */
  deadline?: number;
  now?: () => number;
}

class OpenAiError extends Error {
  constructor(public readonly status: number, what: string) {
    super(`OpenAI ${what} failed (HTTP ${status})`);
    this.name = "OpenAiError";
  }
}

/** Thrown before a call when too little of the request budget is left to finish it. */
export class AiDeadlineError extends Error {
  constructor() {
    super("AI request budget used up");
    this.name = "AiDeadlineError";
  }
}

const PER_CALL_TIMEOUT_MS = 40_000;
/** Below this, a call is not started at all: it could not finish, and the time is better spent saving state. */
export const MIN_CALL_MS = 4_000;

function callSignal(opts: { timeoutMs?: number; deadline?: number; now?: () => number }): AbortSignal {
  const perCall = opts.timeoutMs ?? PER_CALL_TIMEOUT_MS;
  const remaining = opts.deadline === undefined ? perCall : opts.deadline - (opts.now ?? Date.now)();
  if (remaining < MIN_CALL_MS) throw new AiDeadlineError();
  return AbortSignal.timeout(Math.min(perCall, remaining));
}

export function createOpenAiLlm(opts: OpenAiOptions): LlmProvider {
  const doFetch = opts.fetchImpl ?? fetch;
  return {
    name: "openai",
    async run<K extends LlmTask>(task: K, input: LlmTaskMap[K]["input"]): Promise<LlmResult<K>> {
      const { schema, tier } = LLM_TASKS[task];
      const model = tier === "judge" ? opts.judgeModel : opts.fastModel;
      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt(task, z.toJSONSchema(schema as z.ZodType)) },
        { role: "user", content: userMessage(input) },
      ];
      let inputTokens = 0;
      let outputTokens = 0;
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await doFetch(`${API}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model, messages, response_format: { type: "json_object" } }),
          signal: callSignal(opts), // the corrective retry shares the same request deadline
        });
        if (!res.ok) throw new OpenAiError(res.status, task);
        const body = (await res.json()) as {
          choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        inputTokens += body.usage?.prompt_tokens ?? 0;
        outputTokens += body.usage?.completion_tokens ?? 0;
        const content = body.choices?.[0]?.message?.content ?? "";
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(content);
        } catch {
          parsed = null;
        }
        const check = schema.safeParse(parsed);
        if (check.success) {
          return { data: check.data as LlmTaskMap[K]["output"], model, usage: { inputTokens, outputTokens } };
        }
        // One corrective retry with the validation problems (field paths only, no user text).
        const problems = check.error.issues.slice(0, 8).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
        messages.push({ role: "assistant", content: content.slice(0, 4000) });
        messages.push({ role: "user", content: `That JSON did not match the schema (${problems}). Reply with corrected JSON only.` });
      }
      throw new Error(`OpenAI ${task}: output did not match the schema after a retry`);
    },
  };
}

// audio/mp4 (Safari/iOS recordings) must be sent as .m4a: OpenAI returns 400 "Invalid file format"
// for audio-only MP4 named .mp4 (found in the live smoke test, 2026-11-14).
const EXT: Record<string, string> = { webm: "webm", mp4: "m4a", "x-m4a": "m4a", aac: "m4a", ogg: "ogg", mpeg: "mp3", wav: "wav" };

function fileName(mime: string): string {
  const sub = mime.split(";")[0].split("/")[1] ?? "webm";
  return `answer.${EXT[sub] ?? "webm"}`;
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");

/**
 * Re-attach punctuation and capitalisation from Whisper's full text onto its word list, in order.
 * Words that cannot be matched keep Whisper's own spelling. Times become integer ms, non-decreasing.
 */
export function alignPunctuation(words: { word: string; start: number; end: number }[], text: string): Word[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  let t = 0;
  let last = 0;
  return words.map((w) => {
    const target = norm(w.word);
    let out = w.word.trim();
    for (let j = t; j < Math.min(tokens.length, t + 4); j++) {
      if (norm(tokens[j]) === target) {
        out = tokens[j];
        t = j + 1;
        break;
      }
    }
    const start = Math.max(last, Math.round(w.start * 1000));
    const end = Math.max(start + 1, Math.round(w.end * 1000));
    last = end;
    return { w: out || w.word, start, end };
  });
}

export function createOpenAiStt(opts: { apiKey: string; fetchImpl?: Fetch; timeoutMs?: number; deadline?: number; now?: () => number }): SttProvider {
  const doFetch = opts.fetchImpl ?? fetch;
  return {
    name: "openai",
    async transcribe({ audio, mimeType }) {
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType.split(";")[0] }), fileName(mimeType));
      form.append("model", "whisper-1");
      form.append("response_format", "verbose_json");
      form.append("timestamp_granularities[]", "word");
      const res = await doFetch(`${API}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${opts.apiKey}` },
        body: form,
        signal: callSignal(opts),
      });
      if (!res.ok) throw new OpenAiError(res.status, "transcription");
      const body = (await res.json()) as { text?: string; duration?: number; words?: { word: string; start: number; end: number }[] };
      const words = alignPunctuation(body.words ?? [], body.text ?? "");
      const durationMs = Math.max(Math.round((body.duration ?? 0) * 1000), words.at(-1)?.end ?? 0);
      return { transcript: { words, text: words.map((w) => w.w).join(" "), durationMs }, model: "whisper-1" };
    },
  };
}
