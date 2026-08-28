/**
 * Phase 45 — Release-1 Trust Lock.
 *
 * Single source of truth for which athlete-facing metrics are visible
 * in Release-1. Carries the classification decided by Phase 44 §3.
 *
 * Doctrine:
 *  - VISIBLE         → landmark-backed end-to-end, may render and contribute to scores.
 *  - HIDDEN          → LLM-derived; MUST NOT appear in any athlete-facing surface,
 *                      trend, recommendation, pillar contribution, or coaching output.
 *  - SHOWCASE_FUTURE → pose-derivable in principle but blocked on calibration
 *                      / object tracking / release anchor that does not yet exist.
 *                      Suppressed in Release-1 but reversible without new doctrine.
 *
 * Hitting is suppressed in its entirety for Release-1 because every BH metric
 * is HIDDEN today. The suppression is a single flag flip (`RELEASE1_HITTING_SUPPRESSED`).
 */

export const RELEASE1_VISIBLE_METRICS = [
  "tempo_sec",
  "lift_thrust_deg",
  "premature_shoulder_open_deg",
  "shoulder_tilt_deg",
] as const;

export const RELEASE1_HIDDEN_METRICS = [
  // BP — demoted by the AI-vision variability audit
  // (docs/asb/ai-vision-metric-variability-audit.md, 2026-08).
  // `energy_angle_deg` returned the identical value on every clip it measured
  // (constant, not a measurement). `head_vertical_movement_pct` returned
  // `missing` on 12/12 real clips (never measures). Both are suppressed until
  // a deterministic pose-derived implementation replaces the AI-vision guess.
  "energy_angle_deg",
  "head_vertical_movement_pct",
  // BH physics / bat heuristics (LLM-only)
  "bat_speed_contact_mph",
  "time_to_contact_ms",
  "on_plane_pct",
  "bat_path_score_100",
  // BH 0..100 judgement tiles (LLM opinion presented as measurement)
  "hip_stability_score_100",
  "hand_load_score_100",
  "eyes_track_score_100",
  "heel_plant_score_100",
  "connection_barrel_delivery_score_100",
  "hitters_move_score_100",
  "shoulder_plane_steadiness_score_100",
  "finish_balance_score_100",
  // BH boolean anchors (pose-derivable in principle; today LLM-only)
  "p2_timing_pass",
  "sequencing_ok",
  "hands_outside_shoulders_at_landing_pass",
  "shoulder_to_shoulder_hold_pass",
  "front_shoulder_leak_before_contact",
] as const;


export const RELEASE1_SHOWCASE_FUTURE = [
  // BP — blocked on calibration / release-anchor detector
  "stride_pct_of_height",
  "glove_drift_outside_frame_in",
  "head_at_release_deg",
  // SP windmill — pose-derivable checkpoints, blocked on real-video review
  "windup_trunk_tibia_deg",
  "windup_hip_square_deg",
  "windup_knee_over_foot_deg",
  "windup_foot_power_line_deg",
  "stride_triple_extension_pass",
  "sfc_foot_angle_deg",
  "sfc_arm_path_deg",
  "sfc_trunk_alignment_pass",
  "sfc_knee_ankle_deg",
  "sfc_hip_shoulder_rotation_deg",
  "accel_arm_path_pass",
  "ft_knee_ankle_deg",
  "stride_pct_top",
  "stride_pct_sfc",
  "stride_pct_release",
  // BH — pose-derivable with future anchors + fps verification
  "p3_release_offset_ms",
  "stride_dir_deg_off_square",
  "front_shoulder_leak_pct_of_window",
  "shoulder_to_shoulder_hold_pct_to_contact",
] as const;

export type Release1Classification = "visible" | "hidden" | "showcase_future";

const VISIBLE_SET = new Set<string>(RELEASE1_VISIBLE_METRICS);
const HIDDEN_SET = new Set<string>(RELEASE1_HIDDEN_METRICS);
const SHOWCASE_SET = new Set<string>(RELEASE1_SHOWCASE_FUTURE);

export function classifyRelease1(metricKey: string): Release1Classification | null {
  if (VISIBLE_SET.has(metricKey)) return "visible";
  if (HIDDEN_SET.has(metricKey)) return "hidden";
  if (SHOWCASE_SET.has(metricKey)) return "showcase_future";
  return null;
}

export function isRelease1Visible(metricKey: string): boolean {
  return VISIBLE_SET.has(metricKey);
}

export function isRelease1Hidden(metricKey: string): boolean {
  return HIDDEN_SET.has(metricKey);
}

export function isRelease1ShowcaseFuture(metricKey: string): boolean {
  return SHOWCASE_SET.has(metricKey);
}

/**
 * Suppress hitting (BH) end-to-end in Release-1.
 *
 * Flip to `false` once BH measurement gaps (D-OBJECT bat tracking, D-CAL,
 * hitting anchor detectors) close. No code path should hardcode hitting
 * visibility outside of consulting this flag.
 */
export const RELEASE1_HITTING_SUPPRESSED = true;

/**
 * Source signal IDs that map to HIDDEN/SHOWCASE-FUTURE metrics inside UHRC
 * pillar contributions. Used by `buildUhrcReport` to force-mark contributions
 * as `missing: true` instead of fabricating scores from suppressed inputs.
 *
 * The current UHRC `buildReport.ts` uses generic signal IDs (`hitting.P1`...
 * `hie.decision_speed_index`, plus PIE V2 ids). When hitting is suppressed
 * the entire `includeHitting` branch is skipped, so today no individual
 * HIDDEN metric key reaches a UHRC contribution. This set exists so any
 * future contribution that adopts a metric-keyed signal id is automatically
 * suppressed.
 */
export const RELEASE1_HIDDEN_SIGNAL_IDS = new Set<string>([
  ...RELEASE1_HIDDEN_METRICS,
  ...RELEASE1_SHOWCASE_FUTURE,
]);
