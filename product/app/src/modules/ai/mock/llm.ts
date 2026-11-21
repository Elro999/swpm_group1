import { LLM_TASKS, type LlmTask, type LlmTaskMap } from "@/lib/contracts";
import { firstWords, splitSentences } from "@/lib/text";
import type { LlmProvider, LlmResult } from "../types";

/**
 * Deterministic mock LLM (AI_MODE=mock). Every output is derived from the INPUT text, so quotes are
 * always verbatim and the downstream verifiers behave exactly as they will with a real model.
 * It is not "smart"; it exists so the whole product runs and is testable with no keys.
 */

type Handler<K extends LlmTask> = (input: LlmTaskMap[K]["input"]) => LlmTaskMap[K]["output"];

const VAGUE = /\b(helped|worked on|involved|various|several|some|a lot|improved|supported|we)\b/i;
const DECISION = /\b(decided|chose|recommended|proposed|pushed for|I picked|I made the call)\b/i;

/** Split text into blank-line-separated blocks, keeping each block's offset in the original. */
function blocksOf(text: string): { text: string; offset: number }[] {
  const out: { text: string; offset: number }[] = [];
  const re = /\n\s*\n/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push({ text: text.slice(last, m.index), offset: last });
    last = m.index + m[0].length;
  }
  out.push({ text: text.slice(last), offset: last });
  return out.filter((b) => b.text.trim());
}

