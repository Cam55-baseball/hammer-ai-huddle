import { describe, it, expect } from "vitest";
import {
  computeGuardedEnergyAngleDeg,
  ENERGY_ANGLE_STABILITY_TOLERANCE_DEG,
} from "../energyAngleGuarded";
import {
  computeEnergyAngleDeg,
  LEFT_HIP_INDEX,
  RIGHT_HIP_INDEX,
  LEFT_ANKLE_INDEX,
  RIGHT_ANKLE_INDEX,
  LEFT_HEEL_INDEX,
  RIGHT_HEEL_INDEX,
  LEFT_FOOT_INDEX,
  RIGHT_FOOT_INDEX,
} from "../energyAngleDeg";
import type { BallDetectionFrame } from "@/lib/cv/ball/types";

/**
 * Right-handed pitcher at peak leg lift, filmed 1000x1000 so normalized
 * coords read as pixels/1000. Plant foot = right (lower ankle in image),
 * front hip = left hip.
 */
function poseWith(opts: {
  /** Front-hip horizontal offset off the plant foot, in normalized units. */
  hipDx: number;
  /** Front-hip height above the plant foot, in normalized units. */
  hipRise?: number;
  visibility?: number;
}) {
  const { hipDx, hipRise = 0.4, visibility = 1 } = opts;
  const lm = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility,
  }));
  // Right ankle lower in image (larger y) → plant side = right.
  lm[RIGHT_ANKLE_INDEX] = { x: 0.5, y: 0.9, visibility };
  lm[LEFT_ANKLE_INDEX] = { x: 0.5, y: 0.6, visibility };
  lm[RIGHT_HEEL_INDEX] = { x: 0.48, y: 0.9, visibility };
  lm[RIGHT_FOOT_INDEX] = { x: 0.52, y: 0.9, visibility };
  lm[LEFT_HEEL_INDEX] = { x: 0.48, y: 0.6, visibility };
  lm[LEFT_FOOT_INDEX] = { x: 0.52, y: 0.6, visibility };
  // Front hip = lift side = left hip.
  lm[LEFT_HIP_INDEX] = { x: 0.5 + hipDx, y: 0.9 - hipRise, visibility };
  lm[RIGHT_HIP_INDEX] = { x: 0.5, y: 0.9 - hipRise, visibility };
  return lm;
}

function ballFrame(
  frame_index: number,
  ball: { x: number; y: number } | null,
): BallDetectionFrame {
  return {
    frame_index,
    timestamp_seconds: frame_index / 30,
    image_width: 1920,
    image_height: 1080,
    predictions: [],
    chosen: ball
      ? { ...ball, width: 12, height: 12, confidence: 0.8, class: "baseball" }
      : null,
  };
}

const flightFrames: BallDetectionFrame[] = [
  ballFrame(40, { x: 400, y: 500 }),
  ballFrame(41, { x: 700, y: 520 }),
  ballFrame(42, { x: 1000, y: 545 }),
  ballFrame(43, { x: 1300, y: 570 }),
];

const drillFrames: BallDetectionFrame[] = [40, 41, 42, 43, 44].map((i) =>
  ballFrame(i, null),
);

const base = {
  peak_leg_lift_frame_index: 20,
  release_frame_index: 42,
  frame_width: 1000,
  frame_height: 1000,
  shift_frames: 1 as const,
  detectionFrames: flightFrames,
};

describe("guarded energy angle — happy path", () => {
  it("passes a stable measurement through on a live pitch", () => {
    const lm = poseWith({ hipDx: 0.1 });
    const result = computeGuardedEnergyAngleDeg({
      ...base,
      landmarks: lm,
      shifted_landmarks: poseWith({ hipDx: 0.102 }),
    });

    expect(result.value).not.toBeNull();
    expect(result.guard).toBeNull();
    expect(result.missingness).toBeNull();
    // Same value the ungated geometry produces — the guard never alters it.
    expect(result.value).toBe(
      computeEnergyAngleDeg({
        landmarks: lm,
        peak_leg_lift_frame_index: 20,
        frame_width: 1000,
        frame_height: 1000,
      }).value,
    );
  });

  it("reports the observed 1-frame delta in lineage", () => {
    const result = computeGuardedEnergyAngleDeg({
      ...base,
      landmarks: poseWith({ hipDx: 0.1 }),
      shifted_landmarks: poseWith({ hipDx: 0.105 }),
    });
    expect(result.lineage.delta_deg).toBeGreaterThan(0);
    expect(result.lineage.delta_deg).toBeLessThan(
      ENERGY_ANGLE_STABILITY_TOLERANCE_DEG,
    );
    expect(result.lineage.shift_frames).toBe(1);
  });
});

