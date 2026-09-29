/**
 * Deterministic pitching tiles (v2). Rebuilt 2026-09-27.
 *
 * Discipline (tempoSec.ts): pure, explicit inputs, canonical missingness, no
 * model in the value path, fixed constants, byte-identical across runs.
 *
 * DELIVERY GATE — every tile refuses unless the clip contains a pitching
 * delivery: peak leg lift → front-foot plant → pose-only release ≤0.35 s after
 * plant, hands apart at release (gates/releaseHandsApart.ts — any arm slot, shared with throwing).
 *
 * STANCE LOCK (anchors/stanceLock.ts) — head, shoulder and lift & thrust take
 * their baselines from the settled stance immediately before peak leg lift.
 * No settled stance → those tiles refuse. Energy angle needs no baseline.
 *
 * STANDARDS are OWNER COACHING STANDARDS, not data-derived.
 *
 * NOISE FLOORS (still clip 15d75bc9, 29.97 fps, one subject — PROVISIONAL,
 * docs/landmark-noise-floors.md §Pitching v2):
 *   head   0.7 %  — tracking jitter (raw minus <0.5 Hz trend), worst 1.5 s
 *                   window, max−min. Below the owner's 2 % → pass IS measurable.
 *                   The slow component (≤1.8 % per 1.5 s) is not removable by
 *                   any filter; it is either real postural sway or slow model
 *                   drift, and cannot be told apart without ground truth.
 *   shoulder 14.1° — rigid-body length solve, max−min (p2–p98 10.9°). The solve
 *                   did NOT lower the floor (was 12.7° reading MediaPipe z):
 *                   the observed 2-D shoulder width itself wobbles 4.9 % on a
 *                   still subject, and acos(d/L) is flattest exactly at the
 *                   closed position a side-on camera sees. Pass not measurable
 *                   from this camera angle; fail above 14.1° only.
 *
 * `lift_thrust_deg` (≥18°) is RETIRED: it duplicated the energy-angle
 * threshold with no definition of its own. Replaced by `lift_thrust`, the
 * owner's two-channel movement definition (lift height, thrust timing).
 *
 * Staff-only. Hidden from athletes (RELEASE1_HIDDEN_METRICS).
 */
import type { LandmarkSeries, LandmarkSeriesFrame } from "../pose/landmarkSeriesFormat";
import { MISSINGNESS_REASONS as R, missingness, type MissingnessRecord, type MissingnessReason } from "./missingness";
import { uncalibrated, missingConfidence, type ConfidenceRecord } from "./confidence";
import { detectFirstMove, detectReleasePoseOnly, type AnchorResult } from "../anchors/poseEvents";
import { frontFootPlantFromSeries } from "./hittingOwnerTiles";
import { deriveDirectionSign, type Handedness } from "../side/strideSide";
import { LM, pointPx, point, median, mid, round4, bodyScale, smooth, framesFor, type Pt } from "../anchors/poseKinematics";
import { detectStanceLock, headCentroidPx, lowerBodySpeed, unroll, type StanceLock } from "../anchors/stanceLock";
import { solveSegment, horizontalAngleDeg } from "../rigid/segmentRotation";
import { oneEuroZeroPhase, HEAD_ONE_EURO } from "../filters/oneEuro";
import { detectCameraView, checkCameraRequirement, type CameraViewResult } from "../camera/cameraView";
import { fuseShoulderOpen, SHOULDER_FUSION_VERSION, SHOULDER_FUSION_FLOORS, SHOULDER_FUSION_DETECTION_LIMIT_DEG } from "./shoulderOpenFusion";

export const PITCHING_TILES_VERSION = "pitching_tiles@2.2.0-energy-back-ankle-camera-gate-stance-lock-shoulder-fusion-zero-phase-head-lift-thrust";

/** Owner-supplied coaching standards. NOT derived from data. */
export const PITCHING_OWNER_STANDARDS = {
  energy_angle_deg: { pass_min: 18, elite_min: 25, source: "owner_coaching_standard" },
  premature_shoulder_open_deg: { pass_max: 0, source: "owner_coaching_standard" },
  head_vertical_movement_pct: { pass_max: 2, source: "owner_coaching_standard" },
  /** Owner: thrust starts "the exact moment the leg lifts" — offset ≤ 0 s passes; positive is a pause. */
  lift_thrust: { thrust_offset_max_sec: 0, source: "owner_coaching_standard" },
} as const;

