"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/**
 * False during server render and the first client paint, true once React has hydrated.
 * Use it to keep buttons disabled until their click handlers exist, so early taps on slow
 * devices are not silently lost (found by E2E on a busy dev server).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
