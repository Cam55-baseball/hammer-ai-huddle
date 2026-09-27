/**
 * Deterministic rebuild of three of the four fabricated pitching tiles
 * (audit: energy_angle_deg constant, premature_shoulder_open_deg 20° on 7/8,
 * head_vertical_movement_pct missing on 12/12 then impossible values).
 *
 * `lift_thrust_deg` is NOT built: the only written definition is "combined
 * lift-and-thrust angle off the rubber" — not enough to measure without
 * inventing a definition. Waiting on the owner.
 *
 * Discipline (tempoSec.ts): pure, explicit inputs, canonical missingness, no
 * model in the value path, fixed constants, byte-identical across runs.
 *
 * DELIVERY GATE — every tile refuses unless the clip contains a pitching
 * delivery: peak leg lift → front-foot plant → pose-only release, in that
 * order, with the throwing wrist ABOVE the throwing shoulder at release
 * (overhand / three-quarter). Sidearm and underhand deliveries are not yet
 * supported and refuse with the release reason — a stated limitation.
 * A tile on a hitting clip therefore refuses with the anchor's real reason.
 *
 * STANDARDS are OWNER COACHING STANDARDS, not data-derived. No population
 * exists; deriving them is later work.
 *
 * NOISE FLOORS (still clip 15d75bc9, 29.97 fps, one subject — PROVISIONAL):
 *   head centroid vertical range  3.10 % of stature (whole 10.9 s clip)
 *   shoulder x–z line angle       12.7° full range (MediaPipe depth is experimental)
 * Both floors EXCEED the owner's pass standard (≤2 %, 0°). So on this capture
 * those two tiles can only report FAIL (clearly above noise) or missing — a
 * pass cannot be told apart from pose-model noise. Stated, not hidden.
 *
 * Staff-only. Hidden from athletes (RELEASE1_HIDDEN_METRICS). Not wired to any
 * report card.
 */
import type { LandmarkSeries, LandmarkSeriesFrame } from "../pose/landmarkSeriesFormat";
import { MISSINGNESS_REASONS as R, missingness, type MissingnessRecord, type MissingnessReason } from "./missingness";
import { uncalibrated, missingConfidence, type ConfidenceRecord } from "./confidence";
import { detectFirstMove, detectReleasePoseOnly, type AnchorResult } from "../anchors/poseEvents";
import { frontFootPlantFromSeries } from "./hittingOwnerTiles";
import { deriveDirectionSign, type Handedness } from "../side/strideSide";
import { LM, pointPx, point, median, round4, type Pt } from "../anchors/poseKinematics";

export const PITCHING_TILES_VERSION = "pitching_tiles@1.0.0-delivery-gate-owner-standards";

/** Owner-supplied coaching standards. NOT derived from data. */
export const PITCHING_OWNER_STANDARDS = {
  energy_angle_deg: { pass_min: 18, elite_min: 25, source: "owner_coaching_standard" },
  premature_shoulder_open_deg: { pass_max: 0, source: "owner_coaching_standard" },
  head_vertical_movement_pct: { pass_max: 2, source: "owner_coaching_standard" },
  lift_thrust_deg: { pass_min: 18, source: "owner_coaching_standard" },
} as const;

/** Measured on the still clip (see header). Provisional. */
export const HEAD_VERTICAL_NOISE_FLOOR_PCT = 3.1;
export const SHOULDER_ROTATION_NOISE_FLOOR_DEG = 12.7;
/** energy angle must agree with its ±1-frame neighbour within this. */
export const ENERGY_ANGLE_STABILITY_DEG = 5;
/** shoulder→ankle is this fraction of stature (Drillis–Contini, same as tile 19). */
export const SHOULDER_TO_ANKLE_OF_STATURE = 0.818 - 0.039;
export const MIN_WINDOW_COVERAGE = 0.8;
/**
 * Physical bound, not an owner standard: front-foot contact → ball release is
 * ~0.10–0.20 s in overhand pitching (published biomechanics). 0.35 s is a
 * generous ceiling. A hand-speed peak seconds after the plant is not a release
 * (hitting clip 9d2e117e read as a right-hander: plant 42, "release" 97 = 2.3 s).
 */
export const PLANT_TO_RELEASE_MAX_SEC = 0.35;

const HEAD_IDX = [0, 2, 5, 7, 8] as const;
const HEEL = { L: 29, R: 30 } as const;
const TOE = { L: 31, R: 32 } as const;

export type Verdict = "pass" | "fail" | null;
export interface PitchingTileResult {
  readonly key: "energy_angle_deg" | "premature_shoulder_open_deg" | "head_vertical_movement_pct";
  readonly value: number | null;
  readonly unit: "degrees" | "percent";
  readonly uncertainty: number | null;
  readonly verdict: Verdict;
  readonly elite: boolean | null;
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly standard: (typeof PITCHING_OWNER_STANDARDS)[keyof typeof PITCHING_OWNER_STANDARDS];
  readonly lineage: Readonly<Record<string, unknown>>;
}

