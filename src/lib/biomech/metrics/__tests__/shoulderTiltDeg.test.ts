import { describe, it, expect } from "vitest";
import {
  computeShoulderTiltDeg,
  MEDIAPIPE_SHOULDER_TILT_ENABLED,
  LEFT_SHOULDER_INDEX,
  RIGHT_SHOULDER_INDEX,
} from "../shoulderTiltDeg";

function frameWith(
  left: { x: number; y: number; visibility?: number },
  right: { x: number; y: number; visibility?: number },
) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 1 }));
  lm[LEFT_SHOULDER_INDEX] = { visibility: 1, ...left };
  lm[RIGHT_SHOULDER_INDEX] = { visibility: 1, ...right };
  return lm;
}

const base = { release_frame_index: 42, frame_width: 100, frame_height: 100 };

describe("computeShoulderTiltDeg", () => {
  it("stays disabled until the swap is approved", () => {
    expect(MEDIAPIPE_SHOULDER_TILT_ENABLED).toBe(false);
  });

  it("returns 0 for level shoulders", () => {
    const r = computeShoulderTiltDeg({
      ...base,
      landmarks: frameWith({ x: 0.4, y: 0.5 }, { x: 0.6, y: 0.5 }),
    });
    expect(r.value).toBe(0);
    expect(r.missingness).toBeNull();
  });

  it("returns 45 for a 1:1 tilt regardless of direction", () => {
    const down = computeShoulderTiltDeg({
      ...base,
      landmarks: frameWith({ x: 0.4, y: 0.4 }, { x: 0.6, y: 0.6 }),
    });
    const up = computeShoulderTiltDeg({
      ...base,
      landmarks: frameWith({ x: 0.4, y: 0.6 }, { x: 0.6, y: 0.4 }),
    });
    expect(down.value).toBeCloseTo(45, 6);
    expect(up.value).toBeCloseTo(45, 6);
  });

  it("folds obtuse angles into [0,90]", () => {
    const r = computeShoulderTiltDeg({
      ...base,
      landmarks: frameWith({ x: 0.6, y: 0.4 }, { x: 0.4, y: 0.6 }),
    });
    expect(r.value).toBeCloseTo(45, 6);
  });

  it("accounts for non-square frames", () => {
    const r = computeShoulderTiltDeg({
      ...base,
      frame_width: 100,
      frame_height: 200,
      landmarks: frameWith({ x: 0.4, y: 0.4 }, { x: 0.6, y: 0.5 }),
    });
    // dx = 20px, dy = 20px → 45°
    expect(r.value).toBeCloseTo(45, 6);
  });

  it("emits missingness when the release frame is unknown", () => {
    const r = computeShoulderTiltDeg({
      ...base,
      release_frame_index: null,
      landmarks: frameWith({ x: 0.4, y: 0.5 }, { x: 0.6, y: 0.5 }),
    });
    expect(r.value).toBeNull();
    expect(r.missingness?.missing_reason).toBe("pitcher_release_frame_missing");
  });

  it("emits missingness on low shoulder visibility", () => {
    const r = computeShoulderTiltDeg({
      ...base,
      landmarks: frameWith(
        { x: 0.4, y: 0.5, visibility: 0.2 },
        { x: 0.6, y: 0.5 },
      ),
    });
    expect(r.value).toBeNull();
    expect(r.missingness?.missing_reason).toBe("pose_not_detected");
  });

  it("emits missingness on a degenerate shoulder line", () => {
    const r = computeShoulderTiltDeg({
      ...base,
      landmarks: frameWith({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }),
    });
    expect(r.value).toBeNull();
  });

  it("is deterministic", () => {
    const inputs = {
      ...base,
      landmarks: frameWith({ x: 0.41, y: 0.47 }, { x: 0.63, y: 0.52 }),
    };
    expect(computeShoulderTiltDeg(inputs)).toEqual(
      computeShoulderTiltDeg(inputs),
    );
  });
});
