import { Suspense } from "react";
import { StartButtons } from "@/components/StartButtons";
import { ui } from "@/components/ui";
import { ContinueList } from "./ContinueList";

/**
 * Landing page (task 1.1; PF1, PF6). Static shell + a dynamic "continue" list inside Suspense
 * (Next 16 Cache Components: cookie reads must sit inside a Suspense boundary).
 */
export default function Home() {
  return (
    <main className={`${ui.page} flex flex-col justify-center gap-8`}>
      <div className="flex flex-col gap-4">
        <h1 className={ui.h1}>Land your story in about two minutes.</h1>
        <p className={ui.lead}>
          Paste the job description, answer a question out loud, and see the exact line where your answer lost the
          listener. We point and ask; we never rewrite your story or make your role sound bigger than it was.
        </p>
        <p className={ui.muted}>No sign-up. Fit and behavioural interviews only.</p>
      </div>
      <StartButtons />
      <Suspense fallback={null}>
        <ContinueList />
      </Suspense>
    </main>
  );
}
