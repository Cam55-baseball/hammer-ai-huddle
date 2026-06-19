/**
 * Phase 26 — Canonical missingness reasons (D-9/D-10).
 *
 * Sourced verbatim from `canonical-measurement-architecture.md §Missingness rules`
 * and `canonical-build-plan.md §2` (detector missingness routing). No reason
 * may be introduced or relaxed outside the canonical set. Reasons are
 * surfaced unchanged into `TileState.missing_reason` per
 * `src/lib/reportCard/types.ts`.
 */

export const MISSINGNESS_REASONS = {
  POSE_NOT_DETECTED: "pose_not_detected",
  HANDS_NOT_DETECTED: "hands_not_detected",
  BAT_NOT_DETECTED: "bat_not_detected",
  BALL_NOT_DETECTED: "ball_not_detected",
  CONTACT_FRAME_MISSING: "contact_frame_missing",
  FRONT_FOOT_FIRST_CONTACT_MISSING: "front_foot_first_contact_missing",
  FRONT_FOOT_FULL_PLANT_MISSING: "front_foot_full_plant_missing",
  PITCHER_RELEASE_FRAME_MISSING: "pitcher_release_frame_missing",
  PEAK_LEG_LIFT_MISSING: "peak_leg_lift_missing",
  INSUFFICIENT_TEMPORAL_RESOLUTION: "insufficient_temporal_resolution",
  POSE_MODEL_IS_STUB: "pose_model_is_stub",
} as const;

export type MissingnessReason =
  (typeof MISSINGNESS_REASONS)[keyof typeof MISSINGNESS_REASONS];

export interface MissingnessRecord {
  readonly missing: true;
  readonly missing_reason: MissingnessReason;
  /** Layer that emitted the missingness (D-2…D-11). */
  readonly emitted_by: "D-POSE" | "D-PLANT" | "D-ANCHOR" | "D-METRIC";
}

export function missingness(
  reason: MissingnessReason,
  emitted_by: MissingnessRecord["emitted_by"],
): MissingnessRecord {
  return { missing: true, missing_reason: reason, emitted_by };
}
