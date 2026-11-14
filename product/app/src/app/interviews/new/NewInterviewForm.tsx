"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { ui } from "@/components/ui";
import { ensureSession, postJson } from "@/lib/client";
import { SAMPLE_JD } from "@/lib/sample";
import { useHydrated } from "@/lib/useHydrated";

type Field = "jd" | "cv" | "interviewDate" | "form";

/**
 * JD (required), interview date and CV (optional). Server-side validation is the source of truth;
 * this form only shows its messages next to the right field.
 */
export function NewInterviewForm() {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const ids = { jd: useId(), cv: useId(), date: useId() };
  const [jd, setJd] = useState(params.get("sample") === "1" ? SAMPLE_JD : "");
  const [cv, setCv] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    if (!(await ensureSession())) {
      setErrors({ form: "We couldn't start your session. Please refresh and try again." });
      setBusy(false);
      return;
    }
    const r = await postJson<{ id: string }>("/api/interviews", { jd, cv, interviewDate });
    if (r.ok) {
      router.push(`/i/${r.data.id}`);
      return;
    }
    setBusy(false);
    setErrors(r.data.errors ?? { form: r.data.error ?? "Something went wrong. Please try again." });
  }

  const describedBy = (id: string, field: Field) => (errors[field] ? `${id}-error` : undefined);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div>
        <label htmlFor={ids.jd} className={ui.label}>
          Job description <span className="text-red-700 dark:text-red-400">*</span>
        </label>
        <textarea
          id={ids.jd}
          name="jd"
          required
          rows={12}
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          aria-invalid={Boolean(errors.jd)}
          aria-describedby={describedBy(ids.jd, "jd") ?? `${ids.jd}-hint`}
          className={ui.input}
          placeholder="Paste the full JD: title, responsibilities and requirements."
        />
        <p id={`${ids.jd}-hint`} className={ui.muted}>
          {jd.trim().length} characters · at least 150
        </p>
        {errors.jd && (
          <p id={`${ids.jd}-error`} role="alert" className={ui.error}>
            {errors.jd}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={ids.date} className={ui.label}>
          Interview date <span className={ui.muted}>(optional)</span>
        </label>
        <input
          id={ids.date}
          name="interviewDate"
          type="date"
          value={interviewDate}
          onChange={(e) => setInterviewDate(e.target.value)}
          aria-invalid={Boolean(errors.interviewDate)}
          aria-describedby={describedBy(ids.date, "interviewDate")}
          className={`${ui.input} max-w-xs`}
        />
        {errors.interviewDate && (
          <p id={`${ids.date}-error`} role="alert" className={ui.error}>
            {errors.interviewDate}
          </p>
        )}
      </div>

      <details className="group">
        <summary className="cursor-pointer text-sm font-medium">Add your CV or a list of past roles (optional, helps find stories later)</summary>
        <div className="mt-2">
          <label htmlFor={ids.cv} className={ui.label}>
            CV or past roles
          </label>
          <textarea
            id={ids.cv}
            name="cv"
            rows={6}
            value={cv}
            onChange={(e) => setCv(e.target.value)}
            aria-invalid={Boolean(errors.cv)}
            aria-describedby={describedBy(ids.cv, "cv")}
            className={ui.input}
            placeholder="One role or project per line is enough."
          />
          {errors.cv && (
            <p id={`${ids.cv}-error`} role="alert" className={ui.error}>
              {errors.cv}
            </p>
          )}
        </div>
      </details>

      {errors.form && (
        <p role="alert" className={ui.error}>
          {errors.form}
        </p>
      )}

      <div>
        <button type="submit" className={ui.btnPrimary} disabled={!hydrated || busy}>
          {busy ? "Reading the JD…" : "Create my questions"}
        </button>
      </div>
    </form>
  );
}
