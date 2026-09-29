/**
 * Throwing card — INJURY-PREVENTION markers (owner reframe 2026-09-29).
 * Research basis and evidence strength: docs/THROWING-INJURY-RESEARCH.md.
 *
 * These are mechanics the published research associates with higher arm load.
 * They never diagnose and never predict injury. Every tile is UNVALIDATED
 * until the owner supplies real throwing clips.
 *
 * Throwing arm / front leg come from the throwing side (strideSide.ts), never fixed.
 * Grading only where a published video criterion exists; otherwise the value
 * is an ungraded observation (no invented thresholds).
 */
import type { LandmarkSeries, LandmarkSeriesFrame } from "../pose/landmarkSeriesFormat";
import type { Handedness } from "../side/strideSide";
import { frontAnkleIndex } from "../side/strideSide";
import { pointPx, round4, LM, type Pt } from "../anchors/poseKinematics";
import { unroll, type StanceLock } from "../anchors/stanceLock";
import type { PitchingDelivery } from "./pitchingTiles";
import { checkCameraRequirement, type CameraView } from "../camera/cameraView";
import { MISSINGNESS_REASONS as R } from "./missingness";

export const THROWING_INJURY_TILES_VERSION = "throwing_injury_tiles@1.0.0-2026-09-29-unvalidated";

export type InjuryKey =
  | "arm_late_at_foot_strike" | "elbow_height_at_foot_strike" | "elbow_height_at_release"
  | "front_knee_after_landing" | "across_body_stride" | "trunk_lateral_tilt_at_release"
  | "arm_outside_body_frame" | "deceleration_follow_through";

export type Evidence = "moderate" | "limited" | "weak";
export interface InjuryMarker {
  key: InjuryKey;
  value: number | null;
  unit: string;
  verdict: "pass" | "fail" | null;
  graded: boolean;
  missing_reason: string | null;
  evidence: Evidence;
  sources: readonly string[];
  professional_note: boolean;
  lineage: Record<string, unknown>;
}

/** Still clip 15d75bc9, p2–p98 range, measured before any threshold (see research doc). */
export const THROWING_INJURY_FLOORS = {
  wrist_over_elbow_forearms: 0.12,
  elbow_over_shoulder_torsos: 0.03,
  front_knee_deg: 4.0,
  head_offset_head_widths: 0.15,
} as const;

export const INJURY_META: Record<InjuryKey, { evidence: Evidence; sources: string[]; professional_note: boolean; camera: string }> = {
  arm_late_at_foot_strike: { evidence: "moderate", sources: ["Davis et al. 2009, Am J Sports Med 37(8)"], professional_note: false, camera: "side-on" },
  elbow_height_at_foot_strike: { evidence: "limited", sources: ["Matsuo et al. 2002 (simulation)", "Fleisig 2010 ASMI review"], professional_note: false, camera: "either" },
  elbow_height_at_release: { evidence: "limited", sources: ["Matsuo et al. 2002 (simulation)", "Aguinaldo & Chambers 2009"], professional_note: false, camera: "either" },
  front_knee_after_landing: { evidence: "weak", sources: ["Fleisig 2010 ASMI review (performance link; injury link indirect)"], professional_note: false, camera: "side-on" },
  across_body_stride: { evidence: "limited", sources: ["Davis et al. 2009 (stride foot toward target)", "Fleisig 2010 ASMI review"], professional_note: false, camera: "behind/in front" },
  trunk_lateral_tilt_at_release: { evidence: "moderate", sources: ["Oyama et al. 2014, Am J Sports Med", "Solomito et al. 2015, Am J Sports Med 43(5)"], professional_note: false, camera: "behind/in front" },
  arm_outside_body_frame: { evidence: "weak", sources: ["Fleisig 2010 ASMI review"], professional_note: false, camera: "behind/in front" },
  deceleration_follow_through: { evidence: "weak", sources: ["Fleisig et al. 1995, Am J Sports Med (deceleration forces)"], professional_note: true, camera: "side-on" },
};

