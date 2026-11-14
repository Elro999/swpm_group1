import type { Metadata } from "next";
import { DeleteDataButton } from "@/components/DeleteDataButton";
import { ui } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy · Interview Prep Companion" };

/**
 * Privacy notice (task 1.5; PF2). DRAFT wording: the team must approve it and the retention period
 * before public release (PRD open question Q2). Provider names are filled in once chosen (Q1).
 * Keep this page and ConsentGate's summary saying the same thing.
 */
export default function PrivacyPage() {
  return (
    <main className={`${ui.page} flex flex-col gap-6`}>
      <div className="flex flex-col gap-2">
        <h1 className={ui.h1}>How we handle your data</h1>
        <p role="note" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Draft for team review: wording and retention periods are not final yet.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className={ui.h2}>What we store</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>The job description, CV text and stories you paste.</li>
          <li>Your recorded answers (audio) and their transcripts.</li>
          <li>The questions and feedback we generate from them.</li>
          <li>Usage events such as &quot;viewed feedback&quot;. These never contain your words.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={ui.h2}>Who processes it</h2>
        <p>
          A member of our small student team may read your transcripts, stories and feedback to check that the feedback is accurate and
          that nothing was added to your words. We look at what you wrote and said, never at who you are: there is no name or email.
        </p>
        <p>
          Your text and audio are sent to our AI providers (a speech-to-text service and a language model) only to produce your
          transcript, questions and feedback. Our database and file storage are hosted by our infrastructure provider. We don&apos;t
          sell your data or use it for advertising.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={ui.h2}>How long we keep it</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Audio recordings: deleted after 30 days.</li>
          <li>Text (JD, stories, transcripts, feedback): kept until you delete it.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={ui.h2}>Your controls</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>No account: you&apos;re identified only by a private cookie and a private link you can copy.</li>
          <li>Nothing is recorded until you agree on the practice screen.</li>
          <li>You can delete all your data at any time, below or from any interview page.</li>
        </ul>
        <DeleteDataButton />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={ui.h2}>What the AI will never do</h2>
        <p>It will not rewrite your answers or stories, and it will not add ownership, numbers or results you did not say.</p>
      </section>
    </main>
  );
}
