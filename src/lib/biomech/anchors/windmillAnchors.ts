/**
 * Softball windmill anchors — the eight anchors of docs/SOFTBALL-PITCHING-DOCTRINE.md.
 * Baseball anchors do NOT transfer: there is no peak leg lift; 12 o'clock is the
 * windmill's MER equivalent; SFC is the pivotal anchor.
 *
 * Pure, deterministic, pose-only. Every anchor reports ±1 frame and refuses only
 * when its signal is absent. Drive leg = throwing side (rear); stride foot = front,
 * both from strideSide.ts — never fixed left/right.
 *
 * Floors (still clip 15d75bc9, p2–p98, measured 2026-09-30 BEFORE any threshold):
 *   knee angle 5.4°  hip angle 2.5°  trunk angle 2.0°  wrist y 3.9 % stature
 *   inter-ankle x 0.9 % stature.
 * UNVALIDATED: no softball pitching clip has ever been run through this.
 */
import type { LandmarkSeries, LandmarkSeriesFrame } from "../pose/landmarkSeriesFormat";
import { pointPx, bodyScale, bodyScalePx, aggregateSpeed, smooth, framesFor, uncertaintyMs, angleDeg, LM, type Pt } from "./poseKinematics";
import { detectFirstMove, stillRuns, STILL_SPEED, STILL_MIN_SEC } from "./poseEvents";
import { SHOULDER_TO_ANKLE_OF_STATURE } from "./stanceLock";
import { frontAnkleIndex, rearAnkleIndex, deriveDirectionSign, type Handedness } from "../side/strideSide";
import { handsApartAtRelease } from "../gates/releaseHandsApart";

export const WINDMILL_ANCHORS_VERSION = "windmill_anchors@1.0.0-2026-09-30-unvalidated";

export const WINDMILL_FLOORS = { knee_deg: 5.4, hip_deg: 2.5, trunk_deg: 2.0, wrist_y_pct: 3.9, ankle_x_pct: 0.9 } as const;
/** A real stride: stride foot travels forward at least this share of stature (≫ 0.9 % floor). PROPOSED. */
export const SFC_MIN_STRIDE_PCT = 20;
/** Foot "settled": both axes below this speed (stature/s) for 2 frames. */
export const SFC_SETTLE_SPEED = 0.5;
/** Heel off the ground at wu_end: rear heel above its stance level by this share of stature. PROPOSED (≈1.7× ankle floor). */
export const HEEL_OFF_PCT = 1.5;
/** Release must fall within this long after SFC (sourced acceleration phase is short). */
export const RELEASE_AFTER_SFC_SEC = 0.35;
/** Wrist near the hip at release: within this share of stature. PROPOSED. */
export const RELEASE_NEAR_HIP_PCT = 15;

export type WindmillAnchorKey = "wu_first_move" | "wu_end" | "stride_start" | "top_of_backswing" | "arm_12_oclock" | "sfc" | "release" | "ft_end";
export interface WindmillAnchor {
  readonly key: WindmillAnchorKey;
  readonly k: number | null;
  readonly frame: number | null;
  readonly uncertainty_ms: number | null;
  readonly missing_reason: string | null;
}
export interface WindmillAnchors {
  readonly version: string;
  readonly ok: boolean;
  /** "no_windmill_delivery:<anchor>:<reason>" or "throwing_side_unknown" when !ok. */
  readonly refusal_detail: string | null;
  readonly side: Handedness | null;
  readonly direction_sign: 1 | -1 | null;
  readonly stature_px: number | null;
  readonly anchors: Readonly<Record<WindmillAnchorKey, WindmillAnchor>>;
}

const KEYS: WindmillAnchorKey[] = ["wu_first_move", "wu_end", "stride_start", "top_of_backswing", "arm_12_oclock", "sfc", "release", "ft_end"];

