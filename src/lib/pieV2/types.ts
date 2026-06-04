/**
 * PIE V2 — Pitching Intelligence Engine V2 (baseball only).
 *
 * Constitutional substrate types. Subordinate to Eternal Laws, Megaphase 151,
 * RR-5/6/8, replay legality, and the demo↔production firewall.
 *
 * See docs/asb/pie-v2-constitution.md.
 */

export const PIE_V2_ENGINE_VERSION = "pie-v2.0.0" as const;

export type PieV2SignalId =
  | "energy_angle"
  | "visual_stability"
  | "separation"
  | "tempo"
  | "stride"
  | "head_stability"
  | "hip_alignment"
  | "front_side"
  | "head_alignment"
  | "shoulder_level"
  | "rear_foot_drag"
  | "extension_consistency"
  | "arm_slot_consistency";

export const PIE_V2_SCORED_SIGNALS: PieV2SignalId[] = [
  "energy_angle",
  "visual_stability",
  "separation",
  "tempo",
  "stride",
  "head_stability",
  "hip_alignment",
  "front_side",
  "head_alignment",
  "shoulder_level",
  "rear_foot_drag",
];

export const PIE_V2_TRACKED_ONLY_SIGNALS: PieV2SignalId[] = [
  "extension_consistency",
  "arm_slot_consistency",
];

export type PieV2SeverityTier = "clean" | "minor" | "major" | "critical";

export type PieV2Provenance =
  | "manual"
  | "video_derived"
  | "sensor_derived";

export type PieV2ConfidenceBasis =
  | "manual_single_rep"
  | "manual_aggregate"
  | "video_frame_range"
  | "video_aggregate"
  | "sensor_calibrated"
  | "sensor_uncalibrated";

export interface PieV2Confidence {
  /** 0..100. Never fabricated. */
  score: number;
  basis: PieV2ConfidenceBasis;
}

export type PieV2MissingnessReason =
  | "not_captured"
  | "not_visible_in_video"
  | "athlete_declined"
  | "sensor_unavailable";

export interface PieV2MissingnessRecord {
  field: string;
  reason: PieV2MissingnessReason;
}

/** Raw rep-level capture input — all fields optional, missingness preserved. */
export interface PieV2RepInput {
  rep_id: string;
  session_id: string;
  athlete_id: string;
  occurred_at: string;
  provenance: PieV2Provenance;

  // Scored signal raw measurements
  energy_angle_deg?: number;
  eyes_on_target?: boolean;
  shoulders_closed_to_footstrike?: boolean;
  leg_lift_to_footstrike_sec?: number;
  stride_pct_body_height?: number;
  head_vertical_drop_pct?: number;
  hips_fired_toward_target?: boolean;
  glove_inside_frame?: boolean;
  head_offset_from_belly_line_deg?: number;
  shoulder_horizontal_offset_deg?: number;
  rear_foot_drag_foot_lengths?: number;
  rear_foot_drag_direction_clean?: boolean;

  // Tracked-only signals
  release_extension_ft?: number;
  arm_slot_deg?: number;

  // Lineage anchors (video-derived)
  video_id?: string;
  video_frame_range?: [number, number];

  // Athlete-reported context (RR-6 / RR-8 — observational)
  athlete_reported_pain?: boolean;

  missingness?: PieV2MissingnessRecord[];
}

export interface PieV2RepScore {
  signal_id: PieV2SignalId;
  /** 0..100; null when missingness suppresses scoring. */
  score: number | null;
  tier: PieV2SeverityTier | null;
  confidence: PieV2Confidence;
  missingness: PieV2MissingnessRecord[];
  provenance: PieV2Provenance;
  engine_version: typeof PIE_V2_ENGINE_VERSION;
  /** Tracked-only signals carry tier=null even when scored. */
  tracked_only: boolean;
}

export interface PieV2SessionSignalAggregate {
  signal_id: PieV2SignalId;
  sample_count: number;
  missing_count: number;
  average: number | null;
  best: number | null;
  worst: number | null;
  variance: number | null;
  consistency: number | null; // 0..100, inverse of variance, null when n<2
  tier: PieV2SeverityTier | null;
  confidence: PieV2Confidence;
  tracked_only: boolean;
  /**
   * Within-session degradation slope. Negative = degrading across reps.
   * Used by fatigue detection. Null when n<3.
   */
  fatigue_slope: number | null;
}

export interface PieV2SessionAggregate {
  session_id: string;
  athlete_id: string;
  computed_at: string;
  engine_version: typeof PIE_V2_ENGINE_VERSION;
  signals: PieV2SessionSignalAggregate[];
  /** Weighted mean over scored signals only. Tracked-only carry zero weight. */
  pie_v2_composite: number | null;
  /** Boolean: athlete reported pain at any point in the session. RR-6 observational. */
  athlete_reported_pain_in_session: boolean;
}
