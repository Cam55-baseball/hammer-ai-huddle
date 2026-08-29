/**
 * `lead_elbow_bend_increasing_pass` (Hitting tile, pose-only).
 *
 * Philosophy-doc check: through launch the lead elbow should keep folding (bend
 * more), not push out and straighten early. An elbow that extends between plant
 * and contact is casting the barrel away from the body.
 *
 * Pure body geometry across two frames already on the pose path — full plant
 * and contact:
 *
 *   elbow_angle_deg(frame) = angle(shoulder → elbow → wrist)
 *   delta_deg              = angle(contact) − angle(plant)
 *
 * 180° is a straight arm, so bending more means the angle DECREASES. The tile
 * passes when `delta_deg <= LEAD_ELBOW_STRAIGHTEN_TOLERANCE_DEG` — a small
 * positive tolerance absorbs landmark jitter rather than treating a 1° wobble
 * as early extension.
 *
 * The lead side is derived from the pose, never from a handedness input: the
 * lead arm is on the same side as the front foot, and the front foot is the
 * ankle that strides further from the hip midline.
 *
 * Returned as 1 / 0 so the shared runner (`runGuardedMetric`) guards it
 * unchanged.
 *
 * NOT LIVE. Hitting output is suppressed by `RELEASE1_HITTING_SUPPRESSED` and
 * this metric stays in `RELEASE1_HIDDEN_METRICS`.
 */

import {
  MISSINGNESS_REASONS,
  missingness,
  type MissingnessRecord,
} from "./missingness";
import { uncalibrated, type ConfidenceRecord } from "./confidence";

/** Kill switch — MUST stay false until the tile is approved. */
export const MEDIAPIPE_LEAD_ELBOW_ENABLED = false as const;

export const LEFT_SHOULDER_INDEX = 11 as const;
export const RIGHT_SHOULDER_INDEX = 12 as const;
export const LEFT_ELBOW_INDEX = 13 as const;
export const RIGHT_ELBOW_INDEX = 14 as const;
export const LEFT_WRIST_INDEX = 15 as const;
export const RIGHT_WRIST_INDEX = 16 as const;
export const LEFT_HIP_INDEX = 23 as const;
export const RIGHT_HIP_INDEX = 24 as const;
export const LEFT_ANKLE_INDEX = 27 as const;
export const RIGHT_ANKLE_INDEX = 28 as const;

export const MIN_LEAD_ELBOW_VISIBILITY = 0.5;

/**
 * How much the lead elbow may straighten (degrees) between plant and contact
 * before the tile fails. UNVALIDATED starting estimate — tune against real
 * graded clips before any flip; this is not a settled constant.
 */
export const LEAD_ELBOW_STRAIGHTEN_TOLERANCE_DEG = 5;

export interface ElbowLandmark {
  readonly x: number;
  readonly y: number;
  readonly visibility: number;
}

export interface LeadElbowInputs {
  readonly full_plant_landmarks: readonly ElbowLandmark[];
  readonly contact_landmarks: readonly ElbowLandmark[];
  readonly full_plant_frame_index: number | null;
  readonly contact_frame_index: number | null;
  readonly frame_width: number;
  readonly frame_height: number;
}

