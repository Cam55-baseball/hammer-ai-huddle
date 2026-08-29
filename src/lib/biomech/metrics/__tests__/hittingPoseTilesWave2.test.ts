import { describe, it, expect } from "vitest";
import {
  computeHandsStayUpAtPlant,
  HANDS_STAY_UP_MAX_DROP_PCT,
} from "../handsStayUpAtPlant";
import {
  computeLeadElbowBendIncreasing,
  LEAD_ELBOW_STRAIGHTEN_TOLERANCE_DEG,
} from "../leadElbowBendIncreasing";
import {
  computeHeadVerticalMovementPostLanding,
  HEAD_POST_LANDING_MAX_PCT,
} from "../headVerticalMovementPostLanding";
import {
  computePelvisRotationEfficiency,
  PELVIS_ROTATION_MIN_DEG,
} from "../pelvisRotationEfficiency";
import { runGuardedMetric } from "../guardedMetric";
import { isRelease1Hidden } from "@/lib/reportCard/release1";

type LM = { x: number; y: number; visibility: number };

const NOSE = 0;
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_ELBOW = 13;
const R_ELBOW = 14;
const L_WRIST = 15;
const R_WRIST = 16;
const L_HIP = 23;
const R_HIP = 24;
const L_ANKLE = 27;
const R_ANKLE = 28;

function blank(vis = 0.9): LM[] {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: vis }));
}

/* ------------------------------------------------------------------ */
/* hands_stay_up_at_plant_pass                                         */
/* ------------------------------------------------------------------ */

function handsFrame(wristY: number, vis = 0.9): LM[] {
  const lm = blank(vis);
  lm[L_SHOULDER] = { x: 0.45, y: 0.3, visibility: vis };
  lm[R_SHOULDER] = { x: 0.55, y: 0.3, visibility: vis };
  lm[L_HIP] = { x: 0.47, y: 0.6, visibility: vis };
  lm[R_HIP] = { x: 0.53, y: 0.6, visibility: vis };
  lm[L_WRIST] = { x: 0.5, y: wristY, visibility: vis };
  lm[R_WRIST] = { x: 0.52, y: wristY, visibility: vis };
  return lm;
}

describe("hands_stay_up_at_plant_pass", () => {
  // torso = |0.6 - 0.3| * 1000 = 300px
  it("passes when the hands are still at their high point at plant", () => {
    const r = computeHandsStayUpAtPlant({
      load_frames: [
        { frame_index: 10, landmarks: handsFrame(0.35) },
        { frame_index: 20, landmarks: handsFrame(0.3) }, // highest
      ],
      plant_landmarks: handsFrame(0.32), // 20px drop / 300 = 0.067
      full_plant_frame_index: 30,
      frame_height: 1000,
    });
    expect(r.missingness).toBeNull();
    expect(r.lineage.highest_load_frame_index).toBe(20);
    expect(r.lineage.drop_pct!).toBeLessThanOrEqual(HANDS_STAY_UP_MAX_DROP_PCT);
    expect(r.pass).toBe(true);
    expect(r.value).toBe(1);
  });

  it("fails when the hands have dropped by plant", () => {
    const r = computeHandsStayUpAtPlant({
      load_frames: [{ frame_index: 20, landmarks: handsFrame(0.3) }],
      plant_landmarks: handsFrame(0.42), // 120px / 300 = 0.4
      full_plant_frame_index: 30,
      frame_height: 1000,
    });
    expect(r.pass).toBe(false);
    expect(r.value).toBe(0);
    expect(r.lineage.drop_pct!).toBeGreaterThan(HANDS_STAY_UP_MAX_DROP_PCT);
  });

  it("clamps negative drop to zero when hands rise into plant", () => {
    const r = computeHandsStayUpAtPlant({
      load_frames: [{ frame_index: 20, landmarks: handsFrame(0.4) }],
      plant_landmarks: handsFrame(0.3),
      full_plant_frame_index: 30,
      frame_height: 1000,
    });
    expect(r.lineage.drop_px).toBe(0);
    expect(r.pass).toBe(true);
  });

  it("ignores load frames at or after plant", () => {
    const r = computeHandsStayUpAtPlant({
      load_frames: [
        { frame_index: 30, landmarks: handsFrame(0.1) },
        { frame_index: 40, landmarks: handsFrame(0.1) },
      ],
      plant_landmarks: handsFrame(0.32),
      full_plant_frame_index: 30,
      frame_height: 1000,
    });
    expect(r.value).toBeNull();
    expect(r.missingness?.missing_reason).toBe(
      "insufficient_temporal_resolution",
    );
  });

  it("is missing with the plant-anchor reason when plant is unknown", () => {
    const r = computeHandsStayUpAtPlant({
      load_frames: [{ frame_index: 20, landmarks: handsFrame(0.3) }],
      plant_landmarks: handsFrame(0.32),
      full_plant_frame_index: null,
      frame_height: 1000,
    });
    expect(r.missingness?.missing_reason).toBe(
      "front_foot_full_plant_missing",
    );
  });

  it("is missing when plant landmarks are low visibility", () => {
    const r = computeHandsStayUpAtPlant({
      load_frames: [{ frame_index: 20, landmarks: handsFrame(0.3) }],
      plant_landmarks: handsFrame(0.32, 0.2),
      full_plant_frame_index: 30,
      frame_height: 1000,
    });
    expect(r.value).toBeNull();
    expect(r.missingness?.missing_reason).toBe("pose_not_detected");
  });
});