export function detectWindmillAnchors(s: LandmarkSeries, side: Handedness | null): WindmillAnchors {
  const fps = s.header.fps_true;
  const u = uncertaintyMs(fps > 0 ? fps : 30);
  const a = {} as Record<WindmillAnchorKey, WindmillAnchor>;
  const hit = (key: WindmillAnchorKey, k: number) => { a[key] = { key, k, frame: s.frames[k].frame_index, uncertainty_ms: u, missing_reason: null }; };
  const miss = (key: WindmillAnchorKey, reason: string) => { a[key] = { key, k: null, frame: null, uncertainty_ms: null, missing_reason: reason }; };
  let refusal: string | null = null;
  const fail = (key: WindmillAnchorKey, reason: string) => { miss(key, reason); if (!refusal) refusal = `no_windmill_delivery:${key}:${reason}`; };
  const done = (dir: 1 | -1 | null, st: number | null): WindmillAnchors => {
    for (const k of KEYS) if (!a[k]) miss(k, refusal ? "upstream_anchor_missing" : "not_detected");
    const core = a.sfc.k != null && a.arm_12_oclock.k != null && a.release.k != null;
    return { version: WINDMILL_ANCHORS_VERSION, ok: core && refusal == null, refusal_detail: core ? refusal : refusal ?? "no_windmill_delivery", side, direction_sign: dir, stature_px: st, anchors: a };
  };

  if (!side) { refusal = "throwing_side_unknown"; return done(null, null); }
  const scalePx = bodyScalePx(s), scale = bodyScale(s);
  if (!(fps > 0) || scalePx == null || scale == null) { fail("wu_first_move", "no_time_base_or_body_scale"); return done(null, null); }
  const st = scalePx / SHOULDER_TO_ANKLE_OF_STATURE;
  const dir = deriveDirectionSign(s, side);

  // 1. wu_first_move — D-STILL exit (shared detector, one implementation).
  const fm = detectFirstMove(s);
  if (fm.frame == null) { fail("wu_first_move", String((fm as { missing_reason?: string }).missing_reason ?? "never_left_stillness")); return done(dir, st); }
  const k0 = s.frames.findIndex((f) => f.frame_index === fm.frame);
  hit("wu_first_move", k0);
  if (dir == null) { fail("sfc", "stride_direction_unknown"); return done(dir, st); }

  const F = s.frames, P = (f: LandmarkSeriesFrame | undefined, i: number): Pt | null => (f ? pointPx(s, f, i) : null);
  const fa = frontAnkleIndex(side), ra = rearAnkleIndex(side);
  const rk = ra === 27 ? LM.L_KNEE : LM.R_KNEE, rh = ra === 27 ? LM.L_HIP : LM.R_HIP, rheel = ra === 27 ? 29 : 30;
  const SH = side === "R" ? LM.R_SHOULDER : LM.L_SHOULDER, EL = side === "R" ? LM.R_ELBOW : LM.L_ELBOW, WR = side === "R" ? LM.R_WRIST : LM.L_WRIST, HP = side === "R" ? LM.R_HIP : LM.L_HIP;

  // 2. sfc — stride foot travels forward ≥ SFC_MIN_STRIDE_PCT, then settles on both axes for 2 frames.
  const fx0 = P(F[k0], fa)?.x ?? null;
  if (fx0 == null) { fail("sfc", "stride_foot_unobserved_at_first_move"); return done(dir, st); }
  let sfc: number | null = null;
  for (let k = k0 + 1; k < F.length - 2 && sfc == null; k++) {
    const p = P(F[k], fa); if (!p) continue;
    if (((p.x - fx0) * dir) / st * 100 < SFC_MIN_STRIDE_PCT) continue;
    let settled = true;
    for (let j = 0; j < 2; j++) {
      const q0 = P(F[k + j], fa), q1 = P(F[k + j + 1], fa);
      if (!q0 || !q1 || F[k + j + 1].frame_index - F[k + j].frame_index !== 1) { settled = false; break; }
      if (Math.abs(q1.x - q0.x) / st * fps > SFC_SETTLE_SPEED || Math.abs(q1.y - q0.y) / st * fps > SFC_SETTLE_SPEED) { settled = false; break; }
    }
    if (settled) sfc = k;
  }
  if (sfc == null) { fail("sfc", "no_stride_foot_contact"); return done(dir, st); }
  hit("sfc", sfc);

  // 3. wu_end — drive-knee flexion minimum before SFC, below stance by > floor, with back heel off.
  const knee = (k: number) => angleDeg(P(F[k], rh), P(F[k], rk), P(F[k], ra));
  const stanceKnee = knee(k0);
  let kMin: number | null = null, vMin = Infinity;
  for (let k = k0; k < sfc; k++) { const v = knee(k); if (v != null && v < vMin) { vMin = v; kMin = k; } }
  const heel0 = P(F[k0], rheel)?.y ?? null;
  if (kMin == null || stanceKnee == null) miss("wu_end", "drive_knee_unobserved");
  else if (stanceKnee - vMin <= WINDMILL_FLOORS.knee_deg) miss("wu_end", "no_drive_knee_flexion_above_floor");
  else {
    const h = P(F[kMin], rheel)?.y ?? null;
    if (h == null || heel0 == null) miss("wu_end", "back_heel_unobserved");
    else if ((heel0 - h) / st * 100 <= HEEL_OFF_PCT) miss("wu_end", "back_heel_not_off_ground");
    else hit("wu_end", kMin);
  }

  // 4. stride_start — drive knee begins extending: ≥ min + floor, 2 frames, before SFC.
  if (a.wu_end?.k != null) {
    let ss: number | null = null;
    for (let k = a.wu_end.k + 1; k < sfc && ss == null; k++) {
      const v0 = knee(k), v1 = knee(k + 1);
      if (v0 != null && v1 != null && v0 >= vMin + WINDMILL_FLOORS.knee_deg && v1 >= vMin + WINDMILL_FLOORS.knee_deg) ss = k;
    }
    if (ss == null) miss("stride_start", "no_drive_leg_extension_above_floor"); else hit("stride_start", ss);
  } else miss("stride_start", "wu_end_missing");

  // 5. arm_12_oclock — throwing wrist above the shoulder by > floor and nearest the shoulder vertical, first-move → SFC.
  let k12: number | null = null, best = Infinity;
  for (let k = k0; k <= sfc; k++) {
    const w = P(F[k], WR), sh = P(F[k], SH), el = P(F[k], EL);
    if (!w || !sh || !el) continue;
    const fore = Math.hypot(w.x - el.x, w.y - el.y) || 1;
    if ((sh.y - w.y) / st * 100 <= WINDMILL_FLOORS.wrist_y_pct) continue;
    const dx = Math.abs(w.x - sh.x);
    if (dx < 0.5 * fore && dx < best) { best = dx; k12 = k; }
  }
  if (k12 == null) { fail("arm_12_oclock", "throwing_wrist_never_above_shoulder_before_sfc"); return done(dir, st); }
  hit("arm_12_oclock", k12);

  // 6. top_of_backswing — wrist highest while BEHIND the shoulder, first-move → 12 o'clock. May honestly be absent.
  let kb: number | null = null, yb = Infinity;
  for (let k = k0; k < k12; k++) {
    const w = P(F[k], WR), sh = P(F[k], SH), el = P(F[k], EL);
    if (!w || !sh || !el) continue;
    const fore = Math.hypot(w.x - el.x, w.y - el.y) || 1;
    if ((w.x - sh.x) * dir < -0.5 * fore && w.y < yb) { yb = w.y; kb = k; }
  }
  if (kb == null) miss("top_of_backswing", "no_backswing_behind_body"); else hit("top_of_backswing", kb);

  // 7. release — wrist lowest near the hip within RELEASE_AFTER_SFC_SEC of SFC, hands apart (shared slot-free gate).
  const win = framesFor(fps, RELEASE_AFTER_SFC_SEC, 2);
  let kr: number | null = null, yr = -Infinity;
  for (let k = sfc; k <= Math.min(F.length - 1, sfc + win); k++) {
    const w = P(F[k], WR), hp = P(F[k], HP);
    if (!w || !hp) continue;
    if (Math.abs(w.y - hp.y) / st * 100 > RELEASE_NEAR_HIP_PCT) continue;
    if (w.y > yr) { yr = w.y; kr = k; }
  }
  if (kr == null) { fail("release", "throwing_wrist_never_reached_hip_after_sfc"); return done(dir, st); }
  const gate = handsApartAtRelease(s, kr, side);
  if (!gate.ok) { fail("release", String(gate.reason)); return done(dir, st); }
  hit("release", kr);

  // 8. ft_end — first return to stillness after release.
  const ag = smooth(aggregateSpeed(s, scale), 1);
  const runs = stillRuns(ag, framesFor(fps, STILL_MIN_SEC, 3), kr + 1, STILL_SPEED);
  if (runs.length === 0) miss("ft_end", "no_return_to_stillness"); else hit("ft_end", runs[0].start);

  return done(dir, st);
}
