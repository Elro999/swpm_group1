"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ui } from "@/components/ui";
import { ensureSession, postJson, postPdf } from "@/lib/client";
import { SAMPLE_JD } from "@/lib/sample";
import { useHydrated } from "@/lib/useHydrated";

type Field = "jd" | "cv" | "interviewDate" | "form";
type PdfTarget = "jd" | "cv";

/** "Upload a PDF" button + hidden file input. The text it reads is handed back to the form (never stored from here). */
function PdfPicker({ label, ariaLabel, reading, disabled, onFile }: { label: string; ariaLabel: string; reading: boolean; disabled: boolean; onFile: (file: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <button type="button" className={ui.btnSecondary} disabled={disabled || reading} onClick={() => ref.current?.click()}>
        {reading ? "Reading PDF…" : label}
      </button>
      <input
        ref={ref}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        tabIndex={-1}
        aria-label={ariaLabel}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // lets the same file be chosen again
          if (file) onFile(file);
        }}
      />
      <span className={ui.muted}>PDF only, up to 5 MB. We read the text and don&apos;t keep the file.</span>
    </div>
  );
}

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
  const [reading, setReading] = useState<PdfTarget | null>(null);
  const [pdfNote, setPdfNote] = useState<Partial<Record<PdfTarget, string>>>({});

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

  async function readPdf(target: PdfTarget, file: File) {
    const fail = (message: string) => setErrors((prev) => ({ ...prev, [target]: message }));
    setPdfNote((prev) => ({ ...prev, [target]: undefined }));
    setErrors((prev) => ({ ...prev, [target]: undefined }));
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      fail("Upload a PDF, or paste the text instead.");
      return;
    }
    setReading(target);
    try {
      if (!(await ensureSession())) {
        fail("We couldn't start your session. Please refresh and try again.");
        return;
      }
      const r = await postPdf<{ text: string }>("/api/interviews/pdf-text", file);
      if (r.ok) {
        (target === "jd" ? setJd : setCv)(r.data.text);
        setPdfNote((prev) => ({ ...prev, [target]: "Text read from your PDF. Check it below and fix anything that looks off before continuing." }));
      } else {
        fail(r.data.error ?? "We couldn't read that PDF. Paste the text instead.");
      }
    } finally {
      setReading(null);
    }
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
        <PdfPicker label="Upload a PDF instead" ariaLabel="PDF file to read" reading={reading === "jd"} disabled={!hydrated || busy || reading !== null} onFile={(f) => readPdf("jd", f)} />
        {pdfNote.jd && (
          <p role="status" className={ui.muted}>
            {pdfNote.jd}
          </p>
        )}
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
          <PdfPicker label="Upload your CV as a PDF" ariaLabel="CV PDF file to read" reading={reading === "cv"} disabled={!hydrated || busy || reading !== null} onFile={(f) => readPdf("cv", f)} />
          {pdfNote.cv && (
            <p role="status" className={ui.muted}>
              {pdfNote.cv}
            </p>
          )}
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
        <button type="submit" className={ui.btnPrimary} disabled={!hydrated || busy || reading !== null}>
          {busy ? "Reading the JD…" : "Create my questions"}
        </button>
      </div>
    </form>
  );
}