/** Measured on the still clip (see header). Provisional. */
export const HEAD_VERTICAL_NOISE_FLOOR_PCT = 0.6; // 0.535 measured after duplicate-decode repair (2026-09-29); was 0.7
export const SHOULDER_ROTATION_NOISE_FLOOR_DEG = 14.1;
/** Rear-hip forward speed, body-heights/s. Still clip max 0.124 (p99 0.092). */
export const THRUST_ONSET_SPEED = 0.15;
/** Neck length / ear width may deviate this much from stance before a frame is a tracking failure. */
export const NECK_TOL = 0.05, EAR_TOL = 0.1;
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
  readonly key: "energy_angle_deg" | "premature_shoulder_open_deg" | "head_vertical_movement_pct" | "lift_thrust";
  readonly value: number | null;
  readonly unit: "degrees" | "percent" | "seconds";
  readonly uncertainty: number | null;
  readonly verdict: Verdict;
  readonly elite: boolean | null;
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly standard: (typeof PITCHING_OWNER_STANDARDS)[keyof typeof PITCHING_OWNER_STANDARDS];
  readonly lineage: Readonly<Record<string, unknown>>;
}

type Key = PitchingTileResult["key"];
const UNIT: Record<Key, PitchingTileResult["unit"]> = { energy_angle_deg: "degrees", premature_shoulder_open_deg: "degrees", head_vertical_movement_pct: "percent", lift_thrust: "seconds" };

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
  // Any arm slot (owner 2026-09-29: "We have to allow" sidearm). Shared slot-free gate.
  const hands = handsApartAtRelease(series, rk, throwing_side);
  if (hands.reason === "throwing_arm_unobserved_at_release") return fail(missingness(R.LANDMARK_OCCLUDED, "D-ANCHOR"), "no_pitching_delivery:throwing_arm_unobserved_at_release");
  if (!hands.ok) return fail(missingness(R.PITCHER_RELEASE_FRAME_MISSING, "D-ANCHOR"), `no_pitching_delivery:hands_together_at_release_not_a_pitch:${hands.hand_gap_forearms}`);
  if (dir == null) return fail(mr(R.ANCHOR_NOT_DETECTED), "target_direction_underivable");
  return {
    ok: true, throwing_side, direction_sign: dir, first_move,
    lift_k: posOf(series, stride.lift.frame_index), plant_k: posOf(series, stride.plant.frame_index), release_k: rk,
    refusal: null, refusal_detail: null, anchors,
  };
}

function frontHipIdx(side: Handedness) { return side === "R" ? LM.L_HIP : LM.R_HIP; }

/**
 * energy_angle_deg — angle from the BACK ANKLE (support foot) to the front hip
 * at peak leg lift, + toward target.
 * Definition change 2026-09-27 (owner-confirmed): origin moved from the
 * heel–toe mid-foot point to the back-ankle landmark (BlazePose 27/28).
 */
export const ENERGY_ANGLE_ORIGIN = "back_ankle" as const;
export const ENERGY_ANGLE_DEFINITION_HISTORY = [
  { date: "2026-09-27", origin: "rear_midfoot_heel_toe", note: "v2 rebuild" },
  { date: "2026-09-27", origin: "back_ankle", note: "owner confirmed back ankle → front hip at max leg lift" },
] as const;
const ANKLE = { L: 27, R: 28 } as const;

export function energyAt(series: LandmarkSeries, f: LandmarkSeriesFrame | undefined, side: Handedness, dir: 1 | -1, origin: "back_ankle" | "rear_midfoot" = "back_ankle"): number | null {
  if (!f) return null;
  const rear: Handedness = side === "R" ? "R" : "L"; // support foot is the throwing-side foot
  const hip = pointPx(series, f, frontHipIdx(side));
  let o: Pt | null;
  if (origin === "back_ankle") o = pointPx(series, f, ANKLE[rear]);
  else {
    const heel = pointPx(series, f, HEEL[rear]), toe = pointPx(series, f, TOE[rear]);
    o = heel && toe ? { x: (heel.x + toe.x) / 2, y: (heel.y + toe.y) / 2 } as Pt : null;
  }
  if (!o || !hip) return null;
  const dy = o.y - hip.y;
  if (dy <= 0) return null;
  return (Math.atan2((hip.x - o.x) * dir, dy) * 180) / Math.PI;
}

