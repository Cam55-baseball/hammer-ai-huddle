/**
 * Phase 0 — Determinism Foundation
 *
 * Deterministic client-side probe for a video File/Blob. Returns the inputs
 * required to build a replay-safe cache fingerprint:
 *   - sha256_hex of the entire byte stream
 *   - fps_true  (median of inter-frame deltas via requestVideoFrameCallback)
 *   - duration_sec, width, height, orientation
 *
 * No randomness, no time-based jitter — same bytes → same probe result.
 */

import { sha256HexOfBlob } from "./fingerprint";

export interface ProbedVideoMetadata {
  sha256_hex: string;
  fps_true: number;
  duration_sec: number;
  width: number;
  height: number;
  orientation: "portrait" | "landscape" | "square";
}

const PROBE_SAMPLE_FRAMES = 60;        // sample budget
const PROBE_TIMEOUT_MS = 8_000;        // hard ceiling so a stuck decoder can't hang the UI
const FALLBACK_FPS = 30;               // last-resort if probe yields nothing usable

/**
 * Drain N video-frame callbacks and return the median inter-frame delta (in seconds)
 * inverted to frames-per-second. Falls back to FALLBACK_FPS if rVFC is unavailable
 * or the clip is too short to sample.
 */
async function probeFps(videoEl: HTMLVideoElement): Promise<number> {
  const anyEl = videoEl as HTMLVideoElement & {
    requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
  };
  if (typeof anyEl.requestVideoFrameCallback !== "function") {
    return FALLBACK_FPS;
  }

  return new Promise<number>((resolve) => {
    const mediaTimes: number[] = [];
    let resolved = false;
    const finish = (fps: number) => {
      if (resolved) return;
      resolved = true;
      try { videoEl.pause(); } catch { /* noop */ }
      resolve(fps);
    };

    const timeout = setTimeout(() => {
      finish(computeFpsFromMediaTimes(mediaTimes) ?? FALLBACK_FPS);
    }, PROBE_TIMEOUT_MS);

    const tick = (_now: number, meta: { mediaTime: number }) => {
      mediaTimes.push(meta.mediaTime);
      if (mediaTimes.length >= PROBE_SAMPLE_FRAMES) {
        clearTimeout(timeout);
        finish(computeFpsFromMediaTimes(mediaTimes) ?? FALLBACK_FPS);
        return;
      }
      anyEl.requestVideoFrameCallback!(tick);
    };

    anyEl.requestVideoFrameCallback!(tick);
    videoEl.play().catch(() => {
      // Autoplay blocked — fall back to the timeout path with whatever we have.
    });
  });
}

function computeFpsFromMediaTimes(mediaTimes: number[]): number | null {
  if (mediaTimes.length < 4) return null;
  const deltas: number[] = [];
  for (let i = 1; i < mediaTimes.length; i++) {
    const d = mediaTimes[i] - mediaTimes[i - 1];
    if (d > 0 && d < 1) deltas.push(d);
  }
  if (deltas.length === 0) return null;
  deltas.sort((a, b) => a - b);
  const mid = Math.floor(deltas.length / 2);
  const median = deltas.length % 2 === 0 ? (deltas[mid - 1] + deltas[mid]) / 2 : deltas[mid];
  if (!Number.isFinite(median) || median <= 0) return null;
  const fps = 1 / median;
  // Snap to nearest standard rate when within 0.5 fps to keep the cache fingerprint stable.
  for (const std of [23.976, 24, 25, 29.97, 30, 50, 59.94, 60, 120]) {
    if (Math.abs(fps - std) < 0.5) return std;
  }
  // Otherwise round to 3 decimals — toFixed(6) in fingerprint will lock it.
  return Math.round(fps * 1000) / 1000;
}

export async function probeVideoMetadata(file: Blob): Promise<ProbedVideoMetadata> {
  const sha256_hex = await sha256HexOfBlob(file);

  const url = URL.createObjectURL(file);
  try {
    const videoEl = document.createElement("video");
    videoEl.preload = "auto";
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.src = url;

    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => { cleanup(); resolve(); };
      const onErr = () => { cleanup(); reject(new Error("video metadata load failed")); };
      const cleanup = () => {
        videoEl.removeEventListener("loadedmetadata", onLoaded);
        videoEl.removeEventListener("error", onErr);
      };
      videoEl.addEventListener("loadedmetadata", onLoaded);
      videoEl.addEventListener("error", onErr);
    });

    const width = videoEl.videoWidth || 0;
    const height = videoEl.videoHeight || 0;
    const duration_sec = Number.isFinite(videoEl.duration) ? videoEl.duration : 0;
    const orientation: ProbedVideoMetadata["orientation"] =
      width === height ? "square" : width > height ? "landscape" : "portrait";

    const fps_true = await probeFps(videoEl);

    return { sha256_hex, fps_true, duration_sec, width, height, orientation };
  } finally {
    URL.revokeObjectURL(url);
  }
}
