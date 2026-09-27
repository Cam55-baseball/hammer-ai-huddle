/**
 * STANCE LOCK — event-driven baseline. Extends D-STILL: same run-finder
 * (`stillRuns` in poseEvents.ts), applied to LOWER-BODY speed (hips, knees,
 * ankles) with a micro-threshold, and anchored to the movement that follows.
 *
 * Rule: the lock is the LAST lower-body still run of ≥ 0.5 s that ends before
 * the high-acceleration phase begins. "Begins" = `before_frame` when the
 * caller has an anchor (e.g. peak leg lift), otherwise the frame of peak whole
 * body speed. The stillest part of the clip is NOT the rule — a pitcher
 * standing at the back of the mound is still but is not the zero state.
 *
 * No lock → refuse (`anchor_not_detected`, detail `no_settled_stance_before_movement`).
 *
 * Baselines taken from the lock window (medians, source pixels):
 *   camera roll (body axis ankle-mid→shoulder-mid vs image vertical — assumes
 *   the athlete stands upright in stance, stated), shoulder / hip 3-D length,
 *   neck length, ear width, stature. Camera PITCH is not observable from one
 *   2-D view without a ground plane — reported null, never guessed.
 */
import type { LandmarkSeries, LandmarkSeriesFrame } from "../pose/landmarkSeriesFormat";
import { MISSINGNESS_REASONS as R, missingness, type MissingnessRecord } from "../metrics/missingness";
import { stillRuns } from "./poseEvents";
import { LM, aggregateSpeed, bodyScale, median, mid, point, pointPx, round4, smooth, type Pt } from "./poseKinematics";

export const STANCE_LOCK_VERSION = "stance_lock@1.0.0-lowerbody-0.20-0.5s";
/** body-heights/s. Still clip 15d75bc9 lower-body speed: p99 0.143, max 0.190. */
export const STANCE_LOCK_SPEED = 0.2;
export const STANCE_LOCK_MIN_SEC = 0.5;
export const SHOULDER_TO_ANKLE_OF_STATURE = 0.818 - 0.039;
const LOWER = [LM.L_HIP, LM.R_HIP, LM.L_KNEE, LM.R_KNEE, LM.L_ANKLE, LM.R_ANKLE] as const;
const HEAD_IDX = [0, 2, 5, 7, 8] as const;

export interface StanceBaseline {
  readonly roll_deg: number;
  readonly pitch_deg: null;
  readonly shoulder_len_px: number | null;
  readonly hip_len_px: number | null;
  readonly neck_len_px: number | null;
  readonly ear_width_px: number | null;
  readonly stature_px: number | null;
}
export interface StanceLock {
  readonly ok: boolean;
  readonly start_k: number | null;
  readonly end_k: number | null;
  readonly start_frame: number | null;
  readonly end_frame: number | null;
  readonly onset_frame: number | null;
  readonly baseline: StanceBaseline | null;
  readonly missingness: MissingnessRecord | null;
  readonly detail: string | null;
}

/** Lower-body speed, body-heights/s, 3-frame centred mean. */
export function lowerBodySpeed(series: LandmarkSeries, scale: number): (number | null)[] {
  const fps = series.header.fps_true, fr = series.frames;
  const raw: (number | null)[] = fr.map(() => null);
  for (let k = 1; k < fr.length; k++) {
    if (fr[k].frame_index - fr[k - 1].frame_index !== 1) continue;
    let t = 0, c = 0;
    for (const i of LOWER) { const p = point(fr[k - 1], i), q = point(fr[k], i); if (p && q) { t += Math.hypot(q.x - p.x, q.y - p.y); c++; } }
    if (c >= 5) raw[k] = ((t / c) / scale) * fps;
  }
  return smooth(raw, 1);
}

export function headCentroidPx(series: LandmarkSeries, f: LandmarkSeriesFrame): Pt | null {
  let x = 0, y = 0;
  for (const i of HEAD_IDX) { const p = pointPx(series, f, i); if (!p) return null; x += p.x; y += p.y; }
  return { x: x / 5, y: y / 5 };
}

