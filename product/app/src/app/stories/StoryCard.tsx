"use client";

import { useEffect, useId, useRef, useState } from "react";
import { StarProgress } from "@/components/StarProgress";
import { ui } from "@/components/ui";
import { STAR_PARTS, type StarPart } from "@/lib/db/types";
import { useHydrated } from "@/lib/useHydrated";
import type { StoryView } from "@/modules/stories/deps";
import { missingParts, STAR_LABEL, STAR_QUESTION, starGroups, storyName } from "@/modules/stories/star";

/**
 * One story in the bank (SB2, SB3, STAR). Collapsed: one scannable line (title, S·T·A·R progress, status).
 * Open: the four STAR parts, each made only of the user's own sentences; a missing part becomes a question,
 * never suggested wording. Flags point at sentences; nothing is auto-fixed.
 * Buttons: one primary next step; Delete sits apart on the right and always asks first (it cannot be undone).
 */
const ACTOR = {
  own: { label: "You", cls: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  team: { label: "Team", cls: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  unclear: { label: "Unclear", cls: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
} as const;

const LEGACY_MISSING = {
  decision: "We couldn't find the decision you made. Which choice in this story was yours?",
  situation: "We couldn't find a one-line situation. What was going on when this started?",
  result: "We couldn't find a result. What changed because of what you did?",
} as const;

const btnDangerSolid =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-red-700 px-5 font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600";
const btnDanger =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-4 font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600";

export function StoryCard({
  story,
  open,
  startEditing: editFirst = false,
  onToggle,
  onChange,
  onDeleted,
}: {
  story: StoryView;
  open: boolean;
  /** Open in edit mode (set by "Edit this story" after Build story; the card is remounted to apply it). */
  startEditing?: boolean;
  onToggle: () => void;
  onChange: (s: StoryView) => void;
  onDeleted: (s: StoryView) => void;
}) {
  const hydrated = useHydrated();
  const id = useId();
  const [editing, setEditing] = useState(editFirst);
  const [draftTitle, setDraftTitle] = useState(story.title ?? "");
  const [draftText, setDraftText] = useState(story.rawText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const titleInput = useRef<HTMLInputElement>(null);

  const star = story.format === "star";
  const groups = starGroups(story);
  const missing = star ? missingParts(story) : [];
  const ready = story.state === "ready";
  const name = storyName(story);

  async function patch(body: { ready?: boolean; rawText?: string; title?: string | null }) {
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

  function startEditing() {
    setDraftTitle(story.title ?? "");
    setDraftText(story.rawText);
    setError(null);
    setEditing(true);
    if (!open) onToggle();
    requestAnimationFrame(() => titleInput.current?.focus());
  }

  async function save() {
    const body: { rawText?: string; title?: string | null } = {};
    if (draftText.trim() !== story.rawText) body.rawText = draftText;
    if (draftTitle.trim() !== (story.title ?? "")) body.title = draftTitle;
    if (!("rawText" in body) && !("title" in body)) return setEditing(false);
    if (await patch(body)) setEditing(false);
  }

  const status = ready
    ? { label: "Ready", cls: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" }
    : !star
      ? { label: story.state === "draft" ? "Needs a decision" : "Older format", cls: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" }
      : missing.length
        ? { label: `Missing ${missing.map((p) => STAR_LABEL[p]).join(", ")}`, cls: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200" }
        : { label: "Complete", cls: "bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200" };

  return (
    <article
      className={`rounded-xl border bg-white dark:bg-zinc-950 ${ready ? "border-emerald-400 dark:border-emerald-700" : "border-zinc-200 dark:border-zinc-800"}`}
      data-testid="story-card"
      aria-label={name}
    >
      <h3>
        <button
          type="button"
          className="flex min-h-14 w-full items-center gap-3 rounded-xl px-5 py-3 text-left hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:hover:bg-zinc-900"
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={onToggle}
        >
          <span className="min-w-0 flex-1">
            <span className="block font-semibold break-words" data-testid="story-title">
              {name}
            </span>
            {star && <StarProgress missing={missing} className="mt-1" />}
          </span>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.cls}`} data-testid="story-state">
            {status.label}
          </span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className={`size-5 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h3>

      <div id={`${id}-body`} hidden={!open} className="flex flex-col gap-5 border-t border-zinc-200 px-5 pt-4 pb-5 dark:border-zinc-800">
        {!editing && star && (
          <dl className="flex flex-col gap-4">
            {STAR_PARTS.map((p) => (
              <StarSection key={p} part={p} sentences={groups[p]} onAdd={startEditing} disabled={!hydrated || busy} />
            ))}
          </dl>
        )}

        {!editing && !star && (
          <>
            <p className={ui.muted}>Saved before stories were sorted into STAR. Edit it to sort it into Situation, Task, Action and Result.</p>
            <dl className="flex flex-col gap-3">
              {(["decision", "situation", "result"] as const).map((k) => (
                <div key={k} data-testid={`field-${k}`}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{k === "decision" ? "Your decision" : k}</dt>
                  <dd className="mt-1">
                    {story[k] ? <q className="not-italic">{story[k]!.text}</q> : <span className="text-amber-800 dark:text-amber-300">{LEGACY_MISSING[k]}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}

        {editing && (
          <div className="flex flex-col gap-3">
            <div>
              <label htmlFor={`${id}-title`} className={ui.label}>
                Title
              </label>
              <input
                ref={titleInput}
                id={`${id}-title`}
                className={ui.input}
                value={draftTitle}
                maxLength={80}
                onChange={(e) => setDraftTitle(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor={`${id}-text`} className={ui.label}>
                Your story
              </label>
              <textarea id={`${id}-text`} rows={8} className={ui.input} value={draftText} onChange={(e) => setDraftText(e.target.value)} />
              <p className={`${ui.muted} mt-1`}>Changing the story sorts it into STAR again and sets it back to not ready.</p>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className={ui.error}>
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {!editing ? (
            <>
              {star && missing.length > 0 && !ready ? (
                <button type="button" className={ui.btnPrimary} onClick={startEditing} disabled={!hydrated || busy}>
                  Add the missing {missing.length === 1 ? "part" : "parts"}
                </button>
              ) : (
                <button
                  type="button"
                  className={ready ? ui.btnSecondary : ui.btnPrimary}
                  onClick={() => patch({ ready: !ready })}
                  disabled={!hydrated || busy || (!star && story.state === "draft")}
                  aria-pressed={ready}
                >
                  {ready ? "Mark not ready" : "Mark ready"}
                </button>
              )}
              <button type="button" className={ui.btnSecondary} onClick={startEditing} disabled={!hydrated || busy}>
                Edit
              </button>
              <button type="button" className={`${btnDanger} ml-auto`} onClick={() => setConfirming(true)} disabled={!hydrated || busy}>
                Delete
              </button>
            </>
          ) : (
            <>
              <button type="button" className={ui.btnPrimary} disabled={!hydrated || busy || !draftText.trim()} onClick={save}>
                {busy ? "Saving…" : "Save"}
              </button>
              <button type="button" className={ui.btnSecondary} disabled={busy} onClick={() => setEditing(false)}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {confirming && <DeleteDialog story={story} name={name} onCancel={() => setConfirming(false)} onDeleted={() => onDeleted(story)} />}
    </article>
  );
}

function StarSection({
  part,
  sentences,
  onAdd,
  disabled,
}: {
  part: StarPart;
  sentences: ReturnType<typeof starGroups>[StarPart];
  onAdd: () => void;
  disabled: boolean;
}) {
  return (
    <div data-testid={`star-${part}`} className="grid gap-1 sm:grid-cols-[6.5rem_1fr] sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:pt-0.5">{STAR_LABEL[part]}</dt>
      <dd>
        {sentences.length === 0 ? (
          <div className="flex flex-col items-start gap-1 rounded-lg border border-dashed border-amber-400 px-3 py-2 dark:border-amber-700">
            <span className="text-sm text-amber-900 dark:text-amber-200">
              <span className="font-medium">Missing.</span> {STAR_QUESTION[part]}
            </span>
            <button
              type="button"
              className="min-h-9 text-sm font-medium text-indigo-700 underline-offset-2 hover:underline disabled:opacity-60 dark:text-indigo-400"
              onClick={onAdd}
              disabled={disabled}
            >
              Add it to your story
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {sentences.map((s) => (
              <li key={s.start} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                {part === "action" && (
                  <span className={`shrink-0 self-start rounded-full px-2 py-0.5 text-xs font-medium ${ACTOR[s.actor].cls}`}>{ACTOR[s.actor].label}</span>
                )}
                <span className="flex-1">
                  <q className="not-italic">{s.text}</q>
                  {s.flags.includes("we") && <span className="ml-2 text-xs text-amber-800 dark:text-amber-300">Says “we”: which part was yours?</span>}
                  {s.flags.includes("no_evidence") && (
                    <span className="ml-2 text-xs text-amber-800 dark:text-amber-300">A result without evidence: how do you know?</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </dd>
    </div>
  );
}

/** Confirm before deleting (native modal dialog: traps focus, Escape cancels, focus starts on the safe choice). */
function DeleteDialog({ story, name, onCancel, onDeleted }: { story: StoryView; name: string; onCancel: () => void; onDeleted: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/stories/${story.id}`, { method: "DELETE" });
      if (res.ok || res.status === 404) {
        ref.current?.close();
        onDeleted();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Something went wrong. Nothing was deleted; please try again.");
    } catch {
      setError("Network problem. Nothing was deleted; please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-desc`}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
      data-testid="delete-dialog"
    >
      <h2 id={`${id}-title`} className={ui.h2}>
        Delete “{name}”?
      </h2>
      <p id={`${id}-desc`} className="mt-2 text-zinc-600 dark:text-zinc-400">
        This removes the story for good. If it is matched to an interview, that skill will show as not matched until you match again.
      </p>
      {error && (
        <p role="alert" className={ui.error}>
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" className={ui.btnSecondary} onClick={onCancel} disabled={busy} autoFocus>
          Cancel
        </button>
        <button type="button" className={btnDangerSolid} onClick={remove} disabled={busy}>
          {busy ? "Deleting…" : "Delete story"}
        </button>
      </div>
    </dialog>
  );
}
