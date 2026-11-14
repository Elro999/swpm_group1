"use client";

import { useState, useSyncExternalStore } from "react";
import { ui } from "./ui";

const subscribe = () => () => undefined;

/**
 * The visitor's private resume link (US-0.3). Anyone with this link can see their data, so the UI says so.
 * The origin is read in the browser so the link is correct on localhost, previews and production.
 */
export function ResumeLink({ path }: { path: string }) {
  const origin = useSyncExternalStore(subscribe, () => window.location.origin, () => "");
  const [copied, setCopied] = useState(false);
  const url = `${origin}${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <details className={ui.card}>
      <summary className="cursor-pointer font-medium">Continue on another device</summary>
      <p className={`mt-2 ${ui.muted}`}>
        This private link opens your interviews anywhere. Anyone who has it can see your data, so don&apos;t share it.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input readOnly value={url} aria-label="Your private link" className={`${ui.input} mt-0 font-mono text-sm`} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className={ui.btnSecondary} onClick={copy}>
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </details>
  );
}
