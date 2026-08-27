/**
 * Shared detection shape for ball detectors (hosted and on-device).
 *
 * This is deliberately byte-compatible with the Roboflow hosted prediction
 * shape already stored in `cv_velocity_measurements.detections`, so the
 * on-device path can be compared frame-for-frame against stored hosted output
 * without any translation layer in between.
 */

export interface BallPrediction {
  /** Center x, pixels in source-image coordinates. */
  readonly x: number;
  /** Center y, pixels in source-image coordinates. */
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** 0..1 */
  readonly confidence: number;
  readonly class: string;
}

export interface BallDetectionFrame {
  readonly frame_index: number;
  readonly timestamp_seconds: number;
  readonly image_width: number;
  readonly image_height: number;
  readonly predictions: readonly BallPrediction[];
  /** Highest-confidence ball-class prediction, or null when none. */
  readonly chosen: BallPrediction | null;
}

/**
 * Canonical missingness for the detector layer. A detector that cannot run
 * says so — it never returns an empty prediction list dressed up as
 * "no ball in frame".
 */
export type BallDetectorUnavailableReason =
  | "model_asset_missing"
  | "runtime_unavailable"
  | "decode_failed"
  | "not_enabled";

export interface BallDetectorRunOk {
  readonly ok: true;
  readonly detector: "on_device_onnx";
  readonly model_asset: string;
  readonly frames: readonly BallDetectionFrame[];
}

export interface BallDetectorRunUnavailable {
  readonly ok: false;
  readonly detector: "on_device_onnx";
  readonly reason: BallDetectorUnavailableReason;
  readonly detail?: string;
}

export type BallDetectorRun = BallDetectorRunOk | BallDetectorRunUnavailable;

/** BaseballCV `ball_tracking_v4` class order. */
export const BALL_TRACKING_V4_CLASSES = [
  "glove",
  "homeplate",
  "baseball",
  "rubber",
] as const;

export type BallTrackingClass = (typeof BALL_TRACKING_V4_CLASSES)[number];

/** Same predicate the hosted function uses to pick the flight signal. */
export function pickBallPrediction(
  predictions: readonly BallPrediction[],
): BallPrediction | null {
  if (predictions.length === 0) return null;
  const strict = predictions.filter((p) =>
    /^(base|soft)?ball$/i.test((p.class ?? "").trim()),
  );
  const pool =
    strict.length > 0
      ? strict
      : predictions.filter((p) => /ball/i.test(p.class ?? ""));
  if (pool.length === 0) return null;
  return pool.reduce((a, b) => (b.confidence > a.confidence ? b : a));
}
