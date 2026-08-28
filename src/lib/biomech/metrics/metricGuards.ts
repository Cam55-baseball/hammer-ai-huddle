/**
 * Shared pre-flip guard core.
 *
 * `shoulderTiltGuarded.ts` established the two guards the MediaPipe validation
 * report required before any geometry metric can be a candidate to go live:
 *
 *   Guard 1 — stability under a 1-frame shift. Re-measure with the anchor (or
 *     window) moved one frame; if the readings disagree by more than the
 *     metric's tolerance, the anchor is not resolving the motion and no number
 *     is reported.
 *   Guard 2 — live pitch, not a dry drill. Pose geometry measures a towel
 *     drill just as happily as a pitch, so ball-in-flight evidence from the
 *     detection pipeline is required before any value is released.
 *
 * This module is that logic, extracted verbatim in behaviour so
 * `energyAngleGuarded.ts` and `headVerticalMovementGuarded.ts` reuse it rather
 * than re-implementing it. Guards can only remove a value, never create one,
 * and no new missingness reasons are introduced — the canonical set is
 * unchanged and the blocking guard is carried in `guard` / `guard_detail`.
 *
 * Ordering is fixed and load-bearing: the live-pitch gate is evaluated before
 * the stability check, so a drill clip is never described as "unstable".
 */

import {
  MISSINGNESS_REASONS,
  missingness,
  type MissingnessRecord,
} from "./missingness";
import {
  evaluateLivePitchGate,
  type LivePitchGateResult,
} from "../gates/livePitchGate";
import type { BallDetectionFrame } from "@/lib/cv/ball/types";

export type MetricGuard = "stability_1_frame_shift" | "live_pitch_gate";

/** The shape every guarded metric's underlying pure measurement satisfies. */
export interface GuardableMeasurement {
  readonly value: number | null;
  readonly missingness: MissingnessRecord | null;
}

export interface MetricGuardBlock {
  readonly missingness: MissingnessRecord;
  readonly guard: MetricGuard;
  readonly guard_detail: string;
}

export interface MetricGuardInputs {
  readonly primary: GuardableMeasurement;
  /**
   * Same measurement recomputed one frame away. `null` means the neighbour
   * could not be measured at all (no pose / no frame) — that is a withhold,
   * never an assumed pass.
   */
  readonly shifted: GuardableMeasurement | null;
  readonly detectionFrames: readonly BallDetectionFrame[];
  readonly release_frame_index: number | null;
  readonly tolerance: number;
  /** Unit suffix used in the human-readable guard detail, e.g. "°" or " pts". */
  readonly tolerance_unit: string;
  /** Metric noun used in the guard detail, e.g. "tilt", "energy angle". */
  readonly metric_label: string;
  /** Anchor noun used in the guard detail, e.g. "release anchor". */
  readonly anchor_label?: string;
}

export interface MetricGuardOutcome {
  readonly block: MetricGuardBlock | null;
  readonly shifted_value: number | null;
  readonly delta: number | null;
  readonly live_pitch: LivePitchGateResult;
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

/**
 * Pure. Returns the blocking guard, if any, plus the stability lineage the
 * caller records. A `null` block means both guards passed and the caller may
 * release `primary.value`.
 */
export function evaluateMetricGuards(
  inputs: MetricGuardInputs,
): MetricGuardOutcome {
  const {
    primary,
    shifted,
    detectionFrames,
    release_frame_index,
    tolerance,
    tolerance_unit,
    metric_label,
    anchor_label = "anchor",
  } = inputs;

  const live_pitch = evaluateLivePitchGate({
    detectionFrames,
    release_frame_index,
  });

  // Guard 2 first: a drill clip should never be described as unstable.
  if (live_pitch.verdict !== "live_pitch") {
    return {
      block: {
        missingness: missingness(
          MISSINGNESS_REASONS.BALL_NOT_DETECTED,
          "D-METRIC",
        ),
        guard: "live_pitch_gate",
        guard_detail:
          live_pitch.verdict === "not_a_pitch"
            ? `no live pitch in clip (${live_pitch.reason}) — dry/towel drill reps are not measured`
            : `cannot confirm a live pitch (${live_pitch.reason}) — measurement withheld`,
      },
      shifted_value: null,
      delta: null,
      live_pitch,
    };
  }

  // Guard 1: 1-frame-shift re-check.
  if (!shifted) {
    return {
      block: {
        missingness: missingness(
          MISSINGNESS_REASONS.INSUFFICIENT_TEMPORAL_RESOLUTION,
          "D-METRIC",
        ),
        guard: "stability_1_frame_shift",
        guard_detail:
          `no pose on the neighbouring frame — stability of the ${anchor_label} could not be checked`,
      },
      shifted_value: null,
      delta: null,
      live_pitch,
    };
  }

  if (shifted.value == null) {
    return {
      block: {
        missingness: missingness(
          MISSINGNESS_REASONS.INSUFFICIENT_TEMPORAL_RESOLUTION,
          "D-METRIC",
        ),
        guard: "stability_1_frame_shift",
        guard_detail: `neighbouring frame unmeasurable (${shifted.missingness?.missing_reason ?? "unknown"}) — stability could not be checked`,
      },
      shifted_value: null,
      delta: null,
      live_pitch,
    };
  }

  if (primary.value == null) {
    // Caller is responsible for handling base missingness before calling.
    return {
      block: {
        missingness:
          primary.missingness ??
          missingness(MISSINGNESS_REASONS.POSE_NOT_DETECTED, "D-METRIC"),
        guard: "stability_1_frame_shift",
        guard_detail: "no primary measurement to stabilise",
      },
      shifted_value: shifted.value,
      delta: null,
      live_pitch,
    };
  }

  const delta = round6(Math.abs(primary.value - shifted.value));

  if (delta > tolerance) {
    return {
      block: {
        missingness: missingness(
          MISSINGNESS_REASONS.INSUFFICIENT_TEMPORAL_RESOLUTION,
          "D-METRIC",
        ),
        guard: "stability_1_frame_shift",
        guard_detail: `${metric_label} moved ${delta.toFixed(2)}${tolerance_unit} across a single frame (tolerance ${tolerance}${tolerance_unit}) — ${anchor_label} is not resolving the motion`,
      },
      shifted_value: shifted.value,
      delta,
      live_pitch,
    };
  }

  return { block: null, shifted_value: shifted.value, delta, live_pitch };
}