export function computeEnergyAngle(series: LandmarkSeries, d: PitchingDelivery): PitchingTileResult {
  const K: Key = "energy_angle_deg";
  if (!d.ok) return refuse(K, d.refusal!, { gate: d.refusal_detail, origin: ENERGY_ANGLE_ORIGIN });
  const side = d.throwing_side!, dir = d.direction_sign!, k = d.lift_k!;
  const v = energyAt(series, series.frames[k], side, dir);
  if (v == null) return refuse(K, mr(R.LANDMARK_OCCLUDED), { reason: "back_ankle_or_front_hip_unobserved_at_peak_lift", origin: ENERGY_ANGLE_ORIGIN });
  const nb = [energyAt(series, series.frames[k - 1], side, dir), energyAt(series, series.frames[k + 1], side, dir)].filter((x): x is number => x != null);
  if (nb.length === 0) return refuse(K, mr(R.INSUFFICIENT_TEMPORAL_RESOLUTION), { reason: "no_observed_neighbour_frame", primary: round4(v), origin: ENERGY_ANGLE_ORIGIN });
  const u = Math.max(...nb.map((x) => Math.abs(x - v)));
  if (u > ENERGY_ANGLE_STABILITY_DEG) return refuse(K, mr(R.INSUFFICIENT_TEMPORAL_RESOLUTION), { reason: "unstable_under_1_frame_shift", primary: round4(v), delta: round4(u), origin: ENERGY_ANGLE_ORIGIN });
  const s = PITCHING_OWNER_STANDARDS.energy_angle_deg;
  return {
    key: K, value: round4(v), unit: "degrees", uncertainty: round4(u), verdict: v >= s.pass_min ? "pass" : "fail", elite: v >= s.elite_min,
    missingness: null, confidence: uncalibrated(), standard: s,
    lineage: { frame_index: series.frames[k].frame_index, neighbour_delta_deg: round4(u), origin: ENERGY_ANGLE_ORIGIN, definition_changed: "2026-09-27 mid-foot → back ankle (owner)" },
  };
}

/* ---------- stance lock gate for baseline-dependent tiles ---------- */
function lockFor(series: LandmarkSeries, d: PitchingDelivery): StanceLock {
  return detectStanceLock(series, { before_frame: series.frames[d.lift_k!].frame_index });
}
const lockRefusal = (key: Key, l: StanceLock) => refuse(key, l.missingness ?? mr(R.ANCHOR_NOT_DETECTED), { reason: l.detail ?? "stance_lock_missing", onset_frame: l.onset_frame });

