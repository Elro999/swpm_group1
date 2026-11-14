import type { Metadata } from "next";
import { Suspense } from "react";
import { ui } from "@/components/ui";
import { AdminOverview } from "./AdminOverview";

export const metadata: Metadata = { title: "Team review · Interview Prep Companion", robots: { index: false, follow: false } };

/** Team-only review queue and hypothesis metrics (PF4, PF5). Cookie reads sit inside Suspense (Next 16). */
export default function AdminPage() {
  return (
    <main className={`${ui.page} flex flex-col gap-6`}>
      <h1 className={ui.h1}>Team review</h1>
      <Suspense fallback={<p className={ui.muted}>Loading…</p>}>
        <AdminOverview />
      </Suspense>
    </main>
  );
}
