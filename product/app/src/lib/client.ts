"use client";

/**
 * Browser-side helpers for calling our own API routes. Keep these tiny: all rules live on the server.
 */

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T & { error?: string; errors?: Record<string, string> };
}

export async function postJson<T = Record<string, unknown>>(url: string, body?: unknown): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method: "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: ApiResult<T>["data"];
  try {
    data = await res.json();
  } catch {
    data = { error: "Unexpected response from the server." } as ApiResult<T>["data"];
  }
  return { ok: res.ok, status: res.status, data };
}

/** Creates an anonymous session if the visitor has none (idempotent). */
export async function ensureSession(): Promise<boolean> {
  const r = await postJson("/api/session/start");
  return r.ok;
}

/** Fire-and-forget client event (only names allowed by the server's CLIENT_EVENT_NAMES). */
export function trackEvent(name: string, props: Record<string, string | number | boolean | null> = {}): void {
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, props }),
    keepalive: true,
  }).catch(() => undefined);
}
