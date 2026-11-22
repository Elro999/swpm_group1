"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ui } from "@/components/ui";
import { postJson, type ApiResult } from "@/lib/client";
import { useHydrated } from "@/lib/useHydrated";

/**
 * Role page body (design/01, "merged question cards"): consent banner, story bank strip, and one card per
 * question holding its competency, matched story (Open / Change / Unlink) or CV prompts (Build story →),
 * and Practise. Server rules decide everything; this only shows them and calls the API.
 */

export interface RoleCardData {
  questionId: string;
  n: number;
  text: string;
  jdQuote: string;
  competencyId: string | null;
  competency: string | null;
  story: { id: string; name: string; ready: boolean; why: string | null; chosen: boolean } | null;
  prompts: { id: string; text: string; cvLine: string | null }[];
}

interface StoryOption {
  id: string;
  name: string;
  ready: boolean;
}

type StripNote = { tone: "info" | "warn"; text: string; retry?: () => void } | null;

const okChip = "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
const warnChip = "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
const greyChip = "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
const chip = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
const smallBtn = `inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-medium text-indigo-700 hover:bg-zinc-100 disabled:opacity-60 dark:text-indigo-400 dark:hover:bg-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600`;

async function safePost<T>(url: string, body?: unknown): Promise<ApiResult<T> | null> {
  try {
    return await postJson<T>(url, body);
  } catch {
    return null;
  }
}

