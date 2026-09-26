/**
 * Movement gate — runs BEFORE any tile, fault, drill or coaching output.
 *
 * Question it answers: does the analysed window contain any real body
 * movement at all? If not, the whole analysis is refused with one honest
 * result. Nothing downstream may run on a clip that fails this gate.
 *
 * Signal (scale-free, deterministic):
 *   for each of the 12 body landmarks (shoulders, elbows, wrists, hips,
 *   knees, ankles) observed on ≥ MIN_OBSERVED_FRAMES frames at visibility
 *   ≥ 0.5, take the robust excursion hypot(p98−p2 of x, p98−p2 of y) in
 *   source pixels, divided by body scale (median shoulder-mid → ankle-mid
 *   distance in source pixels). movement_score = the MAX over landmarks.
 *   p2/p98 (not min/max) so a single jittery frame cannot open the gate.
 *
 * Threshold basis (docs/landmark-noise-floors.md): on the reference still
 * clip (15d75bc9…, 328 frames, 29.97 fps) the largest landmark excursion was
 * 0.064 body lengths (left wrist); the median landmark was 0.042. The gate is
 * set at 0.20 — ~3× the still-clip maximum. A leg lift, stride, swing or throw
 * moves at least one limb far more than that (the one real motion clip on
 * file scored ~1.6). PROVISIONAL: one subject, one lighting condition, 30 fps.
 */
import type { LandmarkSeries } from "../pose/landmarkSeriesFormat";

export const MOVEMENT_GATE_VERSION = "movement_gate@1.0.0";
export const MOVEMENT_THRESHOLD_BODY = 0.2;
export const STILL_REFERENCE_MAX_BODY = 0.064;
export const MIN_OBSERVED_FRAMES = 10;
export const MIN_LANDMARKS = 6;
export const MIN_POSE_FRACTION = 0.5;
const BODY = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28] as const;
const VIS = 0.5;

export type MovementGateResult =
  | { readonly status: "movement"; readonly movement_score: number; readonly threshold: number; readonly version: string }
  | {
      readonly status: "refused";
      readonly reason: "no_movement_detected" | "body_not_tracked";
      readonly movement_score: number | null;
      readonly threshold: number;
      readonly version: string;
    };

/** Deterministic lower-index percentile. */
function pct(sorted: number[], q: number): number {
  return sorted[Math.floor((sorted.length - 1) * q)];
}

function px(series: LandmarkSeries, fi: number, i: number): { x: number; y: number } | null {
  const f = series.frames[fi];
  if (!f.pose_detected) return null;
  const v = f.visibility?.[i];
  if (v == null || !(v >= VIS)) return null;
  const x = f.normalized[i * 3];
  const y = f.normalized[i * 3 + 1];
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: x * series.header.width, y: y * series.header.height };
}

export function bodyScalePx(series: LandmarkSeries): number | null {
  const d: number[] = [];
  for (let k = 0; k < series.frames.length; k++) {
    const ls = px(series, k, 11), rs = px(series, k, 12), la = px(series, k, 27), ra = px(series, k, 28);
    if (!ls || !rs || !la || !ra) continue;
    d.push(Math.hypot((ls.x + rs.x) / 2 - (la.x + ra.x) / 2, (ls.y + rs.y) / 2 - (la.y + ra.y) / 2));
  }
  if (d.length === 0) return null;
  d.sort((a, b) => a - b);
  const m = pct(d, 0.5);
  return m > 0 ? m : null;
}

export function movementScore(series: LandmarkSeries): number | null {
  const scale = bodyScalePx(series);
  if (scale == null) return null;
  const ex: number[] = [];
  for (const i of BODY) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let k = 0; k < series.frames.length; k++) {
      const p = px(series, k, i);
      if (p) { xs.push(p.x); ys.push(p.y); }
    }
    if (xs.length < MIN_OBSERVED_FRAMES) continue;
    xs.sort((a, b) => a - b);
    ys.sort((a, b) => a - b);
    ex.push(Math.hypot(pct(xs, 0.98) - pct(xs, 0.02), pct(ys, 0.98) - pct(ys, 0.02)) / scale);
  }
  if (ex.length < MIN_LANDMARKS) return null;
  return Math.round(Math.max(...ex) * 1e6) / 1e6;
}

export function evaluateMovementGate(series: LandmarkSeries | null): MovementGateResult {
  const base = { threshold: MOVEMENT_THRESHOLD_BODY, version: MOVEMENT_GATE_VERSION };
  if (!series || series.frames.length === 0) {
    return { status: "refused", reason: "body_not_tracked", movement_score: null, ...base };
  }
  const withPose = series.frames.filter((f) => f.pose_detected).length;
  if (withPose / series.frames.length < MIN_POSE_FRACTION) {
    return { status: "refused", reason: "body_not_tracked", movement_score: null, ...base };
  }
  const score = movementScore(series);
  if (score == null) return { status: "refused", reason: "body_not_tracked", movement_score: null, ...base };
  if (score < MOVEMENT_THRESHOLD_BODY) {
    return { status: "refused", reason: "no_movement_detected", movement_score: score, ...base };
  }
  return { status: "movement", movement_score: score, ...base };
}
