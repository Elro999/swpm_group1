import Link from "next/link";
import { ui } from "@/components/ui";
import { getRepo } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { roleTitle } from "@/modules/interview/format";
import { getCurrentSession } from "@/modules/session/cookie";
import { toStoryView } from "@/modules/stories/deps";
import { StoryBank } from "./StoryBank";

/** Server side of the story bank: the visitor's own stories, and an optional "back to interview" link (?from=<interviewId>). */
export async function StoryBankLoader({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const session = await getCurrentSession();
  const repo = getRepo();
  const stories = session ? (await repo.stories.listBySession(session.id)).map(toStoryView) : [];

  const fromId = typeof sp.from === "string" && isUuid(sp.from) ? sp.from : null;
  const from = fromId && session ? await repo.interviews.findForSession(fromId, session.id) : null;

  return (
    <>
      {from && (
        <nav aria-label="Breadcrumb" className={ui.muted}>
          <Link href={`/i/${from.id}`} className={ui.link}>
            ← Back to {roleTitle(from.jdText)}
          </Link>
        </nav>
      )}
      <StoryBank initial={stories} returnTo={from ? `/i/${from.id}` : null} />
    </>
  );
}
