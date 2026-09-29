/** Position-player overhand throwing measurements, never inferred from a hitting clip.
 * Shares pitching's calibrated measurements where their landmarks and windows
 * really match; a throwing move is not silently passed through a mound gate.
 */
import type { LandmarkSeries } from "../pose/landmarkSeriesFormat";
import type { Handedness } from "../side/strideSide";
import { deriveDirectionSign, frontAnkleIndex, rearAnkleIndex } from "../side/strideSide";
import { point, median, bodyScale, round4, LM } from "../anchors/poseKinematics";
import { detectStanceLock } from "../anchors/stanceLock";
import { buildSegmentValidity, maskUntrusted } from "../validity/segmentValidity";
import { frontFootPlantFromSeries } from "./hittingOwnerTiles";
import { detectReleasePoseOnly, detectFirstMove } from "../anchors/poseEvents";
import { evaluateMovementGate } from "../gates/movementGate";
import { computeTempoSec } from "./tempoSec";
import { energyAt, computePrematureShoulderOpen, computeHeadVerticalMovement, type PitchingDelivery } from "./pitchingTiles";
import { detectCameraView, checkCameraRequirement } from "../camera/cameraView";
import { MISSINGNESS_REASONS as R, missingness } from "./missingness";

export const THROWING_TILES_VERSION = "throwing_tiles@1.0.0-conservative-shuffle-crow-hop";
export type MovementPattern = "shuffle" | "crow_hop_or_walk_through" | "undetermined";
export interface ThrowingMeasurement {
  value: number | null;
  unit: string;
  verdict: "pass" | "fail" | null;
  missing_reason: string | null;
  lineage: Record<string, unknown>;
}
const absent = (unit: string, reason: string, lineage: Record<string, unknown> = {}): ThrowingMeasurement =>
  ({ value: null, unit, verdict: null, missing_reason: reason, lineage });

/** Pattern evidence is independent of the energy-angle measurement.
 * Sideways shuffle: the back foot stays behind the target-side front foot
 * through plant. A back foot crossing the front foot or following it forward
 * is a forward transfer, not a sideways shuffle. Ambiguity refuses the tile.
 * The conservative separation floor is the largest of measured still-foot
 * noise and the existing ankle separation used by the side detector.
 */
export function classifyThrowingPattern(s: LandmarkSeries, side: Handedness | null, liftFrame: number | null, plantFrame: number | null) {
  const base = { pattern: "undetermined" as MovementPattern, reason: "movement_anchors_unavailable", lineage: {} as Record<string, unknown> };
  if (!side || liftFrame == null || plantFrame == null || liftFrame >= plantFrame) return base;
  const lock = detectStanceLock(s, { before_frame: liftFrame });
  const scale = bodyScale(s), dir = deriveDirectionSign(s, side);
  if (!lock.ok || scale == null || dir == null) return { ...base, reason: "stance_or_target_direction_unavailable" };
  const masked = maskUntrusted(s, buildSegmentValidity(s, lock));
  const fi = frontAnkleIndex(side), ri = rearAnkleIndex(side);
  const at = (k: number) => {
    const f = masked.frames[k], rear = f && point(f, ri), front = f && point(f, fi);
    return rear && front ? { rear: rear.x * dir / scale, front: front.x * dir / scale } : null;
  };
  const baseRear = median(Array.from({ length: (lock.end_k ?? 0) - (lock.start_k ?? 0) + 1 }, (_, i) => at((lock.start_k ?? 0) + i)?.rear ?? null).filter((n): n is number => n != null));
  const plantK = masked.frames.findIndex((f) => f.frame_index === plantFrame);
  if (baseRear == null || plantK < 0) return { ...base, reason: "feet_unobserved" };
  const window = Array.from({ length: plantK - (lock.end_k ?? plantK) }, (_, i) => at((lock.end_k ?? plantK) + i + 1));
  const observed = window.filter((p): p is { rear: number; front: number } => p != null);
  if (observed.length < 3 || observed.length / Math.max(1, window.length) < 0.8) return { ...base, reason: "foot_track_incomplete" };
  // This floor is an uncertainty bound, not a coaching threshold. If a real
  // throw is near it, classification stays unknown rather than forcing shuffle.
  const stillNoise = median(Array.from({ length: (lock.end_k ?? 0) - (lock.start_k ?? 0) + 1 }, (_, i) => at((lock.start_k ?? 0) + i)?.rear ?? null).filter((n): n is number => n != null).map((v) => Math.abs(v - baseRear))) ?? 0;
  const floor = Math.max(0.02 / scale, stillNoise * 3);
  const rearTravel = (median(observed.slice(-3).map((v) => v.rear)) ?? baseRear) - baseRear;
  const crossed = observed.some((v) => v.rear > v.front + floor);
  const plant = observed[observed.length - 1];
  const separation = plant.front - plant.rear;
  const lineage = { rear_travel_body_scales: round4(rearTravel), separation_body_scales: round4(separation), uncertainty_floor_body_scales: round4(floor), crossed, coverage: round4(observed.length / window.length) };
  if (crossed || rearTravel > floor * 3) return { pattern: "crow_hop_or_walk_through" as MovementPattern, reason: "rear_foot_transferred_forward", lineage };
  if (rearTravel <= floor && separation > floor * 2) return { pattern: "shuffle" as MovementPattern, reason: "rear_foot_stayed_behind", lineage };
  return { pattern: "undetermined" as MovementPattern, reason: "pattern_signals_ambiguous", lineage };
}