type Key = PitchingTileResult["key"];
const UNIT: Record<Key, "degrees" | "percent"> = { energy_angle_deg: "degrees", premature_shoulder_open_deg: "degrees", head_vertical_movement_pct: "percent" };

function refuse(key: Key, rec: MissingnessRecord, lineage: Record<string, unknown>): PitchingTileResult {
  return { key, value: null, unit: UNIT[key], uncertainty: null, verdict: null, elite: null, missingness: rec, confidence: missingConfidence(), standard: PITCHING_OWNER_STANDARDS[key], lineage };
}
const mr = (r: MissingnessReason) => missingness(r, "D-METRIC");

export interface PitchingDelivery {
  readonly ok: boolean;
  readonly throwing_side: Handedness | null;
  readonly direction_sign: 1 | -1 | null;
  readonly lift_k: number | null;
  readonly plant_k: number | null;
  readonly release_k: number | null;
  readonly first_move: AnchorResult | null;
  readonly refusal: MissingnessRecord | null;
  readonly refusal_detail: string | null;
  readonly anchors: Readonly<Record<string, unknown>>;
}

const posOf = (s: LandmarkSeries, fi: number | null) => (fi == null ? -1 : s.frames.findIndex((f) => f.frame_index === fi));

/** The delivery gate. Pure. */
export function findPitchingDelivery(series: LandmarkSeries, throwing_side: Handedness | null): PitchingDelivery {
  const base = { throwing_side, direction_sign: null, lift_k: null, plant_k: null, release_k: null, first_move: null } as const;
  if (throwing_side == null) {
    return { ...base, ok: false, refusal: mr(R.ANCHOR_NOT_DETECTED), refusal_detail: "throwing_side_unknown", anchors: {} };
  }
  const stride = frontFootPlantFromSeries(series, throwing_side);
  const release = detectReleasePoseOnly(series, { throwing_side: throwing_side === "R" ? "right" : "left" });
  const first_move = detectFirstMove(series);
  const dir = deriveDirectionSign(series, throwing_side);
  const anchors = { peak_leg_lift: stride.lift, front_foot_plant: stride.plant, release, first_move };
  const fail = (rec: MissingnessRecord | null, detail: string): PitchingDelivery =>
    ({ ...base, direction_sign: dir, first_move, ok: false, refusal: rec ?? mr(R.ANCHOR_NOT_DETECTED), refusal_detail: detail, anchors });

  if (stride.lift.frame_index == null) return fail(stride.lift.missingness, "no_pitching_delivery:peak_leg_lift_missing");
  if (stride.plant.frame_index == null) return fail(stride.plant.missingness, `no_pitching_delivery:plant_missing:${stride.plant.detail}`);
  if (release.frame_index == null) return fail(release.missingness ?? mr(R.PITCHER_RELEASE_FRAME_MISSING), `no_pitching_delivery:release_missing:${String(release.diagnostics.reason ?? "signals_disagree")}`);
  if (!(release.frame_index >= stride.plant.frame_index)) {
    return fail(missingness(R.PITCHER_RELEASE_FRAME_MISSING, "D-ANCHOR"), "no_pitching_delivery:release_before_plant");
  }
  const fps = series.header.fps_true;
  if (Number.isFinite(fps) && fps > 0 && (release.frame_index - stride.plant.frame_index) / fps > PLANT_TO_RELEASE_MAX_SEC) {
    return fail(missingness(R.PITCHER_RELEASE_FRAME_MISSING, "D-ANCHOR"), "no_pitching_delivery:release_too_long_after_plant");
  }
  const rk = posOf(series, release.frame_index);
  const S = throwing_side === "R" ? LM.R_SHOULDER : LM.L_SHOULDER;
  const W = throwing_side === "R" ? LM.R_WRIST : LM.L_WRIST;
  const sh = point(series.frames[rk], S), wr = point(series.frames[rk], W);
  if (!sh || !wr) return fail(missingness(R.LANDMARK_OCCLUDED, "D-ANCHOR"), "no_pitching_delivery:throwing_arm_unobserved_at_release");
  if (!(wr.y < sh.y)) {
    return fail(missingness(R.PITCHER_RELEASE_FRAME_MISSING, "D-ANCHOR"), "no_pitching_delivery:throwing_wrist_below_shoulder_at_release");
  }
  if (dir == null) return fail(mr(R.ANCHOR_NOT_DETECTED), "target_direction_underivable");
  return {
    ok: true, throwing_side, direction_sign: dir, first_move,
    lift_k: posOf(series, stride.lift.frame_index), plant_k: posOf(series, stride.plant.frame_index), release_k: rk,
    refusal: null, refusal_detail: null, anchors,
  };
}