/* premature_shoulder_open_deg — rigid-body length solve, lift → plant. */
export function computePrematureShoulderOpen(series: LandmarkSeries, d: PitchingDelivery, lock?: StanceLock): PitchingTileResult {
  const K: Key = "premature_shoulder_open_deg";
  if (!d.ok) return refuse(K, d.refusal!, { gate: d.refusal_detail });
  const l = lock ?? lockFor(series, d);
  if (!l.ok) return lockRefusal(K, l);
  const Ls = l.baseline!.shoulder_len_px, Lh = l.baseline!.hip_len_px;
  if (!Ls || !Lh) return refuse(K, mr(R.CALIBRATION_UNAVAILABLE), { reason: "segment_length_unobserved_in_stance" });
  let fails = 0, n = 0;
  for (let k = l.start_k!; k <= d.plant_k!; k++) { const r = solveSegment(series, series.frames[k], LM.L_SHOULDER, LM.R_SHOULDER, Ls); if (r.d_xy != null) { n++; if (r.tracking_failure) fails++; } }
  const at = (k: number) => ({ s: solveSegment(series, series.frames[k], LM.L_SHOULDER, LM.R_SHOULDER, Ls), p: solveSegment(series, series.frames[k], LM.L_HIP, LM.R_HIP, Lh) });
  const a0 = at(d.lift_k!), a1 = at(d.plant_k!);
  const lineage = {
    method: "rigid_length_preservation", L_true_px: Ls, pelvis_L_px: Lh, tracking_failures: fails, frames_checked: n,
    at_lift_deg: a0.s.theta_deg == null ? null : round4(a0.s.theta_deg), at_plant_deg: a1.s.theta_deg == null ? null : round4(a1.s.theta_deg),
    rel_pelvis_at_lift_deg: (() => { const v = horizontalAngleDeg(a0.s.h, a0.p.h); return v == null ? null : round4(v); })(),
    rel_pelvis_at_plant_deg: (() => { const v = horizontalAngleDeg(a1.s.h, a1.p.h); return v == null ? null : round4(v); })(),
    sign: "unsigned_length_cannot_resolve_crossing", noise_floor_deg: SHOULDER_ROTATION_NOISE_FLOOR_DEG,
  };
  if (n > 0 && fails / n > 0.2) return refuse(K, mr(R.LANDMARK_OCCLUDED), { rigid: lineage, reason: "rigid_body_violated_on_many_frames" });
  // v2.2: the rigid solve is kept as diagnostics only; the verdict comes from the five-signal fusion.
  const fz = fuseShoulderOpen(series, l, d.plant_k!, d.direction_sign!, d.throwing_side!);
  const full = { method: SHOULDER_FUSION_VERSION, fusion: fz, floors: SHOULDER_FUSION_FLOORS, detection_limit_deg: SHOULDER_FUSION_DETECTION_LIMIT_DEG, rigid: lineage };
  if (fz.verdict == null) return refuse(K, mr(R.ANCHOR_NOT_DETECTED), { ...full, reason: fz.reason });
  return { key: K, value: fz.value_deg, unit: "degrees", uncertainty: SHOULDER_FUSION_DETECTION_LIMIT_DEG, verdict: fz.verdict, elite: null, missingness: null,
    confidence: uncalibrated(), standard: PITCHING_OWNER_STANDARDS[K],
    lineage: { ...full, note: fz.verdict === "pass" ? `closed at plant to within the ${SHOULDER_FUSION_DETECTION_LIMIT_DEG}° detection limit — no signal moved beyond its still-clip floor` : `${fz.agreeing} of ${fz.available} independent signals agree the shoulders opened before plant` } };
}

