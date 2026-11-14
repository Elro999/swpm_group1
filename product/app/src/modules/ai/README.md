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
Live adapters (Anthropic for the LLM; OpenAI Whisper or Deepgram for STT) in task 2.9, waiting on the provider decision and keys (PRD Q1). When writing them:
- load the `claude-api` skill, use structured output / tool-use for the schema, and retry once on schema failure;
- confirm the STT model returns **word-level** timestamps, and **align punctuation from the full text onto the words** (Whisper's word list has none; `modules/feedback` splits sentences on punctuation);
- `fit_feedback` is **judgement only**: delivery checks (late decision, I vs we, length) are computed in code and any the model returns are dropped (see `modules/feedback/README.md`). The mock already behaves this way.

**Tests:** `ai.test.ts`.
