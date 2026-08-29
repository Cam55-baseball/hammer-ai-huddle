/**
 * Generic guarded-metric runner (PIECE A7).
 *
 * `metricGuards.ts` already held the two guard *rules* shared by the pitching
 * tiles, but every tile still hand-wrote the same 60 lines of "measure primary,
 * measure the neighbour frame, call the guards, assemble the result". That made
 * the guards easy to forget on a new tile — exactly the failure mode the
 * validation report warned about.
 *
 * This module turns that boilerplate into one reusable function. Any mechanics
 * tile — pitching or hitting, angle or boolean — can be measured through it by
 * supplying:
 *
 *   - `measure(landmarks, frameIndex)` — the pure geometry, unchanged
 *   - `anchor_frame_index` — whichever anchor that tile is defined at
 *   - `landmarksAt(frameIndex)` — a lookup into the pose rows
 *   - `tolerance` — the metric's own stability tolerance, in its own unit
 *
 * The two guards are then unavoidable rather than opt-in:
 *   Guard 1 — stability under a 1-frame shift of the anchor.
 *   Guard 2 — live rep, not a dry drill (ball evidence from the detector).
 *
 * Guard 2 is deliberately not pitch-specific. A hitting mechanics tile run on a
 * dry-swing / tee-less mirror rep is the same failure as a towel drill on the
 * pitching side: the geometry answers confidently about nothing. The underlying
 * evidence (a ball moving through the frame) is identical, so the same gate is
 * used and only the wording changes via `rep_label`.
 *
 * Guards can only remove a value, never create one, and no new missingness
 * reasons are introduced.
 */

import type { MissingnessRecord } from "./missingness";
import { missingConfidence, type ConfidenceRecord } from "./confidence";
import {
  evaluateMetricGuards,
  type MetricGuard,
  type GuardableMeasurement,
} from "./metricGuards";
import type { LivePitchGateResult } from "../gates/livePitchGate";
import type { BallDetectionFrame } from "@/lib/cv/ball/types";

/** Minimal landmark shape every mechanics geometry module accepts. */
export interface PoseLandmark {
  readonly x: number;
  readonly y: number;
  readonly visibility: number;
}

/** What a pure geometry module must return for the runner to guard it. */
export interface GuardableMetricResult<TLineage = unknown>
  extends GuardableMeasurement {
  readonly confidence: ConfidenceRecord;
  readonly lineage: TLineage;
}

export interface RunGuardedMetricInputs<TLineage> {
  /** Pure measurement, run once at the anchor and once one frame away. */
  readonly measure: (
    landmarks: readonly PoseLandmark[],
    anchorFrameIndex: number | null,
  ) => GuardableMetricResult<TLineage>;
  /** Pose landmarks at a given frame; null when that frame has no pose. */
  readonly landmarksAt: (
    frameIndex: number | null,
  ) => readonly PoseLandmark[] | null;
  /** The frame this tile is defined at (release, contact, landing, …). */
  readonly anchor_frame_index: number | null;
  /**
   * Frame the live-rep window centres on. Usually release (pitching) or
   * contact (hitting). Null widens the window to the whole clip.
   */
  readonly rep_frame_index: number | null;
  readonly detectionFrames: readonly BallDetectionFrame[];
  readonly shift_frames?: 1 | -1;
  readonly tolerance: number;
  readonly tolerance_unit: string;
  readonly metric_label: string;
  readonly anchor_label?: string;
}

export interface GuardedMetricResult<TLineage> {
  readonly value: number | null;
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly guard: MetricGuard | null;
  readonly guard_detail: string | null;
  readonly lineage: {
    readonly base: TLineage;
    readonly primary_value: number | null;
    readonly shifted_value: number | null;
    readonly shift_frames: 1 | -1;
    readonly delta: number | null;
    readonly stability_tolerance: number;
    readonly anchor_frame_index: number | null;
    readonly neighbour_frame_index: number | null;
    readonly live_pitch: LivePitchGateResult;
  };
}

export function runGuardedMetric<TLineage>(
  inputs: RunGuardedMetricInputs<TLineage>,
): GuardedMetricResult<TLineage> {
  const {
    measure,
    landmarksAt,
    anchor_frame_index,
    rep_frame_index,
    detectionFrames,
    shift_frames = 1,
    tolerance,
    tolerance_unit,
    metric_label,
    anchor_label = "anchor",
  } = inputs;

  const neighbour_frame_index =
    anchor_frame_index == null ? null : anchor_frame_index + shift_frames;

  const primary = measure(landmarksAt(anchor_frame_index) ?? [], anchor_frame_index);

  const shiftedLandmarks = landmarksAt(neighbour_frame_index);
  const shifted = shiftedLandmarks
    ? measure(shiftedLandmarks, neighbour_frame_index)
    : null;

  const outcome = evaluateMetricGuards({
    primary,
    shifted,
    detectionFrames,
    release_frame_index: rep_frame_index,
    tolerance,
    tolerance_unit,
    metric_label,
    anchor_label,
  });

  const build = (
    over: Partial<Omit<GuardedMetricResult<TLineage>, "lineage">>,
  ): GuardedMetricResult<TLineage> => ({
    value: over.value ?? null,
    missingness: over.missingness ?? null,
    confidence: over.confidence ?? missingConfidence(),
    guard: over.guard ?? null,
    guard_detail: over.guard_detail ?? null,
    lineage: {
      base: primary.lineage,
      primary_value: primary.value,
      shifted_value: outcome.shifted_value,
      shift_frames,
      delta: outcome.delta,
      stability_tolerance: tolerance,
      anchor_frame_index,
      neighbour_frame_index,
      live_pitch: outcome.live_pitch,
    },
  });

  // Base measurement already missing → pass its reason through untouched.
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

/**
 * Boolean mechanics tiles (`*_pass`) are measured as 1 / 0 so the same
 * stability guard applies unchanged: a pass that flips to a fail one frame
 * later is not a reading, it is an unresolved anchor. Tolerance 0 means the
 * two frames must agree exactly.
 */
export const BOOLEAN_PASS_TOLERANCE = 0;

export function passFromValue(value: number | null): boolean | null {
  if (value == null) return null;
  return value >= 0.5;
}
