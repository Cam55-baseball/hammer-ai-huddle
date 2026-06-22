import { describe, expect, it } from "vitest";
import { findPeakLegLiftFrame } from "../anchors/peakLegLift";
import { LANDMARK_MODEL_VERSION } from "../versions";

describe("Phase 42B — peak leg lift anchor (real D-POSE bound)", () => {
  it("D-POSE is no longer stubbed", () => {
    expect(LANDMARK_MODEL_VERSION.endsWith("@0.0.0-stub")).toBe(false);
  });

  it("returns the minimum-y frame_index when pose frames are present", () => {
    const r = findPeakLegLiftFrame([
      { frame_index: 0, lift_ankle_y: 0.9 },
      { frame_index: 1, lift_ankle_y: 0.2 },
      { frame_index: 2, lift_ankle_y: 0.5 },
    ]);
    expect(r.frame_index).toBe(1);
    expect(r.missingness).toBeNull();
    expect(r.source_model).toBe(LANDMARK_MODEL_VERSION);
  });

  it("emits pose_not_detected missingness when no visible ankles", () => {
    const r = findPeakLegLiftFrame([
      { frame_index: 0, lift_ankle_y: null },
      { frame_index: 1, lift_ankle_y: null },
    ]);
    expect(r.frame_index).toBeNull();
    expect(r.missingness?.missing_reason).toBe("pose_not_detected");
    expect(r.missingness?.emitted_by).toBe("D-POSE");
  });
});
