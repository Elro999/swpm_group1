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

const STAR_TASK = /\b(my (task|goal|job|role|responsibility|objective|target) (was|is)|I was (asked|tasked|responsible)|I (needed|had) to|our goal was|the goal was|the task was)\b/i;
const STAR_RESULT = /(\d|\b(results?|resulted|outcomes?|fell|rose|dropped|grew|increased|reduced|improved|saved|launched|won|achieved|led to)\b)/i;

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

  // STAR by keywords and position: task words → task; numbers / outcome words late in the story → result;
  // "I"/"we" doing something → action; everything before the first task or action → situation.
  story_structure({ text }) {
    const sents = splitSentences(text);
    let seenWork = false;
    return {
      sentences: sents.map((s, i) => {
        const late = i >= Math.max(1, Math.floor(sents.length / 2));
        const actor: "team" | "own" | "unclear" = /\bwe\b/i.test(s.text) ? "team" : /\bI\b/.test(s.text) ? "own" : "unclear";
        let part: "situation" | "task" | "action" | "result";
        if (STAR_TASK.test(s.text)) part = "task";
        else if (late && STAR_RESULT.test(s.text)) part = "result";
        else if (actor !== "unclear" && (seenWork || i > 0)) part = "action";
        else part = seenWork ? "action" : "situation";
        if (part === "task" || part === "action") seenWork = true;
        return { text: s.text, start: s.start, end: s.end, part, actor };
      }),
    };
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
