/**
 * G-NO-INVENT (PRD SB5, goal G5): text we show as "yours" must not contain a number, a proper name, or an
 * ownership verb that the user did not say. Used on every model-produced text about a user's story
 * (Phase 4 structuring is verbatim spans already; Phase 5 draft stories rely on this check).
 *
 * It cannot prove meaning (e.g. "supported" vs "led" in paraphrase), which is why fields are verbatim
 * spans wherever possible and a teammate reviews the first users (PRD G5).
 */
export interface Invention {
  kind: "number" | "name" | "ownership";
  token: string;
}

/** Verbs that claim a bigger role. If the output uses one the source does not, it inflates the role. */
const OWNERSHIP_VERBS = [
  "led", "lead", "owned", "own", "drove", "drive", "spearheaded", "headed", "managed", "founded", "built",
  "created", "launched", "designed", "directed", "championed", "initiated", "architected", "ran", "oversaw",
  "single-handedly", "personally",
];

const norm = (s: string) => s.toLowerCase().replace(/[’]/g, "'");

export function findInventions(output: string, source: string): Invention[] {
  const found: Invention[] = [];
  const seen = new Set<string>();
  const add = (inv: Invention) => {
    const k = `${inv.kind}:${inv.token}`;
    if (!seen.has(k)) {
      seen.add(k);
      found.push(inv);
    }
  };
  const src = norm(source);
  const srcNumbers = new Set((source.match(/\d[\d,.]*%?/g) ?? []).map((n) => n.replace(/,/g, "").replace(/\.$/, "")));
  const srcWords = new Set(src.match(/[a-z][a-z'-]*/g) ?? []);

  // Numbers (incl. percentages): every one must appear in the source.
  for (const n of output.match(/\d[\d,.]*%?/g) ?? []) {
    const clean = n.replace(/,/g, "").replace(/\.$/, "");
    if (!srcNumbers.has(clean)) add({ kind: "number", token: clean });
  }

  // Proper names: capitalised words that are not sentence-initial and not "I".
  const nameRe = /(^|[.!?]\s+|\s)([A-Z][A-Za-z&-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = nameRe.exec(output))) {
    const sentenceStart = m.index === 0 || /[.!?]\s+$/.test(m[1]);
    const word = m[2];
    if (sentenceStart || word === "I" || /^I'/.test(word)) continue;
    if (!new RegExp(`\\b${word.replace(/[-&]/g, "\\$&")}\\b`).test(source)) add({ kind: "name", token: word });
  }

  // Ownership verbs the user never used.
  for (const w of norm(output).match(/[a-z][a-z'-]*/g) ?? []) {
    if (OWNERSHIP_VERBS.includes(w) && !srcWords.has(w)) add({ kind: "ownership", token: w });
  }
  return found;
}
