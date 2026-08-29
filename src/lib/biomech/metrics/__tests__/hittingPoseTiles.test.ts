import { describe, it, expect } from "vitest";
import {
  computeBackKneeFlexMaintained,
  BACK_KNEE_FLEX_MAX_ANGLE_DEG,
  LEFT_HIP_INDEX,
  RIGHT_HIP_INDEX,
  LEFT_KNEE_INDEX,
  RIGHT_KNEE_INDEX,
  LEFT_ANKLE_INDEX,
  RIGHT_ANKLE_INDEX,
} from "../backKneeFlexMaintained";
import {
  computePostLandingHipDrift,
  POST_LANDING_HIP_DRIFT_MAX_PCT,
} from "../postLandingHipDrift";
import { runGuardedMetric } from "../guardedMetric";
import { isRelease1Hidden } from "@/lib/reportCard/release1";

type LM = { x: number; y: number; visibility: number };

function blank(): LM[] {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }));
}

/** Back leg on the right side (left ankle strides out further). */
function kneeFrame(kneeX: number, vis = 0.9): LM[] {
  const lm = blank();
  lm[LEFT_HIP_INDEX] = { x: 0.48, y: 0.5, visibility: vis };
  lm[RIGHT_HIP_INDEX] = { x: 0.52, y: 0.5, visibility: vis };
  lm[LEFT_ANKLE_INDEX] = { x: 0.2, y: 0.9, visibility: vis }; // front (strides)
  lm[RIGHT_ANKLE_INDEX] = { x: 0.55, y: 0.9, visibility: vis }; // back
  lm[LEFT_KNEE_INDEX] = { x: 0.3, y: 0.7, visibility: vis };
  lm[RIGHT_KNEE_INDEX] = { x: kneeX, y: 0.7, visibility: vis };
  return lm;
}

describe("back_knee_flex_maintained_pass", () => {
  it("passes when the back knee is clearly flexed", () => {
    // Knee pushed well outside the hip→ankle line = large flexion.
    const r = computeBackKneeFlexMaintained({
      landmarks: kneeFrame(0.75),
      contact_frame_index: 40,
      frame_width: 1000,
      frame_height: 1000,
    });
    expect(r.missingness).toBeNull();
    expect(r.lineage.back_side).toBe("right");
    expect(r.lineage.knee_angle_deg!).toBeLessThanOrEqual(
      BACK_KNEE_FLEX_MAX_ANGLE_DEG,
    );
    expect(r.pass).toBe(true);
    expect(r.value).toBe(1);
  });

  it("fails when the back leg is essentially straight", () => {
    // Hip, knee, ankle nearly collinear.
    const lm = kneeFrame(0.535);
    const r = computeBackKneeFlexMaintained({
      landmarks: lm,
      contact_frame_index: 40,
      frame_width: 1000,
      frame_height: 1000,
    });
    expect(r.missingness).toBeNull();
    expect(r.lineage.knee_angle_deg!).toBeGreaterThan(
      BACK_KNEE_FLEX_MAX_ANGLE_DEG,
    );
    expect(r.pass).toBe(false);
    expect(r.value).toBe(0);
  });

  it("is missing with the contact-anchor reason when contact is unknown", () => {
    const r = computeBackKneeFlexMaintained({
      landmarks: kneeFrame(0.75),
      contact_frame_index: null,
      frame_width: 1000,
      frame_height: 1000,
    });
    expect(r.value).toBeNull();
    expect(r.missingness?.missing_reason).toBe("contact_frame_missing");
  });

  it("is missing when landmark visibility is below threshold", () => {
    const r = computeBackKneeFlexMaintained({
      landmarks: kneeFrame(0.75, 0.2),
      contact_frame_index: 40,
      frame_width: 1000,
      frame_height: 1000,
    });
    expect(r.value).toBeNull();
    expect(r.missingness?.missing_reason).toBe("pose_not_detected");
  });

  it("refuses to guess a back side when the feet are symmetric", () => {
    const lm = kneeFrame(0.75);
    lm[LEFT_ANKLE_INDEX] = { x: 0.3, y: 0.9, visibility: 0.9 };
    lm[RIGHT_ANKLE_INDEX] = { x: 0.7, y: 0.9, visibility: 0.9 };
    const r = computeBackKneeFlexMaintained({
      landmarks: lm,
      contact_frame_index: 40,
      frame_width: 1000,
      frame_height: 1000,
    });
    expect(r.value).toBeNull();
    expect(r.lineage.back_side).toBeNull();
  });
});

function hipFrame(midX: number, halfWidth = 0.04, vis = 0.9): LM[] {
  const lm = blank();
  lm[LEFT_HIP_INDEX] = { x: midX - halfWidth, y: 0.5, visibility: vis };
  lm[RIGHT_HIP_INDEX] = { x: midX + halfWidth, y: 0.5, visibility: vis };
  return lm;
}