/* head_vertical_movement_pct — head centroid, roll-corrected, rigid-rejected, zero-phase One Euro, p2–p98 range, first move → release. */
const q = (a: readonly number[], p: number) => { const b = [...a].sort((x, y) => x - y); return b[Math.round(p * (b.length - 1))]; };
export function computeHeadVerticalMovement(series: LandmarkSeries, d: PitchingDelivery, lock?: StanceLock): PitchingTileResult {
  const K: Key = "head_vertical_movement_pct";
  if (!d.ok) return refuse(K, d.refusal!, { gate: d.refusal_detail });
  const fm = d.first_move!;
  if (fm.frame_index == null) return refuse(K, fm.missingness ?? mr(R.ANCHOR_NOT_DETECTED), { reason: "first_move_missing", upstream: fm.diagnostics });
  const l = lock ?? lockFor(series, d);
  if (!l.ok) return lockRefusal(K, l);
  const B = l.baseline!;
  if (!B.stature_px || !B.neck_len_px || !B.ear_width_px) return refuse(K, mr(R.CALIBRATION_UNAVAILABLE), { reason: "stance_baseline_incomplete" });
  const k0 = posOf(series, fm.frame_index), k1 = d.release_k!;
  if (!(k0 >= 0 && k0 < k1)) return refuse(K, mr(R.ANCHOR_NOT_DETECTED), { reason: "window_invalid" });
  let rejected = 0;
  const y = series.frames.map((f) => {
    const h = headCentroidPx(series, f), sm = mid(pointPx(series, f, LM.L_SHOULDER), pointPx(series, f, LM.R_SHOULDER));
    const e1 = pointPx(series, f, 7), e2 = pointPx(series, f, 8);
    if (!h || !sm || !e1 || !e2) return null;
    if (Math.abs(Math.hypot(h.x - sm.x, h.y - sm.y) / B.neck_len_px! - 1) > NECK_TOL || Math.abs(Math.hypot(e1.x - e2.x, e1.y - e2.y) / B.ear_width_px! - 1) > EAR_TOL) { rejected++; return null; }
    return unroll(h, B.roll_deg).y;
  });
  const scale = bodyScale(series);
  const gate = scale ? lowerBodySpeed(series, scale) : y.map(() => null);
  const filt = oneEuroZeroPhase(y, gate, series.header.fps_true, HEAD_ONE_EURO);
  const ys: number[] = [];
  for (let k = k0; k <= k1; k++) { const v = filt[k]; if (v != null) ys.push(v); }
  const cov = ys.length / (k1 - k0 + 1);
  const lineage = { window: [fm.frame_index, series.frames[k1].frame_index], coverage: round4(cov), stature_px: B.stature_px, roll_deg: B.roll_deg, rigid_rejected_frames: rejected, statistic: "p2_p98_range", filter: "one_euro_zero_phase_lowerbody_gate", noise_floor_pct: HEAD_VERTICAL_NOISE_FLOOR_PCT };
  if (cov < MIN_WINDOW_COVERAGE) return refuse(K, mr(R.LANDMARK_OCCLUDED), { ...lineage, reason: "head_coverage_low" });
  const pct = ((q(ys, 0.98) - q(ys, 0.02)) / B.stature_px) * 100;
  const maxmin = ((Math.max(...ys) - Math.min(...ys)) / B.stature_px) * 100;
  if (pct > 100) return refuse(K, mr(R.POSE_NOT_DETECTED), { ...lineage, reason: "physically_impossible", raw_pct: round4(pct) });
  return { key: K, value: round4(pct), unit: "percent", uncertainty: HEAD_VERTICAL_NOISE_FLOOR_PCT, verdict: pct <= PITCHING_OWNER_STANDARDS[K].pass_max ? "pass" : "fail", elite: null, missingness: null, confidence: uncalibrated(), standard: PITCHING_OWNER_STANDARDS[K], lineage: { ...lineage, max_min_pct: round4(maxmin) } };
}

