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
  buildFrameSelection,
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
}

export interface DeterministicExtractResult {
  requested: FrameSelection[];
  frames: ExtractedFrame[];
}

/**
 * Deterministic frame extraction.
 * Selection is pure integer math; seeking is `index / fps_true`.
 * Encoding is PNG → SHA-256 of the raw PNG bytes.
 */
export const extractKeyFramesDeterministic = async (
  { videoFile, fps_true, duration_sec, landingTime }: DeterministicExtractInput,
): Promise<DeterministicExtractResult> => {
  const requested = buildFrameSelection(fps_true, duration_sec, landingTime ?? null);
  if (requested.length === 0) {
    return { requested: [], frames: [] };
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
    });

    if (!video.videoWidth || !video.videoHeight) {
      throw new Error("video has invalid dimensions");
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

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
        const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
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

    return { requested, frames };
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
