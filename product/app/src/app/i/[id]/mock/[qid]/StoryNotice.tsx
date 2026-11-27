"use client";

import Link from "next/link";
import { useState } from "react";
import { StarProgress } from "@/components/StarProgress";
import { ui } from "@/components/ui";
import { postJson } from "@/lib/client";
import { useHydrated } from "@/lib/useHydrated";
import type { AttemptView } from "@/modules/attempt/view";
import { STAR_LABEL } from "@/modules/stories/star";

/**
 * "This answer is in My stories" (2026-11-27). The story told while practising is kept:
 * - saved automatically when it is new: a short confirmation, its S·T·A·R marks and one link to fill the gaps
 *   (visibility of system status; one clear next step);
 * - when it looks like a story the user already has, nothing is saved on its own: two choices only (Hick's law),
 *   combine (adds only the sentences the story lacks) or save as new, plus "Not now".
 */
export function StoryNotice({ view, onChange }: { view: AttemptView; onChange: (v: AttemptView) => void }) {
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const s = view.story;
  if (!s || dismissed) return null;

  async function choose(body: { mode: "new" } | { mode: "combine"; storyId: string }) {
    setBusy(true);
    setError(null);
    const r = await postJson<{ added: number; view: AttemptView }>(`/api/attempts/${view.id}/story`, body);
    setBusy(false);
    if (!r.ok || !("view" in r.data)) {
      setError((r.data as { error?: string }).error ?? "That didn't work. Please try again.");
      return;
    }
    const { added, view: next } = r.data;
    setNote(
      body.mode === "new"
        ? "Added to My stories."
        : added
          ? `Combined: ${added} new sentence${added === 1 ? "" : "s"} added to your story.`
          : "Your story already has everything you said here.",
    );
    onChange(next);
  }

  if (s.saved) {
    const missing = s.saved.missing;
    return (
      <section
        aria-live="polite"
        aria-label="Saved to My stories"
        className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-900 dark:bg-emerald-950/30"
        data-testid="story-saved"
      >
        <div className="flex flex-col gap-1">
          <p className="font-medium text-emerald-900 dark:text-emerald-200">
            {note ?? "Added to My stories."} <span className="font-normal">&ldquo;{s.saved.name}&rdquo;</span>
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-emerald-900/80 dark:text-emerald-200/80">
            <StarProgress missing={missing} />
            <span>{missing.length ? `Fill in the ${missing.map((p) => STAR_LABEL[p]).join(" and ")} there, and keep improving it.` : "All four STAR parts are there. Go over it and mark it ready."}</span>
          </div>
        </div>
        <Link href={`/stories?open=${s.saved.id}`} className={`${ui.btnSecondary} shrink-0 bg-white dark:bg-zinc-950`} data-testid="open-saved-story">
          Open in My stories
        </Link>
      </section>
    );
  }

  if (s.similar) {
    return (
      <section aria-label="Save this answer to My stories" className={`${ui.card} flex flex-col gap-3`} data-testid="story-similar">
        <p>
          This sounds like your story <span className="font-medium">&ldquo;{s.similar.name}&rdquo;</span>. Combine them, or keep this answer as a separate story?
        </p>
        <p className={ui.muted}>Combining adds only the sentences your story doesn&apos;t have yet, in your own words.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={ui.btnPrimary} disabled={!hydrated || busy} onClick={() => choose({ mode: "combine", storyId: s.similar!.id })}>
            Combine with this story
          </button>
          {s.canSave && (
            <button type="button" className={ui.btnSecondary} disabled={!hydrated || busy} onClick={() => choose({ mode: "new" })}>
              Save as a new story
            </button>
          )}
          <button type="button" className={ui.link} onClick={() => setDismissed(true)}>
            Not now
          </button>
        </div>
        {error && (
          <p className={ui.error} role="alert">
            {error}
          </p>
        )}
      </section>
    );
  }

  if (!s.canSave) return null;
  return (
    <section aria-label="Save this answer to My stories" className={`${ui.card} flex flex-wrap items-center justify-between gap-3`} data-testid="story-save">
      <p>Keep this answer as a story in My stories?</p>
      <button type="button" className={ui.btnSecondary} disabled={!hydrated || busy} onClick={() => choose({ mode: "new" })}>
        Add to My stories
      </button>
      {error && (
        <p className={ui.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
