/**
 * D-5 metric engine for `tempo_sec` — TIMING-BASED.
 *
 *   tempo_sec = (front_foot_strike_frame_index − peak_leg_lift_frame_index) / fps_true
 *
 * Uncertainty: each anchor is located to within one frame, so the delta is
 * uncertain by ±1 frame → ±(1 / fps) seconds (41.7 ms at 24 fps). The value is
 * reported with that range; ordinary phone rates are NOT a reason to refuse.
 * Tolerance: the metric refuses only when the uncertainty is ≥ 50 % of the
 * value (delta under MIN_DELTA_FRAMES) — then the number says nothing.
 *
 * Missingness: when an anchor is absent, the ANCHOR'S OWN missingness record is
 * passed through unchanged (a generic overwrite hid the real D-PLANT cause).
 * The generic reasons are used only when no upstream record is supplied.
 */

import {
  MISSINGNESS_REASONS,
  missingness,
  type MissingnessRecord,
} from "./missingness";
import { uncalibrated, type ConfidenceRecord } from "./confidence";

/** Uncertainty (±1 frame) must stay under half the value. */
export const MIN_DELTA_FRAMES = 2;

export interface TempoSecInputs {
  readonly peak_leg_lift_frame_index: number | null;
  readonly front_foot_strike_frame_index: number | null;
  readonly fps_true: number;
  /** The anchors' own missingness — preserved verbatim when an anchor is absent. */
  readonly peak_leg_lift_missingness?: MissingnessRecord | null;
  readonly front_foot_strike_missingness?: MissingnessRecord | null;
}

export interface TempoSecResult {
  readonly value: number | null;
  readonly unit: "seconds";
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  /** ± seconds (one frame). null when missing. */
  readonly uncertainty_sec: number | null;
  readonly ci_low_sec: number | null;
  readonly ci_high_sec: number | null;
  readonly lineage: {
    readonly peak_leg_lift_frame_index: number | null;
    readonly front_foot_strike_frame_index: number | null;
    readonly fps_true: number;
    readonly delta_frames: number | null;
    /** Which anchor/guard refused, when one did. */
    readonly refused_at?: "peak_leg_lift" | "front_foot_strike" | "fps_unknown" | "strike_not_after_lift" | "uncertainty_exceeds_tolerance";
  };
}

/** Round to 6 decimals so SQL `numeric(12,6)` round-trips byte-identically. */
function roundToSixDecimals(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export function computeTempoSec(inputs: TempoSecInputs): TempoSecResult {
  const { peak_leg_lift_frame_index, front_foot_strike_frame_index, fps_true } = inputs;

  const baseLineage = {
    peak_leg_lift_frame_index,
    front_foot_strike_frame_index,
    fps_true,
    delta_frames: null as number | null,
  };
  const missing = (rec: MissingnessRecord, refused_at: NonNullable<TempoSecResult["lineage"]["refused_at"]>, delta: number | null = null): TempoSecResult => ({
    value: null,
    unit: "seconds",
    missingness: rec,
    confidence: { status: "missing", value: null, certificate_hash: null },
    uncertainty_sec: null,
    ci_low_sec: null,
    ci_high_sec: null,
    lineage: { ...baseLineage, delta_frames: delta, refused_at },
  });

  if (peak_leg_lift_frame_index == null) {
    return missing(inputs.peak_leg_lift_missingness ?? missingness(MISSINGNESS_REASONS.PEAK_LEG_LIFT_MISSING, "D-ANCHOR"), "peak_leg_lift");
  }
  if (front_foot_strike_frame_index == null) {
    return missing(inputs.front_foot_strike_missingness ?? missingness(MISSINGNESS_REASONS.FRONT_FOOT_FIRST_CONTACT_MISSING, "D-ANCHOR"), "front_foot_strike");
  }
  if (!Number.isFinite(fps_true) || fps_true <= 0) {
    // Genuinely no time base (rate unreadable) — not an ordinary-rate refusal.
    return missing(missingness(MISSINGNESS_REASONS.INSUFFICIENT_TEMPORAL_RESOLUTION, "D-METRIC"), "fps_unknown");
  }

  const delta = front_foot_strike_frame_index - peak_leg_lift_frame_index;
  if (!Number.isInteger(delta) || delta <= 0) {
    return missing(missingness(MISSINGNESS_REASONS.ANCHOR_NOT_DETECTED, "D-METRIC"), "strike_not_after_lift", delta);
  }
  if (delta < MIN_DELTA_FRAMES) {
    return missing(missingness(MISSINGNESS_REASONS.INSUFFICIENT_TEMPORAL_RESOLUTION, "D-METRIC"), "uncertainty_exceeds_tolerance", delta);
  }

  const value = roundToSixDecimals(delta / fps_true);
  const u = roundToSixDecimals(1 / fps_true);

  return {
    value,
    unit: "seconds",
    missingness: null,
    confidence: uncalibrated(),
    uncertainty_sec: u,
    ci_low_sec: roundToSixDecimals(value - u),
    ci_high_sec: roundToSixDecimals(value + u),
    lineage: { ...baseLineage, delta_frames: delta },
  };
}