/** 3-D segment length in px, MediaPipe z scaled by width. Used ONLY as a median over the lock window. */
function len3(series: LandmarkSeries, f: LandmarkSeriesFrame, a: number, b: number): number | null {
  const p = point(f, a), q = point(f, b);
  if (!p || !q) return null;
  const W = series.header.width, H = series.header.height, N = f.normalized;
  const dz = (N[a * 3 + 2] - N[b * 3 + 2]) * W;
  if (!Number.isFinite(dz)) return null;
  return Math.hypot((p.x - q.x) * W, (p.y - q.y) * H, dz);
}

export function stanceBaseline(series: LandmarkSeries, k0: number, k1: number): StanceBaseline {
  const roll: number[] = [], sh: number[] = [], hp: number[] = [], nk: number[] = [], ew: number[] = [], st: number[] = [];
  for (let k = k0; k <= k1; k++) {
    const f = series.frames[k];
    const s = mid(pointPx(series, f, LM.L_SHOULDER), pointPx(series, f, LM.R_SHOULDER));
    const a = mid(pointPx(series, f, LM.L_ANKLE), pointPx(series, f, LM.R_ANKLE));
    if (s && a && a.y > s.y) { roll.push((Math.atan2(s.x - a.x, a.y - s.y) * 180) / Math.PI); st.push(Math.hypot(s.x - a.x, s.y - a.y) / SHOULDER_TO_ANKLE_OF_STATURE); }
    const l1 = len3(series, f, LM.L_SHOULDER, LM.R_SHOULDER); if (l1) sh.push(l1);
    const l2 = len3(series, f, LM.L_HIP, LM.R_HIP); if (l2) hp.push(l2);
    const h = headCentroidPx(series, f); if (h && s) nk.push(Math.hypot(h.x - s.x, h.y - s.y));
    const e1 = pointPx(series, f, 7), e2 = pointPx(series, f, 8); if (e1 && e2) ew.push(Math.hypot(e1.x - e2.x, e1.y - e2.y));
  }
  const r = (v: number | null) => (v == null ? null : round4(v));
  return { roll_deg: round4(median(roll) ?? 0), pitch_deg: null, shoulder_len_px: r(median(sh)), hip_len_px: r(median(hp)), neck_len_px: r(median(nk)), ear_width_px: r(median(ew)), stature_px: r(median(st)) };
}

export function detectStanceLock(series: LandmarkSeries, o: { before_frame?: number | null } = {}): StanceLock {
  const none = { start_k: null, end_k: null, start_frame: null, end_frame: null, baseline: null } as const;
  const fps = series.header.fps_true;
  const scale = bodyScale(series);
  if (!(fps > 0) || scale == null) return { ...none, ok: false, onset_frame: null, missingness: missingness(R.LANDMARK_OCCLUDED, "D-ANCHOR"), detail: "no_time_base_or_body_scale" };
  let onsetK: number;
  if (o.before_frame != null) {
    onsetK = series.frames.findIndex((f) => f.frame_index >= (o.before_frame as number));
    if (onsetK < 0) onsetK = series.frames.length;
  } else {
    const ag = smooth(aggregateSpeed(series, scale), 1);
    onsetK = 0;
    ag.forEach((v, k) => { if (v != null && v > (ag[onsetK] ?? -1)) onsetK = k; });
  }
  const minLen = Math.max(3, Math.ceil(fps * STANCE_LOCK_MIN_SEC));
  const runs = stillRuns(lowerBodySpeed(series, scale), minLen, 0, STANCE_LOCK_SPEED).filter((r) => r.end < onsetK);
  const onset_frame = series.frames[Math.min(onsetK, series.frames.length - 1)]?.frame_index ?? null;
  if (runs.length === 0) return { ...none, ok: false, onset_frame, missingness: missingness(R.ANCHOR_NOT_DETECTED, "D-ANCHOR"), detail: "no_settled_stance_before_movement" };
  const run = runs[runs.length - 1];
  return {
    ok: true, start_k: run.start, end_k: run.end,
    start_frame: series.frames[run.start].frame_index, end_frame: series.frames[run.end].frame_index,
    onset_frame, baseline: stanceBaseline(series, run.start, run.end), missingness: null, detail: null,
  };
}

/** Rotate a point about the image origin by −roll so the stance body axis is vertical. */
export function unroll(p: Pt, roll_deg: number): Pt {
  const t = (-roll_deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  return { x: p.x * c + p.y * s, y: -p.x * s + p.y * c };
}
