import type { Metadata } from "next";
import { Suspense } from "react";
import { ui } from "@/components/ui";
import { MockLoader } from "./MockLoader";

export const metadata: Metadata = { title: "Practise · Interview Prep Companion" };

/** Mock practice for one question (Phase 2: MF2–MF7). Dynamic part inside Suspense (Next 16 rule). */
export default function MockPage({ params }: PageProps<"/i/[id]/mock/[qid]">) {
  return (
    <main className={`${ui.page} flex flex-col gap-6`}>
      <Suspense fallback={<p className={ui.muted}>Loading…</p>}>
        <MockLoader params={params} />
      </Suspense>
    </main>
  );
}
