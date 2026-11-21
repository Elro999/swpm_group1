import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackView } from "@/components/TrackView";
import { ui } from "@/components/ui";
import { getRepo } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { CHECK_LABELS, compareAttempts, type Direction } from "@/modules/attempt/compare";
import { loadOwnedQuestion } from "@/modules/attempt/service";
import { roleTitle } from "@/modules/interview/format";
import { getCurrentSession } from "@/modules/session/cookie";

const BADGE: Record<Direction, { text: string; cls: string }> = {
  better: { text: "Better", cls: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  worse: { text: "Worse", cls: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200" },
  same: { text: "Same", cls: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
};

const asInt = (v: string | string[] | undefined) => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Server side of the compare page. Owner only. Defaults to the last two finished attempts;
 * ?from=N&to=M picks another pair (from < to, both finished).
 */
export async function CompareLoader({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; qid: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id, qid } = await params;
  const sp = await searchParams;
  if (!isUuid(id) || !isUuid(qid)) notFound();
  const session = await getCurrentSession();
  if (!session) notFound();
  const repo = getRepo();
  const owned = await loadOwnedQuestion(repo, qid, session.id);
  if (!owned || owned.interview.id !== id) notFound();

  const ready = (await repo.attempts.listByQuestion(qid)).filter((a) => a.status === "ready");
  const practiseHref = `/i/${id}/mock/${qid}`;

  const header = (
    <>
      <nav aria-label="Breadcrumb" className={`flex flex-wrap gap-x-4 ${ui.muted}`}>
        <Link href={`/i/${id}`} className={ui.link}>
          ← {roleTitle(owned.interview.jdText)}
        </Link>
        <Link href={practiseHref} className={ui.link}>
          Back to practice
        </Link>
      </nav>
      <div className="flex flex-col gap-2">
        <h1 className={ui.h1}>Before vs after</h1>
        <p className="font-medium">{owned.question.text}</p>
      </div>
    </>
  );

  if (ready.length < 2) {
    return (
      <>
        {header}
        <section className={ui.card}>
          <p>Answer this question at least twice to compare attempts.</p>
          <Link href={practiseHref} className={`${ui.btnPrimary} mt-3`}>
            Practise this question
          </Link>
        </section>
      </>
    );
  }

  const byNo = new Map(ready.map((a) => [a.attemptNo, a]));
  let to = byNo.get(asInt(sp.to) ?? -1) ?? ready[ready.length - 1];
  let from = byNo.get(asInt(sp.from) ?? -1);
  if (!from || from.attemptNo >= to.attemptNo) {
    const earlier = ready.filter((a) => a.attemptNo < to.attemptNo);
    if (earlier.length) from = earlier[earlier.length - 1];
    else {
      to = ready[ready.length - 1];
      from = ready[ready.length - 2];
    }
  }

  const [fbFrom, fbTo] = await Promise.all([repo.feedback.get(from.id), repo.feedback.get(to.id)]);
  if (!fbFrom.metrics || !fbTo.metrics) notFound();
  const c = compareAttempts({ metrics: fbFrom.metrics, points: fbFrom.points }, { metrics: fbTo.metrics, points: fbTo.points });
  const label = (checkId: string) => CHECK_LABELS[checkId] ?? checkId;
  const pairs = ready.slice(1).map((a, i) => ({ from: ready[i].attemptNo, to: a.attemptNo }));

  return (
    <>
      <TrackView name="compare_viewed" props={{ from: from.attemptNo, to: to.attemptNo }} />
      {header}

      {pairs.length > 1 && (
        <nav aria-label="Choose attempts to compare" className="flex flex-wrap gap-2">
          {pairs.map((p) => {
            const active = p.from === from.attemptNo && p.to === to.attemptNo;
            return (
              <Link
                key={`${p.from}-${p.to}`}
                href={`?from=${p.from}&to=${p.to}`}
                aria-current={active ? "page" : undefined}
                className={active ? ui.btnPrimary : ui.btnSecondary}
              >
                {p.from} → {p.to}
              </Link>
            );
          })}
        </nav>
      )}

      <p className="text-lg font-medium" data-testid="compare-summary">
        Attempt {from.attemptNo} → attempt {to.attemptNo}: {c.summary}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left" data-testid="compare-table">
          <caption className="sr-only">
            The same checks for attempt {from.attemptNo} and attempt {to.attemptNo}
          </caption>
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th scope="col" className="py-2 pr-4 font-medium">
                Check
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Attempt {from.attemptNo}
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Attempt {to.attemptNo}
              </th>
              <th scope="col" className="py-2 font-medium">
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            {c.metrics.map((m) => (
              <tr key={m.key} className="border-b border-zinc-100 dark:border-zinc-900" data-testid={`metric-${m.key}`}>
                <th scope="row" className="py-2 pr-4 font-normal">
                  {m.label}
                </th>
                <td className="py-2 pr-4 tabular-nums">{m.before}</td>
                <td className="py-2 pr-4 tabular-nums">{m.after}</td>
                <td className="py-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE[m.direction].cls}`}>{BADGE[m.direction].text}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="fixed-title" className="flex flex-col gap-2" data-testid="resolved">
        <h2 id="fixed-title" className={ui.h2}>
          Fixed ({c.resolved.length})
        </h2>
        {c.resolved.length === 0 && <p className={ui.muted}>Nothing from attempt {from.attemptNo} is fixed yet.</p>}
        {c.resolved.map((r) => (
          <div key={r.checkId} className={ui.card} data-testid={`resolved-${r.checkId}`}>
            <p className="font-medium">✓ {label(r.checkId)}</p>
            <blockquote className={`mt-1 ${ui.quote}`}>Before: “{r.beforeQuote}”</blockquote>
          </div>
        ))}
      </section>

      <section aria-labelledby="still-title" className="flex flex-col gap-2" data-testid="still-present">
        <h2 id="still-title" className={ui.h2}>
          Still there ({c.stillPresent.length})
        </h2>
        {c.stillPresent.length === 0 && <p className={ui.muted}>None.</p>}
        {c.stillPresent.map((s) => (
          <div key={s.checkId} className={ui.card} data-testid={`still-${s.checkId}`}>
            <p className="font-medium">{label(s.checkId)}</p>
            <blockquote className={`mt-1 ${ui.quote}`}>Before: “{s.beforeQuote}”</blockquote>
            <blockquote className={`mt-1 ${ui.quote}`}>Now: “{s.afterQuote}”</blockquote>
          </div>
        ))}
      </section>

      {c.newIssues.length > 0 && (
        <section aria-labelledby="new-title" className="flex flex-col gap-2">
          <h2 id="new-title" className={ui.h2}>
            New to look at ({c.newIssues.length})
          </h2>
          {c.newIssues.map((p) => (
            <div key={p.id} className={ui.card}>
              <p className="font-medium">{label(p.checkId)}</p>
              <blockquote className={`mt-1 ${ui.quote}`}>“{p.quote}”</blockquote>
              <p className="mt-1">{p.message}</p>
            </div>
          ))}
        </section>
      )}

      {c.strengths.length > 0 && (
        <section aria-labelledby="strengths-title" className="flex flex-col gap-2">
          <h2 id="strengths-title" className={ui.h2}>
            Working well
          </h2>
          {c.strengths.map((p) => (
            <blockquote key={p.id} className={ui.quote}>
              “{p.quote}”
            </blockquote>
          ))}
        </section>
      )}

      <div>
        <Link href={practiseHref} className={ui.btnPrimary}>
          Practise again
        </Link>
      </div>
    </>
  );
}
