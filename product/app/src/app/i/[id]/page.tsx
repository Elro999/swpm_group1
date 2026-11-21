import type { Metadata } from "next";
import { Suspense } from "react";
import { ui } from "@/components/ui";
import { InterviewHub } from "./InterviewHub";

export const metadata: Metadata = { title: "Your interview · Interview Prep Companion" };

/**
 * Interview hub (task 1.4). The shell is static; everything that needs the cookie or the id
 * renders inside Suspense (Next 16 Cache Components rule).
 */
export default function InterviewPage({ params }: PageProps<"/i/[id]">) {
  return (
    <main className={`${ui.page} flex flex-col gap-8`}>
      <Suspense fallback={<p className={ui.muted}>Loading your interview…</p>}>
        <InterviewHub params={params} />
      </Suspense>
    </main>
  );
}
