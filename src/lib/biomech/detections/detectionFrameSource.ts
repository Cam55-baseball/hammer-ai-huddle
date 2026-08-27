/**
 * Detection-frame source for the pose / mechanics path.
 *
 * The guards in `shoulderTiltGuarded.ts` need `BallDetectionFrame[]` at
 * measurement time, but until now only the pitch-velocity pipeline produced
 * them (server-side, stored as `cv_velocity_measurements.detections`). The
 * pose path had no way to see them, so the live-pitch gate could never run
 * where it is actually needed.
 *
 * This module is that bridge, and nothing more:
 *
 *   video_id → stored hosted detections (jsonb, already byte-compatible with
 *   `BallDetectionFrame`) → normalized, validated frames for the pose path.
 *
 * Honesty rule, unchanged: "no detections stored" is never returned as an
 * empty frame list. A caller that cannot get frames gets `ok: false` with a
 * reason, and `evaluateLivePitchGate` then reports `indeterminate` rather
 * than silently passing a drill clip.
 *
 * NOT LIVE. Read only by the flag-gated guarded pipeline.
 */

import { supabase } from "@/integrations/supabase/client";
import type { BallDetectionFrame, BallPrediction } from "@/lib/cv/ball/types";

export type DetectionSourceUnavailableReason =
  | "no_measurement_row"
  | "detections_absent"
  | "detections_malformed"
  | "query_failed";

export interface DetectionFrameSourceOk {
  readonly ok: true;
  readonly source: "hosted_stored";
  readonly measurement_id: string;
  readonly frames: readonly BallDetectionFrame[];
}

export interface DetectionFrameSourceUnavailable {
  readonly ok: false;
  readonly source: "hosted_stored";
  readonly reason: DetectionSourceUnavailableReason;
  readonly detail?: string;
}

export type DetectionFrameSourceResult =
  | DetectionFrameSourceOk
  | DetectionFrameSourceUnavailable;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function normalizePrediction(raw: unknown): BallPrediction | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (
    !isFiniteNumber(p.x) ||
    !isFiniteNumber(p.y) ||
    !isFiniteNumber(p.width) ||
    !isFiniteNumber(p.height) ||
    !isFiniteNumber(p.confidence)
  ) {
    return null;
  }
  return {
    x: p.x,
    y: p.y,
    width: p.width,
    height: p.height,
    confidence: p.confidence,
    class: typeof p.class === "string" ? p.class : "",
  };
}

/**
 * Pure normalizer over the stored jsonb. Exported so the pose path (and the
 * tests) can convert detections obtained by any route — a fetch here, an
 * on-device run later — without duplicating the validation.
 *
 * Returns null when the payload is not a usable frame array. A frame whose
 * geometry is unreadable is dropped rather than repaired; a payload where
 * every frame is unreadable normalizes to null, not to an empty list.
 */
export function normalizeDetectionFrames(
  raw: unknown,
): readonly BallDetectionFrame[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const frames: BallDetectionFrame[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const f = item as Record<string, unknown>;
    if (!isFiniteNumber(f.frame_index)) continue;

    const predictions = Array.isArray(f.predictions)
      ? f.predictions
          .map(normalizePrediction)
          .filter((p): p is BallPrediction => p !== null)
      : [];

    frames.push({
      frame_index: f.frame_index,
      timestamp_seconds: isFiniteNumber(f.timestamp_seconds)
        ? f.timestamp_seconds
        : 0,
      image_width: isFiniteNumber(f.image_width) ? f.image_width : 0,
      image_height: isFiniteNumber(f.image_height) ? f.image_height : 0,
      predictions,
      chosen: normalizePrediction(f.chosen),
    });
  }

  if (frames.length === 0) return null;
  return frames.sort((a, b) => a.frame_index - b.frame_index);
}

/**
 * Load the detection frames the velocity pipeline already produced for a
 * video, so a pose/mechanics measurement of the same clip can gate on them.
 *
 * Most recent measurement row wins — the pipeline appends, and the newest run
 * is the one whose frames correspond to the current analysis.
 */
export async function loadDetectionFramesForVideo(
  videoId: string,
): Promise<DetectionFrameSourceResult> {
  const base = { source: "hosted_stored" as const };

  const { data, error } = await supabase
    .from("cv_velocity_measurements")
    .select("id, detections")
    .eq("video_id", videoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ...base, ok: false, reason: "query_failed", detail: error.message };
  }
  if (!data) {
    return { ...base, ok: false, reason: "no_measurement_row" };
  }
  if (data.detections == null) {
    return { ...base, ok: false, reason: "detections_absent" };
  }

  const frames = normalizeDetectionFrames(data.detections);
  if (!frames) {
    return { ...base, ok: false, reason: "detections_malformed" };
  }

  return { ...base, ok: true, measurement_id: data.id, frames };
}
