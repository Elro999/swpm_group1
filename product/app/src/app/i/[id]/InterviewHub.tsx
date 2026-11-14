import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ConsentGate } from "@/components/ConsentGate";
import { DeleteDataButton } from "@/components/DeleteDataButton";
import { GapDiscovery } from "@/components/GapDiscovery";
import { MatchStoriesButton } from "@/components/MatchStoriesButton";
import { ResumeLink } from "@/components/ResumeLink";
import { TrackView } from "@/components/TrackView";
import { ui } from "@/components/ui";
import { getRepo } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { describeInterviewDate, roleTitle } from "@/modules/interview/format";
import { buildPrepList } from "@/modules/prep/prep";
import { getCurrentSession, readSessionToken } from "@/modules/session/cookie";

/**
 * Interview hub content (task 1.4; MF1 now, SB4 map in Phase 4, prep list in Phase 5).
 * Ownership: an interview is only found for the session that created it; anything else is a 404.
 */
export async function InterviewHub({ params }: { params: Promise<{ id: string }> }) {
  // Request-time only: the date countdown reads the clock (Next 16 rejects new Date() during prerender).
  await connection();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const session = await getCurrentSession();
  if (!session) notFound();
  const repo = getRepo();
  const interview = await repo.interviews.findForSession(id, session.id);
  if (!interview) notFound();

  const [competencies, questions, token, stories] = await Promise.all([
    repo.competencies.listByInterview(interview.id),
    repo.questions.listByInterview(interview.id),
    readSessionToken(),
    repo.stories.listBySession(session.id),
  ]);
  const labelOf = new Map(competencies.map((c) => [c.id, c.label]));
  const storyById = new Map(stories.map((s) => [s.id, s]));
  // Never show coverage whose evidence is no longer in the story (e.g. edited before invalidation): such a row
  // is treated as "not matched yet" until mapping runs again (review fix).
  const mapping = new Map(
    (await repo.competencyMap.listByCompetencies(competencies.map((c) => c.id)))
      .filter((m) => {
        if (m.isGap) return true;
        const st = m.storyId ? storyById.get(m.storyId) : undefined;
        return Boolean(st && (!m.rationaleQuote || st.rawText.includes(m.rationaleQuote)));
      })
      .map((m) => [m.competencyId, m]),
  );
  const gaps = competencies.filter((c) => mapping.get(c.id)?.isGap).length;
  const when = describeInterviewDate(interview.interviewDate);

  // Prep list (PL1, PL2): derived from current state, so it updates as stories become ready and questions get feedback.
  const readyAttempts = new Map(
    await Promise.all(
      questions.map(async (q) => [q.id, (await repo.attempts.listByQuestion(q.id)).filter((a) => a.status === "ready").length] as const),
    ),
  );
  const prep = buildPrepList({
    interviewId: interview.id,
    interviewDate: interview.interviewDate,
    today: new Date(),
    questions,
    readyAttempts,
    competencies,
    mapping: [...mapping.values()],
    stories,
  });

  return (
    <>
      <TrackView name="questions_shown" props={{ count: questions.length }} />

      <div className="flex flex-col gap-2">
        <h1 className={ui.h1}>{roleTitle(interview.jdText)}</h1>
        {when && <p className={ui.muted}>{when}</p>}
      </div>

      <section aria-labelledby="questions-title" className="flex flex-col gap-4">
        <h2 id="questions-title" className={ui.h2}>
          Questions to practise ({questions.length})
        </h2>
        <ol className="flex flex-col gap-3" data-testid="question-list">
          {questions.map((q, i) => (
            <li key={q.id} className={ui.card}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={ui.muted}>Q{i + 1}</span>
                {q.competencyId && labelOf.get(q.competencyId) && <span className={ui.chip}>{labelOf.get(q.competencyId)}</span>}
              </div>
              <p className="mt-2 font-medium">{q.text}</p>
              <blockquote className={`mt-2 ${ui.quote}`} data-testid="jd-quote">
                From the JD: “{q.jdQuote}”
              </blockquote>
              {session.consentAt && (
                <Link href={`/i/${interview.id}/mock/${q.id}`} className={`${ui.btnPrimary} mt-3`} aria-label={`Practise question ${i + 1}`}>
                  Practise
                </Link>
              )}
            </li>
          ))}
        </ol>

        <ConsentGate consented={Boolean(session.consentAt)}>
          <div className={ui.card} data-testid="practice-ready">
            <p className="font-medium">You&apos;re set to record.</p>
            <p className={ui.muted}>Pick a question above and press Practise. Answer out loud; you&apos;ll get one follow-up, then feedback on your own words.</p>
          </div>
        </ConsentGate>
      </section>

      <section aria-labelledby="competencies-title" className="flex flex-col gap-3">
        <h2 id="competencies-title" className={ui.h2}>
          What this role tests
        </h2>
        <p className={ui.muted}>
          {stories.length === 0 && mapping.size === 0
            ? "Add your stories and match them to what this role tests, or let us help you find stories from your CV."
            : mapping.size === 0
              ? `You have ${stories.length} stor${stories.length === 1 ? "y" : "ies"}. Match them to this role.`
              : `${competencies.length - gaps} of ${competencies.length} matched to a story · ${gaps} gap${gaps === 1 ? "" : "s"}.`}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/stories?from=${interview.id}`} className={ui.btnSecondary}>
            {stories.length ? "Open my stories" : "Add my stories"}
          </Link>
          <MatchStoriesButton
            interviewId={interview.id}
            label={mapping.size ? "Match again" : stories.length ? "Match my stories to this role" : "Find stories for this role"}
          />
        </div>
        <ul className="flex flex-col gap-2" data-testid="competency-map">
          {competencies.map((c) => {
            const m = mapping.get(c.id);
            const story = m?.storyId ? storyById.get(m.storyId) : undefined;
            const storyLine = story?.decision?.text ?? story?.situation?.text ?? story?.rawText.slice(0, 120);
            return (
              <li key={c.id} className={ui.card} data-testid="competency">
                <p className="font-medium">{c.label}</p>
                <blockquote className={`mt-1 ${ui.quote}`}>“{c.jdQuote}”</blockquote>
                {!m && <p className={`mt-2 ${ui.muted}`}>Not matched yet.</p>}
                {m?.isGap && (
                  <>
                    <p className="mt-2 text-sm font-medium text-amber-800 dark:text-amber-300" data-testid="gap">
                      Gap: none of your stories shows this yet.
                    </p>
                    <GapDiscovery interviewId={interview.id} competencyId={c.id} label={c.label} hasCv={Boolean(interview.cvText)} />
                  </>
                )}
                {m && !m.isGap && story && (
                  <div className="mt-2 text-sm" data-testid="mapped-story">
                    <p>
                      <span className="font-medium">Your story:</span> <q>{storyLine}</q>
                      {story.state === "ready" && <span className={`ml-2 ${ui.chip}`}>Ready</span>}
                      {story.source === "discovery" && story.state !== "ready" && <span className={`ml-2 ${ui.chip}`}>Draft, from your answer</span>}
                    </p>
                    {m.rationaleQuote && <p className={`mt-1 ${ui.muted}`}>Why it fits: “{m.rationaleQuote}”</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="prep-title" className={`${ui.card} flex flex-col gap-3`} data-testid="prep-list">
        <TrackView name="prep_list_viewed" props={{ items: prep.items.length, done: prep.done }} />
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="prep-title" className={ui.h2}>
            Prep list
          </h2>
          <p className={ui.muted} data-testid="prep-progress">
            {prep.done} of {prep.total} done
            {prep.daysLeft !== null && prep.daysLeft > 0 && ` · ${prep.daysLeft} day${prep.daysLeft === 1 ? "" : "s"} to go`}
          </p>
        </div>
        {prep.items.length === 0 ? (
          <p>You&apos;re ready: every matched story is marked ready and every question has feedback. Keep it warm with one retry a day.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {prep.items.map((item) => (
              <li key={`${item.kind}-${item.refId}-${item.retry}`} className="flex flex-col gap-1 border-l-2 border-indigo-300 pl-3 dark:border-indigo-700" data-testid="prep-item">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {item.when} · {item.minutes} min
                </p>
                <Link href={item.href} className={ui.link}>
                  {item.title}
                </Link>
                {item.detail && <p className={`${ui.muted}`}>{item.detail}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      {token && <ResumeLink path={`/r/${token}`} />}
      <details className={ui.card}>
        <summary className="cursor-pointer font-medium">Delete my data</summary>
        <div className="mt-3">
          <DeleteDataButton />
        </div>
      </details>
    </>
  );
}
