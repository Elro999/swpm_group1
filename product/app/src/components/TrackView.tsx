"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/client";

/** Reports a client-only view event once per mount (e.g. questions_shown). Renders nothing. */
export function TrackView({ name, props = {} }: { name: string; props?: Record<string, string | number | boolean | null> }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackEvent(name, props);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per mount by design
  }, []);
  return null;
}
