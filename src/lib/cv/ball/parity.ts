/**
 * Frame-for-frame parity harness: on-device ONNX detector vs the stored
 * hosted (Roboflow) detections for the same calibration frames.
 *
 * This is the gate. Until `runBallDetectorParity` reports
 * `verdict === "parity"` over real stored sessions, the on-device path stays
 * flagged off and is trusted for nothing.
 *
 * Pure comparison logic — no network, no runtime. Callers supply both sides.
 */

import { pickBallPrediction, type BallDetectionFrame, type BallPrediction } from "./types";
import { iou } from "./onDeviceBallDetector";

/** Agreement tolerances. Deliberately tight — this is a trust gate. */
export const PARITY_IOU_MIN = 0.7;
export const PARITY_CONFIDENCE_DELTA_MAX = 0.1;

export type FrameVerdict =
  | "match" // both chose a ball, boxes agree within tolerance
  | "agreed_absent" // both found no ball
  | "box_mismatch" // both chose a ball, boxes disagree
  | "confidence_mismatch"
  | "on_device_only" // on-device found a ball the hosted path did not
  | "hosted_only" // hosted found a ball the on-device path did not
  | "frame_missing"; // one side has no row for this frame index

export interface FrameComparison {
  readonly frame_index: number;
  readonly verdict: FrameVerdict;
  readonly iou: number | null;
  readonly confidence_delta: number | null;
  readonly hosted: BallPrediction | null;
  readonly on_device: BallPrediction | null;
}

export interface ParityReport {
  readonly frames_compared: number;
  readonly matches: number;
  readonly agreed_absent: number;
  readonly mismatches: number;
  readonly verdict: "parity" | "divergent" | "insufficient_data";
  readonly comparisons: readonly FrameComparison[];
}

/** Accepts either the raw hosted row shape or an already-normalized frame. */
export interface HostedFrameLike {
  readonly frame_index: number;
  readonly predictions?: readonly BallPrediction[];
  readonly chosen?: BallPrediction | null;
}

function chosenOf(f: HostedFrameLike | BallDetectionFrame): BallPrediction | null {
  if (f.chosen !== undefined) return f.chosen;
  return pickBallPrediction(f.predictions ?? []);
}

function compareFrame(
  frame_index: number,
  hosted: BallPrediction | null,
  onDevice: BallPrediction | null,
): FrameComparison {
  if (!hosted && !onDevice) {
    return {
      frame_index,
      verdict: "agreed_absent",
      iou: null,
      confidence_delta: null,
      hosted: null,
      on_device: null,
    };
  }
  if (hosted && !onDevice) {
    return {
      frame_index,
      verdict: "hosted_only",
      iou: null,
      confidence_delta: null,
      hosted,
      on_device: null,
    };
  }
  if (!hosted && onDevice) {
    return {
      frame_index,
      verdict: "on_device_only",
      iou: null,
      confidence_delta: null,
      hosted: null,
      on_device: onDevice,
    };
  }

  const h = hosted as BallPrediction;
  const d = onDevice as BallPrediction;
  const overlap = iou(h, d);
  const delta = Math.abs(h.confidence - d.confidence);
  const verdict: FrameVerdict =
    overlap < PARITY_IOU_MIN
      ? "box_mismatch"
      : delta > PARITY_CONFIDENCE_DELTA_MAX
        ? "confidence_mismatch"
        : "match";

  return {
    frame_index,
    verdict,
    iou: Math.round(overlap * 1e6) / 1e6,
    confidence_delta: Math.round(delta * 1e6) / 1e6,
    hosted: h,
    on_device: d,
  };
}

export function runBallDetectorParity(
  hostedFrames: readonly HostedFrameLike[],
  onDeviceFrames: readonly BallDetectionFrame[],
): ParityReport {
  const hostedByIndex = new Map(hostedFrames.map((f) => [f.frame_index, f]));
  const deviceByIndex = new Map(onDeviceFrames.map((f) => [f.frame_index, f]));
  const indices = [...new Set([...hostedByIndex.keys(), ...deviceByIndex.keys()])].sort(
    (a, b) => a - b,
  );

  const comparisons: FrameComparison[] = indices.map((index) => {
    const h = hostedByIndex.get(index);
    const d = deviceByIndex.get(index);
    if (!h || !d) {
      return {
        frame_index: index,
        verdict: "frame_missing" as const,
        iou: null,
        confidence_delta: null,
        hosted: h ? chosenOf(h) : null,
        on_device: d ? chosenOf(d) : null,
      };
    }
    return compareFrame(index, chosenOf(h), chosenOf(d));
  });

  const matches = comparisons.filter((c) => c.verdict === "match").length;
  const agreedAbsent = comparisons.filter((c) => c.verdict === "agreed_absent").length;
  const mismatches = comparisons.length - matches - agreedAbsent;

  const verdict: ParityReport["verdict"] =
    comparisons.length === 0
      ? "insufficient_data"
      : mismatches === 0
        ? "parity"
        : "divergent";

  return {
    frames_compared: comparisons.length,
    matches,
    agreed_absent: agreedAbsent,
    mismatches,
    verdict,
    comparisons,
  };
}
