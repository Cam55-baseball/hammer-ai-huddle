/**
 * Phase 26 — D-5 metric engine for `tempo_sec` (Baseball Pitching tile).
 *
 * Definition (per `src/lib/reportCard/contracts/bp.contract.ts` and the
 * `back-elbow-methodology.md` / canonical methodology pattern):
 *
 *   tempo_sec = (front_foot_strike_frame_index − peak_leg_lift_frame_index) / fps_true
 *
 * Pure deterministic function. Same inputs → byte-identical output. Emits
 * canonical missingness when any antecedent anchor is absent. Never
 * fabricates a value. Confidence emission lives in `./confidence.ts`.
 */

import {
  MISSINGNESS_REASONS,
  missingness,
  type MissingnessRecord,
} from "./missingness";
import { uncalibrated, type ConfidenceRecord } from "./confidence";

export interface TempoSecInputs {
  readonly peak_leg_lift_frame_index: number | null;
  readonly front_foot_strike_frame_index: number | null;
  readonly fps_true: number;
}

export interface TempoSecResult {
  readonly value: number | null;
  readonly unit: "seconds";
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly lineage: {
    readonly peak_leg_lift_frame_index: number | null;
    readonly front_foot_strike_frame_index: number | null;
    readonly fps_true: number;
    readonly delta_frames: number | null;
  };
}

/** Round to 6 decimals so SQL `numeric(12,6)` round-trips byte-identically. */
function roundToSixDecimals(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export function computeTempoSec(inputs: TempoSecInputs): TempoSecResult {
  const { peak_leg_lift_frame_index, front_foot_strike_frame_index, fps_true } =
    inputs;

  const baseLineage = {
    peak_leg_lift_frame_index,
    front_foot_strike_frame_index,
    fps_true,
    delta_frames: null as number | null,
  };

  if (peak_leg_lift_frame_index == null) {
    return {
      value: null,
      unit: "seconds",
      missingness: missingness(
        MISSINGNESS_REASONS.PEAK_LEG_LIFT_MISSING,
        "D-ANCHOR",
      ),
      confidence: { status: "missing", value: null, certificate_hash: null },
      lineage: baseLineage,
    };
  }
  if (front_foot_strike_frame_index == null) {
    return {
      value: null,
      unit: "seconds",
      missingness: missingness(
        MISSINGNESS_REASONS.FRONT_FOOT_FIRST_CONTACT_MISSING,
        "D-ANCHOR",
      ),
      confidence: { status: "missing", value: null, certificate_hash: null },
      lineage: baseLineage,
    };
  }
  if (!Number.isFinite(fps_true) || fps_true <= 0) {
    return {
      value: null,
      unit: "seconds",
      missingness: missingness(
        MISSINGNESS_REASONS.INSUFFICIENT_TEMPORAL_RESOLUTION,
        "D-METRIC",
      ),
      confidence: { status: "missing", value: null, certificate_hash: null },
      lineage: baseLineage,
    };
  }

  const delta = front_foot_strike_frame_index - peak_leg_lift_frame_index;
  // A non-positive delta is structurally impossible (strike after lift); emit
  // missingness rather than a negative or zero "tempo".
  if (!Number.isInteger(delta) || delta <= 0) {
    return {
      value: null,
      unit: "seconds",
      missingness: missingness(
        MISSINGNESS_REASONS.PEAK_LEG_LIFT_MISSING,
        "D-METRIC",
      ),
      confidence: { status: "missing", value: null, certificate_hash: null },
      lineage: { ...baseLineage, delta_frames: delta },
    };
  }

  const value = roundToSixDecimals(delta / fps_true);

  return {
    value,
    unit: "seconds",
    missingness: null,
    confidence: uncalibrated(),
    lineage: { ...baseLineage, delta_frames: delta },
  };
}