export function RoleCards({
  interviewId,
  consented: initialConsent,
  hasCv,
  cards,
  stories,
  neverMatched,
  newStoryIds,
  alsoTested,
}: {
  interviewId: string;
  consented: boolean;
  hasCv: boolean;
  cards: RoleCardData[];
  stories: StoryOption[];
  neverMatched: boolean;
  newStoryIds: string[];
  alsoTested: { label: string; jdQuote: string }[];
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [consented, setConsented] = useState(initialConsent);
  const [pending, setPending] = useState<number | null>(null); // Q number whose Practise was pressed before consent
  const [justAgreed, setJustAgreed] = useState<number | null>(null);
  const [pulse, setPulse] = useState(0);
  const [agreeBusy, setAgreeBusy] = useState(false);
  const [agreeError, setAgreeError] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);
  const [note, setNote] = useState<StripNote>(null);
  const [unlinked, setUnlinked] = useState<{ storyId: string; name: string; competencyId: string }[]>([]);
  const needPrompts = hasCv && cards.some((c) => c.competencyId && c.prompts.length === 0);
  const [loadingPrompts, setLoadingPrompts] = useState(needPrompts);
  const banner = useRef<HTMLElement>(null);
  const practise = useRef<Record<number, HTMLAnchorElement | null>>({});
  const cardRefs = useRef<Record<number, HTMLLIElement | null>>({});
  // Next keeps a visited page alive when navigating back, so "once" is per page data, not per mount.
  const started = useRef<string | null>(null);

  const linkedCount = cards.filter((c) => c.story).length;

  async function match(storyIds: string[] | undefined, describe: (linked: number, checked: number) => string) {
    setMatching(true);
    setNote(null);
    const r = await safePost<{ linked: number; checked: number }>(`/api/interviews/${interviewId}/map`, storyIds ? { storyIds } : {});
    setMatching(false);
    if (!r?.ok) {
      setNote({
        tone: "warn",
        text: "We couldn't match your stories just now. Nothing is lost: your stories and CV prompts are all still here.",
        retry: () => void match(storyIds, describe),
      });
      return false;
    }
    setNote({ tone: "info", text: describe(r.data.linked, r.data.checked) });
    router.refresh();
    return true;
  }

  // On load: save each card's CV prompts, and match stories once if they were never matched.
  const needMatch = neverMatched && stories.length > 0;
  const loadKey = `${interviewId}|${needPrompts}|${needMatch}|${stories.length}`;
  useEffect(() => {
    if (started.current === loadKey) return;
    started.current = loadKey;
    if (needPrompts) {
      void safePost(`/api/interviews/${interviewId}/prompts`).then(() => {
        setLoadingPrompts(false);
        router.refresh();
      });
    }
    if (needMatch) {
      void match(undefined, (linked, checked) =>
        linked
          ? `Matched ${linked} of ${cards.length} questions to your saved stories.`
          : `Checked your ${checked} saved stor${checked === 1 ? "y" : "ies"}: none fits these questions yet, so each card shows prompts from your CV instead.`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the page data changes, see loadKey
  }, [loadKey]);

  function askConsent(n: number) {
    setPending(n);
    setPulse((p) => p + 1);
    banner.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    requestAnimationFrame(() => banner.current?.querySelector<HTMLButtonElement>("button[data-agree]")?.focus({ preventScroll: true }));
  }

  async function agree() {
    setAgreeBusy(true);
    setAgreeError(null);
    const r = await safePost("/api/session/consent");
    setAgreeBusy(false);
    if (!r?.ok) {
      setAgreeError((r?.data.error as string | undefined) ?? "We couldn't save your choice. Please try again.");
      return;
    }
    setConsented(true);
    const n = pending;
    setPending(null);
    if (n !== null) {
      setJustAgreed(n);
      requestAnimationFrame(() => {
        cardRefs.current[n]?.scrollIntoView({ behavior: "smooth", block: "center" });
        practise.current[n]?.focus({ preventScroll: true });
      });
    }
    router.refresh();
  }

  async function setStory(card: RoleCardData, storyId: string | null) {
    if (!card.competencyId) return false;
    let ok = false;
    try {
      const res = await fetch(`/api/competencies/${card.competencyId}/story`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId }),
      });
      ok = res.ok;
    } catch {
      ok = false;
    }
    if (!ok) return false;
    if (storyId === null && card.story) {
      const gone = card.story;
      setUnlinked((u) => [...u.filter((x) => x.storyId !== gone.id), { storyId: gone.id, name: gone.name, competencyId: card.competencyId! }]);
    } else if (storyId) {
      setUnlinked((u) => u.filter((x) => x.storyId !== storyId));
    }
    router.refresh();
    return true;
  }

  const newCount = newStoryIds.length;

  return (
    <>
      {/* Consent banner (PF2): short, details in a fold-out; a green line once agreed. */}
      {!consented ? (
        <section
          ref={banner}
          aria-labelledby="consent-title"
          key={pulse}
          className={`${ui.card} ${pending !== null ? "border-indigo-500 ring-2 ring-indigo-500/40 motion-safe:animate-[pulse_1s_ease-out_2]" : "border-amber-300 dark:border-amber-800"}`}
          data-testid="consent-banner"
        >
          {pending !== null && <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">One step before Q{pending}</p>}
          <h2 id="consent-title" className={ui.h2}>
            Turn on practice recording
          </h2>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            We record your spoken answer and turn it into text so feedback can point to the exact moment to fix. Audio is deleted after 30 days.
          </p>
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer font-medium">What happens to my recording</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
              <li>Audio and text go to our AI providers (speech-to-text and language model) only to give you feedback.</li>
              <li>A member of our small student team may read transcripts and feedback to check accuracy.</li>
              <li>Audio is deleted after 30 days. You can delete everything at any time.</li>
            </ul>
            <p className="mt-2">
              Details: <Link href="/privacy" className={ui.link}>how we handle your data</Link>.
            </p>
          </details>
          <div className="mt-4">
            <button type="button" data-agree className={ui.btnPrimary} onClick={agree} disabled={!hydrated || agreeBusy}>
              {agreeBusy ? "Saving…" : pending !== null ? `I agree, back to Q${pending}` : "I agree, let me practise"}
            </button>
          </div>
          {agreeError && (
            <p role="alert" className={ui.error}>
              {agreeError}
            </p>
          )}
        </section>
      ) : (
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300" data-testid="practice-ready">
          ✓ You&apos;re set to record. Press Practise on any question.
        </p>
      )}

      {/* Story bank strip: one status line, plus a row for each check that is waiting. */}
      <section aria-label="Your stories for this role" className={`${ui.card} flex flex-col gap-3 py-4`} data-testid="story-strip">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm" aria-live="polite">
            {matching
              ? "Matching your stories to these questions…"
              : stories.length === 0
                ? "No saved stories yet. Add one and we'll match it to these questions automatically."
                : `${linkedCount} of ${cards.length} questions have a story · ${stories.length} saved stor${stories.length === 1 ? "y" : "ies"}.`}
          </p>
          <Link href={`/stories?from=${interviewId}`} className={stories.length === 0 ? ui.btnSecondary : ui.link}>
            {stories.length === 0 ? "Add your first story" : "Open my stories"}
          </Link>
        </div>

        {!hasCv && <CvAdder interviewId={interviewId} onSaved={() => router.refresh()} />}

        {note && (
          <div
            role={note.tone === "warn" ? "alert" : "status"}
            className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${note.tone === "warn" ? "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200" : "bg-zinc-50 dark:bg-zinc-900"}`}
            data-testid="strip-note"
          >
            <span>{note.text}</span>
            {note.retry && (
              <button type="button" className={ui.btnSecondary} onClick={note.retry} disabled={matching}>
                Try again
              </button>
            )}
          </div>
        )}

        {newCount > 0 && !matching && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
            <span>
              {newCount} new stor{newCount === 1 ? "y" : "ies"} since the last match.
            </span>
            <button
              type="button"
              className={ui.btnSecondary}
              disabled={!hydrated}
              onClick={() =>
                void match(newStoryIds, (linked) =>
                  linked
                    ? `Checked your new stor${newCount === 1 ? "y" : "ies"}: ${linked} question${linked === 1 ? "" : "s"} now ha${linked === 1 ? "s" : "ve"} a story.`
                    : `Checked your new stor${newCount === 1 ? "y" : "ies"}: ${newCount === 1 ? "it doesn't" : "they don't"} fit any of these questions. ${newCount === 1 ? "It stays" : "They stay"} in My stories.`,
                )
              }
            >
              Match new stor{newCount === 1 ? "y" : "ies"}
            </button>
          </div>
        )}

        {unlinked.map((u) => (
          <div key={u.storyId} className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
            <span>
              Unlinked “{u.name}”.
            </span>
            <button
              type="button"
              className={ui.btnSecondary}
              disabled={!hydrated || matching}
              onClick={async () => {
                const ok = await match([u.storyId], (linked) =>
                  linked
                    ? `Checked again: “${u.name}” fits ${linked} question${linked === 1 ? "" : "s"} and is linked back.`
                    : `Checked again: “${u.name}” doesn't fit any of these questions now. It stays in My stories and in the card's suggestions.`,
                );
                if (ok) setUnlinked((x) => x.filter((y) => y.storyId !== u.storyId));
              }}
            >
              Match again
            </button>
          </div>
        ))}
      </section>

      <section aria-labelledby="questions-title" className="flex flex-col gap-4">
        <h2 id="questions-title" className={ui.h2}>
          Questions to practise ({cards.length})
        </h2>
        <ol className="flex flex-col gap-4" data-testid="question-list">
          {cards.map((card) => (
            <li
              key={card.questionId}
              id={`q-${card.questionId}`}
              ref={(el) => {
                cardRefs.current[card.n] = el;
              }}
              className={`${ui.card} scroll-mt-24 ${justAgreed === card.n ? "outline-2 outline-offset-2 outline-indigo-500" : ""}`}
              data-testid="question-card"
            >
              <QuestionCard
                card={card}
                interviewId={interviewId}
                stories={stories}
                unlinkedHere={unlinked.filter((u) => u.competencyId === card.competencyId)}
                loadingPrompts={loadingPrompts}
                hasCv={hasCv}
                onSetStory={(id) => setStory(card, id)}
              />
              <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                {justAgreed === card.n && <span className="text-sm text-indigo-700 dark:text-indigo-300">You&apos;re set to record. Press Practise to start.</span>}
                {consented ? (
                  <Link
                    ref={(el) => {
                      practise.current[card.n] = el;
                    }}
                    href={`/i/${interviewId}/mock/${card.questionId}`}
                    className={ui.btnPrimary}
                    aria-label={`Practise question ${card.n}`}
                  >
                    Practise
                  </Link>
                ) : (
                  <button type="button" className={ui.btnPrimary} onClick={() => askConsent(card.n)} disabled={!hydrated} aria-label={`Practise question ${card.n}`}>
                    Practise
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>

        {alsoTested.map((c) => (
          <div key={c.label} className="flex flex-col gap-1 border-l-2 border-zinc-300 pl-3 text-sm dark:border-zinc-700" data-testid="also-tested">
            <p>
              <span className="font-medium">Also tested in every answer:</span> {c.label}
            </p>
            <p className={ui.muted}>“{c.jdQuote}” Your feedback covers this on each question, so it has no card of its own.</p>
          </div>
        ))}
      </section>
    </>
  );
}

function QuestionCard({
  card,
  interviewId,
  stories,
  unlinkedHere,
  loadingPrompts,
  hasCv,
  onSetStory,
}: {
  card: RoleCardData;
  interviewId: string;
  stories: StoryOption[];
  unlinkedHere: { storyId: string; name: string }[];
  loadingPrompts: boolean;
  hasCv: boolean;
  onSetStory: (storyId: string | null) => Promise<boolean>;
}) {
  const hydrated = useHydrated();
  const listId = useId();
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(storyId: string | null) {
    setBusy(true);
    setError(null);
    const ok = await onSetStory(storyId);
    setBusy(false);
    if (!ok) setError("That didn't save. Please try again.");
    else setPicking(false);
  }

  const n = card.prompts.length;
  const status = card.story
    ? { label: "Story matched", cls: okChip }
    : n
      ? { label: `${n} from your CV`, cls: greyChip }
      : { label: "Gap", cls: warnChip };
  const buildHref = (promptId: string | null) =>
    `/stories?from=${interviewId}&q=${card.questionId}${promptId ? `&prompt=${promptId}` : ""}`;
  const savedSuggestions = unlinkedHere.filter((u) => u.storyId !== card.story?.id);
  const [top, ...rest] = card.prompts;

  const promptRow = (p: RoleCardData["prompts"][number]) => (
    <li key={p.id} className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 sm:flex-row sm:items-start sm:justify-between dark:border-zinc-800" data-testid="cv-prompt">
      <p className="text-sm">{p.text}</p>
      <Link href={buildHref(p.id)} className={`${smallBtn} shrink-0`} aria-label={`Build a story for question ${card.n} from this CV line`}>
        Build story →
      </Link>
    </li>
  );
  const savedRow = (u: { storyId: string; name: string }) => (
    <li key={u.storyId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800" data-testid="saved-suggestion">
      <span>
        <span className={`${chip} ${greyChip} mr-2`}>Saved story</span>
        {u.name}
      </span>
      <button type="button" className={smallBtn} onClick={() => void choose(u.storyId)} disabled={!hydrated || busy}>
        Use this story
      </button>
    </li>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={ui.muted}>Q{card.n}</span>
        {card.competency && <span className={ui.chip}>{card.competency}</span>}
        <span className={`${chip} ${status.cls}`} data-testid="card-status">
          {status.label}
        </span>
      </div>
      <p className="font-medium">{card.text}</p>
      <blockquote className={ui.quote} data-testid="jd-quote">
        From the JD: “{card.jdQuote}”
      </blockquote>

      {card.story && (
        <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/30" data-testid="mapped-story">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">{card.story.chosen ? "Chosen by you" : "Your matched story"}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{card.story.name}</span>
            <span className={`${chip} ${card.story.ready ? okChip : greyChip}`}>{card.story.ready ? "Ready" : "Draft"}</span>
          </div>
          {card.story.why && <p className={ui.muted}>Why it fits: “{card.story.why}”</p>}
          <div className="flex flex-wrap gap-1">
            <Link href={`/stories?from=${interviewId}&open=${card.story.id}`} className={smallBtn}>
              Open
            </Link>
            <button type="button" className={smallBtn} aria-expanded={picking} aria-controls={listId} onClick={() => setPicking((p) => !p)} disabled={!hydrated}>
              Change
            </button>
          </div>
          {picking && (
            <div id={listId} className="flex flex-col gap-2 border-t border-emerald-200 pt-2 dark:border-emerald-900">
              <p className="text-sm font-medium">Your saved stories, best fit first</p>
              <ul className="flex flex-col gap-1">
                {[...stories].sort((a, b) => Number(b.id === card.story!.id) - Number(a.id === card.story!.id)).map((s) => (
                  <li key={s.id}>
                    {s.id === card.story!.id ? (
                      <span className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm">
                        {s.name} <span className={`${chip} ${okChip}`}>In use</span>
                      </span>
                    ) : (
                      <button type="button" className={`${smallBtn} w-full justify-start text-left`} onClick={() => void choose(s.id)} disabled={busy}>
                        {s.name}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <div>
                <button type="button" className="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950" onClick={() => void choose(null)} disabled={busy}>
                  Unlink this story
                </button>
                <p className={ui.muted}>Only the link to this question is removed. The story stays in My stories.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className={ui.error}>
          {error}
        </p>
      )}

      {!card.story && (
        <>
          {loadingPrompts && n === 0 && <p className={ui.muted}>Finding lines from your CV for this question…</p>}
          {(top || savedSuggestions.length > 0) && (
            <ul className="flex flex-col gap-2">
              {top ? promptRow(top) : savedRow(savedSuggestions[0])}
            </ul>
          )}
          {(rest.length > 0 || (top && savedSuggestions.length > 0) || (!top && savedSuggestions.length > 1)) && (
            <details>
              <summary className="cursor-pointer text-sm font-medium">
                More prompts from your CV{savedSuggestions.length ? " and stories" : ""} ({rest.length + savedSuggestions.length - (top ? 0 : 1)})
              </summary>
              <ul className="mt-2 flex flex-col gap-2">
                {top && savedSuggestions.map(savedRow)}
                {!top && savedSuggestions.slice(1).map(savedRow)}
                {rest.map(promptRow)}
              </ul>
            </details>
          )}
          {!top && savedSuggestions.length === 0 && !(loadingPrompts && n === 0) && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200" data-testid="gap">
              <span className="font-medium">Gap:</span> {hasCv ? "nothing on your CV or in your saved stories shows this yet." : "none of your saved stories shows this yet."} A small example works
              too: think of one moment, even in a class project, and{" "}
              <Link href={buildHref(null)} className={ui.link}>
                write it up on My stories
              </Link>
              .
            </p>
          )}
        </>
      )}

      {card.story && n > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium">More prompts from your CV ({n})</summary>
          <ul className="mt-2 flex flex-col gap-2">{card.prompts.map(promptRow)}</ul>
        </details>
      )}
    </div>
  );
}

/** No CV yet: paste one here so every card can show lines from it (SD1). Prompts are made right after saving. */
function CvAdder({ interviewId, onSaved }: { interviewId: string; onSaved: () => void }) {
  const hydrated = useHydrated();
  const id = useId();
  const [cv, setCv] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const r = await safePost(`/api/interviews/${interviewId}/cv`, { cv });
    if (!r?.ok) {
      setBusy(false);
      setError((r?.data.error as string | undefined) ?? "That didn't save. Please try again.");
      return;
    }
    await safePost(`/api/interviews/${interviewId}/prompts`);
    setBusy(false);
    onSaved();
  }

  return (
    <details className="border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
      <summary className="cursor-pointer font-medium">Add your CV to see lines from it on each question</summary>
      <div className="mt-2 flex flex-col gap-2">
        <label htmlFor={id} className={ui.label}>
          Your CV or past roles (pasted text)
        </label>
        <textarea id={id} rows={5} className={ui.input} value={cv} onChange={(e) => setCv(e.target.value)} />
        {error && (
          <p role="alert" className={ui.error}>
            {error}
          </p>
        )}
        <div>
          <button type="button" className={ui.btnSecondary} onClick={save} disabled={!hydrated || busy || cv.trim().length < 20}>
            {busy ? "Reading your CV…" : "Save CV"}
          </button>
        </div>
      </div>
    </details>
  );
}
