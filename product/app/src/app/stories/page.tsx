import type { Metadata } from "next";
import { Suspense } from "react";
import { ui } from "@/components/ui";
import { StoryBankLoader } from "./StoryBankLoader";

export const metadata: Metadata = { title: "My stories · Interview Prep Companion" };

/** Story bank (Phase 4: SB1–SB5). Cookie and searchParams reads sit inside Suspense (Next 16 rule). */
export default function StoriesPage({ searchParams }: PageProps<"/stories">) {
  return (
    <main className={`${ui.page} flex flex-col gap-6`}>
      <div className="flex flex-col gap-2">
        <h1 className={ui.h1}>My stories</h1>
        <p className={ui.lead}>
          Paste your stories in your own words. We put your decision first and show which actions were yours and which were the
          team&apos;s. We only ever use your words: nothing is added or made bigger.
        </p>
      </div>
      <Suspense fallback={<p className={ui.muted}>Loading your stories…</p>}>
        <StoryBankLoader searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
