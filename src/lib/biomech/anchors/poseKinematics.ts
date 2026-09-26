/**
 * Shared, pure kinematics over the PERSISTED landmark series.
 *
 * Every pose-derived event anchor (D-STILL, D-FIRST-MOVE, D-RELEASE pose-only,
 * D-LOAD-APEX, D-SWING-START, D-P4, D-FINISH) reads through these helpers so
 * visibility gating, scale normalisation and smoothing are identical everywhere.
 *
 * Rules (same as metrics/tempoSec.ts and detectors/dPlant.ts):
 *   - pure, deterministic: no clock, no RNG, no model call, fixed constants
 *   - a landmark under MIN_VIS is "not observed" → null, never interpolated
 *   - smoothing only averages OBSERVED neighbours; a gap stays a gap
 */
import type { LandmarkSeries, LandmarkSeriesFrame } from "../pose/landmarkSeriesFormat";

export const LM = {
  L_SHOULDER: 11, R_SHOULDER: 12, L_ELBOW: 13, R_ELBOW: 14, L_WRIST: 15, R_WRIST: 16,
  L_HIP: 23, R_HIP: 24, L_KNEE: 25, R_KNEE: 26, L_ANKLE: 27, R_ANKLE: 28,
} as const;

/** Landmarks used for whole-body (aggregate) motion. */
export const BODY_SET: readonly number[] = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
/** At least this many BODY_SET landmarks must be observed in both frames. */
export const MIN_BODY_LANDMARKS = 8;
export const MIN_VIS = 0.5;
export const FPS_FLOOR = 29.9;
export const FPS_T_MID = 59.9;

export type Pt = { readonly x: number; readonly y: number };

export function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}
export function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

export function point(f: LandmarkSeriesFrame, i: number): Pt | null {
  if (!f.pose_detected) return null;
  const v = f.visibility?.[i];
  if (v == null || !(v >= MIN_VIS)) return null;
  const x = f.normalized[i * 3];
  const y = f.normalized[i * 3 + 1];
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

export function mid(a: Pt | null, b: Pt | null): Pt | null {
  return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null;
}

/** Median of a numeric list (lower median for even counts — deterministic). */
export function median(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
}

/**
 * Body scale: median shoulder-mid → ankle-mid distance in normalized units.
 * Makes every threshold "body-heights", independent of zoom and resolution.
 */
export function bodyScale(series: LandmarkSeries): number | null {
  const d: number[] = [];
  for (const f of series.frames) {
    const s = mid(point(f, LM.L_SHOULDER), point(f, LM.R_SHOULDER));
    const a = mid(point(f, LM.L_ANKLE), point(f, LM.R_ANKLE));
    if (s && a) d.push(Math.hypot(s.x - a.x, s.y - a.y));
  }
  const m = median(d);
  return m != null && m > 0.05 ? m : null;
}

/** Consecutive frames are adjacent only when frame indices differ by exactly 1. */
function adjacent(a: LandmarkSeriesFrame, b: LandmarkSeriesFrame): boolean {
  return b.frame_index - a.frame_index === 1;
}

/**
 * Aggregate body speed per frame, body-heights/sec: mean displacement of the
 * BODY_SET landmarks observed in both this frame and the previous one.
 * null where not enough landmarks are observed or the previous frame is absent.
 */
export function aggregateSpeed(series: LandmarkSeries, scale: number): (number | null)[] {
  const fps = series.header.fps_true;
  const fr = series.frames;
  const out: (number | null)[] = fr.map(() => null);
  for (let k = 1; k < fr.length; k++) {
    if (!adjacent(fr[k - 1], fr[k])) continue;
    let sum = 0;
    let n = 0;
    for (const i of BODY_SET) {
      const p = point(fr[k - 1], i);
      const q = point(fr[k], i);
      if (p && q) {
        sum += Math.hypot(q.x - p.x, q.y - p.y);
        n++;
      }
    }
    if (n >= MIN_BODY_LANDMARKS) out[k] = ((sum / n) / scale) * fps;
  }
  return out;
}

/** Centred moving average over observed neighbours only. Gaps stay null. */
export function smooth(xs: readonly (number | null)[], half: number): (number | null)[] {
  return xs.map((v, k) => {
    if (v == null) return null;
    let s = 0;
    let n = 0;
    for (let j = k - half; j <= k + half; j++) {
      const w = xs[j];
      if (w != null) {
        s += w;
        n++;
      }
    }
    return s / n;
  });
}

/** Per-frame first difference × fps. null when either side is null or not adjacent. */
export function derivative(
  series: LandmarkSeries,
  xs: readonly (number | null)[],
): (number | null)[] {
  const fps = series.header.fps_true;
  const fr = series.frames;
  return xs.map((v, k) => {
    if (k === 0 || v == null) return null;
    const p = xs[k - 1];
    if (p == null || !adjacent(fr[k - 1], fr[k])) return null;
    return (v - p) * fps;
  });
}

/** Signed track of a landmark coordinate (or midpoint), scale-normalised. */
export function track(
  series: LandmarkSeries,
  pick: (f: LandmarkSeriesFrame) => Pt | null,
  axis: "x" | "y",
  scale: number,
): (number | null)[] {
  return series.frames.map((f) => {
    const p = pick(f);
    return p ? p[axis] / scale : null;
  });
}

/** Interior angle at b (degrees) for a-b-c. */
export function angleDeg(a: Pt | null, b: Pt | null, c: Pt | null): number | null {
  if (!a || !b || !c) return null;
  const v1x = a.x - b.x, v1y = a.y - b.y, v2x = c.x - b.x, v2y = c.y - b.y;
  const n = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (n === 0) return null;
  const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / n));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Frames needed to cover `sec` at this fps, never below `min`. */