describe("post_landing_hip_drift_pass", () => {
  const base = {
    full_plant_frame_index: 30,
    contact_frame_index: 45,
    frame_width: 1000,
  };

  it("passes when the hips hold their position after landing", () => {
    const r = computePostLandingHipDrift({
      ...base,
      full_plant_landmarks: hipFrame(0.5),
      contact_landmarks: hipFrame(0.505),
    });
    expect(r.missingness).toBeNull();
    expect(r.lineage.drift_pct!).toBeLessThanOrEqual(
      POST_LANDING_HIP_DRIFT_MAX_PCT,
    );
    expect(r.pass).toBe(true);
  });

  it("fails when the hips keep travelling toward the pitcher", () => {
    const r = computePostLandingHipDrift({
      ...base,
      full_plant_landmarks: hipFrame(0.5),
      contact_landmarks: hipFrame(0.56),
    });
    expect(r.pass).toBe(false);
    expect(r.value).toBe(0);
    expect(r.lineage.drift_pct!).toBeGreaterThan(POST_LANDING_HIP_DRIFT_MAX_PCT);
  });

  it("normalises by pelvis width, so camera distance does not change the verdict", () => {
    const near = computePostLandingHipDrift({
      ...base,
      full_plant_landmarks: hipFrame(0.5, 0.08),
      contact_landmarks: hipFrame(0.5 + 0.02, 0.08),
    });
    const far = computePostLandingHipDrift({
      ...base,
      full_plant_landmarks: hipFrame(0.5, 0.04),
      contact_landmarks: hipFrame(0.5 + 0.01, 0.04),
    });
    expect(near.lineage.drift_pct).toBeCloseTo(far.lineage.drift_pct!, 6);
    expect(near.pass).toBe(far.pass);
  });

  it("is missing when the full-plant anchor is unknown", () => {
    const r = computePostLandingHipDrift({
      ...base,
      full_plant_frame_index: null,
      full_plant_landmarks: hipFrame(0.5),
      contact_landmarks: hipFrame(0.5),
    });
    expect(r.value).toBeNull();
    expect(r.missingness?.missing_reason).toBe("front_foot_full_plant_missing");
  });

  it("issues no verdict when the pelvis is edge-on to the camera", () => {
    const r = computePostLandingHipDrift({
      ...base,
      full_plant_landmarks: hipFrame(0.5, 0.0002),
      contact_landmarks: hipFrame(0.5, 0.0002),
    });
    expect(r.value).toBeNull();
    expect(r.missingness?.missing_reason).toBe("pose_not_detected");
  });
});

describe("shared guarded-metric runner", () => {
  const landmarks = kneeFrame(0.75);

  const measure = (lms: readonly LM[], idx: number | null) =>
    computeBackKneeFlexMaintained({
      landmarks: lms,
      contact_frame_index: idx,
      frame_width: 1000,
      frame_height: 1000,
    });

  it("withholds the value when there is no ball evidence (drill clip)", () => {
    const out = runGuardedMetric({
      measure,
      landmarksAt: () => landmarks,
      anchor_frame_index: 40,
      rep_frame_index: 40,
      detectionFrames: [],
      tolerance: 0,
      tolerance_unit: "",
      metric_label: "back knee flex",
      anchor_label: "contact anchor",
    });
    expect(out.value).toBeNull();
    expect(out.guard).toBe("live_pitch_gate");
    expect(out.missingness?.missing_reason).toBe("ball_not_detected");
  });

  it("withholds the value when the neighbouring frame has no pose", () => {
    const out = runGuardedMetric({
      measure,
      landmarksAt: (i) => (i === 40 ? landmarks : null),
      anchor_frame_index: 40,
      rep_frame_index: 40,
      detectionFrames: [],
      tolerance: 0,
      tolerance_unit: "",
      metric_label: "back knee flex",
    });
    expect(out.value).toBeNull();
    expect(out.lineage.neighbour_frame_index).toBe(41);
  });

  it("passes base missingness through untouched", () => {
    const out = runGuardedMetric({
      measure,
      landmarksAt: () => landmarks,
      anchor_frame_index: null,
      rep_frame_index: null,
      detectionFrames: [],
      tolerance: 0,
      tolerance_unit: "",
      metric_label: "back knee flex",
    });
    expect(out.value).toBeNull();
    expect(out.missingness?.missing_reason).toBe("contact_frame_missing");
    expect(out.guard).toBeNull();
  });
});

describe("release gating", () => {
  it("keeps both new hitting tiles hidden", () => {
    expect(isRelease1Hidden("back_knee_flex_maintained_pass")).toBe(true);
    expect(isRelease1Hidden("post_landing_hip_drift_pass")).toBe(true);
  });
});
