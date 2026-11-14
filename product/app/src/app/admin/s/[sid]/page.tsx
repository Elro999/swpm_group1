import type { Metadata } from "next";
import { Suspense } from "react";
import { ui } from "@/components/ui";
import { SessionReviewView } from "./SessionReviewView";

export const metadata: Metadata = { title: "Session review · Interview Prep Companion", robots: { index: false, follow: false } };

/** One session's transcripts, pinned feedback and "not useful" flags, for the teammate reviewer (PF4). */
export default function SessionReviewPage({ params }: PageProps<"/admin/s/[sid]">) {
  return (
    <main className={`${ui.page} flex flex-col gap-6`}>
      <Suspense fallback={<p className={ui.muted}>Loading…</p>}>
        <SessionReviewView params={params} />
      </Suspense>
    </main>
  );
}
