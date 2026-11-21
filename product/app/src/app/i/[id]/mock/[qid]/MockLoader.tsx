import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ui } from "@/components/ui";
import { getRepo } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { loadOwnedQuestion } from "@/modules/attempt/service";
import { buildAttemptView } from "@/modules/attempt/view";
import { roleTitle } from "@/modules/interview/format";
import { getCurrentSession } from "@/modules/session/cookie";
import { MockSession } from "./MockSession";

/** Server side of the practice screen: ownership, consent, and the latest attempt to resume. */
export async function MockLoader({ params }: { params: Promise<{ id: string; qid: string }> }) {
  const { id, qid } = await params;
  if (!isUuid(id) || !isUuid(qid)) notFound();
  const session = await getCurrentSession();
  if (!session) notFound();
  const repo = getRepo();
  const owned = await loadOwnedQuestion(repo, qid, session.id);
  if (!owned || owned.interview.id !== id) notFound();
  if (!session.consentAt) redirect(`/i/${id}`); // consent lives on the hub (PF2)

  const attempts = await repo.attempts.listByQuestion(qid);
  const latest = attempts.at(-1);
  const initial = latest ? await buildAttemptView(repo, latest, owned.question) : null;
  const competency = owned.question.competencyId
    ? (await repo.competencies.listByInterview(id)).find((c) => c.id === owned.question.competencyId)
    : undefined;

  return (
    <>
      <nav aria-label="Breadcrumb" className={ui.muted}>
        <Link href={`/i/${id}`} className={ui.link}>
          ← {roleTitle(owned.interview.jdText)}
        </Link>
      </nav>
      <div className="flex flex-col gap-2">
        {competency && <span className={`${ui.chip} self-start`}>{competency.label}</span>}
        <h1 className="text-2xl font-semibold tracking-tight">{owned.question.text}</h1>
        <p className={ui.muted}>Answer out loud as you would in the room, in about two minutes. Then you get one follow-up question.</p>
      </div>
      <MockSession questionId={qid} initial={initial} />
    </>
  );
}