/* ------------------------------------------------------------------ */
/* lead_elbow_bend_increasing_pass                                     */
/* ------------------------------------------------------------------ */

/** Left ankle strides out further → lead side is left. */
function elbowFrame(elbowX: number, vis = 0.9): LM[] {
  const lm = blank(vis);
  lm[L_HIP] = { x: 0.48, y: 0.5, visibility: vis };
  lm[R_HIP] = { x: 0.52, y: 0.5, visibility: vis };
  lm[L_ANKLE] = { x: 0.2, y: 0.9, visibility: vis };
  lm[R_ANKLE] = { x: 0.55, y: 0.9, visibility: vis };
  lm[L_SHOULDER] = { x: 0.4, y: 0.3, visibility: vis };
  lm[L_ELBOW] = { x: elbowX, y: 0.45, visibility: vis };
  lm[L_WRIST] = { x: 0.4, y: 0.6, visibility: vis };
  lm[R_SHOULDER] = { x: 0.6, y: 0.3, visibility: vis };
  lm[R_ELBOW] = { x: 0.65, y: 0.45, visibility: vis };
  lm[R_WRIST] = { x: 0.6, y: 0.6, visibility: vis };
  return lm;
}

describe("lead_elbow_bend_increasing_pass", () => {
  it("passes when the elbow keeps folding into contact", () => {
    const r = computeLeadElbowBendIncreasing({
      full_plant_landmarks: elbowFrame(0.3),
      contact_landmarks: elbowFrame(0.2), // further from the line = more bend
      full_plant_frame_index: 30,
      contact_frame_index: 40,
      frame_width: 1000,
      frame_height: 1000,
    });
    expect(r.missingness).toBeNull();
    expect(r.lineage.lead_side).toBe("left");
    expect(r.lineage.delta_deg!).toBeLessThanOrEqual(
      LEAD_ELBOW_STRAIGHTEN_TOLERANCE_DEG,
    );
    expect(r.pass).toBe(true);
  });

  it("fails when the elbow straightens early", () => {
    const r = computeLeadElbowBendIncreasing({
      full_plant_landmarks: elbowFrame(0.2),
      contact_landmarks: elbowFrame(0.398), // near-collinear = straight
      full_plant_frame_index: 30,
      contact_frame_index: 40,
      frame_width: 1000,
      frame_height: 1000,
    });
    expect(r.lineage.delta_deg!).toBeGreaterThan(
      LEAD_ELBOW_STRAIGHTEN_TOLERANCE_DEG,
    );
    expect(r.pass).toBe(false);
    expect(r.value).toBe(0);
  });

  it("is missing when contact is unknown", () => {
    const r = computeLeadElbowBendIncreasing({
      full_plant_landmarks: elbowFrame(0.3),
      contact_landmarks: elbowFrame(0.2),
      full_plant_frame_index: 30,
      contact_frame_index: null,
      frame_width: 1000,
      frame_height: 1000,
    });
    expect(r.missingness?.missing_reason).toBe("contact_frame_missing");
  });

  it("refuses a verdict when no stride resolves the lead side", () => {
    const lm = elbowFrame(0.3);
    lm[L_ANKLE] = { x: 0.3, y: 0.9, visibility: 0.9 };
    lm[R_ANKLE] = { x: 0.7, y: 0.9, visibility: 0.9 };
    const r = computeLeadElbowBendIncreasing({
      full_plant_landmarks: lm,
      contact_landmarks: lm,
      full_plant_frame_index: 30,
      contact_frame_index: 40,
      frame_width: 1000,
      frame_height: 1000,
    });
    expect(r.value).toBeNull();
    expect(r.lineage.lead_side).toBeNull();
  });

  it("is missing on low visibility", () => {
    const r = computeLeadElbowBendIncreasing({
      full_plant_landmarks: elbowFrame(0.3, 0.2),
      contact_landmarks: elbowFrame(0.2, 0.2),
      full_plant_frame_index: 30,
      contact_frame_index: 40,
      frame_width: 1000,
      frame_height: 1000,
    });
    expect(r.missingness?.missing_reason).toBe("pose_not_detected");
  });
});

