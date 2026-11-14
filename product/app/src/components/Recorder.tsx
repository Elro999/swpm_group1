"use client";

import { useEffect, useRef, useState } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { formatMs } from "@/modules/feedback/transcript";
import { ui } from "./ui";

/**
 * Voice recorder (task 2.1; MF2). MediaRecorder, mono, ~32 kbps; WebM/Opus where supported, MP4/AAC on
 * Safari. Hard cap 3:00 with a visible timer. The user can listen back and re-record before sending.
 * MUST be rendered inside <ConsentGate> (the server also refuses uploads without consent).
 */
export const MAX_RECORDING_MS = 180_000;

type State =
  | { kind: "idle" }
  | { kind: "recording"; startedAt: number }
  | { kind: "recorded"; blob: Blob; url: string; ms: number }
  | { kind: "error"; message: string };

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

function micErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Microphone access is blocked. Allow it from the icon in your browser's address bar, then press Start recording again.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "We couldn't find a microphone. Plug one in or check your sound settings.";
  if (name === "NotReadableError") return "Your microphone is being used by another app. Close it and try again.";
  return "We couldn't start recording. Please try again.";
}

export function Recorder({
  onSubmit,
  disabled = false,
  startLabel = "Start recording",
  submitLabel = "Use this answer",
}: {
  onSubmit: (blob: Blob) => void | Promise<void>;
  disabled?: boolean;
  startLabel?: string;
  submitLabel?: string;
}) {
  const hydrated = useHydrated();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [elapsed, setElapsed] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState({ kind: "error", message: "This browser can't record audio. Try a recent Chrome, Edge, Firefox or Safari." });
      return;
    }
    let s: MediaStream;
    try {
      s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
    } catch (err) {
      setState({ kind: "error", message: micErrorMessage(err) });
      return;
    }
    stream.current = s;
    const mime = pickMime();
    const rec = new MediaRecorder(s, mime ? { mimeType: mime, audioBitsPerSecond: 32_000 } : { audioBitsPerSecond: 32_000 });
    const chunks: Blob[] = [];
    const startedAt = Date.now();
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    rec.onstop = () => {
      if (timer.current) clearInterval(timer.current);
      s.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: rec.mimeType || mime || "audio/webm" });
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(blob);
      setState({ kind: "recorded", blob, url: urlRef.current, ms: Date.now() - startedAt });
    };
    recorder.current = rec;
    rec.start(250);
    setElapsed(0);
    setState({ kind: "recording", startedAt });
    timer.current = setInterval(() => {
      const ms = Date.now() - startedAt;
      setElapsed(ms);
      if (ms >= MAX_RECORDING_MS && rec.state === "recording") rec.stop();
    }, 250);
  }

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  function again() {
    setState({ kind: "idle" });
  }

  return (
    <div className="flex flex-col gap-3">
      <p aria-live="polite" className={ui.muted}>
        {state.kind === "recording" && `Recording… ${formatMs(elapsed)} / ${formatMs(MAX_RECORDING_MS)}`}
        {state.kind === "recorded" && `Recorded ${formatMs(state.ms)}. Listen back, then send it or record again.`}
      </p>

      {state.kind === "error" && (
        <p role="alert" className={ui.error}>
          {state.message}
        </p>
      )}

      {(state.kind === "idle" || state.kind === "error") && (
        <div>
          <button type="button" className={ui.btnPrimary} onClick={start} disabled={!hydrated || disabled}>
            ● {startLabel}
          </button>
        </div>
      )}

      {state.kind === "recording" && (
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-3 w-3 animate-pulse rounded-full bg-red-600" />
          <button type="button" className={ui.btnPrimary} onClick={stop}>
            ■ Stop
          </button>
          <div className="h-2 flex-1 rounded bg-zinc-200 dark:bg-zinc-800" aria-hidden>
            <div className="h-2 rounded bg-indigo-600" style={{ width: `${Math.min(100, (elapsed / MAX_RECORDING_MS) * 100)}%` }} />
          </div>
        </div>
      )}

      {state.kind === "recorded" && (
        <div className="flex flex-col gap-3">
          <audio controls src={state.url} className="w-full" aria-label="Your recording" />
          <div className="flex flex-wrap gap-3">
            <button type="button" className={ui.btnPrimary} onClick={() => onSubmit(state.blob)} disabled={disabled}>
              {submitLabel}
            </button>
            <button type="button" className={ui.btnSecondary} onClick={again} disabled={disabled}>
              Record again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
