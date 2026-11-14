"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { ui } from "./ui";

/**
 * Gap discovery for one competency (SD1, SD2): CV (if missing) → 3–5 prompts that point at the CV →
 * the user's answer → a draft story built only from their words, which fills the gap.
 */
interface Prompt {
  text: string;
  references: string[];
}

export function GapDiscovery({ interviewId, competencyId, label, hasCv }: { interviewId: string; competencyId: string; label: string; hasCv: boolean }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const ids = { cv: useId(), answer: useId() };
  const [open, setOpen] = useState(false);
  const [cvSaved, setCvSaved] = useState(hasCv);
  const [cv, setCv] = useState("");
  const [prompts, setPrompts] = useState<Prompt[] | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(label: string, url: string, body?: unknown): Promise<Record<string, unknown> | null> {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setError((data.error as string) ?? "Something went wrong. Please try again.");
        return null;
      }
      return data;
    } catch {
      setError("Network problem. Check your connection and try again.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  const loadPrompts = async () => {
    const data = await call("Finding prompts in your CV…", `/api/competencies/${competencyId}/prompts`);
    if (data) setPrompts(data.prompts as Prompt[]);
  };

  async function start() {
    setOpen(true);
    if (cvSaved && !prompts) await loadPrompts();
  }

  async function saveCvAndLoad() {
    if (await call("Saving your CV…", `/api/interviews/${interviewId}/cv`, { cv })) {
      setCvSaved(true);
      router.refresh(); // other gaps on the page now know a CV exists
      await loadPrompts();
    }
  }

  async function submitAnswer() {
    if (await call("Turning your answer into a draft story…", `/api/competencies/${competencyId}/draft-story`, { answer })) router.refresh();
  }

  const locked = !hydrated || busy !== null;

  if (!open) {
    return (
      <button type="button" className={`${ui.btnSecondary} mt-3`} onClick={start} disabled={locked}>
        Find a story for this
      </button>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900" data-testid="gap-discovery">
      {busy && (
        <p role="status" className={ui.muted}>
          {busy}
        </p>
      )}
      {error && (
        <p role="alert" className={ui.error}>
          {error}
        </p>
      )}

      {!cvSaved && (
        <div className="flex flex-col gap-2">
          <label htmlFor={ids.cv} className={ui.label}>
            Paste your CV or list your past roles and projects (one per line)
          </label>
          <p className={ui.muted}>The prompts will point at your own experience, so you can spot a story you had forgotten.</p>
          <textarea id={ids.cv} rows={5} className={ui.input} value={cv} onChange={(e) => setCv(e.target.value)} />
          <button type="button" className={`${ui.btnPrimary} self-start`} onClick={saveCvAndLoad} disabled={locked || !cv.trim()}>
            Save and show prompts
          </button>
        </div>
      )}

      {cvSaved && prompts && (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-medium">Pick a prompt about “{label}”</legend>
          {prompts.map((p, i) => (
            <label key={i} className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <input type="radio" name={`prompt-${competencyId}`} className="mt-1" checked={chosen === i} onChange={() => setChosen(i)} />
              <span data-testid="gap-prompt">{p.text}</span>
            </label>
          ))}
        </fieldset>
      )}

      {chosen !== null && prompts && (
        <div className="flex flex-col gap-2">
          <label htmlFor={ids.answer} className={ui.label}>
            Your answer, in your own words
          </label>
          <p className={ui.muted}>What happened, what you decided, and what changed. We will not add anything to it.</p>
          <textarea id={ids.answer} rows={5} className={ui.input} value={answer} onChange={(e) => setAnswer(e.target.value)} />
          <button type="button" className={`${ui.btnPrimary} self-start`} onClick={submitAnswer} disabled={locked || !answer.trim()}>
            Turn into a draft story
          </button>
        </div>
      )}
    </div>
  );
}