export interface LeadElbowResult {
  /** 1 = elbow kept folding, 0 = elbow straightened early. */
  readonly value: number | null;
  readonly pass: boolean | null;
  readonly unit: "pass";
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly lineage: {
    readonly full_plant_frame_index: number | null;
    readonly contact_frame_index: number | null;
    readonly lead_side: "left" | "right" | null;
    readonly elbow_angle_plant_deg: number | null;
    readonly elbow_angle_contact_deg: number | null;
    readonly delta_deg: number | null;
    readonly tolerance_deg: number;
    readonly min_visibility: number | null;
  };
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

function angleDeg(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
): number | null {
  const v1x = ax - bx;
  const v1y = ay - by;
  const v2x = cx - bx;
  const v2y = cy - by;
  const m1 = Math.hypot(v1x, v1y);
  const m2 = Math.hypot(v2x, v2y);
  if (m1 < 1e-6 || m2 < 1e-6) return null;
  const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / (m1 * m2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function computeLeadElbowBendIncreasing(
  inputs: LeadElbowInputs,
): LeadElbowResult {
  const {
    full_plant_landmarks,
    contact_landmarks,
    full_plant_frame_index,
    contact_frame_index,
    frame_width,
    frame_height,
  } = inputs;

  const emptyLineage: LeadElbowResult["lineage"] = {
    full_plant_frame_index,
    contact_frame_index,
    lead_side: null,
    elbow_angle_plant_deg: null,
    elbow_angle_contact_deg: null,
    delta_deg: null,
    tolerance_deg: LEAD_ELBOW_STRAIGHTEN_TOLERANCE_DEG,
    min_visibility: null,
  };

  const miss = (
    reason: (typeof MISSINGNESS_REASONS)[keyof typeof MISSINGNESS_REASONS],
    emitted_by: MissingnessRecord["emitted_by"],
    lineage: LeadElbowResult["lineage"] = emptyLineage,
  ): LeadElbowResult => ({
    value: null,
    pass: null,
    unit: "pass",
    missingness: missingness(reason, emitted_by),
    confidence: { status: "missing", value: null, certificate_hash: null },
    lineage,
  });

  if (full_plant_frame_index == null) {
    return miss(MISSINGNESS_REASONS.FRONT_FOOT_FULL_PLANT_MISSING, "D-ANCHOR");
  }
  if (contact_frame_index == null) {
    return miss(MISSINGNESS_REASONS.CONTACT_FRAME_MISSING, "D-ANCHOR");
  }
  if (
    !Number.isFinite(frame_width) ||
    !Number.isFinite(frame_height) ||
    frame_width <= 0 ||
    frame_height <= 0
  ) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }

  const lHip = full_plant_landmarks?.[LEFT_HIP_INDEX];
  const rHip = full_plant_landmarks?.[RIGHT_HIP_INDEX];
  const lAnkle = full_plant_landmarks?.[LEFT_ANKLE_INDEX];
  const rAnkle = full_plant_landmarks?.[RIGHT_ANKLE_INDEX];
  if (!lHip || !rHip || !lAnkle || !rAnkle) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }

  const hipMidX = (lHip.x + rHip.x) / 2;
  const lSpread = Math.abs(lAnkle.x - hipMidX);
  const rSpread = Math.abs(rAnkle.x - hipMidX);
  if (Math.abs(lSpread - rSpread) < 1e-6) {
    // No stride resolved — the lead side is undefined, not a coin flip.
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE");
  }
  const leadSide: "left" | "right" = lSpread > rSpread ? "left" : "right";

  const sIdx = leadSide === "left" ? LEFT_SHOULDER_INDEX : RIGHT_SHOULDER_INDEX;
  const eIdx = leadSide === "left" ? LEFT_ELBOW_INDEX : RIGHT_ELBOW_INDEX;
  const wIdx = leadSide === "left" ? LEFT_WRIST_INDEX : RIGHT_WRIST_INDEX;

  const points = [
    full_plant_landmarks?.[sIdx],
    full_plant_landmarks?.[eIdx],
    full_plant_landmarks?.[wIdx],
    contact_landmarks?.[sIdx],
    contact_landmarks?.[eIdx],
    contact_landmarks?.[wIdx],
  ];
  if (points.some((p) => !p)) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE", {
      ...emptyLineage,
      lead_side: leadSide,
    });
  }

  const minVis = Math.min(...points.map((p) => p!.visibility));
  if (minVis < MIN_LEAD_ELBOW_VISIBILITY) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE", {
      ...emptyLineage,
      lead_side: leadSide,
      min_visibility: round6(minVis),
    });
  }

  const [ps, pe, pw, cs, ce, cw] = points as ElbowLandmark[];
  const plantAngle = angleDeg(
    ps.x * frame_width, ps.y * frame_height,
    pe.x * frame_width, pe.y * frame_height,
    pw.x * frame_width, pw.y * frame_height,
  );
  const contactAngle = angleDeg(
    cs.x * frame_width, cs.y * frame_height,
    ce.x * frame_width, ce.y * frame_height,
    cw.x * frame_width, cw.y * frame_height,
  );

  if (plantAngle == null || contactAngle == null) {
    return miss(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-POSE", {
      ...emptyLineage,
      lead_side: leadSide,
      min_visibility: round6(minVis),
    });
  }

  const delta = contactAngle - plantAngle;
  const pass = delta <= LEAD_ELBOW_STRAIGHTEN_TOLERANCE_DEG;

  return {
    value: pass ? 1 : 0,
    pass,
    unit: "pass",
    missingness: null,
    confidence: uncalibrated(),
    lineage: {
      full_plant_frame_index,
      contact_frame_index,
      lead_side: leadSide,
      elbow_angle_plant_deg: round6(plantAngle),
      elbow_angle_contact_deg: round6(contactAngle),
      delta_deg: round6(delta),
      tolerance_deg: LEAD_ELBOW_STRAIGHTEN_TOLERANCE_DEG,
      min_visibility: round6(minVis),
    },
  };
}
