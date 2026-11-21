import Link from "next/link";
import { connection } from "next/server";
import { AdminLogin, AdminLogout } from "@/components/AdminControls";
import { ui } from "@/components/ui";
import { getRepo } from "@/lib/db";
import { buildAdminOverview } from "@/modules/admin/review";
import { adminEnabled, isAdminRequest } from "@/modules/admin/server";

const STATUS = {
  pass: { text: "Pass", cls: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  fail: { text: "Below target", cls: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200" },
  no_data: { text: "No data", cls: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
} as const;

const when = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export async function AdminOverview() {
  // Request-time only: without this, Next prerenders the page at build time and freezes the ADMIN_KEY check.
  await connection();
  if (!adminEnabled()) {
    return <p className={ui.card}>Admin is not enabled. Set ADMIN_KEY (16+ characters) in the environment to turn it on.</p>;
  }
  if (!(await isAdminRequest())) return <AdminLogin />;

  const { sessions, metrics } = await buildAdminOverview(getRepo());

  return (
    <>
      <div className="flex justify-end">
        <AdminLogout />
      </div>

      <section aria-labelledby="metrics-title" className="flex flex-col gap-3">
        <h2 id="metrics-title" className={ui.h2}>
          MVP hypotheses
        </h2>
        <p className={ui.muted}>With fewer than about 25 users these numbers are directional, not proof. Read them next to the interviews.</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm" data-testid="admin-metrics">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th scope="col" className="py-2 pr-3 font-medium">Metric</th>
                <th scope="col" className="py-2 pr-3 font-medium">Now</th>
                <th scope="col" className="py-2 pr-3 font-medium">Count</th>
                <th scope="col" className="py-2 pr-3 font-medium">Target</th>
                <th scope="col" className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.key} className="border-b border-zinc-100 dark:border-zinc-900" data-testid={`admin-metric-${m.key}`}>
                  <th scope="row" className="py-2 pr-3 font-normal">
                    {m.label}
                    {m.note && <span className={`block ${ui.muted}`}>{m.note}</span>}
                  </th>
                  <td className="py-2 pr-3 tabular-nums">{m.display}</td>
                  <td className="py-2 pr-3 tabular-nums">
                    {m.numerator} / {m.denominator}
                  </td>
                  <td className="py-2 pr-3">{m.target}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[m.status].cls}`}>{STATUS[m.status].text}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="queue-title" className="flex flex-col gap-3">
        <h2 id="queue-title" className={ui.h2}>
          Review queue ({sessions.length})
        </h2>
        <p className={ui.muted}>Open a session to read its transcripts and every feedback point. Check that each quote is really in the answer and nothing was added.</p>
        {sessions.length === 0 && <p>No sessions yet.</p>}
        <ul className="flex flex-col gap-2" data-testid="admin-sessions">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link href={`/admin/s/${s.id}`} className={`${ui.card} block hover:border-indigo-400`}>
                <span className="font-mono text-sm">{s.id.slice(0, 8)}</span>
                <span className={`ml-3 ${ui.muted}`}>
                  started {when(s.createdAt)} · last seen {when(s.lastSeenAt)}
                </span>
                <span className="mt-1 block text-sm">
                  {s.interviews} interview{s.interviews === 1 ? "" : "s"} · {s.attempts} attempt{s.attempts === 1 ? "" : "s"} · {s.feedbackPoints} feedback points
                  {s.notUseful > 0 && <span className="ml-1 font-medium text-red-700 dark:text-red-400">· {s.notUseful} marked not useful</span>} · {s.stories} stories
                  {!s.consented && " · no recording consent"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
