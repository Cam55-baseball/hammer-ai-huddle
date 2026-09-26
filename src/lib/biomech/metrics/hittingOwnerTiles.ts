/**
 * Tiles 19 and 20 — the two owner-defined hitting tiles (Hammers originals).
 *
 *   19  head_path_through_stride   diagnoses P1   window hand_load_apex → p4_start_frame
 *   20  back_hip_socket_hold       diagnoses P2   window d_coil         → p4_start_frame
 *
 * Doctrine: docs/HITTING-PHILOSOPHY.md §4 (head) and the back-hip rules quoted
 * below. Noise floors: docs/landmark-noise-floors.md (2026-09-26, PROVISIONAL).
 *
 * Discipline copied from tempoSec.ts: pure, explicit inputs, canonical
 * missingness, no model in the value path, deterministic (fixed constants, no
 * clock, no RNG). Same series + anchors in → byte-identical result out.
 *
 * GRADING: pass/fail against owner standards ONLY. Neither tile enters 20-80
 * grading — no reference population exists. NOT wired into any report card;
 * both tiles stay hidden until the unhide decision.
 *
 * Confidence: four factors (visibility, coverage, temporal resolution, anchor
 * certainty). Any factor < 0.5 forces missingness. The numeric confidence is
 * NOT surfaced (no calibration certificate) — status "uncalibrated".
 */
import type { LandmarkSeries, LandmarkSeriesFrame } from "../pose/landmarkSeriesFormat";
import { MISSINGNESS_REASONS as R, missingness, type MissingnessRecord, type MissingnessReason } from "./missingness";
import { uncalibrated, missingConfidence, type ConfidenceRecord } from "./confidence";
import { detectLoadApex, detectP4, detectCoil, type AnchorResult } from "../anchors/poseEvents";
import { detectFrontFootPlant } from "../detectors/dPlant";
import { FPS_FLOOR, LM, MIN_VIS, bodyScalePx, mid, pointPx, rearSide, rearThighAngleDeg, round4, tierFactor, type Pt } from "../anchors/poseKinematics";

export const HEAD_PATH_TILE_VERSION = "head_path@1.0.0-com-p2-floor-4.2pct";
export const BACK_HIP_TILE_VERSION = "back_hip_hold@1.0.0-coil-proxy-floor-3deg";

/** Head floor: 4.2 % body height. Basis: p99 head-centroid displacement between ANY two frames on the still clip (4.15 %). */
export const HEAD_FLOOR_BODY = 0.042;
/** 19b threshold — owner-supplied 2026-09-14, PROVISIONAL, requires validation against clips with known outcomes. */
export const HEAD_FORWARD_EXCESSIVE_IN = 6;
/** 19b CI half-width from tracking: 1.3 % body = p99 head-centroid displacement over a 15-frame lag on the still clip. */
export const HEAD_CI_TRACKING_BODY = 0.013;
/** 19b CI from height scaling: ±5 % on the stature ratio below. STATED ASSUMPTION, not measured. */
export const HEAD_CI_SCALE_REL = 0.05;
/**
 * Shoulder-mid → ankle-mid as a fraction of standing height.
 * Drillis & Contini (1966), "Body Segment Parameters", Tech. Rep. 1166-03,
 * NYU School of Engineering — shoulder height 0.818 H, ankle height 0.039 H.
 */
export const SHOULDER_TO_ANKLE_OF_STATURE = 0.818 - 0.039;
/** Hip deadband: 3.0°. Basis: full hip-line angle range while standing still (2.90°). Not a softening of the zero-degree standard. */
export const HIP_DEADBAND_DEG = 3.0;
/** Any confidence factor under this forces missingness. */
export const MIN_FACTOR = 0.5;