export function framesFor(fps: number, sec: number, min: number): number {
  return Math.max(min, Math.ceil(fps * sec));
}

export function uncertaintyMs(fps: number, frames = 1): number {
  return round4((1000 / fps) * Math.max(1, frames));
}

export function tierFactor(fps: number): number {
  return fps >= 99.9 ? 1 : fps >= FPS_T_MID ? 0.9 : 0.75;
}

/** Landmark in SOURCE PIXELS (normalized × header width/height). Isotropic, unlike raw normalized x/y. */
export function pointPx(series: LandmarkSeries, f: LandmarkSeriesFrame, i: number): Pt | null {
  const p = point(f, i);
  return p ? { x: p.x * series.header.width, y: p.y * series.header.height } : null;
}

/** Median shoulder-mid → ankle-mid distance in source pixels. */
export function bodyScalePx(series: LandmarkSeries): number | null {
  const d: number[] = [];
  for (const f of series.frames) {
    const s = mid(pointPx(series, f, LM.L_SHOULDER), pointPx(series, f, LM.R_SHOULDER));
    const a = mid(pointPx(series, f, LM.L_ANKLE), pointPx(series, f, LM.R_ANKLE));
    if (s && a) d.push(Math.hypot(s.x - a.x, s.y - a.y));
  }
  const m = median(d);
  return m != null && m > 20 ? m : null;
}

/** Rear side = the hip that sits further from the pitcher (median over the clip). null when unobservable. */
export function rearSide(series: LandmarkSeries, direction_sign: 1 | -1): "left" | "right" | null {
  const l: number[] = [], r: number[] = [];
  for (const f of series.frames) {
    const a = point(f, LM.L_HIP), b = point(f, LM.R_HIP);
    if (a && b) { l.push(a.x * direction_sign); r.push(b.x * direction_sign); }
  }
  const ml = median(l), mr = median(r);
  if (ml == null || mr == null || ml === mr) return null;
  return ml < mr ? "left" : "right";
}

/**
 * D-COIL PROXY SIGNAL — rear thigh angle (degrees) from vertical, positive when
 * the rear knee sits toward the pitcher of the rear hip. This is a PROXY for
 * rear hip-socket internal rotation, NOT a measurement of it: femoral rotation
 * about its own axis is not visible from one side-on camera.
 */
export function rearThighAngleDeg(series: LandmarkSeries, f: LandmarkSeriesFrame, rear: "left" | "right", direction_sign: 1 | -1): number | null {
  const h = pointPx(series, f, rear === "left" ? LM.L_HIP : LM.R_HIP);
  const k = pointPx(series, f, rear === "left" ? LM.L_KNEE : LM.R_KNEE);
  if (!h || !k || k.y - h.y <= 0) return null;
  return (Math.atan2((k.x - h.x) * direction_sign, k.y - h.y) * 180) / Math.PI;
}
