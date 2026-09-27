/**
 * Rigid-body length preservation for a two-landmark segment (shoulders, hips).
 *
 * The 3-D segment length is constant. X/Y are observed; Z is inferred. So:
 *   d_xy = hypot(dx, dy)               observed, trusted
 *   dz   = sqrt(max(0, L² − d_xy²))    solved, not read from MediaPipe
 *   θ    = asin(dz / L) = acos(d_xy / L)  rotation out of the image plane
 *
 * d_xy > L·(1 + tol) cannot happen for a rigid body → TRACKING FAILURE, counted,
 * never clamped silently. Inside the tolerance it is clamped to θ = 0.
 *
 * SIGN: length alone gives |θ|. Continuity cannot resolve the sign at θ≈0 — a
 * segment that touches the image plane and turns back looks identical to one
 * that crosses it. Reported unsigned; the limitation is stated in lineage.
 */
import type { LandmarkSeries, LandmarkSeriesFrame } from "../pose/landmarkSeriesFormat";
import { point } from "../anchors/poseKinematics";

export const RIGID_SEGMENT_VERSION = "rigid_segment@1.0.0-length-preservation";
/** d_xy may exceed L by this fraction before it is called a tracking failure. */
export const RIGID_LENGTH_TOL = 0.03;

export interface SegmentFrame {
  readonly d_xy: number | null;
  readonly theta_deg: number | null;
  readonly tracking_failure: boolean;
  /** Horizontal-plane vector (dx, dz_solved), for pelvis-relative angles. */
  readonly h: { x: number; z: number } | null;
}

export function solveSegment(series: LandmarkSeries, f: LandmarkSeriesFrame, a: number, b: number, L: number): SegmentFrame {
  const p = point(f, a), q = point(f, b);
  if (!p || !q || !(L > 0)) return { d_xy: null, theta_deg: null, tracking_failure: false, h: null };
  const dx = (p.x - q.x) * series.header.width, dy = (p.y - q.y) * series.header.height;
  const d = Math.hypot(dx, dy);
  if (d > L * (1 + RIGID_LENGTH_TOL)) return { d_xy: d, theta_deg: null, tracking_failure: true, h: null };
  const r = Math.min(1, d / L);
  const dz = Math.sqrt(Math.max(0, L * L - Math.min(d, L) ** 2));
  return { d_xy: d, theta_deg: (Math.acos(r) * 180) / Math.PI, tracking_failure: false, h: { x: dx, z: dz } };
}

/** Angle between two horizontal-plane vectors, degrees, via normalised dot product. */
export function horizontalAngleDeg(u: { x: number; z: number } | null, v: { x: number; z: number } | null): number | null {
  if (!u || !v) return null;
  const nu = Math.hypot(u.x, u.z), nv = Math.hypot(v.x, v.z);
  if (!(nu > 0 && nv > 0)) return null;
  const c = Math.max(-1, Math.min(1, (u.x * v.x + u.z * v.z) / (nu * nv)));
  return (Math.acos(c) * 180) / Math.PI;
}
