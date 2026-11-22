import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DeleteDataButton } from "@/components/DeleteDataButton";
import { StreakCard } from "@/components/streak/StreakCard";
import { TrackView } from "@/components/TrackView";
import { ui } from "@/components/ui";
import { getRepo } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { describeInterviewDate, roleTitle } from "@/modules/interview/format";
import { buildPrepList } from "@/modules/prep/prep";
import { getCurrentSession } from "@/modules/session/cookie";
import { storyName } from "@/modules/stories/star";
import { RoleCards, type RoleCardData } from "./RoleCards";

/**
 * Interview hub content (task 1.4; MF1, SB4, SD1, prep list). Since 2026-11-22 (design/01) each question is one
 * card holding its competency, matched story or CV prompts, and Practise; "What this role tests" is gone.
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

  const [competencies, questions, stories] = await Promise.all([
    repo.competencies.listByInterview(interview.id),
    repo.questions.listByInterview(interview.id),
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
  const when = describeInterviewDate(interview.interviewDate);
  const prompts = await repo.competencyPrompts.listByCompetencies(competencies.map((c) => c.id));

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

  // Everything the merged question cards need (design/01), as plain data for the client component.
  const asked = new Set(questions.map((q) => q.competencyId));
  const since = interview.matchedAt?.getTime() ?? null;
  const cards: RoleCardData[] = questions.map((q, i) => {
    const m = q.competencyId ? mapping.get(q.competencyId) : undefined;
    const story = m?.storyId ? storyById.get(m.storyId) : undefined;
    return {
      questionId: q.id,
      n: i + 1,
      text: q.text,
      jdQuote: q.jdQuote,
      competencyId: q.competencyId,
      competency: q.competencyId ? (labelOf.get(q.competencyId) ?? null) : null,
      story: story && m ? { id: story.id, name: storyName(story), ready: story.state === "ready", why: m.rationaleQuote, chosen: Boolean(m.chosenByUser) } : null,
      prompts: prompts.filter((p) => p.competencyId === q.competencyId).map((p) => ({ id: p.id, text: p.text, cvLine: p.refs[0] ?? null })),
    };
  });

  return (
    <>
      <TrackView name="questions_shown" props={{ count: questions.length }} />

      <div className="flex flex-col gap-2">
        <h1 className={ui.h1}>{roleTitle(interview.jdText)}</h1>
        <p className={ui.muted}>
          {when ? `${when}. ` : ""}
          {questions.length} questions from the job description{interview.cvText ? ", each with lines from your CV that could become your answer." : "."}
        </p>
      </div>

      <StreakCard interviewId={interview.id} nextStep={prep.items[0] ? { title: prep.items[0].title, href: prep.items[0].href, minutes: prep.items[0].minutes } : null} />

      <RoleCards
        interviewId={interview.id}
        consented={Boolean(session.consentAt)}
        hasCv={Boolean(interview.cvText)}
        cards={cards}
        stories={stories.map((s) => ({ id: s.id, name: storyName(s), ready: s.state === "ready" }))}
        neverMatched={since === null}
        newStoryIds={since === null ? [] : stories.filter((s) => s.createdAt.getTime() > since).map((s) => s.id)}
        alsoTested={competencies.filter((c) => !asked.has(c.id)).map((c) => ({ label: c.label, jdQuote: c.jdQuote }))}
      />

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

      <details className={ui.card}>
        <summary className="cursor-pointer font-medium">Delete my data</summary>
        <p className={`mt-2 ${ui.muted}`}>Removes your job descriptions, CV, stories, recordings and feedback.</p>
        <div className="mt-3">
          <DeleteDataButton />
        </div>
      </details>
    </>
  );
}
