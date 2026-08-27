/**
 * Guarded `shoulder_tilt_deg` — the two preconditions the MediaPipe
 * validation report said must exist before that tile is even a candidate to
 * flip over.
 *
 *   Guard 1 — stability under a 1-frame shift.
 *     The validation run showed the raw geometry is sound but sensitive to
 *     which frame is called "release". Re-measure on the neighbouring frame;
 *     if the two readings disagree by more than the tolerance, the release
 *     anchor is not resolving the motion and the reading is not reported.
 *     Missing with a reason, never a number.
 *
 *   Guard 2 — live pitch, not a dry drill.
 *     MediaPipe happily measures a towel drill. `evaluateLivePitchGate`
 *     requires ball-in-flight evidence from the existing detection pipeline
 *     before any value is released.
 *
 * Both guards can only remove a value, never create one. Canonical
 * missingness reasons are unchanged (no new reasons invented); the specific
 * guard that blocked is carried in `guard`/`lineage` for lineage visibility.
 *
 * NOT LIVE. `MEDIAPIPE_SHOULDER_TILT_ENABLED` still gates the swap, and this
 * module is read by nothing on the athlete path.
 */

import {
  MISSINGNESS_REASONS,
  missingness,
  type MissingnessRecord,
} from "./missingness";
import { missingConfidence, type ConfidenceRecord } from "./confidence";
import {
  computeShoulderTiltDeg,
  type ShoulderTiltLandmark,
  type ShoulderTiltResult,
} from "./shoulderTiltDeg";
import {
  evaluateLivePitchGate,
  type LivePitchGateResult,
} from "../gates/livePitchGate";
import type { BallDetectionFrame } from "@/lib/cv/ball/types";

/**
 * Max allowed disagreement, in degrees, between the release frame and its
 * 1-frame neighbour. Starting estimate from the validation data — tune with
 * more sessions before any flip, it is not a settled constant.
 */
export const SHOULDER_TILT_STABILITY_TOLERANCE_DEG = 5;

export type ShoulderTiltGuard =
  | "stability_1_frame_shift"
  | "live_pitch_gate";

export interface GuardedShoulderTiltInputs {
  /** Landmarks at the release frame. */
  readonly landmarks: readonly ShoulderTiltLandmark[];
  /**
   * Landmarks at release ± 1 frame, for the stability re-check. Null means the
   * neighbour frame has no pose — the guard cannot be satisfied, so no value.
   */
  readonly shifted_landmarks: readonly ShoulderTiltLandmark[] | null;
  /** Which neighbour was used (release_frame_index + shift). Lineage only. */
  readonly shift_frames: 1 | -1;
  readonly release_frame_index: number | null;
  readonly frame_width: number;
  readonly frame_height: number;
  /** Ball detection frames from the pitch-velocity pipeline. */
  readonly detectionFrames: readonly BallDetectionFrame[];
  readonly stability_tolerance_deg?: number;
}

export interface GuardedShoulderTiltResult {
  readonly value: number | null;
  readonly unit: "degrees";
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  /** Which guard blocked the value, when one did. */
  readonly guard: ShoulderTiltGuard | null;
  readonly guard_detail: string | null;
  readonly lineage: {
    readonly base: ShoulderTiltResult["lineage"];
    readonly primary_value: number | null;
    readonly shifted_value: number | null;
    readonly shift_frames: 1 | -1;
    readonly delta_deg: number | null;
    readonly stability_tolerance_deg: number;
    readonly live_pitch: LivePitchGateResult;
  };
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export function computeGuardedShoulderTiltDeg(
  inputs: GuardedShoulderTiltInputs,
): GuardedShoulderTiltResult {
  const {
    landmarks,
    shifted_landmarks,
    shift_frames,
    release_frame_index,
    frame_width,
    frame_height,
    detectionFrames,
    stability_tolerance_deg = SHOULDER_TILT_STABILITY_TOLERANCE_DEG,
  } = inputs;

  const primary = computeShoulderTiltDeg({
    landmarks,
    release_frame_index,
    frame_width,
    frame_height,
  });

  const livePitch = evaluateLivePitchGate({
    detectionFrames,
    release_frame_index,
  });

  const build = (
    over: Partial<GuardedShoulderTiltResult> & {
      shifted_value?: number | null;
      delta_deg?: number | null;
    },
  ): GuardedShoulderTiltResult => ({
    value: over.value ?? null,
    unit: "degrees",
    missingness: over.missingness ?? null,
    confidence: over.confidence ?? missingConfidence(),
    guard: over.guard ?? null,
    guard_detail: over.guard_detail ?? null,
    lineage: {
      base: primary.lineage,
      primary_value: primary.value,
      shifted_value: over.shifted_value ?? null,
      shift_frames,
      delta_deg: over.delta_deg ?? null,
      stability_tolerance_deg: stability_tolerance_deg,
      live_pitch: livePitch,
    },
  });

  // Base measurement already missing → pass its reason through untouched.
  if (primary.value == null) {
    return build({
      missingness: primary.missingness,
      confidence: primary.confidence,
    });
  }

  // Guard 2 first: a drill clip should never even be described as unstable.
  if (livePitch.verdict !== "live_pitch") {
    return build({
      missingness: missingness(
        MISSINGNESS_REASONS.BALL_NOT_DETECTED,
        "D-METRIC",
      ),
      guard: "live_pitch_gate",
      guard_detail:
        livePitch.verdict === "not_a_pitch"
          ? `no live pitch in clip (${livePitch.reason}) — dry/towel drill reps are not measured`
          : `cannot confirm a live pitch (${livePitch.reason}) — measurement withheld`,
    });
  }

  // Guard 1: 1-frame-shift re-check.
  if (!shifted_landmarks) {
    return build({
      missingness: missingness(
        MISSINGNESS_REASONS.INSUFFICIENT_TEMPORAL_RESOLUTION,
        "D-METRIC",
      ),
      guard: "stability_1_frame_shift",
      guard_detail:
        "no pose on the neighbouring frame — stability of the release anchor could not be checked",
    });
  }

  const shifted = computeShoulderTiltDeg({
    landmarks: shifted_landmarks,
    release_frame_index:
      release_frame_index == null ? null : release_frame_index + shift_frames,
    frame_width,
    frame_height,
  });

  if (shifted.value == null) {
    return build({
      missingness: missingness(
        MISSINGNESS_REASONS.INSUFFICIENT_TEMPORAL_RESOLUTION,
        "D-METRIC",
      ),
      guard: "stability_1_frame_shift",
      guard_detail: `neighbouring frame unmeasurable (${shifted.missingness?.missing_reason ?? "unknown"}) — stability could not be checked`,
    });
  }

  const delta = round6(Math.abs(primary.value - shifted.value));

  if (delta > stability_tolerance_deg) {
    return build({
      shifted_value: shifted.value,
      delta_deg: delta,
      missingness: missingness(
        MISSINGNESS_REASONS.INSUFFICIENT_TEMPORAL_RESOLUTION,
        "D-METRIC",
      ),
      guard: "stability_1_frame_shift",
      guard_detail: `tilt moved ${delta.toFixed(2)}° across a single frame (tolerance ${stability_tolerance_deg}°) — release anchor is not resolving the motion`,
    });
  }

  return build({
    value: primary.value,
    shifted_value: shifted.value,
    delta_deg: delta,
    missingness: null,
    confidence: primary.confidence,
  });
}
