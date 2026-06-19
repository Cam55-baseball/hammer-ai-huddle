import { describe, expect, it } from "vitest";
import { findFrontFootStrikeFrame } from "../anchors/frontFootStrike";
import { LANDMARK_MODEL_VERSION } from "../versions";

describe("Phase 26 — front-foot strike anchor", () => {
  it("emits pose_model_is_stub while D-POSE is stubbed", () => {
    expect(LANDMARK_MODEL_VERSION.endsWith("@0.0.0-stub")).toBe(true);
    const r = findFrontFootStrikeFrame([
      { frame_index: 0, front_ankle_y: 0.2 },
      { frame_index: 1, front_ankle_y: 0.9 },
    ]);
    expect(r.frame_index).toBeNull();
    expect(r.missingness?.missing_reason).toBe("pose_model_is_stub");
    expect(r.missingness?.emitted_by).toBe("D-PLANT");
  });
});