/**
 * Segment mass fractions and COM locations — Dempster (1955) via
 * Winter, D.A. (2009) "Biomechanics and Motor Control of Human Movement", 4th ed., Table 4.1.
 * `at` = COM position as a fraction from proximal → distal landmark.
 * Head COM taken at the head centroid; hand at the wrist and foot at the ankle
 * (the series has no reliable hand/foot COM landmarks) — stated approximations.
 */
const SEGMENTS = {
  head: 0.081, trunk: 0.497, trunk_at: 0.5,
  upper_arm: 0.028, upper_arm_at: 0.436,
  forearm: 0.016, forearm_at: 0.43,
  hand: 0.006,
  thigh: 0.1, thigh_at: 0.433,
  shank: 0.0465, shank_at: 0.433,
  foot: 0.0145,
} as const;

const HEAD_IDX = [0, 2, 5, 7, 8] as const; // nose, L eye, R eye, L ear, R ear

export const FAULT_SIGNATURES = {
  head_forward:
    "late on fastballs or swinging and missing chase pitches and fouling off pitches they thought they would hit super well or crush",
  back_hip_opens_early:
    "bad at hitting the high or away pitch, along with hitting hard pullside groundballs and soft pop ups opposite field, usually not good fastball hitters but can usually crush off speed if they time it up perfectly",
} as const;

export interface ConfidenceFactors {
  readonly visibility: number | null;
  readonly coverage: number | null;
  readonly temporal: number | null;
  readonly anchors: number | null;
}

interface Channel<T> { readonly value: T | null; readonly missingness: MissingnessRecord | null }

export interface HeadPathResult {
  readonly tile: "head_path_through_stride";
  readonly version: string;
  readonly grading: "pass_fail_owner_standard";
  readonly verdict: "pass" | "fail" | null;
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly factors: ConfidenceFactors;
  readonly channels: {
    readonly midline_crossed_19a: Channel<boolean>;
    readonly forward_in_19b: Channel<number> & { readonly ci_low_in: number | null; readonly ci_high_in: number | null; readonly threshold_in: number; readonly provisional: true };
    readonly angle_from_vertical_deg_19c: Channel<number> & { readonly threshold: null };
  };
  readonly fault_signature: string | null;
  readonly lineage: Readonly<Record<string, unknown>>;
}

export interface BackHipResult {
  readonly tile: "back_hip_socket_hold";
  readonly version: string;
  readonly grading: "pass_fail_owner_standard";
  readonly proxy_note: string;
  readonly verdict: "pass" | "fail" | null;
  readonly missingness: MissingnessRecord | null;
  readonly confidence: ConfidenceRecord;
  readonly factors: ConfidenceFactors;
  readonly outputs: {
    readonly held_or_increased_20a: Channel<boolean>;
    readonly end_of_p3_vs_floor_deg_20b: Channel<number>;
    readonly first_drop_20c: Channel<{ frame_index: number; preceded_p4: boolean } | "none">;
  };
  readonly fault_signature: string | null;
  readonly lineage: Readonly<Record<string, unknown>>;
}

const PROXY_NOTE =
  "Rear-thigh angle is a PROXY for rear hip-socket internal rotation. Femoral rotation in the socket is not directly visible from one side-on camera.";

const m = (r: MissingnessReason) => missingness(r, "D-METRIC");
const NOF: ConfidenceFactors = { visibility: null, coverage: null, temporal: null, anchors: null };

function headCentroid(series: LandmarkSeries, f: LandmarkSeriesFrame): Pt | null {
  let x = 0, y = 0;
  for (const i of HEAD_IDX) { const p = pointPx(series, f, i); if (!p) return null; x += p.x; y += p.y; }
  return { x: x / HEAD_IDX.length, y: y / HEAD_IDX.length };
}

function lerp(a: Pt, b: Pt, t: number): Pt { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }

