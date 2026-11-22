import Link from "next/link";
import { ui } from "@/components/ui";
import { getRepo } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { loadBuildContext } from "@/modules/discovery/service";
import { roleTitle } from "@/modules/interview/format";
import { getCurrentSession } from "@/modules/session/cookie";
import { toStoryView } from "@/modules/stories/deps";
import { StoryBank } from "./StoryBank";

/**
 * Server side of the story bank: the visitor's own stories, an optional "back to interview" link (?from=<interviewId>),
 * a story to open (?open=<storyId>), and "Build story" from a question card (?q=<questionId>&prompt=<promptId>).
 * The URL carries IDs only; the question and CV line are looked up here, for this session only.
 */
export async function StoryBankLoader({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const session = await getCurrentSession();
  const repo = getRepo();
  const stories = session ? (await repo.stories.listBySession(session.id)).map(toStoryView) : [];

  const fromId = typeof sp.from === "string" && isUuid(sp.from) ? sp.from : null;
  const from = fromId && session ? await repo.interviews.findForSession(fromId, session.id) : null;
  const one = (k: string) => (typeof sp[k] === "string" && isUuid(sp[k] as string) ? (sp[k] as string) : null);
  const questionId = one("q");
  const build = from && session && questionId ? await loadBuildContext({ repo }, session.id, { interviewId: from.id, questionId, promptId: one("prompt") }) : null;
  const openId = one("open");

  return (
    <>
      {from && (
        <nav aria-label="Breadcrumb" className={ui.muted}>
          <Link href={build ? `/i/${from.id}#q-${build.questionId}` : `/i/${from.id}`} className={ui.link}>
            ← Back to {build ? `Q${build.questionNo}` : roleTitle(from.jdText)}
          </Link>
        </nav>
      )}
      <StoryBank
        initial={stories}
        returnTo={from ? `/i/${from.id}` : null}
        build={build}
        openId={openId && stories.some((s) => s.id === openId) ? openId : null}
      />
    </>
  );
}