function frontHipIdx(side: Handedness) { return side === "R" ? LM.L_HIP : LM.R_HIP; }

/* energy_angle_deg — angle from rear (support) foot centre to front hip at peak leg lift, + toward target. */
function energyAt(series: LandmarkSeries, f: LandmarkSeriesFrame | undefined, side: Handedness, dir: 1 | -1): number | null {
  if (!f) return null;
  const rear: Handedness = side === "R" ? "R" : "L"; // support foot is the throwing-side foot
  const heel = pointPx(series, f, HEEL[rear]), toe = pointPx(series, f, TOE[rear]), hip = pointPx(series, f, frontHipIdx(side));
  if (!heel || !toe || !hip) return null;
  const fx = (heel.x + toe.x) / 2, fy = (heel.y + toe.y) / 2;
  const dy = fy - hip.y;
  if (dy <= 0) return null;
  return (Math.atan2((hip.x - fx) * dir, dy) * 180) / Math.PI;
}

export function computeEnergyAngle(series: LandmarkSeries, d: PitchingDelivery): PitchingTileResult {
  const K: Key = "energy_angle_deg";
  if (!d.ok) return refuse(K, d.refusal!, { gate: d.refusal_detail });
  const side = d.throwing_side!, dir = d.direction_sign!, k = d.lift_k!;
  const v = energyAt(series, series.frames[k], side, dir);
  if (v == null) return refuse(K, mr(R.LANDMARK_OCCLUDED), { reason: "foot_or_front_hip_unobserved_at_peak_lift" });
  const nb = [energyAt(series, series.frames[k - 1], side, dir), energyAt(series, series.frames[k + 1], side, dir)].filter((x): x is number => x != null);
  if (nb.length === 0) return refuse(K, mr(R.INSUFFICIENT_TEMPORAL_RESOLUTION), { reason: "no_observed_neighbour_frame", primary: round4(v) });
  const u = Math.max(...nb.map((x) => Math.abs(x - v)));
  if (u > ENERGY_ANGLE_STABILITY_DEG) return refuse(K, mr(R.INSUFFICIENT_TEMPORAL_RESOLUTION), { reason: "unstable_under_1_frame_shift", primary: round4(v), delta: round4(u) });
  const s = PITCHING_OWNER_STANDARDS.energy_angle_deg;
  return {
    key: K, value: round4(v), unit: "degrees", uncertainty: round4(u), verdict: v >= s.pass_min ? "pass" : "fail", elite: v >= s.elite_min,
    missingness: null, confidence: uncalibrated(), standard: s, lineage: { frame_index: series.frames[k].frame_index, neighbour_delta_deg: round4(u) },
  };
}

/* premature_shoulder_open_deg — shoulder-line rotation (x–z plane) from peak lift to plant. */
function shoulderAngle(series: LandmarkSeries, f: LandmarkSeriesFrame, side: Handedness, dir: 1 | -1): number | null {
  const [G, T] = side === "R" ? [LM.L_SHOULDER, LM.R_SHOULDER] : [LM.R_SHOULDER, LM.L_SHOULDER];
  if (!point(f, G) || !point(f, T)) return null;
  const W = series.header.width, N = f.normalized;
  const dx = (N[G * 3] - N[T * 3]) * W * dir, dz = (N[G * 3 + 2] - N[T * 3 + 2]) * W;
  if (!Number.isFinite(dz)) return null;
  return Math.abs((Math.atan2(dz, dx) * 180) / Math.PI); // 0 = glove shoulder points at target (closed)
}

export function computePrematureShoulderOpen(series: LandmarkSeries, d: PitchingDelivery): PitchingTileResult {
  const K: Key = "premature_shoulder_open_deg";
  if (!d.ok) return refuse(K, d.refusal!, { gate: d.refusal_detail });
  const side = d.throwing_side!, dir = d.direction_sign!;
  const a0 = shoulderAngle(series, series.frames[d.lift_k!], side, dir);
  const a1 = shoulderAngle(series, series.frames[d.plant_k!], side, dir);
  if (a0 == null || a1 == null) return refuse(K, mr(R.LANDMARK_OCCLUDED), { reason: "shoulder_unobserved_at_lift_or_plant" });
  const v = a1 - a0;
  const lineage = { at_lift_deg: round4(a0), at_plant_deg: round4(a1), noise_floor_deg: SHOULDER_ROTATION_NOISE_FLOOR_DEG, signal: "mediapipe_z_experimental" };
  if (Math.abs(v) <= SHOULDER_ROTATION_NOISE_FLOOR_DEG) return refuse(K, mr(R.ANCHOR_NOT_DETECTED), { ...lineage, reason: "rotation_within_noise_floor", raw_deg: round4(v) });
  return { key: K, value: round4(v), unit: "degrees", uncertainty: SHOULDER_ROTATION_NOISE_FLOOR_DEG, verdict: v > 0 ? "fail" : "pass", elite: null, missingness: null, confidence: uncalibrated(), standard: PITCHING_OWNER_STANDARDS[K], lineage };
}

