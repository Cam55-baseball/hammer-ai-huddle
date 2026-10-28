/**
 * Frame Extraction Utilities for Video Analysis
 *
 * Phase 1 — Deterministic Video Processing Layer.
 *
 * Same source bytes + same probe (fps_true, duration_sec) + same landingTime
 * → byte-identical PNG frames → byte-identical SHA-256 per frame.
 *
 * Hashing uses PNG (lossless) because canvas → JPEG encoding is not
 * byte-stable across browsers / runs.
 */

import { sha256HexOfBlob } from "@/lib/biomech/fingerprint";
import {
  buildDenseFrameSelection,
  buildFrameSelection,
  buildMovementFrameSelection,
  type FrameSelection,
} from "@/lib/biomech/frameExtractionDeterministic";

const SEEK_TIMEOUT_MS = 8_000;

export interface ExtractedFrame {
  frame_index: number;
  timestamp_seconds: number;
  sha256_hex: string;
  dataUrl: string;       // PNG data URL — what callers send to multimodal APIs
  width: number;
  height: number;
}

export interface DeterministicExtractInput {
  videoFile: Blob;
  fps_true: number;
  duration_sec: number;
  landingTime?: number | null;
  /**
   * 'key' (default) — 7 canonical analysis frames.
   * 'dense' — uniform ~12fps sampling (max 48) for ball-flight measurement.
   */
  sampling?: "key" | "dense";
  /**
   * Seconds where the scout pass found the movement. When set (and no landing
   * mark), the 'key' budget is placed around it instead of spread evenly.
   */
  motionCentreSec?: number | null;
}

export interface DeterministicExtractResult {
  requested: FrameSelection[];
  frames: ExtractedFrame[];
  placement: "dense" | "landing_mark" | "movement_centred" | "even_spread";
}

/**
 * Deterministic frame extraction.
 * Selection is pure integer math; seeking is `index / fps_true`.
 * Encoding is PNG → SHA-256 of the raw PNG bytes.
 */
export const extractKeyFramesDeterministic = async (
  { videoFile, fps_true, duration_sec, landingTime, sampling = "key", motionCentreSec }: DeterministicExtractInput,
): Promise<DeterministicExtractResult> => {
  const hasLanding = landingTime != null && landingTime > 0 && landingTime < duration_sec;
  const movement = sampling === "key" && !hasLanding && motionCentreSec != null
    ? buildMovementFrameSelection(fps_true, duration_sec, motionCentreSec)
    : [];
  const placement: DeterministicExtractResult["placement"] = sampling === "dense"
    ? "dense"
    : hasLanding ? "landing_mark" : movement.length > 0 ? "movement_centred" : "even_spread";
  const requested = sampling === "dense"
    ? buildDenseFrameSelection(fps_true, duration_sec)
    : movement.length > 0 ? movement : buildFrameSelection(fps_true, duration_sec, landingTime ?? null);
  if (requested.length === 0) {
    return { requested: [], frames: [], placement };
  }

  const video = document.createElement("video");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not supported");

  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";

  const url = URL.createObjectURL(videoFile);
  video.src = url;

  const cleanup = () => {
    try { URL.revokeObjectURL(url); } catch { /* noop */ }
  };

  try {
    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => { video.removeEventListener("error", onErr); resolve(); };
      const onErr = () => { video.removeEventListener("loadedmetadata", onLoaded); reject(new Error("video metadata load failed")); };
      video.addEventListener("loadedmetadata", onLoaded, { once: true });
      video.addEventListener("error", onErr, { once: true });
      // A codec the browser cannot decode never fires either event — fail visibly.
      setTimeout(() => reject(new Error("video metadata load timeout")), 20000);
    });

    if (!video.videoWidth || !video.videoHeight) {
      throw new Error("video has invalid dimensions");
    }
    // Downscale frames so the multimodal payload stays well under the
    // AI gateway's 30MB-per-image cap. Long edge capped at 1280px; JPEG
    // @ 0.85 keeps each frame typically <300KB while preserving enough
    // detail for pose/mechanics evaluation. PNG at native resolution
    // produced 5–25MB per frame on phone footage and routinely 413'd
    // the gateway. Deterministic: same pixels in → same JPEG out.
    const MAX_EDGE = 1280;
    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    const longest = Math.max(srcW, srcH);
    const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
    canvas.width = Math.max(1, Math.round(srcW * scale));
    canvas.height = Math.max(1, Math.round(srcH * scale));

    const frames: ExtractedFrame[] = [];

    for (const sel of requested) {
      video.currentTime = sel.timestamp_seconds;
      try {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            video.removeEventListener("seeked", onSeeked);
            reject(new Error("seek timeout"));
          }, SEEK_TIMEOUT_MS);
          const onSeeked = () => { clearTimeout(timer); resolve(); };
          video.addEventListener("seeked", onSeeked, { once: true });
        });

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
        if (!blob || blob.size === 0) continue;
        const [sha256_hex, dataUrl] = await Promise.all([
          sha256HexOfBlob(blob),
          blobToDataUrl(blob),
        ]);
        frames.push({
          frame_index: sel.frame_index,
          timestamp_seconds: sel.timestamp_seconds,
          sha256_hex,
          dataUrl,
          width: canvas.width,
          height: canvas.height,
        });
      } catch (e) {
        console.warn("[FRAME EXTRACTION] dropped frame", sel, e);
      }
    }

    return { requested, frames, placement };
  } finally {
    cleanup();
  }
};

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error ?? new Error("FileReader error"));
    r.onload = () => resolve(String(r.result ?? ""));
    r.readAsDataURL(blob);
  });
}