/** Segment-weighted whole-body COM (2D, source px). null unless every required landmark is observed. */
export function centreOfMassPx(series: LandmarkSeries, f: LandmarkSeriesFrame): Pt | null {
  const P = (i: number) => pointPx(series, f, i);
  const head = headCentroid(series, f);
  const sh = mid(P(LM.L_SHOULDER), P(LM.R_SHOULDER)), hip = mid(P(LM.L_HIP), P(LM.R_HIP));
  if (!head || !sh || !hip) return null;
  const parts: [Pt, number][] = [[head, SEGMENTS.head], [lerp(sh, hip, SEGMENTS.trunk_at), SEGMENTS.trunk]];
  for (const [S, E, W, H, K, A] of [
    [LM.L_SHOULDER, LM.L_ELBOW, LM.L_WRIST, LM.L_HIP, LM.L_KNEE, LM.L_ANKLE],
    [LM.R_SHOULDER, LM.R_ELBOW, LM.R_WRIST, LM.R_HIP, LM.R_KNEE, LM.R_ANKLE],
  ]) {
    const s = P(S), e = P(E), w = P(W), h = P(H), k = P(K), a = P(A);
    if (!s || !e || !w || !h || !k || !a) return null;
    parts.push([lerp(s, e, SEGMENTS.upper_arm_at), SEGMENTS.upper_arm], [lerp(e, w, SEGMENTS.forearm_at), SEGMENTS.forearm], [w, SEGMENTS.hand]);
    parts.push([lerp(h, k, SEGMENTS.thigh_at), SEGMENTS.thigh], [lerp(k, a, SEGMENTS.shank_at), SEGMENTS.shank], [a, SEGMENTS.foot]);
  }
  let x = 0, y = 0, w = 0;
  for (const [p, mass] of parts) { x += p.x * mass; y += p.y * mass; w += mass; }
  return { x: x / w, y: y / w };
}

function meanVis(f: LandmarkSeriesFrame, idx: readonly number[]): number {
  if (!f.pose_detected) return 0;
  return idx.reduce((s, i) => s + (f.visibility?.[i] ?? 0), 0) / idx.length;
}

type Pre = { err: MissingnessReason; diag: Record<string, unknown> } | { kS: number; kE: number; scale: number; temporal: number; anchors: number };

function common(series: LandmarkSeries, dir: 1 | -1 | null, start: AnchorResult, end: AnchorResult): Pre {
  const fps = series.header.fps_true;
  if (dir !== 1 && dir !== -1) return { err: R.ANCHOR_NOT_DETECTED, diag: { reason: "direction_sign_unknown" } };
  if (!Number.isFinite(fps) || fps < FPS_FLOOR) return { err: R.INSUFFICIENT_TEMPORAL_RESOLUTION, diag: { fps } };
  if (series.header.subject_track_reliable === false) return { err: R.POSE_NOT_DETECTED, diag: { reason: "subject_track_unreliable" } };
  if (start.frame_index == null) return { err: R.ANCHOR_NOT_DETECTED, diag: { reason: `${start.anchor}_missing`, upstream: start.missingness?.missing_reason ?? null } };
  if (end.frame_index == null) return { err: R.ANCHOR_NOT_DETECTED, diag: { reason: `${end.anchor}_missing`, upstream: end.missingness?.missing_reason ?? null } };
  const kS = series.frames.findIndex((f) => f.frame_index === start.frame_index);
  const kE = series.frames.findIndex((f) => f.frame_index === end.frame_index);
  if (kS < 0 || kE < 0 || kE <= kS) return { err: R.ANCHOR_NOT_DETECTED, diag: { reason: "window_invalid", start: start.frame_index, end: end.frame_index } };
  const scale = bodyScalePx(series);
  if (scale == null) return { err: R.LANDMARK_OCCLUDED, diag: { reason: "no_body_scale" } };
  return { kS, kE, scale, temporal: tierFactor(fps), anchors: Math.min(start.confidence ?? 0, end.confidence ?? 0) };
}