/* head_vertical_movement_pct — head-centroid vertical range, first move → release, % of stature. */
function head(series: LandmarkSeries, f: LandmarkSeriesFrame): Pt | null {
  let x = 0, y = 0;
  for (const i of HEAD_IDX) { const p = pointPx(series, f, i); if (!p) return null; x += p.x; y += p.y; }
  return { x: x / 5, y: y / 5 };
}

export function computeHeadVerticalMovement(series: LandmarkSeries, d: PitchingDelivery): PitchingTileResult {
  const K: Key = "head_vertical_movement_pct";
  if (!d.ok) return refuse(K, d.refusal!, { gate: d.refusal_detail });
  const fm = d.first_move!;
  // Previous rebuild defaulted a missing anchor to the WHOLE clip (walk-offs included → 70 %). Never again.
  if (fm.frame_index == null) return refuse(K, fm.missingness ?? mr(R.ANCHOR_NOT_DETECTED), { reason: "first_move_missing", upstream: fm.diagnostics });
  const k0 = posOf(series, fm.frame_index), k1 = d.release_k!;
  if (!(k0 >= 0 && k0 < k1)) return refuse(K, mr(R.ANCHOR_NOT_DETECTED), { reason: "window_invalid" });
  const ys: number[] = [];
  for (let k = k0; k <= k1; k++) { const h = head(series, series.frames[k]); if (h) ys.push(h.y); }
  const cov = ys.length / (k1 - k0 + 1);
  if (cov < MIN_WINDOW_COVERAGE) return refuse(K, mr(R.LANDMARK_OCCLUDED), { reason: "head_coverage_low", coverage: round4(cov) });
  // Stature from pre-delivery frames only (lift/stride shrink shoulder→ankle).
  const sc: number[] = [];
  for (let k = 0; k < k0; k++) {
    const f = series.frames[k];
    const L = (i: number) => pointPx(series, f, i);
    const s1 = L(LM.L_SHOULDER), s2 = L(LM.R_SHOULDER), a1 = L(LM.L_ANKLE), a2 = L(LM.R_ANKLE);
    if (s1 && s2 && a1 && a2) sc.push(Math.hypot((s1.x + s2.x) / 2 - (a1.x + a2.x) / 2, (s1.y + s2.y) / 2 - (a1.y + a2.y) / 2));
  }
  const m = median(sc);
  if (m == null || m <= 20) return refuse(K, mr(R.CALIBRATION_UNAVAILABLE), { reason: "no_pre_delivery_stature_frames" });
  const stature = m / SHOULDER_TO_ANKLE_OF_STATURE;
  const med3 = ys.map((v, i) => [ys[i - 1] ?? v, v, ys[i + 1] ?? v].sort((a, b) => a - b)[1]);
  const pct = ((Math.max(...med3) - Math.min(...med3)) / stature) * 100;
  const lineage = { window: [fm.frame_index, series.frames[k1].frame_index], coverage: round4(cov), stature_px: round4(stature), noise_floor_pct: HEAD_VERTICAL_NOISE_FLOOR_PCT };
  if (pct > 100) return refuse(K, mr(R.POSE_NOT_DETECTED), { ...lineage, reason: "physically_impossible", raw_pct: round4(pct) });
  if (pct <= HEAD_VERTICAL_NOISE_FLOOR_PCT) return refuse(K, mr(R.ANCHOR_NOT_DETECTED), { ...lineage, reason: "movement_within_noise_floor", raw_pct: round4(pct) });
  return { key: K, value: round4(pct), unit: "percent", uncertainty: HEAD_VERTICAL_NOISE_FLOOR_PCT, verdict: pct <= PITCHING_OWNER_STANDARDS[K].pass_max ? "pass" : "fail", elite: null, missingness: null, confidence: uncalibrated(), standard: PITCHING_OWNER_STANDARDS[K], lineage };
}

export function runPitchingTiles(series: LandmarkSeries, o: { throwing_side: Handedness | null }) {
  const d = findPitchingDelivery(series, o.throwing_side);
  return {
    version: PITCHING_TILES_VERSION,
    delivery: { ok: d.ok, refusal: d.refusal, refusal_detail: d.refusal_detail, direction_sign: d.direction_sign },
    energy_angle_deg: computeEnergyAngle(series, d),
    premature_shoulder_open_deg: computePrematureShoulderOpen(series, d),
    head_vertical_movement_pct: computeHeadVerticalMovement(series, d),
  };
}
