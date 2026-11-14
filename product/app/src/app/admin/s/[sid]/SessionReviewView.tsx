import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminLogin } from "@/components/AdminControls";
import { ui } from "@/components/ui";
import { getRepo } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { buildSessionReview } from "@/modules/admin/review";
import { adminEnabled, isAdminRequest } from "@/modules/admin/server";
import { formatMs } from "@/modules/feedback/transcript";

/** Read-only review of one session (PF4). Admin cookie required; anything else shows the key form or 404. */
export async function SessionReviewView({ params }: { params: Promise<{ sid: string }> }) {
  await connection(); // the ADMIN_KEY check must run per request, never at build time
  const { sid } = await params;
  if (!adminEnabled() || !isUuid(sid)) notFound();
  if (!(await isAdminRequest())) return <AdminLogin />;
  const review = await buildSessionReview(getRepo(), sid);
  if (!review) notFound();

  return (
    <>
      <nav aria-label="Breadcrumb" className={ui.muted}>
        <Link href="/admin" className={ui.link}>
          ← Team review
        </Link>
      </nav>
      <h1 className="text-2xl font-semibold tracking-tight">
        Session <span className="font-mono">{review.session.id.slice(0, 8)}</span>
      </h1>
      <p className={ui.muted}>Check: is every quote really in the transcript? Does any message suggest new wording, or add a role, number or result?</p>

      {review.interviews.map((iv) => (
        <section key={iv.id} className="flex flex-col gap-4" data-testid="review-interview">
          <h2 className={ui.h2}>{iv.jdFirstLine}</h2>
          {iv.questions.map((q, qi) => (
            <div key={qi} className="flex flex-col gap-3">
              <p className="font-medium">
                Q{qi + 1}. {q.text}
              </p>
              {q.attempts.length === 0 && <p className={ui.muted}>Not practised.</p>}
              {q.attempts.map((a) => (
                <article key={a.attemptNo} className={`${ui.card} flex flex-col gap-3`} data-testid="review-attempt">
                  <p className={ui.muted}>
                    Attempt {a.attemptNo} · {a.status}
                  </p>
                  {a.transcript && (
                    <details open>
                      <summary className="cursor-pointer text-sm font-medium">Transcript</summary>
                      <p className="mt-2 text-sm leading-7" data-testid="review-transcript">
                        {a.transcript}
                      </p>
                    </details>
                  )}
                  {a.followup && (
                    <p className="text-sm">
                      <span className="font-medium">Follow-up:</span> {a.followup.question}{" "}
                      <span className={ui.muted}>{a.followup.skipped ? "(skipped)" : a.followup.transcript ? `→ ${a.followup.transcript}` : ""}</span>
                    </p>
                  )}
                  <ul className="flex flex-col gap-2">
                    {a.points.map((p, pi) => (
                      <li key={pi} className={`rounded-md border p-2 text-sm ${p.notUseful ? "border-red-300 dark:border-red-800" : "border-zinc-200 dark:border-zinc-800"}`} data-testid="review-point">
                        <span className="font-mono text-xs">{p.checkId}</span> <span className={ui.muted}>· {p.kind} · {p.severity} · {formatMs(p.startMs)}</span>
                        <blockquote className={`mt-1 ${ui.quote}`}>“{p.quote}”</blockquote>
                        <p className="mt-1">{p.message}</p>
                        {p.notUseful && (
                          <p className="mt-1 font-medium text-red-700 dark:text-red-400" data-testid="review-not-useful">
                            Marked not useful{p.reason ? `: “${p.reason}”` : ""}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          ))}
        </section>
      ))}

      <section className="flex flex-col gap-2">
        <h2 className={ui.h2}>Stories ({review.stories.length})</h2>
        {review.stories.map((s) => (
          <div key={s.id} className={`${ui.card} text-sm`}>
            <p className={ui.muted}>
              {s.state} · {s.source}
            </p>
            <p className="mt-1">{s.rawText}</p>
          </div>
        ))}
      </section>
    </>
  );
}