function factorGate(f: ConfidenceFactors): MissingnessReason | null {
  if (f.temporal != null && f.temporal < MIN_FACTOR) return R.INSUFFICIENT_TEMPORAL_RESOLUTION;
  if (f.anchors != null && f.anchors < MIN_FACTOR) return R.ANCHOR_NOT_DETECTED;
  if ((f.visibility != null && f.visibility < MIN_FACTOR) || (f.coverage != null && f.coverage < MIN_FACTOR)) return R.LANDMARK_OCCLUDED;
  return null;
}

/* ============================== TILE 19 ============================== */
export interface HeadPathInputs {
  readonly series: LandmarkSeries;
  /** +1 when the pitcher is +x in the image. Derived from handedness + camera side; never assumed. */
  readonly direction_sign: 1 | -1 | null;
  /** Athlete standing height in inches; null → 19b calibration_unavailable. */
  readonly athlete_height_in: number | null;
  readonly hand_load_apex: AnchorResult;
  readonly p4_start: AnchorResult;
}

export function computeHeadPathThroughStride(i: HeadPathInputs): HeadPathResult {
  const { series } = i;
  const missAll = (r: MissingnessReason, factors: ConfidenceFactors, lineage: Record<string, unknown>): HeadPathResult => ({
    tile: "head_path_through_stride", version: HEAD_PATH_TILE_VERSION, grading: "pass_fail_owner_standard", verdict: null,
    missingness: m(r), confidence: missingConfidence(), factors,
    channels: {
      midline_crossed_19a: { value: null, missingness: m(r) },
      forward_in_19b: { value: null, missingness: m(r), ci_low_in: null, ci_high_in: null, threshold_in: HEAD_FORWARD_EXCESSIVE_IN, provisional: true },
      angle_from_vertical_deg_19c: { value: null, missingness: m(r), threshold: null },
    },
    fault_signature: null, lineage,
  });
  const pre = common(series, i.direction_sign, i.hand_load_apex, i.p4_start);
  if ("err" in pre) return missAll(pre.err, NOF, pre.diag);
  const dir = i.direction_sign!;
  const { kS, kE, scale } = pre;
  const fr = series.frames;
  const heads: (Pt | null)[] = [];
  let vis = 0;
  for (let k = kS; k <= kE; k++) { heads.push(headCentroid(series, fr[k])); vis += meanVis(fr[k], HEAD_IDX); }
  const n = kE - kS + 1;
  const factors: ConfidenceFactors = {
    visibility: round4(vis / n), coverage: round4(heads.filter(Boolean).length / n), temporal: pre.temporal, anchors: round4(pre.anchors),
  };
  const lineageBase = {
    window: { start_frame: fr[kS].frame_index, end_frame: fr[kE].frame_index }, body_scale_px: round4(scale),
    anchor_versions: { hand_load_apex: i.hand_load_apex.detector_version, p4_start: i.p4_start.detector_version },
  };
  const g = factorGate(factors);
  if (g) return missAll(g, factors, { ...lineageBase, reason: "confidence_factor_below_0.5" });
  const com = centreOfMassPx(series, fr[kS]);
  const h0 = heads[0];
  if (!com || !h0) return missAll(R.LANDMARK_OCCLUDED, factors, { ...lineageBase, reason: !com ? "com_at_p2_unobserved" : "head_at_p2_unobserved" });
  let maxDisp = 0, maxFwd = 0, crossed = false;
  for (const h of heads) {
    if (!h) continue;
    maxDisp = Math.max(maxDisp, Math.hypot(h.x - h0.x, h.y - h0.y));
    maxFwd = Math.max(maxFwd, (h.x - h0.x) * dir);
    if ((h.x - com.x) * dir > 0) crossed = true;
  }
  const lineage = { ...lineageBase, com_at_p2_x_px: round4(com.x), head_at_p2_px: { x: round4(h0.x), y: round4(h0.y) }, max_displacement_body: round4(maxDisp / scale), floor_body: HEAD_FLOOR_BODY };
  // THE FLOOR — movement indistinguishable from model noise is never a score.
  if (maxDisp / scale < HEAD_FLOOR_BODY) return missAll(R.LANDMARK_OCCLUDED, factors, { ...lineage, reason: "head_displacement_below_noise_floor" });

  // 19b
  let b: HeadPathResult["channels"]["forward_in_19b"];
  const H = i.athlete_height_in;
  if (H == null || !Number.isFinite(H) || H < 36 || H > 96) {
    b = { value: null, missingness: m(R.CALIBRATION_UNAVAILABLE), ci_low_in: null, ci_high_in: null, threshold_in: HEAD_FORWARD_EXCESSIVE_IN, provisional: true };
  } else {
    const pxPerIn = scale / (SHOULDER_TO_ANKLE_OF_STATURE * H);
    const v = maxFwd / pxPerIn;
    const half = (HEAD_CI_TRACKING_BODY * scale) / pxPerIn + v * HEAD_CI_SCALE_REL;
    b = { value: round4(v), missingness: null, ci_low_in: round4(Math.max(0, v - half)), ci_high_in: round4(v + half), threshold_in: HEAD_FORWARD_EXCESSIVE_IN, provisional: true };
  }
  // 19c
  const hE = heads[heads.length - 1];
  const c: HeadPathResult["channels"]["angle_from_vertical_deg_19c"] = hE
    ? { value: round4((Math.atan2((hE.x - h0.x) * dir, hE.y - h0.y) * 180) / Math.PI), missingness: null, threshold: null }
    : { value: null, missingness: m(R.LANDMARK_OCCLUDED), threshold: null };
  const fail = crossed || (b.value != null && b.value >= HEAD_FORWARD_EXCESSIVE_IN);
  return {
    tile: "head_path_through_stride", version: HEAD_PATH_TILE_VERSION, grading: "pass_fail_owner_standard",
    verdict: fail ? "fail" : "pass", missingness: null, confidence: uncalibrated(), factors,
    channels: { midline_crossed_19a: { value: crossed, missingness: null }, forward_in_19b: b, angle_from_vertical_deg_19c: c },
    fault_signature: fail ? FAULT_SIGNATURES.head_forward : null,
    lineage: { ...lineage, max_forward_body: round4(maxFwd / scale) },
  };
}

