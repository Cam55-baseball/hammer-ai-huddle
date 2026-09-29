/**
 * Throwing card — INJURY-PREVENTION FLAGS (owner reframe 2026-09-29).
 * Doctrine + sources: docs/THROWING-DOCTRINE.md.
 *
 * A flag is NEVER a grade: grading_weight is always 0, verdict is always null.
 * "raised" means the mechanic the research associates with more shoulder/elbow
 * stress was seen clearly beyond the still-clip noise floor; "clear" means it
 * was clearly not seen; anything inside the floor is no call. Never a
 * diagnosis, never a prediction. UNVALIDATED until owner throwing clips.
 *
 * All angles are 2-D image-plane projections, not true 3-D joint angles.
 * Throwing arm / front leg from the throwing side (strideSide.ts), never fixed.
 */
import type { LandmarkSeries, LandmarkSeriesFrame } from "../pose/landmarkSeriesFormat";
import type { Handedness } from "../side/strideSide";
import { frontAnkleIndex } from "../side/strideSide";
import { pointPx, round4, LM, type Pt } from "../anchors/poseKinematics";
import { unroll, type StanceLock } from "../anchors/stanceLock";
import type { PitchingDelivery } from "./pitchingTiles";
import type { CameraView } from "../camera/cameraView";
import { MISSINGNESS_REASONS as R } from "./missingness";

export const THROWING_INJURY_TILES_VERSION = "throwing_injury_flags@3.0.0-2026-09-29-elite-filter-unvalidated";

/**
 * Elite filter (owner 2026-09-29): only three flags survive. Cut — elbow height at
 * landing, elbow bend at landing, front knee, glove-side lean, sidearm slot. See
 * docs/THROWING-DOCTRINE.md before re-adding anything.
 */
export type InjuryKey = "trunk_rotation_before_foot_contact" | "horizontal_abduction_at_foot_contact" | "stride_foot_direction";

export type Evidence = "moderate" | "limited" | "weak";
export type Flag = "raised" | "clear" | null;
export interface InjuryMarker {
  key: InjuryKey;
  value: number | null;
  unit: string;
  /** Always null — injury flags carry no grading weight. */
  verdict: null;
  flag: Flag;
  grading_weight: 0;
  missing_reason: string | null;
  evidence: Evidence;
  sources: readonly string[];
  camera: string;
  lineage: Record<string, unknown>;
}

export const INJURY_META: Record<InjuryKey, { evidence: Evidence; sources: string[]; camera: string }> = {
  trunk_rotation_before_foot_contact: { evidence: "moderate", sources: ["Aguinaldo & Chambers 2009, Am J Sports Med", "Fleisig et al. (ASMI)"], camera: "side-on" },
  horizontal_abduction_at_foot_contact: { evidence: "limited", sources: ["Takagi et al.", "Aguinaldo & Chambers 2009"], camera: "behind/overhead — depth axis side-on" },
  stride_foot_direction: { evidence: "limited", sources: ["Movement System Dysfunction in throwers, PMC8720247"], camera: "behind/in front" },
};

const mk = (key: InjuryKey, unit: string, value: number | null, flag: Flag, missing: string | null, lineage: Record<string, unknown>): InjuryMarker => {
  const m = INJURY_META[key];
  return { key, unit, value: value == null ? null : round4(value), verdict: null, flag, grading_weight: 0,
    missing_reason: value == null && flag == null ? missing ?? R.ANCHOR_NOT_DETECTED : null,
    evidence: m.evidence, sources: m.sources, camera: m.camera, lineage: { unvalidated: true, projection: "2d_image_plane", ...lineage } };
};
const refuseAll = (reason: string): Record<InjuryKey, InjuryMarker> =>
  Object.fromEntries((Object.keys(INJURY_META) as InjuryKey[]).map((k) => [k, mk(k, "", null, null, reason, { reason })])) as Record<InjuryKey, InjuryMarker>;
export const refusedInjuryMarkers = refuseAll;

/** Band flag: raised only when clearly outside the band by more than the floor. */
export function bandFlag(v: number, lo: number, hi: number, floor: number): Flag {
  if (v < lo - floor || v > hi + floor) return "raised";
  if (v > lo + floor && v < hi - floor) return "clear";
  return null;
}