const handlers: { [K in LlmTask]: Handler<K> } = {
  competencies({ jd }) {
    let quotes = splitSentences(jd).map((s) => s.text).filter((t) => t.length >= 20);
    if (quotes.length < 4) {
      // Fall back to equal word chunks; still verbatim substrings of the JD.
      const words = jd.trim().split(/\s+/);
      const size = Math.max(1, Math.ceil(words.length / 4));
      quotes = [0, 1, 2, 3].map((i) => words.slice(i * size, (i + 1) * size).join(" ")).filter(Boolean);
      while (quotes.length < 4) quotes.push(quotes[quotes.length - 1] ?? jd.trim());
    }
    return {
      competencies: quotes.slice(0, 6).map((q) => ({
        label: firstWords(q, 4).replace(/[^\w\s-]/g, "").slice(0, 80) || "Competency",
        jd_quote: q.slice(0, 400),
      })),
    };
  },

  questions({ competencies }) {
    const picked = competencies.slice(0, 5);
    while (picked.length < 3) picked.push(competencies[picked.length % competencies.length]);
    return {
      questions: picked.map((c) => ({
        competency_label: c.label,
        text: `Tell me about a time your work showed this: "${firstWords(c.jd_quote, 8)}". What did you decide?`,
        jd_quote: c.jd_quote,
      })),
    };
  },

  followup({ transcript }) {
    const sentences = splitSentences(transcript);
    const target = sentences.find((s) => VAGUE.test(s.text)) ?? sentences[0];
    const quote = firstWords(target?.text ?? transcript, 10) || transcript.trim().slice(0, 50);
    return { question: `You said "${quote}". What exactly did you do yourself, and what changed because of it?`, quote };
  },

  // Judgement only: delivery checks (late decision, we vs I, length) are computed in code, not by the model.
  fit_feedback({ sentences }) {
    const decisionIdx = sentences.findIndex((s) => DECISION.test(s));
    const points: LlmTaskMap["fit_feedback"]["output"]["points"] = [];
    if (decisionIdx === -1 && sentences.length) {
      points.push({
        check_id: "competency_not_shown",
        severity: "fix",
        message: "This answer describes the situation, but where does it show what you decided?",
        quote: firstWords(sentences[0], 10),
      });
    }
    const vagueIdx = sentences.findIndex((s, i) => i !== decisionIdx && VAGUE.test(s));
    if (vagueIdx >= 0) {
      points.push({
        check_id: "vague_claim",
        severity: "warn",
        message: "This line is general. What exactly did you do here, and what changed because of it?",
        quote: firstWords(sentences[vagueIdx], 10),
      });
    }
    if (decisionIdx >= 0) {
      points.push({ check_id: "strong_moment", severity: "info", message: "Here the listener hears your own decision clearly.", quote: firstWords(sentences[decisionIdx], 10) });
    }
    return {
      answered_question: sentences.length > 0,
      competency_shown: decisionIdx >= 0,
      decision_sentence_index: decisionIdx >= 0 ? decisionIdx : null,
      points,
    };
  },

  story_structure({ text }) {
    const stories = blocksOf(text)
      .slice(0, 10)
      .map(({ text: block, offset }) => {
        const sents = splitSentences(block).map((s) => ({ ...s, start: s.start + offset, end: s.end + offset }));
        const decision = sents.find((s) => DECISION.test(s.text)) ?? null;
        const result = sents.length > 1 ? sents[sents.length - 1] : null;
        return {
          situation: sents[0],
          decision,
          result,
          sentences: sents.map((s) => {
            const isWe = /\bwe\b/i.test(s.text);
            const actor: "team" | "own" | "unclear" = isWe ? "team" : /\bI\b/.test(s.text) ? "own" : "unclear";
            const flags: ("we" | "no_evidence")[] = [];
            if (isWe) flags.push("we");
            if (!/\d/.test(s.text)) flags.push("no_evidence");
            return { start: s.start, end: s.end, actor, flags };
          }),
        };
      })
      .filter((s) => s.situation);
    if (stories.length) return { stories };
    const t = text.trim();
    const start = text.indexOf(t);
    return { stories: [{ situation: { text: t, start, end: start + t.length }, decision: null, result: null, sentences: [] }] };
  },

  // Keyword overlap between each competency's JD quote and each story; reason = the story sentence that overlaps.
  story_map({ competencies, stories }) {
    const words = (s: string) => new Set(s.toLowerCase().match(/[a-z]{5,}/g) ?? []);
    const used = new Set<string>();
    return {
      mappings: competencies.slice(0, 6).map((c) => {
        const want = words(`${c.label} ${c.jd_quote}`);
        let best: { id: string; text: string; score: number } | null = null;
        for (const s of stories) {
          const score = [...words(s.text)].filter((w) => want.has(w)).length - (used.has(s.id) ? 0.5 : 0);
          if (score >= 1 && (!best || score > best.score)) best = { ...s, score };
        }
        if (!best) return { competency_label: c.label, story_id: null, rationale_quote: null };
        used.add(best.id);
        const sentence = splitSentences(best.text).find((x) => [...words(x.text)].some((w) => want.has(w))) ?? splitSentences(best.text)[0];
        return { competency_label: c.label, story_id: best.id, rationale_quote: sentence ? firstWords(sentence.text, 12) : null };
      }),
    };
  },

  gap_prompts({ competency, cv }) {
    const lines = cv.split("\n").map((l) => l.trim()).filter((l) => l.length >= 8).slice(0, 5);
    const refs = lines.length ? lines : ["your most recent role", "a project you are proud of", "a time plans changed"];
    const prompts = refs.slice(0, 5).map((ref) => {
      const r = firstWords(ref, 6);
      return { text: `In "${r}", when did you have to show ${competency.toLowerCase()}? What did you decide?`, references: lines.length ? [r] : [] };
    });
    while (prompts.length < 3) prompts.push({ ...prompts[0], text: `${prompts[0].text} (another moment)` });
    return { prompts };
  },
};

export function createMockLlm(): LlmProvider {
  return {
    name: "mock",
    async run<K extends LlmTask>(task: K, input: LlmTaskMap[K]["input"]): Promise<LlmResult<K>> {
      const raw = (handlers[task] as Handler<K>)(input);
      // Validate exactly as the live adapter will, so a mock that drifts from the contract fails loudly.
      const data = LLM_TASKS[task].schema.parse(raw) as LlmTaskMap[K]["output"];
      return { data, model: "mock", usage: { inputTokens: null, outputTokens: null } };
    },
  };
}