/* ------------------------------------------------------------------ */
/* head_vertical_movement_post_landing_pct                             */
/* ------------------------------------------------------------------ */

function headFrame(noseY: number, vis = 0.9): LM[] {
  const lm = blank(vis);
  lm[NOSE] = { x: 0.5, y: noseY, visibility: vis };
  lm[L_ANKLE] = { x: 0.4, y: 0.9, visibility: vis };
  lm[R_ANKLE] = { x: 0.6, y: 0.95, visibility: vis };
  return lm;
}

describe("head_vertical_movement_post_landing_pct", () => {
  // height = (0.95 - 0.20) * 1000 = 750px
  it("reports a small percentage when the head is quiet", () => {
    const r = computeHeadVerticalMovementPostLanding({
      landing_landmarks: headFrame(0.2),
      contact_landmarks: headFrame(0.21), // 10px / 750 = 1.33%
      full_plant_frame_index: 30,
      contact_frame_index: 40,
      frame_height: 1000,
    });
    expect(r.missingness).toBeNull();
    expect(r.value!).toBeCloseTo(1.3333, 3);
    expect(r.pass).toBe(true);
  });

  it("fails when the head dives after landing", () => {
    const r = computeHeadVerticalMovementPostLanding({
      landing_landmarks: headFrame(0.2),
      contact_landmarks: headFrame(0.3), // 100px / 750 = 13.3%
      full_plant_frame_index: 30,
      contact_frame_index: 40,
      frame_height: 1000,
    });
    expect(r.value!).toBeGreaterThan(HEAD_POST_LANDING_MAX_PCT);
    expect(r.pass).toBe(false);
  });

  it("measures magnitude regardless of direction", () => {
    const down = computeHeadVerticalMovementPostLanding({
      landing_landmarks: headFrame(0.2),
      contact_landmarks: headFrame(0.25),
      full_plant_frame_index: 30,
      contact_frame_index: 40,
      frame_height: 1000,
    }).value;
    const up = computeHeadVerticalMovementPostLanding({
      landing_landmarks: headFrame(0.25),
      contact_landmarks: headFrame(0.2),
      full_plant_frame_index: 30,
      contact_frame_index: 40,
      frame_height: 1000,
    }).value;
    expect(down!).toBeGreaterThan(0);
    expect(up!).toBeGreaterThan(0);
  });

  it("is missing when landing is unknown", () => {
    const r = computeHeadVerticalMovementPostLanding({
      landing_landmarks: headFrame(0.2),
      contact_landmarks: headFrame(0.21),
      full_plant_frame_index: null,
      contact_frame_index: 40,
      frame_height: 1000,
    });
    expect(r.missingness?.missing_reason).toBe(
      "front_foot_full_plant_missing",
    );
  });

  it("refuses a verdict when the athlete is not resolved head-to-foot", () => {
    const lm = headFrame(0.95);
    const r = computeHeadVerticalMovementPostLanding({
      landing_landmarks: lm,
      contact_landmarks: lm,
      full_plant_frame_index: 30,
      contact_frame_index: 40,
      frame_height: 1000,
    });
    expect(r.value).toBeNull();
    expect(r.missingness?.missing_reason).toBe("pose_not_detected");
  });
});

/* ------------------------------------------------------------------ */
/* pelvis_rotation_efficiency_deg                                      */
/* ------------------------------------------------------------------ */

function pelvisFrame(angleDeg: number, halfWidth = 0.05, vis = 0.9): LM[] {
  const lm = blank(vis);
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(rad) * halfWidth;
  const dy = Math.sin(rad) * halfWidth;
  lm[L_HIP] = { x: 0.5 - dx, y: 0.5 - dy, visibility: vis };
  lm[R_HIP] = { x: 0.5 + dx, y: 0.5 + dy, visibility: vis };
  return lm;
}

