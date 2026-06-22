import { describe, expect, it } from "vitest";
import { findFrontFootStrikeFrame } from "../anchors/frontFootStrike";
import { LANDMARK_MODEL_VERSION } from "../versions";

describe("Phase 42B — front-foot strike anchor (real D-POSE bound)", () => {
  it("D-POSE is no longer stubbed", () => {
    expect(LANDMARK_MODEL_VERSION.endsWith("@0.0.0-stub")).toBe(false);
  });

  it("returns the maximum-y frame_index when pose frames are present", () => {
    const r = findFrontFootStrikeFrame([
      { frame_index: 0, front_ankle_y: 0.2 },
      { frame_index: 1, front_ankle_y: 0.9 },
      { frame_index: 2, front_ankle_y: 0.5 },
    ]);
    expect(r.frame_index).toBe(1);
    expect(r.missingness).toBeNull();
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