/* ============================== TILE 20 ============================== */
export interface BackHipInputs {
  readonly series: LandmarkSeries;
  readonly direction_sign: 1 | -1 | null;
  readonly d_coil: AnchorResult;
  readonly p4_start: AnchorResult;
}

export function computeBackHipSocketHold(i: BackHipInputs): BackHipResult {
  const { series } = i;
  const missAll = (r: MissingnessReason, factors: ConfidenceFactors, lineage: Record<string, unknown>): BackHipResult => ({
    tile: "back_hip_socket_hold", version: BACK_HIP_TILE_VERSION, grading: "pass_fail_owner_standard", proxy_note: PROXY_NOTE,
    verdict: null, missingness: m(r), confidence: missingConfidence(), factors,
    outputs: {
      held_or_increased_20a: { value: null, missingness: m(r) },
      end_of_p3_vs_floor_deg_20b: { value: null, missingness: m(r) },
      first_drop_20c: { value: null, missingness: m(r) },
    },
    fault_signature: null, lineage,
  });
  const pre = common(series, i.direction_sign, i.d_coil, i.p4_start);
  if ("err" in pre) return missAll(pre.err, NOF, pre.diag);
  const dir = i.direction_sign!;
  const rear = rearSide(series, dir);
  if (!rear) return missAll(R.LANDMARK_OCCLUDED, NOF, { reason: "hips_unobserved" });
  const { kS, kE } = pre;
  const fr = series.frames;
  const idx = rear === "left" ? [LM.L_HIP, LM.L_KNEE] : [LM.R_HIP, LM.R_KNEE];
  const proxy = fr.map((f) => rearThighAngleDeg(series, f, rear, dir));
  let vis = 0, obs = 0;
  for (let k = kS; k <= kE; k++) { vis += meanVis(fr[k], idx); if (proxy[k] != null) obs++; }
  const n = kE - kS + 1;
  const factors: ConfidenceFactors = { visibility: round4(vis / n), coverage: round4(obs / n), temporal: pre.temporal, anchors: round4(pre.anchors) };
  const lineage = {
    window: { start_frame: fr[kS].frame_index, end_frame: fr[kE].frame_index }, rear_side: rear, deadband_deg: HIP_DEADBAND_DEG, min_vis: MIN_VIS,
    anchor_versions: { d_coil: i.d_coil.detector_version, p4_start: i.p4_start.detector_version },
  };
  const g = factorGate(factors);
  if (g) return missAll(g, factors, { ...lineage, reason: "confidence_factor_below_0.5" });
  const floor = proxy[kS];
  if (floor == null) return missAll(R.LANDMARK_OCCLUDED, factors, { ...lineage, reason: "proxy_at_p1_unobserved" });
  // First frame below floor − deadband, searched to the end of the series.
  let drop = -1;
  for (let k = kS; k < fr.length; k++) if (proxy[k] != null && proxy[k]! < floor - HIP_DEADBAND_DEG) { drop = k; break; }
  const dropBeforeP4 = drop >= 0 && drop < kE;
  const endVal = proxy[kE];
  const b: Channel<number> = endVal != null ? { value: round4(endVal - floor), missingness: null } : { value: null, missingness: m(R.LANDMARK_OCCLUDED) };
  let peak = floor;
  for (let k = kS; k <= kE; k++) if (proxy[k] != null && proxy[k]! > peak) peak = proxy[k]!;
  const closedAtEnd = b.value == null ? null : b.value >= -HIP_DEADBAND_DEG;
  const fail = dropBeforeP4 || closedAtEnd === false;
  return {
    tile: "back_hip_socket_hold", version: BACK_HIP_TILE_VERSION, grading: "pass_fail_owner_standard", proxy_note: PROXY_NOTE,
    verdict: fail ? "fail" : "pass", missingness: null, confidence: uncalibrated(), factors,
    outputs: {
      held_or_increased_20a: { value: !dropBeforeP4, missingness: null },
      end_of_p3_vs_floor_deg_20b: b,
      first_drop_20c: { value: drop < 0 ? "none" : { frame_index: fr[drop].frame_index, preceded_p4: dropBeforeP4 }, missingness: null },
    },
    fault_signature: fail ? FAULT_SIGNATURES.back_hip_opens_early : null,
    lineage: { ...lineage, floor_deg: round4(floor), peak_above_floor_deg: round4(peak - floor) },
  };
}

/* ============================== runner ============================== */
/** Computes the anchors from the persisted series and both tiles. Pure. */
export function runHittingOwnerTiles(series: LandmarkSeries, o: { direction_sign: 1 | -1 | null; athlete_height_in: number | null }) {
  const load = detectLoadApex(series, o.direction_sign);
  const plant = detectFrontFootPlant(series, { front_side: "auto" });
  const p4 = detectP4(series, o.direction_sign, plant.front_foot_full_plant?.frame_index ?? null);
  const coil = detectCoil(series, o.direction_sign, load);
  return {
    anchors: { hand_load_apex: load, p4_start: p4, d_coil: coil, front_foot_full_plant: plant.front_foot_full_plant?.frame_index ?? null },
    tile19: computeHeadPathThroughStride({ series, direction_sign: o.direction_sign, athlete_height_in: o.athlete_height_in, hand_load_apex: load, p4_start: p4 }),
    tile20: computeBackHipSocketHold({ series, direction_sign: o.direction_sign, d_coil: coil, p4_start: p4 }),
  };
}
