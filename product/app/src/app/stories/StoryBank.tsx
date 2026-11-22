"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { ui } from "@/components/ui";
import { ensureSession } from "@/lib/client";
import { STAR_PARTS } from "@/lib/db/types";
import { useHydrated } from "@/lib/useHydrated";
import type { StoryView } from "@/modules/stories/deps";
import { STAR_LABEL, STAR_QUESTION } from "@/modules/stories/star";
import { StoryCard } from "./StoryCard";

const MIN_CHARS = 40;
const TITLE_MAX = 80;

/**
 * Story bank page body (SB1, STAR). Layout rules:
 * - one primary action per state: "Save story" while writing, "Add a story" once the bank has stories (Hick);
 * - the writing form is open when the bank is empty and folds away after a save (progressive disclosure);
 * - cards are collapsed to one scannable line (title, STAR progress, status); the newest story opens on save;
 * - the STAR guide sits next to the box, so users recognise what to write instead of recalling it (Miller, chunking).
 * Server rules decide everything; this only shows them.
 */
export function StoryBank({ initial, returnTo }: { initial: StoryView[]; returnTo: string | null }) {
  const hydrated = useHydrated();
  const id = useId();
  const [stories, setStories] = useState(initial);
  const [composing, setComposing] = useState(initial.length === 0);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [announce, setAnnounce] = useState("");
  const addButton = useRef<HTMLButtonElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);

  const tooShort = text.trim().length < MIN_CHARS;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Give your story a short title, so you can find it later.");
      titleInput.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (!(await ensureSession())) throw new Error("session");
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      const story = data.story as StoryView;
      setStories((s) => [...s, story]);
      setOpenIds((o) => new Set(o).add(story.id));
      setTitle("");
      setText("");
      setComposing(false);
      setAnnounce(`Saved “${story.title ?? "your story"}”.`);
    } catch {
      setError("Network problem. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function startComposing() {
    setComposing(true);
    setError(null);
    requestAnimationFrame(() => titleInput.current?.focus());
  }

  function cancelComposing() {
    setComposing(false);
    setError(null);
    requestAnimationFrame(() => addButton.current?.focus());
  }

  const toggle = (sid: string) =>
    setOpenIds((o) => {
      const next = new Set(o);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });

  const replace = (updated: StoryView) => setStories((s) => s.map((x) => (x.id === updated.id ? updated : x)));
  const removed = (gone: StoryView) => {
    setStories((s) => s.filter((x) => x.id !== gone.id));
    setAnnounce(`Deleted “${gone.title ?? "the story"}”.`);
    requestAnimationFrame(() => addButton.current?.focus());
  };

  const newestFirst = [...stories].reverse();
  const readyCount = stories.filter((s) => s.state === "ready").length;

  return (
    <div className="flex flex-col gap-8">
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      {composing && (
        <form onSubmit={submit} className={`${ui.card} flex flex-col gap-4`} noValidate aria-labelledby={`${id}-new`}>
          <h2 id={`${id}-new`} className={ui.h2}>
            New story
          </h2>

          <div>
            <label htmlFor={`${id}-title`} className={ui.label}>
              Title
            </label>
            <input
              ref={titleInput}
              id={`${id}-title`}
              className={ui.input}
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fixing app sign-up tracking"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_14rem]">
            <div>
              <label htmlFor={`${id}-text`} className={ui.label}>
                Your story
              </label>
              <textarea
                id={`${id}-text`}
                rows={9}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={ui.input}
                placeholder="Tell one story in your own words, in any order. We'll sort it into STAR."
                aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
              />
              <p id={`${id}-hint`} className={`${ui.muted} mt-1`}>
                One story per save. At least {MIN_CHARS} characters.
              </p>
            </div>
            <aside aria-label="What a STAR story covers" className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
              <p className="font-medium">A good story covers</p>
              <ul className="mt-2 flex flex-col gap-2">
                {STAR_PARTS.map((p) => (
                  <li key={p}>
                    <span className="font-semibold">{STAR_LABEL[p]}:</span>{" "}
                    <span className="text-zinc-600 dark:text-zinc-400">{STAR_QUESTION[p]}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>

          {error && (
            <p id={`${id}-error`} role="alert" className={ui.error}>
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="submit" className={ui.btnPrimary} disabled={!hydrated || busy || tooShort}>
              {busy ? "Sorting your story…" : "Save story"}
            </button>
            {stories.length > 0 && (
              <button type="button" className={ui.btnSecondary} onClick={cancelComposing} disabled={busy}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <section aria-labelledby="bank-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="bank-title" className={ui.h2}>
              Your story bank ({stories.length})
            </h2>
            {stories.length > 0 && (
              <p className={ui.muted} data-testid="bank-summary">
                {readyCount} of {stories.length} ready
              </p>
            )}
          </div>
          {!composing && (
            <button ref={addButton} type="button" className={ui.btnPrimary} onClick={startComposing} disabled={!hydrated}>
              Add a story
            </button>
          )}
        </div>

        {returnTo && stories.length > 0 && (
          <Link href={returnTo} className={`${ui.link} self-start`}>
            Match them to the interview →
          </Link>
        )}

        {stories.length === 0 && <p className={ui.muted}>No stories yet. Write your first one above.</p>}

        <ul className="flex flex-col gap-3" data-testid="story-list">
          {newestFirst.map((s) => (
            <li key={s.id}>
              <StoryCard story={s} open={openIds.has(s.id)} onToggle={() => toggle(s.id)} onChange={replace} onDeleted={removed} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
