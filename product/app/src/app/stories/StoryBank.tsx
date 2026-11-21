"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { ui } from "@/components/ui";
import { ensureSession } from "@/lib/client";
import { useHydrated } from "@/lib/useHydrated";
import type { StoryView } from "@/modules/stories/deps";
import { StoryCard } from "./StoryCard";

/** Paste box + list of story cards (SB1). Server rules decide everything; this only shows them. */
export function StoryBank({ initial, returnTo }: { initial: StoryView[]; returnTo: string | null }) {
  const hydrated = useHydrated();
  const id = useId();
  const [stories, setStories] = useState(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!(await ensureSession())) throw new Error("session");
      const res = await fetch("/api/stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setStories((s) => [...s, ...(data.stories as StoryView[])]);
      setText("");
    } catch {
      setError("Network problem. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const replace = (updated: StoryView) => setStories((s) => s.map((x) => (x.id === updated.id ? updated : x)));

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={submit} className={`${ui.card} flex flex-col gap-3`} noValidate>
        <label htmlFor={id} className={ui.label}>
          Paste one or more stories
        </label>
        <textarea
          id={id}
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={ui.input}
          placeholder="Leave a blank line between stories. Say what happened, what you decided, and what changed."
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {error && (
          <p id={`${id}-error`} role="alert" className={ui.error}>
            {error}
          </p>
        )}
        <div>
          <button type="submit" className={ui.btnPrimary} disabled={!hydrated || busy || !text.trim()}>
            {busy ? "Reading your stories…" : "Add to my stories"}
          </button>
        </div>
      </form>

      <section aria-labelledby="bank-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="bank-title" className={ui.h2}>
            Your story bank ({stories.length})
          </h2>
          {returnTo && stories.length > 0 && (
            <Link href={returnTo} className={ui.link}>
              Match them to the interview →
            </Link>
          )}
        </div>
        {stories.length === 0 && <p className={ui.muted}>No stories yet. Paste one above to start.</p>}
        <ol className="flex flex-col gap-4" data-testid="story-list">
          {stories.map((s, i) => (
            <li key={s.id}>
              <StoryCard story={s} index={i + 1} onChange={replace} />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
