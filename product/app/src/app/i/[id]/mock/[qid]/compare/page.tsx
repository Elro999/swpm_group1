import type { Metadata } from "next";
import { Suspense } from "react";
import { ui } from "@/components/ui";
import { CompareLoader } from "./CompareLoader";

export const metadata: Metadata = { title: "Before vs after · Interview Prep Companion" };

/** Before vs after for one question (task 3.2; MF6, G6). Cookie and params reads sit inside Suspense. */
export default function ComparePage({ params, searchParams }: PageProps<"/i/[id]/mock/[qid]/compare">) {
  return (
    <main className={`${ui.page} flex flex-col gap-6`}>
      <Suspense fallback={<p className={ui.muted}>Loading…</p>}>
        <CompareLoader params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
