/**
 * Guarded `head_vertical_movement_pct` — same two preconditions as the guarded
 * shoulder tilt, run through the shared core in `./metricGuards.ts`:
 *
 *   Guard 1 — stability under a 1-frame shift. For a window metric the shift
 *     is applied to the whole setup→release window, which is the direct
 *     analogue of shifting a single anchor: if a one-frame change to where the
 *     delivery is said to start and end moves the answer more than tolerance,
 *     the window is not resolving the delivery.
 *   Guard 2 — live pitch, not a dry/towel drill (ball-in-flight evidence).
 *
 * Guards can only remove a value, never create one. No new missingness
 * reasons; the blocking guard is carried in `guard` / `guard_detail`.
 *
 * NOT LIVE. `MEDIAPIPE_HEAD_MOVEMENT_ENABLED` is false and the metric is
 * hidden in Release-1.
 */

import type { MissingnessRecord } from "./missingness";
import { missingConfidence, type ConfidenceRecord } from "./confidence";
import {
  computeHeadVerticalMovementPct,
  type HeadMovementFrame,
  type HeadMovementResult,
} from "./headVerticalMovementPct";
import { evaluateMetricGuards, type MetricGuard } from "./metricGuards";
import type { LivePitchGateResult } from "../gates/livePitchGate";
import type { BallDetectionFrame } from "@/lib/cv/ball/types";

/**
 * Max allowed disagreement, in percentage points, between the window and the
 * 1-frame-shifted window. Provisional — set from the validation distribution.
 */
export const HEAD_MOVEMENT_STABILITY_TOLERANCE_PCT = 1;

export interface GuardedHeadMovementInputs {
  readonly frames: readonly HeadMovementFrame[];
  readonly start_frame_index: number | null;
  readonly release_frame_index: number | null;
  readonly shift_frames: 1 | -1;
  readonly frame_height: number;
  readonly detectionFrames: readonly BallDetectionFrame[];
  readonly stability_tolerance_pct?: number;
}

export interface GuardedHeadMovementResult {
  readonly value: number | null;
  readonly unit: "percent";
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly guard: MetricGuard | null;
  readonly guard_detail: string | null;
  readonly lineage: {
    readonly base: HeadMovementResult["lineage"];
    readonly primary_value: number | null;
    readonly shifted_value: number | null;
    readonly shift_frames: 1 | -1;
    readonly delta_pct: number | null;
    readonly stability_tolerance_pct: number;
    readonly live_pitch: LivePitchGateResult;
  };
}

export function computeGuardedHeadVerticalMovementPct(
  inputs: GuardedHeadMovementInputs,
): GuardedHeadMovementResult {
  const {
    frames,
    start_frame_index,
    release_frame_index,
    shift_frames,
    frame_height,
    detectionFrames,
    stability_tolerance_pct = HEAD_MOVEMENT_STABILITY_TOLERANCE_PCT,
  } = inputs;

  const primary = computeHeadVerticalMovementPct({
    frames,
    start_frame_index,
    release_frame_index,
    frame_height,
  });

  const shifted = computeHeadVerticalMovementPct({
    frames,
    start_frame_index:
      start_frame_index == null ? null : start_frame_index + shift_frames,
    release_frame_index:
      release_frame_index == null ? null : release_frame_index + shift_frames,
    frame_height,
  });

  const outcome = evaluateMetricGuards({
    primary,
    shifted,
    detectionFrames,
    release_frame_index,
    tolerance: stability_tolerance_pct,
    tolerance_unit: " pts",
    metric_label: "head movement",
    anchor_label: "setup→release window",
  });

  const build = (
    over: Partial<GuardedHeadMovementResult>,
  ): GuardedHeadMovementResult => ({
    value: over.value ?? null,
    unit: "percent",
    missingness: over.missingness ?? null,
    confidence: over.confidence ?? missingConfidence(),
    guard: over.guard ?? null,
    guard_detail: over.guard_detail ?? null,
    lineage: {
      base: primary.lineage,
      primary_value: primary.value,
      shifted_value: outcome.shifted_value,
      shift_frames,
      delta_pct: outcome.delta,
      stability_tolerance_pct,
      live_pitch: outcome.live_pitch,
    },
  });

  if (primary.value == null) {
    return build({
      missingness: primary.missingness,
      confidence: primary.confidence,
    });
  }

  if (outcome.block) {
    return build({
      missingness: outcome.block.missingness,
      guard: outcome.block.guard,
      guard_detail: outcome.block.guard_detail,
    });
  }

  return build({
    value: primary.value,
    missingness: null,
    confidence: primary.confidence,
  });
}