interface Ctx { s: LandmarkSeries; lock: StanceLock }
const P = (c: Ctx, f: LandmarkSeriesFrame | undefined, i: number): Pt | null => {
  if (!f) return null; const p = pointPx(c.s, f, i); return p ? unroll(p, c.lock.baseline?.roll_deg ?? 0) : null;
};
const med3 = (c: Ctx, k: number, g: (f: LandmarkSeriesFrame) => number | null): number | null => {
  const v = [k - 1, k, k + 1].map((j) => (c.s.frames[j] ? g(c.s.frames[j]) : null)).filter((x): x is number => x != null).sort((a, b) => a - b);
  return v.length >= 2 ? v[Math.floor((v.length - 1) / 2)] : null;
};
const stanceMedian = (c: Ctx, g: (f: LandmarkSeriesFrame) => number | null): number | null => {
  const v: number[] = [];
  for (let k = c.lock.start_k ?? 0; k <= (c.lock.end_k ?? -1); k++) { const x = g(c.s.frames[k]); if (x != null && x > 0) v.push(x); }
  v.sort((a, b) => a - b); return v.length ? v[Math.floor((v.length - 1) / 2)] : null;
};
const angle = (a: Pt, b: Pt, c: Pt) => {
  const u = { x: a.x - b.x, y: a.y - b.y }, v = { x: c.x - b.x, y: c.y - b.y };
  return (Math.acos(Math.max(-1, Math.min(1, (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y) || 1)))) * 180) / Math.PI;
};

export interface ShoulderOpenInput { verdict: "pass" | "fail" | null; value: number | null; lineage?: Readonly<Record<string, unknown>> }

export function computeThrowingInjuryMarkers(
  s: LandmarkSeries, d: PitchingDelivery, lock: StanceLock, side: Handedness, view: CameraView | null, shoulderOpen: ShoulderOpenInput | null,
): Record<InjuryKey, InjuryMarker> {
  if (!d.ok || d.plant_k == null || d.release_k == null || !lock.ok) return refuseAll("throwing_delivery_not_confirmed");
  const c: Ctx = { s, lock };
  const SH = side === "R" ? LM.R_SHOULDER : LM.L_SHOULDER, EL = side === "R" ? LM.R_ELBOW : LM.L_ELBOW, WR = side === "R" ? LM.R_WRIST : LM.L_WRIST;
  const HP = side === "R" ? LM.R_HIP : LM.L_HIP;
  const fa = frontAnkleIndex(side), fk = fa === 27 ? LM.L_KNEE : LM.R_KNEE, fh = fa === 27 ? LM.L_HIP : LM.R_HIP;
  const sideOn = view === "side_on", onLine = view === "on_line";
  const out = {} as Record<InjuryKey, InjuryMarker>;

  // 1. Trunk rotation before foot contact — the SAME measurement as shoulder_opening (five-signal fusion).
  out.trunk_rotation_before_foot_contact = !shoulderOpen || shoulderOpen.verdict == null
    ? mk("trunk_rotation_before_foot_contact", "degrees", null, null, R.ANCHOR_NOT_DETECTED, { reason: "shoulder_opening_fusion_refused", reused: "premature_shoulder_open_deg" })
    : mk("trunk_rotation_before_foot_contact", "degrees", shoulderOpen.value, shoulderOpen.verdict === "fail" ? "raised" : "clear", null, { reused: "premature_shoulder_open_deg", fusion: shoulderOpen.lineage ?? null });

  // 4/5. Depth-axis quantities side-on — refuse honestly; no behind-view throwing clip exists to build against.
  out.horizontal_abduction_at_foot_contact = mk("horizontal_abduction_at_foot_contact", "degrees", null, null, R.CALIBRATION_UNAVAILABLE,
    { reason: sideOn ? "camera_view_mismatch:arm_behind_trunk_is_along_camera_depth" : "not_built:no_behind_view_throwing_clip" });
  out.stride_foot_direction = mk("stride_foot_direction", "degrees", null, null, R.CALIBRATION_UNAVAILABLE,
    { reason: sideOn ? "camera_view_mismatch:foot_yaw_and_lateral_offset_are_along_camera_depth" : "not_built:no_behind_view_throwing_clip" });

  return out;
}
