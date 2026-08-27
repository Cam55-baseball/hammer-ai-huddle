import { describe, it, expect } from "vitest";
import {
  computeGuardedShoulderTiltDeg,
  SHOULDER_TILT_STABILITY_TOLERANCE_DEG,
} from "../shoulderTiltGuarded";
import {
  LEFT_SHOULDER_INDEX,
  RIGHT_SHOULDER_INDEX,
} from "../shoulderTiltDeg";
import { evaluateLivePitchGate } from "../../gates/livePitchGate";
import type { BallDetectionFrame } from "@/lib/cv/ball/types";

function frameWith(
  left: { x: number; y: number; visibility?: number },
  right: { x: number; y: number; visibility?: number },
) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 1 }));
  lm[LEFT_SHOULDER_INDEX] = { visibility: 1, ...left };
  lm[RIGHT_SHOULDER_INDEX] = { visibility: 1, ...right };
  return lm;
}

function ballFrame(
  frame_index: number,
  ball: { x: number; y: number } | null,
  confidence = 0.8,
): BallDetectionFrame {
  return {
    frame_index,
    timestamp_seconds: frame_index / 30,
    image_width: 1920,
    image_height: 1080,
    predictions: [],
    chosen: ball
      ? { ...ball, width: 12, height: 12, confidence, class: "baseball" }
      : null,
  };
}

/** A real pitch: ball detected across several frames, travelling far. */
const flightFrames: BallDetectionFrame[] = [
  ballFrame(40, { x: 400, y: 500 }),
  ballFrame(41, { x: 700, y: 520 }),
  ballFrame(42, { x: 1000, y: 545 }),
  ballFrame(43, { x: 1300, y: 570 }),
];

/** A towel/dry drill: no ball anywhere. */
const drillFrames: BallDetectionFrame[] = [40, 41, 42, 43, 44].map((i) =>
  ballFrame(i, null),
);

const base = {
  release_frame_index: 42,
  frame_width: 100,
  frame_height: 100,
  shift_frames: 1 as const,
};

describe("live-pitch gate", () => {
  it("passes a real ball in flight", () => {
    const r = evaluateLivePitchGate({
      detectionFrames: flightFrames,
      release_frame_index: 42,
    });
    expect(r.verdict).toBe("live_pitch");
    expect(r.lineage.ball_frames).toBe(4);
  });

  it("rejects a dry drill with no ball", () => {
    const r = evaluateLivePitchGate({
      detectionFrames: drillFrames,
      release_frame_index: 42,
    });
    expect(r.verdict).toBe("not_a_pitch");
    expect(r.reason).toBe("no_ball_detected_in_window");
  });

  it("rejects a held / barely-moving ball", () => {
    const held = [40, 41, 42, 43].map((i) =>
      ballFrame(i, { x: 500 + i, y: 500 }),
    );
    const r = evaluateLivePitchGate({
      detectionFrames: held,
      release_frame_index: 42,
    });
    expect(r.verdict).toBe("not_a_pitch");
    expect(r.reason).toBe("ball_present_but_static");
  });

  it("reports indeterminate — never a pass — with no detection data", () => {
    const r = evaluateLivePitchGate({
      detectionFrames: [],
      release_frame_index: 42,
    });
    expect(r.verdict).toBe("indeterminate");
    expect(r.reason).toBe("no_detection_data");
  });

  it("ignores low-confidence detections", () => {
    const weak = flightFrames.map((f) => ({
      ...f,
      chosen: f.chosen ? { ...f.chosen, confidence: 0.05 } : null,
    }));
    const r = evaluateLivePitchGate({
      detectionFrames: weak,
      release_frame_index: 42,
    });
    expect(r.verdict).toBe("not_a_pitch");
  });
});