describe("pelvis_rotation_efficiency_deg", () => {
  it("measures the rotation between plant and contact", () => {
    const r = computePelvisRotationEfficiency({
      full_plant_landmarks: pelvisFrame(0),
      contact_landmarks: pelvisFrame(40),
      full_plant_frame_index: 30,
      contact_frame_index: 40,
      frame_width: 1000,
      frame_height: 1000,
    });
    expect(r.missingness).toBeNull();
    expect(r.value!).toBeCloseTo(40, 3);
    expect(r.pass).toBe(true);
  });

  it("fails below the unvalidated rotation floor", () => {
    const r = computePelvisRotationEfficiency({
      full_plant_landmarks: pelvisFrame(0),
      contact_landmarks: pelvisFrame(10),
      full_plant_frame_index: 30,
      contact_frame_index: 40,
      frame_width: 1000,
      frame_height: 1000,
    });
    expect(r.value!).toBeLessThan(PELVIS_ROTATION_MIN_DEG);
    expect(r.pass).toBe(false);
  });

  it("wraps rather than reporting a ~360 degree turn", () => {
    const r = computePelvisRotationEfficiency({
      full_plant_landmarks: pelvisFrame(170),
      contact_landmarks: pelvisFrame(-170),
      full_plant_frame_index: 30,
      contact_frame_index: 40,
      frame_width: 1000,
      frame_height: 1000,
    });
    expect(r.value!).toBeCloseTo(20, 3);
  });

  it("refuses a verdict when the hips are edge-on", () => {
    const r = computePelvisRotationEfficiency({
      full_plant_landmarks: pelvisFrame(0, 0.001),
      contact_landmarks: pelvisFrame(40, 0.001),
      full_plant_frame_index: 30,
      contact_frame_index: 40,
      frame_width: 1000,
      frame_height: 1000,
    });
    expect(r.value).toBeNull();
    expect(r.missingness?.missing_reason).toBe("pose_not_detected");
  });

  it("is missing when contact is unknown", () => {
    const r = computePelvisRotationEfficiency({
      full_plant_landmarks: pelvisFrame(0),
      contact_landmarks: pelvisFrame(40),
      full_plant_frame_index: 30,
      contact_frame_index: null,
      frame_width: 1000,
      frame_height: 1000,
    });
    expect(r.missingness?.missing_reason).toBe("contact_frame_missing");
  });
});

/* ------------------------------------------------------------------ */
/* guards + release gating                                             */
/* ------------------------------------------------------------------ */

describe("shared guard runner applies to the wave-2 tiles", () => {
  it("withholds pelvis rotation when there is no ball evidence", () => {
    const plant = pelvisFrame(0);
    const contact = pelvisFrame(40);
    const out = runGuardedMetric({
      measure: (_lm, idx) =>
        computePelvisRotationEfficiency({
          full_plant_landmarks: plant,
          contact_landmarks: contact,
          full_plant_frame_index: 30,
          contact_frame_index: idx,
          frame_width: 1000,
          frame_height: 1000,
        }),
      landmarksAt: () => contact,
      anchor_frame_index: 40,
      rep_frame_index: 40,
      detectionFrames: [],
      tolerance: 1,
      tolerance_unit: "deg",
      metric_label: "pelvis rotation",
      anchor_label: "contact anchor",
    });
    expect(out.value).toBeNull();
    expect(out.guard).toBe("live_pitch_gate");
  });

  it("passes base missingness through untouched", () => {
    const out = runGuardedMetric({
      measure: (_lm, idx) =>
        computePelvisRotationEfficiency({
          full_plant_landmarks: pelvisFrame(0),
          contact_landmarks: pelvisFrame(40),
          full_plant_frame_index: 30,
          contact_frame_index: idx,
          frame_width: 1000,
          frame_height: 1000,
        }),
      landmarksAt: () => pelvisFrame(40),
      anchor_frame_index: null,
      rep_frame_index: null,
      detectionFrames: [],
      tolerance: 1,
      tolerance_unit: "deg",
      metric_label: "pelvis rotation",
    });
    expect(out.value).toBeNull();
    expect(out.missingness?.missing_reason).toBe("contact_frame_missing");
    expect(out.guard).toBeNull();
  });
});

describe("release gating", () => {
  it("keeps all four wave-2 hitting tiles hidden", () => {
    expect(isRelease1Hidden("hands_stay_up_at_plant_pass")).toBe(true);
    expect(isRelease1Hidden("lead_elbow_bend_increasing_pass")).toBe(true);
    expect(isRelease1Hidden("head_vertical_movement_post_landing_pct")).toBe(
      true,
    );
    expect(isRelease1Hidden("pelvis_rotation_efficiency_deg")).toBe(true);
  });
});
