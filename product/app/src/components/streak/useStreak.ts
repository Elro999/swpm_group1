"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { StreakSummary } from "@/modules/streak/streak";

/** Fired after an action that may change the streak (e.g. feedback viewed), so every streak view reloads. */
export const STREAK_REFRESH_EVENT = "streak:refresh";

export function refreshStreak(): void {
  window.dispatchEvent(new Event(STREAK_REFRESH_EVENT));
}

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return "";
  }
}

/**
 * The visitor's prep streak, loaded from GET /api/streak with the browser's timezone.
 * Reloads on navigation and on refreshStreak(). `refreshes` counts reloads caused by refreshStreak(),
 * so a view can react only to fresh progress (the confirmation after feedback). Null when there is no session.
 */
export function useStreak(): { streak: StreakSummary | null; refreshes: number } {
  const pathname = usePathname();
  const [streak, setStreak] = useState<StreakSummary | null>(null);
  const [refreshes, setRefreshes] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = (fromRefresh: boolean) =>
      fetch(`/api/streak?tz=${encodeURIComponent(browserTimeZone())}`, { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<StreakSummary>) : null))
        .then((s) => {
          if (cancelled) return;
          setStreak(s);
          if (fromRefresh) setRefreshes((n) => n + 1);
        })
        .catch(() => undefined);
    void load(false);
    const onRefresh = () => void load(true);
    window.addEventListener(STREAK_REFRESH_EVENT, onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener(STREAK_REFRESH_EVENT, onRefresh);
    };
  }, [pathname]);

  return { streak, refreshes };
}
