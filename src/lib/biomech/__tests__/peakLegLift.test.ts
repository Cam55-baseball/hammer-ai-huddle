import { describe, expect, it } from "vitest";
import { findPeakLegLiftFrame } from "../anchors/peakLegLift";
import { LANDMARK_MODEL_VERSION } from "../versions";

describe("Phase 26 — peak leg lift anchor", () => {
  it("emits pose_model_is_stub while D-POSE is stubbed", () => {
    // Sanity: the repo ships with a stub pose model at Phase 26.
    expect(LANDMARK_MODEL_VERSION.endsWith("@0.0.0-stub")).toBe(true);
    const r = findPeakLegLiftFrame([
      { frame_index: 0, lift_ankle_y: 0.9 },
      { frame_index: 1, lift_ankle_y: 0.2 },
    ]);
    expect(r.frame_index).toBeNull();
    expect(r.missingness?.missing_reason).toBe("pose_model_is_stub");
    expect(r.missingness?.emitted_by).toBe("D-POSE");
  });
});