describe("guarded energy angle — live-pitch gate", () => {
  it("withholds the value on a dry drill with no ball", () => {
    const result = computeGuardedEnergyAngleDeg({
      ...base,
      landmarks: poseWith({ hipDx: 0.1 }),
      shifted_landmarks: poseWith({ hipDx: 0.101 }),
      detectionFrames: drillFrames,
    });

    expect(result.value).toBeNull();
    expect(result.guard).toBe("live_pitch_gate");
    expect(result.missingness?.missing_reason).toBeTruthy();
    // The underlying measurement still exists in lineage — nothing is hidden.
    expect(result.lineage.primary_value).not.toBeNull();
  });

  it("checks the pitch gate before calling anything unstable", () => {
    const result = computeGuardedEnergyAngleDeg({
      ...base,
      landmarks: poseWith({ hipDx: 0.1 }),
      shifted_landmarks: poseWith({ hipDx: 0.9 }),
      detectionFrames: drillFrames,
    });
    expect(result.guard).toBe("live_pitch_gate");
  });
});

describe("guarded energy angle — stability guard", () => {
  it("withholds when a single frame moves the angle past tolerance", () => {
    const result = computeGuardedEnergyAngleDeg({
      ...base,
      landmarks: poseWith({ hipDx: 0.02 }),
      shifted_landmarks: poseWith({ hipDx: 0.3 }),
    });

    expect(result.value).toBeNull();
    expect(result.guard).toBe("stability_1_frame_shift");
    expect(result.lineage.delta_deg).toBeGreaterThan(
      ENERGY_ANGLE_STABILITY_TOLERANCE_DEG,
    );
    expect(result.guard_detail).toContain("peak-leg-lift anchor");
  });

  it("withholds when the neighbouring frame has no pose at all", () => {
    const result = computeGuardedEnergyAngleDeg({
      ...base,
      landmarks: poseWith({ hipDx: 0.1 }),
      shifted_landmarks: null,
    });
    expect(result.value).toBeNull();
    expect(result.guard).toBe("stability_1_frame_shift");
  });

  it("withholds when the neighbouring frame is unmeasurable", () => {
    const result = computeGuardedEnergyAngleDeg({
      ...base,
      landmarks: poseWith({ hipDx: 0.1 }),
      shifted_landmarks: poseWith({ hipDx: 0.1, visibility: 0.1 }),
    });
    expect(result.value).toBeNull();
    expect(result.guard).toBe("stability_1_frame_shift");
  });
});

describe("guarded energy angle — guards never invent a value", () => {
  it("passes base missingness through untouched when pose is absent", () => {
    const result = computeGuardedEnergyAngleDeg({
      ...base,
      landmarks: [],
      shifted_landmarks: poseWith({ hipDx: 0.1 }),
    });
    expect(result.value).toBeNull();
    expect(result.guard).toBeNull();
    expect(result.missingness?.emitted_by).toBe("D-POSE");
  });

  it("passes anchor missingness through when peak leg lift is unknown", () => {
    const result = computeGuardedEnergyAngleDeg({
      ...base,
      peak_leg_lift_frame_index: null,
      landmarks: poseWith({ hipDx: 0.1 }),
      shifted_landmarks: poseWith({ hipDx: 0.1 }),
    });
    expect(result.value).toBeNull();
    expect(result.guard).toBeNull();
    expect(result.missingness?.emitted_by).toBe("D-ANCHOR");
  });

  it("never produces a value the base geometry refused", () => {
    const refused = computeGuardedEnergyAngleDeg({
      ...base,
      landmarks: poseWith({ hipDx: 0.1, visibility: 0.2 }),
      shifted_landmarks: poseWith({ hipDx: 0.1 }),
    });
    expect(refused.value).toBeNull();
  });
});