/**
 * Back-compat shim: callers that still want a simple `string[]` of data URLs.
 * Internally runs the deterministic pipeline. Probe metadata is required —
 * pass it in from the upload flow where it has already been computed.
 */
export const extractKeyFrames = async (
  videoFile: File,
  landingTime?: number | null,
  probe?: { fps_true: number; duration_sec: number },
): Promise<string[]> => {
  if (!probe) {
    // Defensive fallback for legacy callers that haven't been wired to pass
    // the deterministic probe yet. We refuse to silently fabricate fps/duration —
    // throw so the call site is fixed rather than producing non-deterministic frames.
    throw new Error("extractKeyFrames requires a deterministic probe (fps_true + duration_sec). Pass `probe` from probeVideoMetadata().");
  }
  const { frames } = await extractKeyFramesDeterministic({
    videoFile,
    fps_true: probe.fps_true,
    duration_sec: probe.duration_sec,
    landingTime: landingTime ?? null,
  });
  return frames.map((f) => f.dataUrl);
};

/**
 * For landing-centered extraction the landing frame is the one whose
 * frame_index equals round(landingTime * fps_true).
 */
export const calculateLandingFrameIndex = (
  landingTime: number | null,
  fps_true?: number,
  selectedIndices?: number[],
): number | null => {
  if (landingTime == null || landingTime <= 0) return null;
  if (fps_true && selectedIndices) {
    const target = Math.round(landingTime * fps_true);
    const i = selectedIndices.indexOf(target);
    return i >= 0 ? i : null;
  }
  // Legacy behavior: landing was always at array position 3 in the 7-offset grid.
  return 3;
};

/**
 * The January–September 2026 picture sampling, restored as the primary
 * analysis input (owner P0, Oct 28). Same method as commit f55fb9d9d's
 * `extractKeyFrames`: a hidden muted inline <video>, 7 seeks at 10/25/40/50/
 * 60/75/90% of the clip (or −0.4…+0.3 s around a marked landing), each drawn
 * to a canvas at the clip's own size and saved as JPEG at 80% quality.
 *
 * The only differences from January: no "need at least 3 frames" refusal and
 * no throw. Whatever pictures were captured are returned (possibly none, if
 * the phone can't decode the clip); the server then watches the uploaded
 * clip itself as a backup. No quality, blur, size or body-tracking check.
 */
export const CLASSIC_FRAME_POSITIONS = [0.10, 0.25, 0.40, 0.50, 0.60, 0.75, 0.90] as const;
export const CLASSIC_LANDING_OFFSETS = [-0.4, -0.2, -0.1, 0, 0.1, 0.2, 0.3] as const;

export function classicFrameTimestamps(duration: number, landingTime?: number | null): number[] {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  if (landingTime != null && landingTime > 0 && landingTime < duration) {
    return CLASSIC_LANDING_OFFSETS.map((o) => landingTime + o).filter((t) => t >= 0 && t <= duration);
  }
  return CLASSIC_FRAME_POSITIONS.map((p) => p * duration);
}

export const extractClassicKeyFrames = (
  videoFile: Blob,
  landingTime?: number | null,
  timeoutMs = 30_000,
): Promise<string[]> => new Promise((resolve) => {
  const video = document.createElement("video");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const frames: string[] = [];
  let done = false;
  let url: string | null = null;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    if (url) URL.revokeObjectURL(url);
    resolve(frames.slice());
  };
  const timer = setTimeout(() => { console.warn("[FRAME EXTRACTION] timed out; using", frames.length, "pictures"); finish(); }, timeoutMs);
  if (!ctx) { finish(); return; }

  video.addEventListener("error", () => { console.warn("[FRAME EXTRACTION] video failed to load:", video.error?.message); finish(); });
  video.addEventListener("loadedmetadata", async () => {
    if (!video.videoWidth || !video.videoHeight) { finish(); return; }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    for (const time of classicFrameTimestamps(video.duration, landingTime)) {
      if (done) return;
      try {
        video.currentTime = time;
        await new Promise<void>((res, rej) => {
          video.addEventListener("seeked", () => res(), { once: true });
          video.addEventListener("error", () => rej(new Error("seek failed")), { once: true });
        });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        if (dataUrl && dataUrl !== "data:," && dataUrl.length > 100) frames.push(dataUrl);
      } catch (e) {
        console.warn("[FRAME EXTRACTION] picture skipped at", time.toFixed(2), e);
      }
    }
    finish();
  });
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  try { url = URL.createObjectURL(videoFile); video.src = url; } catch { finish(); }
});
