import type { Metadata } from "next";
import { Suspense } from "react";
import { ui } from "@/components/ui";
import { NewInterviewForm } from "./NewInterviewForm";

export const metadata: Metadata = { title: "Add an interview · Interview Prep Companion" };

/** Add an interview (task 1.2; US-0.2). The form reads ?sample=1, so it sits inside Suspense. */
export default function NewInterviewPage() {
  return (
    <main className={`${ui.page} flex flex-col gap-6`}>
      <div className="flex flex-col gap-2">
        <h1 className={ui.h1}>Add an interview</h1>
        <p className={ui.lead}>Paste the job description. We pick out what the role tests and write 3–5 questions from it.</p>
      </div>
      <Suspense fallback={<p className={ui.muted}>Loading…</p>}>
        <NewInterviewForm />
      </Suspense>
    </main>
  );
}
