/**
 * Live-pitch gate — "is this actually a pitch, or a towel / dry drill?"
 *
 * MediaPipe reads shoulder geometry off any body in frame, so a towel drill,
 * a dry mechanics rep, or a warm-up shadow throw currently produces a
 * confident-looking tilt number that describes nothing releasable. Before any
 * pitch-conditioned metric can be trusted, the clip has to be shown to
 * contain a real thrown ball.
 *
 * Signal used: ball presence and ball motion, taken from the detection frames
 * the pitch-velocity pipeline already produces (`src/lib/cv/ball/types.ts`,
 * same shape for hosted Roboflow output and the on-device detector). That is
 * the most direct evidence available today — a dry drill has no ball leaving
 * the hand, so it cannot satisfy it.
 *
 * Honesty rule: absence of ball evidence is NOT evidence of a drill, and it is
 * never treated as a pass either. No detection data at all → verdict
 * "indeterminate", which blocks the measurement the same way a fail does, but
 * carries its own reason so the two are never confused.
 *
 * Pure and deterministic. Not wired to any live path.
 */

import type { BallDetectionFrame } from "@/lib/cv/ball/types";

export type LivePitchVerdict = "live_pitch" | "not_a_pitch" | "indeterminate";

/** Minimum detected-ball frames inside the evaluation window. */
export const MIN_BALL_FRAMES = 3;
/**
 * Minimum ball travel across the window, as a fraction of frame diagonal.
 * A ball held/rolled in the hand during a dry rep barely moves relative to
 * the body; a thrown ball crosses a large part of the frame.
 */
export const MIN_BALL_TRAVEL_FRACTION = 0.12;
/** Detections below this confidence are not counted as ball evidence. */
export const MIN_BALL_CONFIDENCE = 0.2;
/** Frames either side of release considered, when a release frame is known. */
export const DEFAULT_WINDOW_FRAMES = 12;

export interface LivePitchGateInputs {
  /** Detection frames from the ball detector (hosted or on-device). */
  readonly detectionFrames: readonly BallDetectionFrame[];
  /** Release anchor, when known. Null widens the window to the whole clip. */
  readonly release_frame_index: number | null;
  readonly window_frames?: number;
  readonly min_ball_frames?: number;
  readonly min_travel_fraction?: number;
  readonly min_confidence?: number;
}

export interface LivePitchGateResult {
  readonly verdict: LivePitchVerdict;
  readonly reason:
    | "ball_in_flight"
    | "no_ball_detected_in_window"
    | "ball_present_but_static"
    | "no_detection_data";
  readonly lineage: {
    readonly frames_in_window: number;
    readonly ball_frames: number;
    readonly travel_fraction: number | null;
    readonly window_start_frame: number | null;
    readonly window_end_frame: number | null;
  };
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export function evaluateLivePitchGate(
  inputs: LivePitchGateInputs,
): LivePitchGateResult {
  const {
    detectionFrames,
    release_frame_index,
    window_frames = DEFAULT_WINDOW_FRAMES,
    min_ball_frames = MIN_BALL_FRAMES,
    min_travel_fraction = MIN_BALL_TRAVEL_FRACTION,
    min_confidence = MIN_BALL_CONFIDENCE,
  } = inputs;

  if (!detectionFrames || detectionFrames.length === 0) {
    return {
      verdict: "indeterminate",
      reason: "no_detection_data",
      lineage: {
        frames_in_window: 0,
        ball_frames: 0,
        travel_fraction: null,
        window_start_frame: null,
        window_end_frame: null,
      },
    };
  }

  const inWindow =
    release_frame_index == null
      ? [...detectionFrames]
      : detectionFrames.filter(
          (f) =>
            Math.abs(f.frame_index - release_frame_index) <= window_frames,
        );

  const sorted = [...inWindow].sort((a, b) => a.frame_index - b.frame_index);
  const lineageBase = {
    frames_in_window: sorted.length,
    window_start_frame: sorted[0]?.frame_index ?? null,
    window_end_frame: sorted[sorted.length - 1]?.frame_index ?? null,
  };

  const balls = sorted.filter(
    (f) => f.chosen != null && f.chosen.confidence >= min_confidence,
  );

  if (balls.length < min_ball_frames) {
    return {
      verdict: balls.length === 0 ? "not_a_pitch" : "indeterminate",
      reason: "no_ball_detected_in_window",
      lineage: { ...lineageBase, ball_frames: balls.length, travel_fraction: null },
    };
  }

  // Ball travel, normalized by frame diagonal so resolution does not matter.
  let maxTravel = 0;
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i].chosen!;
      const b = balls[j].chosen!;
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d > maxTravel) maxTravel = d;
    }
  }
  const w = balls[0].image_width || 1;
  const h = balls[0].image_height || 1;
  const diagonal = Math.hypot(w, h);
  const travelFraction = round6(maxTravel / diagonal);

  if (travelFraction < min_travel_fraction) {
    return {
      verdict: "not_a_pitch",
      reason: "ball_present_but_static",
      lineage: {
        ...lineageBase,
        ball_frames: balls.length,
        travel_fraction: travelFraction,
      },
    };
  }

  return {
    verdict: "live_pitch",
    reason: "ball_in_flight",
    lineage: {
      ...lineageBase,
      ball_frames: balls.length,
      travel_fraction: travelFraction,
    },
  };
}
