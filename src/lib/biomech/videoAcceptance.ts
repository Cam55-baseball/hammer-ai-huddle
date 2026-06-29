/**
 * Phase 1 — Deterministic Video Processing Layer
 *
 * Constitutional acceptance gates for video uploads. Pure functions: same
 * probe → same verdict across every invocation. Rejection reasons are
 * stable tags that flow into `video_analysis_runs.outcome_reason`.
 */

import type { ProbedVideoMetadata } from "./probeVideoMetadata";

export const MIN_FPS = 24;
// 320px floor matches real-world phone exports (iMessage / WhatsApp /
// social re-encodes commonly arrive at 320–360px wide). BlazePose Full
// still lands reliable landmarks at this resolution; the previous 480px
// gate was overly defensive and rejected typical user uploads.
export const MIN_WIDTH = 320;
export const MIN_HEIGHT = 320;
export const MIN_DURATION_SEC = 0.5;
export const MAX_DURATION_SEC = 60;
export const MAX_DROPPED_FRAME_RATIO = 0.34; // > 1/3 of requested frames dropped = reject

export type RejectionReason =
  | "reject_low_fps"
  | "reject_low_resolution"
  | "reject_duration_out_of_bounds"
  | "reject_excessive_dropped_frames";

export type AcceptanceVerdict =
  | { ok: true }
  | { ok: false; reason: RejectionReason; detail: string };

export function evaluateProbe(probe: ProbedVideoMetadata): AcceptanceVerdict {
  if (!Number.isFinite(probe.fps_true) || probe.fps_true < MIN_FPS) {
    return {
      ok: false,
      reason: "reject_low_fps",
      detail: `fps_true=${probe.fps_true} < MIN_FPS=${MIN_FPS}`,
    };
  }
  if (probe.width < MIN_WIDTH || probe.height < MIN_HEIGHT) {
    return {
      ok: false,
      reason: "reject_low_resolution",
      detail: `width=${probe.width} height=${probe.height} below ${MIN_WIDTH}x${MIN_HEIGHT}`,
    };
  }
  if (
    !Number.isFinite(probe.duration_sec) ||
    probe.duration_sec < MIN_DURATION_SEC ||
    probe.duration_sec > MAX_DURATION_SEC
  ) {
    return {
      ok: false,
      reason: "reject_duration_out_of_bounds",
      detail: `duration_sec=${probe.duration_sec} outside [${MIN_DURATION_SEC}, ${MAX_DURATION_SEC}]`,
    };
  }
  return { ok: true };
}

export function evaluateExtraction(requested: number, captured: number): AcceptanceVerdict {
  if (requested <= 0) {
    return { ok: false, reason: "reject_excessive_dropped_frames", detail: "no frames requested" };
  }
  const droppedRatio = (requested - captured) / requested;
  if (droppedRatio > MAX_DROPPED_FRAME_RATIO) {
    return {
      ok: false,
      reason: "reject_excessive_dropped_frames",
      detail: `dropped=${requested - captured}/${requested} (${droppedRatio.toFixed(3)} > ${MAX_DROPPED_FRAME_RATIO})`,
    };
  }
  return { ok: true };
}
