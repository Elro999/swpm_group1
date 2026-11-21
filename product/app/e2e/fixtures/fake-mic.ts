import type { Page } from "@playwright/test";

/**
 * Microphone test double for E2E. Replaces getUserMedia and MediaRecorder in the page with stubs that
 * produce a small WebM blob, so the app's recording UI and the upload → transcribe → feedback pipeline
 * run end to end. It does NOT test a real microphone or the browser's MediaRecorder; that is a manual
 * check (build-plan task 2.1: Chrome, Safari, Android). Mock STT ignores the audio content anyway.
 *
 * mode "deny" makes getUserMedia reject with NotAllowedError to test the blocked-microphone message.
 */
export async function installFakeMic(page: Page, mode: "allow" | "deny" = "allow"): Promise<void> {
  await page.addInitScript((m: string) => {
    const track = { stop() {}, kind: "audio" };
    const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          if (m === "deny") throw new DOMException("Permission denied", "NotAllowedError");
          return stream;
        },
        enumerateDevices: async () => [],
      },
    });

    class FakeMediaRecorder {
      static isTypeSupported(type: string) {
        return type.startsWith("audio/webm");
      }
      mimeType = "audio/webm;codecs=opus";
      state: "inactive" | "recording" = "inactive";
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      private timer: ReturnType<typeof setInterval> | undefined;
      constructor(_stream: unknown, opts?: { mimeType?: string }) {
        if (opts?.mimeType) this.mimeType = opts.mimeType;
      }
      private chunk() {
        // A few hundred bytes starting with the EBML (WebM) magic number.
        const bytes = new Uint8Array(300);
        bytes.set([0x1a, 0x45, 0xdf, 0xa3]);
        this.ondataavailable?.({ data: new Blob([bytes], { type: this.mimeType }) });
      }
      start() {
        this.state = "recording";
        this.timer = setInterval(() => this.chunk(), 250);
      }
      stop() {
        if (this.state !== "recording") return;
        clearInterval(this.timer);
        this.state = "inactive";
        this.chunk();
        setTimeout(() => this.onstop?.(), 0);
      }
    }
    (window as unknown as { MediaRecorder: unknown }).MediaRecorder = FakeMediaRecorder;
  }, mode);
}
