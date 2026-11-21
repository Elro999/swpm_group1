"use client";

import { useId, useState } from "react";
import { ui } from "@/components/ui";
import { useHydrated } from "@/lib/useHydrated";
import type { StoryView } from "@/modules/stories/deps";

/**
 * Decision-first story card (SB2, SB3). Every field is a verbatim span of the user's text; missing fields
 * become questions, never suggested wording. Flags point at sentences; nothing is auto-fixed.
 */
const ACTOR = {
  own: { label: "You", cls: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  team: { label: "Team", cls: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  unclear: { label: "Unclear", cls: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
} as const;

const MISSING = {
  decision: "We couldn't find the decision you made. Which choice in this story was yours?",
  situation: "We couldn't find a one-line situation. What was going on when this started?",
  result: "We couldn't find a result. What changed because of what you did?",
} as const;

export function StoryCard({ story, index, onChange }: { story: StoryView; index: number; onChange: (s: StoryView) => void }) {
  const hydrated = useHydrated();
  const editId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(story.rawText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: { ready?: boolean; rawText?: string }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/stories/${story.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return false;
      }
      onChange(data.story as StoryView);
      return true;
    } catch {
      setError("Network problem. Check your connection and try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const field = (key: "decision" | "situation" | "result", label: string) => {
    const f = story[key];
    return (
      <div data-testid={`field-${key}`}>
        <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
        <dd className="mt-1">{f ? <q className="not-italic">{f.text}</q> : <span className="text-amber-800 dark:text-amber-300">{MISSING[key]}</span>}</dd>
      </div>
    );
  };

  const ready = story.state === "ready";
  const counts = story.sentences.reduce(
    (acc, s) => ({ ...acc, [s.actor]: acc[s.actor] + 1 }),
    { own: 0, team: 0, unclear: 0 } as Record<"own" | "team" | "unclear", number>,
  );

  return (
    <article className={`${ui.card} flex flex-col gap-4 ${ready ? "border-emerald-400 dark:border-emerald-700" : ""}`} data-testid="story-card" aria-label={`Story ${index}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Story {index}</h3>
        <span className={`${ui.chip}`} data-testid="story-state">
          {ready ? "Ready" : story.state === "draft" ? "Needs a decision" : "Structured"}
        </span>
      </div>

      {!editing && (
        <>
          <dl className="flex flex-col gap-3">
            {field("decision", "Your decision")}
            {field("situation", "Situation")}
            {field("result", "Result")}
          </dl>

          <details>
            <summary className="cursor-pointer text-sm font-medium">
              Who did what: {counts.own} you · {counts.team} team · {counts.unclear} unclear
            </summary>
            <ul className="mt-2 flex flex-col gap-2" data-testid="sentences">
              {story.sentences.map((s, i) => (
                <li key={i} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:gap-2">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ACTOR[s.actor].cls}`}>{ACTOR[s.actor].label}</span>
                  <span className="flex-1">
                    {story.rawText.slice(s.start, s.end)}
                    {s.flags.includes("we") && <span className="ml-2 text-xs text-amber-800 dark:text-amber-300">Says “we”: which part was yours?</span>}
                    {s.flags.includes("no_evidence") && (
                      <span className="ml-2 text-xs text-amber-800 dark:text-amber-300">A result without evidence: how do you know?</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}

      {editing && (
        <div className="flex flex-col gap-2">
          <label htmlFor={editId} className={ui.label}>
            Edit your story
          </label>
          <textarea id={editId} rows={6} className={ui.input} value={draft} onChange={(e) => setDraft(e.target.value)} />
        </div>
      )}

      {error && (
        <p role="alert" className={ui.error}>
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {!editing ? (
          <>
            <button
              type="button"
              className={ready ? ui.btnSecondary : ui.btnPrimary}
              onClick={() => patch({ ready: !ready })}
              disabled={!hydrated || busy}
              aria-pressed={ready}
            >
              {ready ? "Mark not ready" : "Mark ready"}
            </button>
            <button type="button" className={ui.btnSecondary} onClick={() => setEditing(true)} disabled={!hydrated || busy}>
              Edit
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={ui.btnPrimary}
              disabled={!hydrated || busy || !draft.trim()}
              onClick={async () => {
                if (await patch({ rawText: draft })) setEditing(false);
              }}
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className={ui.btnSecondary}
              disabled={busy}
              onClick={() => {
                setDraft(story.rawText);
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </article>
  );
}
