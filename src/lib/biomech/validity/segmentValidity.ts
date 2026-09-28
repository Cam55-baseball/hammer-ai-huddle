/**
 * SEGMENT VALIDITY — universal per-frame landmark trust gate (2026-09-28).
 *
 * Every segment below is a rigid body: its 3-D length cannot change. Each
 * segment's reference length is its median 2-D length over the Stance Lock
 * window (px, then % of stature). In a frame where a segment's 2-D length
 * deviates from that reference by more than SEGMENT_TOL, the landmarks that
 * segment depends on are UNTRUSTED in that frame — not the whole frame. A bad
 * left wrist never invalidates a hip.
 *
 * A landmark is untrusted if ANY segment touching it fails. Longer than the
 * reference beyond tolerance is physically impossible in 2-D (projection can
 * only shorten) → tracking failure. Shorter beyond tolerance is either real
 * foreshortening or a mis-track; a single camera cannot tell them apart, so it
 * is untrusted (conservative, owner-approved rule 2026-09-28). Stated in lineage.
 *
 * Never uses MediaPipe visibility.
 */
import type { LandmarkSeries, LandmarkSeriesFrame } from "../pose/landmarkSeriesFormat";
import { LM, pointPx, median, mid, round4, type Pt } from "../anchors/poseKinematics";
import { headCentroidPx, type StanceLock } from "../anchors/stanceLock";

export const SEGMENT_VALIDITY_VERSION = "segment_validity@1.0.0-lock-median-tol-0.20";
/**
 * Owner-approved 20%. Still clip 15d75bc9 measured worst-segment p99 deviation
 * well under this (see docs/landmark-noise-floors.md, "Rigid-segment natural
 * variation"); 20% sits above pose noise yet below the 914cf54c left-wrist
 * mis-track (forearm at 32–68% of its reference).
 */
export const SEGMENT_TOL = 0.2;

/** Pseudo-landmark for the head centroid (mean of nose, eyes, ears). */
export const HEAD = -1;
export interface Segment { readonly key: string; readonly a: number; readonly b: number }
export const SEGMENTS: readonly Segment[] = [
  { key: "upper_arm_L", a: LM.L_SHOULDER, b: LM.L_ELBOW }, { key: "upper_arm_R", a: LM.R_SHOULDER, b: LM.R_ELBOW },
  { key: "forearm_L", a: LM.L_ELBOW, b: LM.L_WRIST }, { key: "forearm_R", a: LM.R_ELBOW, b: LM.R_WRIST },
  { key: "thigh_L", a: LM.L_HIP, b: LM.L_KNEE }, { key: "thigh_R", a: LM.R_HIP, b: LM.R_KNEE },
  { key: "shin_L", a: LM.L_KNEE, b: LM.L_ANKLE }, { key: "shin_R", a: LM.R_KNEE, b: LM.R_ANKLE },
  { key: "foot_L", a: LM.L_ANKLE, b: 31 }, { key: "foot_R", a: LM.R_ANKLE, b: 32 },
  { key: "shoulder_width", a: LM.L_SHOULDER, b: LM.R_SHOULDER }, { key: "hip_width", a: LM.L_HIP, b: LM.R_HIP },
  { key: "neck", a: HEAD, b: -2 },
];
/**
 * Shoulder and hip WIDTH legitimately shrink in 2-D as the body turns side-on
 * (that is the rotation signal). Only their over-length is a tracking failure;
 * under-length never invalidates. Same for the neck (head turn/tilt).
 */
const SHRINK_OK = new Set(["shoulder_width", "hip_width", "neck"]);

function pt(series: LandmarkSeries, f: LandmarkSeriesFrame, i: number): Pt | null {
  if (i === HEAD) return headCentroidPx(series, f);
  if (i === -2) return mid(pointPx(series, f, LM.L_SHOULDER), pointPx(series, f, LM.R_SHOULDER));
  return pointPx(series, f, i);
}
export function segmentLengthPx(series: LandmarkSeries, f: LandmarkSeriesFrame, s: Segment): number | null {
  const p = pt(series, f, s.a), q = pt(series, f, s.b);
  return p && q ? Math.hypot(p.x - q.x, p.y - q.y) : null;
}

export interface SegmentValidity {
  readonly version: string;
  readonly ref_pct_stature: Readonly<Record<string, number | null>>;
  /** Per-frame (series index) set of UNTRUSTED landmark indices. */
  readonly untrusted: readonly ReadonlySet<number>[];
  /** Per-frame per-segment reasons, only for failures. */
  readonly failures: readonly Readonly<Record<string, "over_length_tracking_failure" | "under_length_foreshortened_or_mistracked">>[];
  trusted(k: number, landmark: number): boolean;
  trustedAll(k: number, landmarks: readonly number[]): boolean;
}

export function buildSegmentValidity(series: LandmarkSeries, lock: StanceLock): SegmentValidity | null {
  const st = lock.baseline?.stature_px;
  if (!lock.ok || lock.start_k == null || lock.end_k == null || !st) return null;
  const ref: Record<string, number | null> = {};
  for (const s of SEGMENTS) {
    const xs: number[] = [];
    for (let k = lock.start_k; k <= lock.end_k; k++) { const L = segmentLengthPx(series, series.frames[k], s); if (L != null) xs.push(L); }
    ref[s.key] = xs.length ? median(xs) : null;
  }
  const untrusted: Set<number>[] = [], failures: Record<string, "over_length_tracking_failure" | "under_length_foreshortened_or_mistracked">[] = [];
  for (const f of series.frames) {
    const u = new Set<number>(), fl: Record<string, "over_length_tracking_failure" | "under_length_foreshortened_or_mistracked"> = {};
    for (const s of SEGMENTS) {
      const R = ref[s.key], L = segmentLengthPx(series, f, s);
      if (R == null || L == null || !(R > 0)) continue;
      const d = L / R - 1;
      const bad = d > SEGMENT_TOL ? "over_length_tracking_failure" : d < -SEGMENT_TOL && !SHRINK_OK.has(s.key) ? "under_length_foreshortened_or_mistracked" : null;
      if (!bad) continue;
      fl[s.key] = bad;
      // Blame the distal landmark of a limb chain; for widths/neck both ends.
      if (s.key.startsWith("forearm") || s.key.startsWith("shin") || s.key.startsWith("foot") || s.key.startsWith("upper_arm") || s.key.startsWith("thigh")) u.add(s.b);
      else { if (s.a >= 0) u.add(s.a); if (s.b >= 0) u.add(s.b); if (s.a === HEAD) for (const i of [0, 2, 5, 7, 8]) u.add(i); }
    }
    untrusted.push(u); failures.push(fl);
  }
  const refPct: Record<string, number | null> = {};
  for (const k of Object.keys(ref)) refPct[k] = ref[k] == null ? null : round4((ref[k]! * 100) / st);
  return {
    version: SEGMENT_VALIDITY_VERSION, ref_pct_stature: refPct, untrusted, failures,
    trusted: (k, i) => !(untrusted[k]?.has(i) ?? false),
    trustedAll: (k, is) => is.every((i) => !(untrusted[k]?.has(i) ?? false)),
  };
}

/** Wrap a pointPx lookup so untrusted landmarks read as missing. */
export function trustedPointPx(series: LandmarkSeries, v: SegmentValidity | null, k: number, i: number): Pt | null {
  if (v && !v.trusted(k, i)) return null;
  return pointPx(series, series.frames[k], i);
}