/* lift_thrust — owner's two-channel movement. Value = thrust offset (s) from peak knee lift; ≤0 passes. */
export function computeLiftThrust(series: LandmarkSeries, d: PitchingDelivery, lock?: StanceLock): PitchingTileResult {
  const K: Key = "lift_thrust";
  if (!d.ok) return refuse(K, d.refusal!, { gate: d.refusal_detail });
  const l = lock ?? lockFor(series, d);
  if (!l.ok) return lockRefusal(K, l);
  const side = d.throwing_side!, dir = d.direction_sign!, fps = series.header.fps_true;
  const [FK, RH, RS] = side === "R" ? [LM.L_KNEE, LM.R_HIP, LM.R_SHOULDER] : [LM.R_KNEE, LM.L_HIP, LM.L_SHOULDER];
  const roll = l.baseline!.roll_deg;
  const P = (f: LandmarkSeriesFrame, i: number) => { const p = pointPx(series, f, i); return p ? unroll(p, roll) : null; };
  const trunk = (f: LandmarkSeriesFrame) => {
    const h = mid(P(f, LM.L_HIP), P(f, LM.R_HIP)), s = mid(P(f, LM.L_SHOULDER), P(f, LM.R_SHOULDER));
    return h && s && h.y > s.y ? (Math.atan2((s.x - h.x) * dir, h.y - s.y) * 180) / Math.PI : null;
  };
  // Lift channel: front knee rise above hip-mid as a fraction of hip-mid → rear shoulder (armpit ≈ rear shoulder).
  let kPeak = -1, best = -Infinity;
  for (let k = l.end_k! + 1; k <= d.plant_k!; k++) {
    const f = series.frames[k], kn = P(f, FK), rs = P(f, RS), hm = mid(P(f, LM.L_HIP), P(f, LM.R_HIP));
    if (!kn || !rs || !hm || !(hm.y > rs.y)) continue;
    const r = (hm.y - kn.y) / (hm.y - rs.y);
    if (r > best) { best = r; kPeak = k; }
  }
  if (kPeak < 0) return refuse(K, mr(R.LANDMARK_OCCLUDED), { reason: "front_knee_or_rear_shoulder_unobserved" });
  const tr0 = median(Array.from({ length: l.end_k! - l.start_k! + 1 }, (_, i) => trunk(series.frames[l.start_k! + i])).filter((v): v is number => v != null));
  const trP = trunk(series.frames[kPeak]);
  // Thrust channel: rear hip forward speed toward the target.
  const scale = bodyScale(series);
  if (!scale) return refuse(K, mr(R.CALIBRATION_UNAVAILABLE), { reason: "no_body_scale" });
  const v = smooth(series.frames.map((f, k) => {
    if (k === 0 || f.frame_index - series.frames[k - 1].frame_index !== 1) return null;
    const a = point(series.frames[k - 1], RH), b = point(f, RH);
    return a && b ? (((b.x - a.x) * dir) / scale) * fps : null;
  }), 1);
  const persist = framesFor(fps, 0.06, 2);
  let onset = -1;
  for (let k = l.end_k! + 1; k <= d.plant_k!; k++) {
    let ok = true;
    for (let j = 0; j < persist; j++) { const x = v[k + j]; if (x == null || x < THRUST_ONSET_SPEED) { ok = false; break; } }
    if (ok) { onset = k; break; }
  }
  const lift = { knee_peak_frame: series.frames[kPeak].frame_index, lift_ratio_to_armpit: round4(best), trunk_change_deg: tr0 != null && trP != null ? round4(trP - tr0) : null };
  if (onset < 0) return refuse(K, mr(R.ANCHOR_NOT_DETECTED), { reason: "no_rear_hip_thrust_above_noise_before_plant", lift, thrust_onset_speed: THRUST_ONSET_SPEED });
  const off = (onset - kPeak) / fps;
  return {
    key: K, value: round4(off), unit: "seconds", uncertainty: round4(2 / fps),
    verdict: off <= PITCHING_OWNER_STANDARDS.lift_thrust.thrust_offset_max_sec ? "pass" : "fail", elite: null, missingness: null, confidence: uncalibrated(), standard: PITCHING_OWNER_STANDARDS[K],
    lineage: { lift, thrust_onset_frame: series.frames[onset].frame_index, peak_rear_hip_speed: round4(Math.max(...v.slice(onset, d.plant_k! + 1).filter((x): x is number => x != null))), note: "lift height and posture are reported, not graded — the owner gave no numeric standard for them" },
  };
}

/** Delivery gate first (more fundamental), then the per-tile camera requirement. */
function cameraGated(r: PitchingTileResult, d: PitchingDelivery, cam: CameraViewResult): PitchingTileResult {
  const g = checkCameraRequirement(r.key, cam.view);
  if (!d.ok || g.ok) return g.detail ? { ...r, lineage: { ...r.lineage, camera_view: g.detail } } : r;
  return refuse(r.key, mr(R.CALIBRATION_UNAVAILABLE), { reason: g.detail, message: g.message, camera: cam });
}

export function runPitchingTiles(series: LandmarkSeries, o: { throwing_side: Handedness | null }) {
  const d = findPitchingDelivery(series, o.throwing_side);
  const lock = d.ok ? lockFor(series, d) : undefined;
  const cam = detectCameraView(series);
  return {
    version: PITCHING_TILES_VERSION,
    camera_view: cam,
    delivery: { ok: d.ok, refusal: d.refusal, refusal_detail: d.refusal_detail, direction_sign: d.direction_sign },
    stance_lock: lock ? { ok: lock.ok, start_frame: lock.start_frame, end_frame: lock.end_frame, detail: lock.detail } : null,
    energy_angle_deg: cameraGated(computeEnergyAngle(series, d), d, cam),
    premature_shoulder_open_deg: cameraGated(computePrematureShoulderOpen(series, d, lock), d, cam),
    head_vertical_movement_pct: cameraGated(computeHeadVerticalMovement(series, d, lock), d, cam),
    lift_thrust: cameraGated(computeLiftThrust(series, d, lock), d, cam),
  };
}