const mk = (key: InjuryKey, unit: string, value: number | null, verdict: "pass" | "fail" | null, missing: string | null, lineage: Record<string, unknown>): InjuryMarker => {
  const m = INJURY_META[key];
  return { key, unit, value: value == null ? null : round4(value), verdict, graded: verdict != null, missing_reason: value == null && verdict == null ? missing ?? R.ANCHOR_NOT_DETECTED : null,
    evidence: m.evidence, sources: m.sources, professional_note: m.professional_note, lineage: { camera: m.camera, unvalidated: true, ...lineage } };
};
const refuseAll = (reason: string): Record<InjuryKey, InjuryMarker> =>
  Object.fromEntries((Object.keys(INJURY_META) as InjuryKey[]).map((k) => [k, mk(k, "", null, null, reason, { reason })])) as Record<InjuryKey, InjuryMarker>;
export const refusedInjuryMarkers = refuseAll;

interface Ctx { s: LandmarkSeries; lock: StanceLock; side: Handedness }
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

export function computeThrowingInjuryMarkers(s: LandmarkSeries, d: PitchingDelivery, lock: StanceLock, side: Handedness, view: CameraView | null): Record<InjuryKey, InjuryMarker> {
  if (!d.ok || d.plant_k == null || d.release_k == null || !lock.ok) return refuseAll("throwing_delivery_not_confirmed");
  const c: Ctx = { s, lock, side };
  const SH = side === "R" ? LM.R_SHOULDER : LM.L_SHOULDER, EL = side === "R" ? LM.R_ELBOW : LM.L_ELBOW, WR = side === "R" ? LM.R_WRIST : LM.L_WRIST;
  const fa = frontAnkleIndex(side), fk = fa === 27 ? LM.L_KNEE : LM.R_KNEE, fh = fa === 27 ? LM.L_HIP : LM.R_HIP;
  const cam = (tile: string) => checkCameraRequirement(tile, view);
  const forearm = stanceMedian(c, (f) => { const e = P(c, f, EL), w = P(c, f, WR); return e && w ? Math.hypot(e.x - w.x, e.y - w.y) : null; });
  const torso = stanceMedian(c, (f) => { const a = P(c, f, SH), h = P(c, f, side === "R" ? LM.R_HIP : LM.L_HIP); return a && h ? Math.abs(h.y - a.y) : null; });
  const out = {} as Record<InjuryKey, InjuryMarker>;

  // 1. Arm late at foot strike (Davis 2009: arm in throwing position at foot contact).
  {
    const up = forearm ? med3(c, d.plant_k, (f) => { const e = P(c, f, EL), w = P(c, f, WR); return e && w ? (e.y - w.y) / forearm : null; }) : null;
    const fl = THROWING_INJURY_FLOORS.wrist_over_elbow_forearms;
    out.arm_late_at_foot_strike = up == null ? mk("arm_late_at_foot_strike", "forearm_lengths", null, null, R.LANDMARK_OCCLUDED, { reason: "throwing_arm_hidden_at_foot_strike" })
      : Math.abs(up) <= fl ? mk("arm_late_at_foot_strike", "forearm_lengths", up, null, null, { reason: "within_noise_floor_cannot_call", noise_floor: fl })
      : mk("arm_late_at_foot_strike", "forearm_lengths", up, up > fl ? "pass" : "fail", null, { criterion: "throwing hand above elbow at front-foot strike", noise_floor: fl });
  }
  // 2/3. Elbow height vs shoulder (ungraded — no published video threshold).
  for (const [key, k] of [["elbow_height_at_foot_strike", d.plant_k], ["elbow_height_at_release", d.release_k]] as const) {
    const v = torso ? med3(c, k, (f) => { const a = P(c, f, SH), e = P(c, f, EL); return a && e ? (a.y - e.y) / torso : null; }) : null;
    out[key] = mk(key, "torso_lengths_above_shoulder", v, null, v == null ? R.LANDMARK_OCCLUDED : null, { standard: "ungraded_no_published_video_threshold", noise_floor: THROWING_INJURY_FLOORS.elbow_over_shoulder_torsos });
  }
  // 4. Front knee keeps bending after landing (ungraded, weak evidence).
  {
    const kAt = (k: number) => med3(c, k, (f) => { const h = P(c, f, fh), n = P(c, f, fk), a = P(c, f, fa); return h && n && a ? angle(h, n, a) : null; });
    const a0 = kAt(d.plant_k), a1 = kAt(d.release_k);
    const g = cam("front_knee_after_landing");
    out.front_knee_after_landing = !g.ok ? mk("front_knee_after_landing", "degrees", null, null, R.CALIBRATION_UNAVAILABLE, { reason: g.detail })
      : a0 == null || a1 == null ? mk("front_knee_after_landing", "degrees", null, null, R.LANDMARK_OCCLUDED, { reason: "front_leg_hidden" })
      : mk("front_knee_after_landing", "degrees_further_bend", a0 - a1, null, null, { standard: "ungraded_weak_evidence", noise_floor: THROWING_INJURY_FLOORS.front_knee_deg, knee_at_plant: round4(a0), knee_at_release: round4(a1) });
  }
  // 5/7. Lateral quantities — need a view from behind or in front; not built (no on-line clip).
  out.across_body_stride = mk("across_body_stride", "degrees", null, null, R.CALIBRATION_UNAVAILABLE, { reason: "camera_view_mismatch:needs_two_view_pair" });
  out.arm_outside_body_frame = mk("arm_outside_body_frame", "degrees", null, null, R.CALIBRATION_UNAVAILABLE, { reason: view === "on_line" ? "not_built:no_on_line_throwing_clip" : "camera_view_mismatch:needs_on_line_view" });
  // 6. Trunk lateral tilt (Oyama 2014 video criterion: throwing-side head beyond stride-ankle vertical by > one head width).
  {
    const g = cam("trunk_lateral_tilt_at_release");
    const headW = stanceMedian(c, (f) => { const a = P(c, f, 7), b = P(c, f, 8); return a && b ? Math.abs(a.x - b.x) : null; });
    const ear = side === "R" ? 8 : 7;
    const off = g.ok && headW ? med3(c, d.release_k, (f) => { const e = P(c, f, ear), a = P(c, f, fa); return e && a ? Math.abs(e.x - a.x) / headW : null; }) : null;
    out.trunk_lateral_tilt_at_release = !g.ok ? mk("trunk_lateral_tilt_at_release", "head_widths", null, null, R.CALIBRATION_UNAVAILABLE, { reason: g.detail })
      : off == null ? mk("trunk_lateral_tilt_at_release", "head_widths", null, null, R.LANDMARK_OCCLUDED, { reason: "head_or_front_ankle_hidden" })
      : Math.abs(off - 1) <= THROWING_INJURY_FLOORS.head_offset_head_widths ? mk("trunk_lateral_tilt_at_release", "head_widths", off, null, null, { reason: "within_noise_floor_of_criterion" })
      : mk("trunk_lateral_tilt_at_release", "head_widths", off, off > 1 ? "fail" : "pass", null, { criterion: "Oyama 2014: > 1 head width", note: "published at max external rotation; measured here at release", view_unvalidated: true });
  }
  // 8. Deceleration: throwing hand finishes below the front hip within 0.5 s of release (ungraded observation).
  {
    const fps = s.header.fps_true ?? 0;
    const end = Math.min(s.frames.length - 1, d.release_k + Math.round(fps * 0.5));
    let seen: number | null = null, observed = 0;
    for (let k = d.release_k + 1; k <= end; k++) { const w = P(c, s.frames[k], WR), h = P(c, s.frames[k], fh); if (w && h) { observed++; if (w.y > h.y && seen == null) seen = k; } }
    out.deceleration_follow_through = !fps || observed < 3 ? mk("deceleration_follow_through", "seconds", null, null, R.LANDMARK_OCCLUDED, { reason: "follow_through_not_observed" })
      : mk("deceleration_follow_through", "seconds_to_hand_below_front_hip", seen == null ? -1 : (seen - d.release_k) / fps, null, null, { finished: seen != null, standard: "ungraded_no_published_video_threshold" });
  }
  return out;
}