describe("computeGuardedShoulderTiltDeg", () => {
  it("returns a value when both guards pass", () => {
    const r = computeGuardedShoulderTiltDeg({
      ...base,
      landmarks: frameWith({ x: 0.4, y: 0.4 }, { x: 0.6, y: 0.6 }),
      shifted_landmarks: frameWith({ x: 0.4, y: 0.4 }, { x: 0.6, y: 0.595 }),
      detectionFrames: flightFrames,
    });
    expect(r.missingness).toBeNull();
    expect(r.value).toBeCloseTo(45, 3);
    expect(r.guard).toBeNull();
    expect(r.lineage.delta_deg).not.toBeNull();
    expect(r.lineage.delta_deg!).toBeLessThanOrEqual(
      SHOULDER_TILT_STABILITY_TOLERANCE_DEG,
    );
  });

  it("withholds the value when the 1-frame shift disagrees", () => {
    const r = computeGuardedShoulderTiltDeg({
      ...base,
      landmarks: frameWith({ x: 0.4, y: 0.4 }, { x: 0.6, y: 0.6 }), // 45°
      shifted_landmarks: frameWith({ x: 0.4, y: 0.5 }, { x: 0.6, y: 0.5 }), // 0°
      detectionFrames: flightFrames,
    });
    expect(r.value).toBeNull();
    expect(r.guard).toBe("stability_1_frame_shift");
    expect(r.missingness?.missing_reason).toBe(
      "insufficient_temporal_resolution",
    );
    expect(r.guard_detail).toContain("single frame");
    expect(r.lineage.delta_deg).toBeCloseTo(45, 3);
  });

  it("withholds when the neighbouring frame has no pose", () => {
    const r = computeGuardedShoulderTiltDeg({
      ...base,
      landmarks: frameWith({ x: 0.4, y: 0.4 }, { x: 0.6, y: 0.6 }),
      shifted_landmarks: null,
      detectionFrames: flightFrames,
    });
    expect(r.value).toBeNull();
    expect(r.guard).toBe("stability_1_frame_shift");
  });

  it("withholds a towel/dry drill even when the geometry is stable", () => {
    const lm = frameWith({ x: 0.4, y: 0.4 }, { x: 0.6, y: 0.6 });
    const r = computeGuardedShoulderTiltDeg({
      ...base,
      landmarks: lm,
      shifted_landmarks: lm,
      detectionFrames: drillFrames,
    });
    expect(r.value).toBeNull();
    expect(r.guard).toBe("live_pitch_gate");
    expect(r.missingness?.missing_reason).toBe("ball_not_detected");
    expect(r.guard_detail).toContain("drill");
  });

  it("withholds when the pitch cannot be confirmed at all", () => {
    const lm = frameWith({ x: 0.4, y: 0.4 }, { x: 0.6, y: 0.6 });
    const r = computeGuardedShoulderTiltDeg({
      ...base,
      landmarks: lm,
      shifted_landmarks: lm,
      detectionFrames: [],
    });
    expect(r.value).toBeNull();
    expect(r.guard).toBe("live_pitch_gate");
    expect(r.guard_detail).toContain("cannot confirm");
  });

  it("passes through base missingness untouched", () => {
    const r = computeGuardedShoulderTiltDeg({
      ...base,
      release_frame_index: null,
      landmarks: frameWith({ x: 0.4, y: 0.4 }, { x: 0.6, y: 0.6 }),
      shifted_landmarks: frameWith({ x: 0.4, y: 0.4 }, { x: 0.6, y: 0.6 }),
      detectionFrames: flightFrames,
    });
    expect(r.value).toBeNull();
    expect(r.guard).toBeNull();
    expect(r.missingness?.missing_reason).toBe("pitcher_release_frame_missing");
  });

  it("is deterministic", () => {
    const inputs = {
      ...base,
      landmarks: frameWith({ x: 0.41, y: 0.47 }, { x: 0.63, y: 0.52 }),
      shifted_landmarks: frameWith({ x: 0.41, y: 0.47 }, { x: 0.63, y: 0.53 }),
      detectionFrames: flightFrames,
    };
    expect(computeGuardedShoulderTiltDeg(inputs)).toEqual(
      computeGuardedShoulderTiltDeg(inputs),
    );
  });
});
