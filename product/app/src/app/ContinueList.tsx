import Link from "next/link";
import { connection } from "next/server";
import { ui } from "@/components/ui";
import { getRepo } from "@/lib/db";
import { describeInterviewDate, roleTitle } from "@/modules/interview/format";
import { getCurrentSession } from "@/modules/session/cookie";

/** Returning visitors see their interviews (US-0.3). Renders nothing for a new visitor. */
export async function ContinueList() {
  await connection(); // the date countdown reads the clock; request-time only (Next 16)
  const session = await getCurrentSession();
  if (!session) return null;
  const interviews = (await getRepo().interviews.listBySession(session.id)).slice(0, 5);
  if (!interviews.length) return null;

  return (
    <section aria-labelledby="continue-title" className="flex flex-col gap-3">
      <h2 id="continue-title" className={ui.h2}>
        Continue where you left off
      </h2>
      <ul className="flex flex-col gap-2">
        {interviews.map((iv) => (
          <li key={iv.id}>
            <Link href={`/i/${iv.id}`} className={`${ui.card} block hover:border-indigo-400`}>
              <span className="font-medium">{roleTitle(iv.jdText)}</span>
              {iv.interviewDate && <span className={`block ${ui.muted}`}>{describeInterviewDate(iv.interviewDate)}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
