/** Display helpers for an interview. Pure functions; unit-tested in format.test.ts. */

/** First non-empty line of the JD, trimmed, as a human title ("Associate Product Manager, Payments"). */
export function roleTitle(jd: string, max = 90): string {
  const line = jd.split("\n").map((l) => l.trim()).find(Boolean) ?? "Interview";
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line.replace(/[.:]$/, "");
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
