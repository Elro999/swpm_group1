"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { ui } from "./ui";

/** Admin key form (PF4/PF5). The key is sent once; the server sets an HMAC cookie, never the key itself. */
export function AdminLogin() {
  const router = useRouter();
  const hydrated = useHydrated();
  const id = useId();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setKey("");
      router.refresh();
      return;
    }
    const data = res ? await res.json().catch(() => ({})) : {};
    setError((data as { error?: string }).error ?? "Network problem. Please try again.");
  }

  return (
    <form onSubmit={submit} className={`${ui.card} flex max-w-md flex-col gap-3`}>
      <label htmlFor={id} className={ui.label}>
        Team key
      </label>
      <input id={id} type="password" autoComplete="off" className={ui.input} value={key} onChange={(e) => setKey(e.target.value)} />
      {error && (
        <p role="alert" className={ui.error}>
          {error}
        </p>
      )}
      <button type="submit" className={`${ui.btnPrimary} self-start`} disabled={!hydrated || busy || !key}>
        {busy ? "Checking…" : "Open the review page"}
      </button>
    </form>
  );
}

export function AdminLogout() {
  const router = useRouter();
  const hydrated = useHydrated();
  return (
    <button
      type="button"
      className={ui.btnSecondary}
      disabled={!hydrated}
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
        router.refresh();
      }}
    >
      Sign out of admin
    </button>
  );
}
