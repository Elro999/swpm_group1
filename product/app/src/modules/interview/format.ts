/** Display helpers for an interview. Pure functions; unit-tested in format.test.ts. */

/** Words that make a short line look like a job title. Deterministic on purpose: no model call. */
const ROLE_WORDS =
  "manager|engineer|analyst|associate|intern|internship|trainee|consultant|lead|director|designer|developer|scientist|specialist|executive|officer|head|architect|coordinator|strategist|researcher|administrator|advisor|adviser|representative|supervisor|technician|planner|programmer|recruiter|accountant|auditor|writer|editor|owner|founder|president|vp|apprentice|partner|banker|trader|underwriter|economist|statistician|tester|sde|pm|apm";
const ROLE_RE = new RegExp(`\\b(?:${ROLE_WORDS})s?\\b`, "i");

/** Lines at the top of a JD that are headers or metadata, never the title. */
const NOISE_RE =
  /^(?:job\s+description|jd\b|about\b|company\b|overview|posted\b|apply\b|location\b|salary\b|ctc\b|experience\b|qualifications?\b|requirements?\b|responsibilities\b|full[\s-]?time\b|part[\s-]?time\b|contract\b|remote\b|hybrid\b|on[\s-]?site\b|job\s+(?:id|type|code|category)\b|req(?:uisition)?\b|ref(?:erence)?\b|https?:|www\.|\S+@\S+)/i;

/** A sentence, not a title: starts like prose. */
const PROSE_RE = /^(?:you\b|we\b|we're\b|the\b|this\b|our\b|as an?\b|in this\b|join\b|are you\b|if you\b)/i;

const LABEL_RE = /^(?:job\s*)?(?:title|role|position|designation|opening|vacancy|post)\s*(?:[:\-–—]\s*(.*))?$/i;
const HIRING_RE = /\b(?:(?:we(?:'re|\s+are)|is|are)\s+(?:now\s+)?(?:hiring|looking\s+for|seeking)|hiring)\s*[:\-–—]?\s*(?:an?\s+|the\s+)?(.+)$/i;

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** Strip bullets, markdown, emoji-ish symbols and trailing punctuation; collapse whitespace. */
function clean(line: string): string {
  return line
    .replace(/[*_#`>|]+/g, " ")
    .replace(/^[\s\-–—•·▪●◦■□►➤➢✔✓★☆\d.)(]+(?=[A-Za-z])/u, "") // leading bullets / numbering
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.:;,!\s]+$/, "");
}

const isBulleted = (raw: string) => /^\s*(?:[-–—•·▪●◦■□►➤➢✔✓*]|\d+[.)])\s+/u.test(raw);
const looksLikeTitle = (s: string) => s.length > 0 && s.length <= 80 && wordCount(s) <= 9 && !PROSE_RE.test(s);

/**
 * The role title for display ("Associate Product Manager, Payments"), found without any model call.
 * In order: (1) a labelled line ("Job Title: …", or the label alone with the value on the next line);
 * (2) "We are hiring a …" phrasing; (3) the first short, non-header line in the top of the JD that
 * contains a role word (manager, engineer, analyst, …); (4) fallback: the first non-header line.
 * It can still be wrong for unusual titles (no role word) — the fallback is the old first-line rule.
 */
export function roleTitle(jd: string, max = 90): string {
  const raw = jd.split("\n").map((l) => l.trim()).filter(Boolean);
  const finish = (s: string) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

  // 1. Labelled title, anywhere in the first 40 lines.
  for (let i = 0; i < Math.min(raw.length, 40); i++) {
    const m = LABEL_RE.exec(clean(raw[i]).replace(/\s*[:\-–—]\s*$/, ":"));
    if (!m) continue;
    const value = clean(m[1] ?? raw[i + 1] ?? "");
    if (looksLikeTitle(value) && !NOISE_RE.test(value)) return finish(value);
  }

  const top = raw.slice(0, 15);

  // 2. "We are hiring a Product Manager to …"
  for (const line of top) {
    const m = HIRING_RE.exec(line);
    if (!m) continue;
    const value = clean(m[1].split(/\s+(?:to|who|for|at|in|with|that|based|on|and)\s+|[.!?]/i)[0]);
    if (ROLE_RE.test(value) && looksLikeTitle(value)) return finish(value);
  }

  // 3. First short, title-looking line with a role word.
  for (const line of top) {
    if (isBulleted(line) || NOISE_RE.test(clean(line))) continue;
    const value = clean(line);
    if (ROLE_RE.test(value) && looksLikeTitle(value)) return finish(value);
  }

  // 4. Fallback: first line that isn't obvious header/metadata, else the very first line.
  const fallback = raw.find((l) => !NOISE_RE.test(clean(l))) ?? raw[0];
  return fallback ? finish(clean(fallback) || fallback) : "Interview";
}

/** "Interview on 1 Dec 2026 · in 18 days" (or "today", "was 3 days ago"). Dates are YYYY-MM-DD. */
export function describeInterviewDate(date: string | null, today: Date = new Date()): string | null {
  if (!date) return null;
  const d = new Date(`${date}T00:00:00Z`);
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((d.getTime() - t) / 86_400_000);
  const pretty = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const rel = days === 0 ? "today" : days === 1 ? "tomorrow" : days > 1 ? `in ${days} days` : days === -1 ? "was yesterday" : `was ${-days} days ago`;
  return `Interview on ${pretty} · ${rel}`;
}
