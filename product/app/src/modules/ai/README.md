# modules/ai

**Purpose:** every AI call goes through two small interfaces, so the vendor can change (PRD Q1 is open) and the whole product runs with no keys in mock mode (architecture A3, A4).

## Intended behaviour
- `getLlm().run(task, input)` returns `{ data, model, usage }`. `data` is **always validated** against `LLM_TASKS[task].schema` in `lib/contracts.ts`.
- `getStt().transcribe({ audio, mimeType })` returns a transcript with **per-word timestamps in ms**. That is the one hard requirement for MF4 (time to decision).
- Wrap every real call in `withAiCall(repo, { sessionId, purpose, provider }, fn)`. It logs purpose, provider, model, latency, tokens and status to `ai_calls`, **never content**, and re-throws errors unchanged.
- The LLM does judgement only (questions, vague-claim detection, competencies, fit verdicts). Timing, I/we counts and length are computed in code from the word list (Phase 2.5).
- **Never trust a quote from the model.** Feature code must verify every returned quote is in the user's text before showing it (G2, G-NO-INVENT). The mocks quote verbatim, so verifiers behave the same in tests and production.

## Tasks (see `LlmTaskMap`)
`competencies` · `questions` · `followup` · `fit_feedback` · `story_structure` · `story_map` (Phase 4) · `gap_prompts`. Model tier per task (`judge` = `LLM_MODEL_JUDGE`, `fast` = `LLM_MODEL_FAST`) is set in `LLM_TASKS`.

## Mocks (`AI_MODE=mock`)
- `mock/llm.ts`: deterministic, derives every output from the input text (sentence splitting plus simple patterns). It is not smart; it exists to make flows and verifiers testable.
- `mock/stt.ts`: ignores audio and returns a **synthetic** answer with realistic timings. Attempt 1 has the two most common defects from the research (decision late, "we" not "I"); attempt 2+ is improved, so before vs after has something to show.

## Not yet done
Live adapters: **done (2026-11-14), OpenAI only**: `live/openai.ts` (chat JSON mode + Zod validation with one retry; whisper-1 word timestamps, punctuation re-attached; `audio/mp4` sent as `.m4a` because OpenAI rejects it as `.mp4`) and `live/prompts.ts`. Verified live end to end. Anthropic/Deepgram stay unimplemented and fail fast. Rules the adapters follow:
- load the `claude-api` skill, use structured output / tool-use for the schema, and retry once on schema failure;
- confirm the STT model returns **word-level** timestamps, and **align punctuation from the full text onto the words** (Whisper's word list has none; `modules/feedback` splits sentences on punctuation);
- `fit_feedback` is **judgement only**: delivery checks (late decision, I vs we, length) are computed in code and any the model returns are dropped (see `modules/feedback/README.md`). The mock already behaves this way.

**Tests:** `ai.test.ts`.

## Cost and time limits (review fixes, 2026-11-14)
- **Quota is reserved atomically** before the provider is called (`repo.aiCalls.reserve` → SQL `reserve_ai_call`, migration 0004): 80 calls per session per 24 h **and** a deployment-wide cap (`AI_GLOBAL_DAILY_LIMIT`, default 1500). Concurrent requests cannot overshoot; `AiQuotaError.scope` says which limit was hit. Calls stay counted (unlinked) after a user deletes their data.
- **One deadline per request**: `getLlm(deadline)` / `getStt(deadline)` share `requestDeadline()` (45 s of the route's 60 s). Every call and the corrective retry use what is left; a call with under 4 s left is not started (`AiDeadlineError`), so the route always has time to save a "failed, try again" state.