export function runThrowingTiles(series: LandmarkSeries, side: Handedness | null) {
  const missing = (reason: string) => ({
    tempo: absent("seconds", reason), energy_angle: absent("degrees", reason),
    shoulder_opening: absent("degrees", reason), head_stability: absent("percent", reason),
  });
  const movement = evaluateMovementGate(series);
  const refusal = movement.status === "refused" ? "pose_not_detected" : !side ? "anchor_not_detected" : null;
  if (refusal || !side) return { version: THROWING_TILES_VERSION, pattern: "undetermined" as MovementPattern, pattern_evidence: null, ...missing(refusal ?? "anchor_not_detected") };
  const anchors = frontFootPlantFromSeries(series, side);
  const release = detectReleasePoseOnly(series, { throwing_side: side === "R" ? "right" : "left" });
  const pattern = classifyThrowingPattern(series, side, anchors.lift.frame_index, anchors.plant.frame_index);
  const time = computeTempoSec({ peak_leg_lift_frame_index: anchors.lift.frame_index, front_foot_strike_frame_index: anchors.plant.frame_index,
    fps_true: series.header.fps_true ?? 0, peak_leg_lift_missingness: anchors.lift.missingness, front_foot_strike_missingness: anchors.plant.missingness });
  const tempo: ThrowingMeasurement = time.value == null ? absent("seconds", time.missingness?.missing_reason ?? R.ANCHOR_NOT_DETECTED, { tempo: time.lineage })
    : { value: time.value, unit: "seconds", verdict: null, missing_reason: null, lineage: { ...time.lineage, uncertainty_sec: time.uncertainty_sec, standard: "ungraded_no_throwing_threshold" } };
  const allMissing = { version: THROWING_TILES_VERSION, pattern: pattern.pattern, pattern_evidence: pattern, tempo,
    energy_angle: absent("degrees", R.ANCHOR_NOT_DETECTED, { pattern: pattern.reason }),
    shoulder_opening: absent("degrees", R.ANCHOR_NOT_DETECTED), head_stability: absent("percent", R.ANCHOR_NOT_DETECTED) };
  const plantFrame = anchors.plant.frame_index, liftFrame = anchors.lift.frame_index, releaseFrame = release.frame_index;
  if (plantFrame == null || releaseFrame == null || releaseFrame < plantFrame || !series.header.fps_true || (releaseFrame - plantFrame) / series.header.fps_true > 0.35)
    return { ...allMissing, energy_angle: absent("degrees", R.PITCHER_RELEASE_FRAME_MISSING, { pattern: pattern.reason }), shoulder_opening: absent("degrees", R.PITCHER_RELEASE_FRAME_MISSING), head_stability: absent("percent", R.PITCHER_RELEASE_FRAME_MISSING) };
  const rk = series.frames.findIndex((f) => f.frame_index === releaseFrame), pk = series.frames.findIndex((f) => f.frame_index === plantFrame);
  const wrist = point(series.frames[rk], side === "R" ? LM.R_WRIST : LM.L_WRIST), shoulder = point(series.frames[rk], side === "R" ? LM.R_SHOULDER : LM.L_SHOULDER);
  if (!wrist || !shoulder || wrist.y >= shoulder.y) return allMissing; // overhand only
  const lk = series.frames.findIndex((f) => f.frame_index === liftFrame);
  const dir = deriveDirectionSign(series, side);
  const lock = liftFrame == null ? null : detectStanceLock(series, { before_frame: liftFrame });
  const view = detectCameraView(series).view;
  let energy = allMissing.energy_angle;
  if (pattern.pattern === "shuffle" && lk >= 0 && dir != null && checkCameraRequirement("energy_angle_deg", view).ok) {
    const val = energyAt(series, series.frames[lk], side, dir);
    const neighbors = [energyAt(series, series.frames[lk - 1], side, dir), energyAt(series, series.frames[lk + 1], side, dir)].filter((v): v is number => v != null);
    if (val != null && neighbors.length && Math.max(...neighbors.map((v) => Math.abs(v - val))) <= 5)
      energy = { value: round4(val), unit: "degrees", verdict: null, missing_reason: null, lineage: { movement_pattern: pattern.pattern, ...pattern.lineage, uncertainty_deg: round4(Math.max(...neighbors.map((v) => Math.abs(v - val)))), standard: "ungraded_throwing_standard_unconfirmed" } };
  }
  if (pattern.pattern !== "shuffle") energy = absent("degrees", R.CALIBRATION_UNAVAILABLE, { movement_pattern: pattern.pattern, reason: pattern.reason, ...pattern.lineage });
  // Shared pitching measures only where the same first-move → landing →
  // overhand-release window genuinely exists; no leg lift means no comparison.
  if (lk < 0 || !lock?.ok || dir == null || pk < 0) return { ...allMissing, energy_angle: energy };
  const masked = maskUntrusted(series, buildSegmentValidity(series, lock));
  const d: PitchingDelivery = { ok: true, throwing_side: side, direction_sign: dir, lift_k: lk, plant_k: pk, release_k: rk,
    first_move: detectFirstMove(series), refusal: null, refusal_detail: null, anchors: { lift: anchors.lift, plant: anchors.plant, release } };
  const sh = checkCameraRequirement("premature_shoulder_open_deg", view).ok ? computePrematureShoulderOpen(masked, d, lock) : null;
  const head = computeHeadVerticalMovement(masked, d, lock);
  const adapt = (tile: { value: number | null; unit: string; verdict: "pass" | "fail" | null; missingness: { missing_reason: string } | null; lineage: Readonly<Record<string, unknown>> } | null, unit: string): ThrowingMeasurement =>
    tile?.value == null ? absent(unit, tile?.missingness?.missing_reason ?? R.CALIBRATION_UNAVAILABLE, { ...(tile?.lineage ?? {}) })
      : { value: tile.value, unit, verdict: tile.verdict, missing_reason: null, lineage: { ...tile.lineage, reused_window: "throw_first_move_to_overhand_release" } };
  return { ...allMissing, energy_angle: energy, shoulder_opening: adapt(sh, "degrees"), head_stability: adapt(head, "percent") };
}