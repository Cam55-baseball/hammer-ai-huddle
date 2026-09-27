import { describe, expect, it } from "vitest";
import { findFrontFootStrikeFrame } from "../anchors/frontFootStrike";
import { LANDMARK_MODEL_VERSION } from "../versions";

describe("Phase 42B — front-foot strike anchor (real D-POSE bound)", () => {
  it("D-POSE is no longer stubbed", () => {
    expect(LANDMARK_MODEL_VERSION.endsWith("@0.0.0-stub")).toBe(false);
  });

  // stance 0.80 (frames 0-5), lift to 0.60 (6-9), back down + settled 0.80 from frame 10.
  const stride = Array.from({ length: 20 }, (_, i) => ({
    frame_index: i, body_height_y: 0.5,
    front_ankle_y: i < 6 ? 0.8 : i < 10 ? 0.6 : 0.8,
  }));
  it("plant = first down-and-settled frame after the lift, ±1 frame at 24 fps", () => {
    const r = findFrontFootStrikeFrame(stride, { after_frame_index: 8, fps: 24 });
    expect(r.frame_index).toBe(10);
    expect(r.path).toBe("after_lift");
    expect(r.anchor_uncertainty_ms).toBeCloseTo(41.6667, 3);
    expect(r.missingness).toBeNull();
  });
  it("onset path finds the same plant without a lift frame", () => {
    expect(findFrontFootStrikeFrame(stride, { fps: 30 }).frame_index).toBe(10);
  });
  it("refuses with its own detail when nothing follows the lift", () => {
    const r = findFrontFootStrikeFrame(stride, { after_frame_index: 19, fps: 24 });
    expect(r.frame_index).toBeNull();
    expect(r.detail).toBe("no_observed_frames_after_lift");
  });

  it("emits front_foot_first_contact_missing when no visible ankles", () => {
    const r = findFrontFootStrikeFrame([
      { frame_index: 0, front_ankle_y: null },
      { frame_index: 1, front_ankle_y: null },
    ]);
    expect(r.frame_index).toBeNull();
    expect(r.missingness?.missing_reason).toBe("front_foot_first_contact_missing");
    expect(r.missingness?.emitted_by).toBe("D-PLANT");
  });
});
