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

export const THROWING_INJURY_TILES_VERSION = "throwing_injury_flags@2.0.0-2026-09-29-unvalidated";

export type InjuryKey =
  | "trunk_rotation_before_foot_contact" | "shoulder_abduction_at_foot_contact" | "elbow_flexion_at_foot_contact"
  | "horizontal_abduction_at_foot_contact" | "stride_foot_direction" | "lead_knee_flexion"
  | "contralateral_trunk_tilt" | "sidearm_arm_slot";

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

/**
 * Still clip 15d75bc9, p2–p98 range of the 2-D angle, worst side, measured
 * BEFORE any flag rule. Near-side arm in brackets. The far arm side-on is
 * very noisy for elbow bend (26°) — clear cases only.
 */
export const THROWING_INJURY_FLOORS = {
  shoulder_abduction_deg: 6.2, // R 3.4
  elbow_flexion_deg: 26.0, // R 5.1 — far arm unusable near the line
  knee_flexion_deg: 5.4, // R 5.0 — LARGER than half the 45–55° band: band edges unresolvable
  arm_slot_deg: 11.9, // R 4.3
  head_offset_head_widths: 0.43, // against Oyama's 1-head-width criterion
} as const;

/** Research figures; flag bands marked `ours` are pending owner confirmation. */
export const INJURY_FLAG_RULES = {
  shoulder_abduction_deg: { target: 90, band: [70, 110], band_source: "ours_pending_owner (research: ~90°, both markedly above and below raise elbow stress)" },
  elbow_flexion_deg: { min: 90, source: "Aguinaldo & Chambers 2009; >90° by end of stride" },
  lead_knee_flexion_deg: { band: [45, 55], source: "research summary; ~45–55° at foot contact, extending through release" },
  sidearm_slot_from_vertical_deg: { min: 70, band_source: "ours_pending_owner (no published slot angle)" },
} as const;

export const INJURY_META: Record<InjuryKey, { evidence: Evidence; sources: string[]; camera: string }> = {
  trunk_rotation_before_foot_contact: { evidence: "moderate", sources: ["Aguinaldo & Chambers 2009, Am J Sports Med", "Fleisig et al. (ASMI)"], camera: "side-on" },
  shoulder_abduction_at_foot_contact: { evidence: "limited", sources: ["Biomechanical Analysis of the Throwing Athlete (Physiopedia summary)", "Matsuo et al. 2002"], camera: "side-on (2-D projection)" },
  elbow_flexion_at_foot_contact: { evidence: "moderate", sources: ["Aguinaldo & Chambers 2009, Am J Sports Med"], camera: "side-on, throwing arm on camera side" },
  horizontal_abduction_at_foot_contact: { evidence: "limited", sources: ["Takagi et al.", "Aguinaldo & Chambers 2009"], camera: "behind/overhead — depth axis side-on" },
  stride_foot_direction: { evidence: "limited", sources: ["Movement System Dysfunction in throwers, PMC8720247"], camera: "behind/in front" },
  lead_knee_flexion: { evidence: "limited", sources: ["Chalmers et al.", "Fleisig (ASMI)"], camera: "side-on" },
  contralateral_trunk_tilt: { evidence: "moderate", sources: ["Systematic review, PMC10043103", "Oyama et al. 2014", "Solomito et al. 2015"], camera: "behind/in front" },
  sidearm_arm_slot: { evidence: "limited", sources: ["Movement System Dysfunction in throwers, PMC8720247"], camera: "behind/in front" },
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
  const F = THROWING_INJURY_FLOORS;

  // 1. Trunk rotation before foot contact — the SAME measurement as shoulder_opening (five-signal fusion).
  out.trunk_rotation_before_foot_contact = !shoulderOpen || shoulderOpen.verdict == null
    ? mk("trunk_rotation_before_foot_contact", "degrees", null, null, R.ANCHOR_NOT_DETECTED, { reason: "shoulder_opening_fusion_refused", reused: "premature_shoulder_open_deg" })
    : mk("trunk_rotation_before_foot_contact", "degrees", shoulderOpen.value, shoulderOpen.verdict === "fail" ? "raised" : "clear", null, { reused: "premature_shoulder_open_deg", fusion: shoulderOpen.lineage ?? null });

  // 2. Shoulder abduction at foot contact: trunk line (hip→shoulder) vs upper arm (shoulder→elbow).
  if (!sideOn) out.shoulder_abduction_at_foot_contact = mk("shoulder_abduction_at_foot_contact", "degrees", null, null, R.CALIBRATION_UNAVAILABLE, { reason: "camera_view_mismatch:needs_side_on" });
  else {
    const v = med3(c, d.plant_k, (f) => { const h = P(c, f, HP), a = P(c, f, SH), e = P(c, f, EL); return h && a && e ? angle(h, a, e) : null; });
    const r = INJURY_FLAG_RULES.shoulder_abduction_deg;
    out.shoulder_abduction_at_foot_contact = v == null ? mk("shoulder_abduction_at_foot_contact", "degrees", null, null, R.LANDMARK_OCCLUDED, { reason: "throwing_arm_hidden_at_foot_contact" })
      : mk("shoulder_abduction_at_foot_contact", "degrees", v, bandFlag(v, r.band[0], r.band[1], F.shoulder_abduction_deg), null, { rule: r, noise_floor: F.shoulder_abduction_deg });
  }

  // 3. Elbow flexion at foot contact (180 − interior angle). Far arm floor is 26°.
  if (!sideOn) out.elbow_flexion_at_foot_contact = mk("elbow_flexion_at_foot_contact", "degrees", null, null, R.CALIBRATION_UNAVAILABLE, { reason: "camera_view_mismatch:needs_side_on" });
  else {
    const v = med3(c, d.plant_k, (f) => { const a = P(c, f, SH), e = P(c, f, EL), w = P(c, f, WR); return a && e && w ? 180 - angle(a, e, w) : null; });
    const fl = F.elbow_flexion_deg, min = INJURY_FLAG_RULES.elbow_flexion_deg.min;
    out.elbow_flexion_at_foot_contact = v == null ? mk("elbow_flexion_at_foot_contact", "degrees", null, null, R.LANDMARK_OCCLUDED, { reason: "throwing_arm_hidden_at_foot_contact" })
      : mk("elbow_flexion_at_foot_contact", "degrees", v, v < min - fl ? "raised" : v > min + fl ? "clear" : null, null, { rule: INJURY_FLAG_RULES.elbow_flexion_deg, noise_floor: fl });
  }

  // 4/5. Depth-axis quantities side-on — refuse honestly; no behind-view throwing clip exists to build against.
  out.horizontal_abduction_at_foot_contact = mk("horizontal_abduction_at_foot_contact", "degrees", null, null, R.CALIBRATION_UNAVAILABLE,
    { reason: sideOn ? "camera_view_mismatch:arm_behind_trunk_is_along_camera_depth" : "not_built:no_behind_view_throwing_clip" });
  out.stride_foot_direction = mk("stride_foot_direction", "degrees", null, null, R.CALIBRATION_UNAVAILABLE,
    { reason: sideOn ? "camera_view_mismatch:foot_yaw_and_lateral_offset_are_along_camera_depth" : "not_built:no_behind_view_throwing_clip" });

  // 6. Lead knee: in band at contact, and not bending further by release.
  if (!sideOn) out.lead_knee_flexion = mk("lead_knee_flexion", "degrees", null, null, R.CALIBRATION_UNAVAILABLE, { reason: "camera_view_mismatch:needs_side_on" });
  else {
    const kAt = (k: number) => med3(c, k, (f) => { const h = P(c, f, fh), n = P(c, f, fk), a = P(c, f, fa); return h && n && a ? 180 - angle(h, n, a) : null; });
    const a0 = kAt(d.plant_k), a1 = kAt(d.release_k), fl = F.knee_flexion_deg, band = INJURY_FLAG_RULES.lead_knee_flexion_deg.band;
    if (a0 == null || a1 == null) out.lead_knee_flexion = mk("lead_knee_flexion", "degrees", null, null, R.LANDMARK_OCCLUDED, { reason: "front_leg_hidden" });
    else {
      const contact = bandFlag(a0, band[0], band[1], fl);
      const kept = a1 - a0 > fl ? "raised" : a0 - a1 > fl ? "clear" : null; // still bending vs extending
      const flag: Flag = contact === "raised" || kept === "raised" ? "raised" : contact === "clear" && kept === "clear" ? "clear" : null;
      out.lead_knee_flexion = mk("lead_knee_flexion", "degrees", a0, flag, null,
        { knee_flex_at_contact: round4(a0), knee_flex_at_release: round4(a1), contact_flag: contact, still_bending_flag: kept, noise_floor: fl, note: "floor exceeds half the 45–55° band — edges unresolvable", rule: INJURY_FLAG_RULES.lead_knee_flexion_deg });
    }
  }

  // 7. Contralateral trunk tilt (Oyama video criterion) — frontal plane at release: behind/in-front view only.
  if (!onLine) out.contralateral_trunk_tilt = mk("contralateral_trunk_tilt", "head_widths", null, null, R.CALIBRATION_UNAVAILABLE, { reason: "camera_view_mismatch:needs_on_line_view" });
  else {
    const headW = stanceMedian(c, (f) => { const a = P(c, f, 7), b = P(c, f, 8); return a && b ? Math.abs(a.x - b.x) : null; });
    const ear = side === "R" ? 8 : 7;
    const off = headW ? med3(c, d.release_k, (f) => { const e = P(c, f, ear), a = P(c, f, fa); return e && a ? Math.abs(e.x - a.x) / headW : null; }) : null;
    const fl = F.head_offset_head_widths;
    out.contralateral_trunk_tilt = off == null ? mk("contralateral_trunk_tilt", "head_widths", null, null, R.LANDMARK_OCCLUDED, { reason: "head_or_front_ankle_hidden" })
      : mk("contralateral_trunk_tilt", "head_widths", off, off > 1 + fl ? "raised" : off < 1 - fl ? "clear" : null, null, { criterion: "Oyama 2014: > 1 head width", noise_floor: fl, view_unvalidated: true });
  }

  // 8. Arm slot at release — caution only, never a fault. Frontal plane at release: behind/in-front view only.
  if (!onLine) out.sidearm_arm_slot = mk("sidearm_arm_slot", "degrees_from_vertical", null, null, R.CALIBRATION_UNAVAILABLE, { reason: "camera_view_mismatch:needs_on_line_view" });
  else {
    const v = med3(c, d.release_k, (f) => { const a = P(c, f, SH), w = P(c, f, WR); return a && w ? (Math.atan2(Math.abs(w.x - a.x), a.y - w.y) * 180) / Math.PI : null; });
    const fl = F.arm_slot_deg, min = INJURY_FLAG_RULES.sidearm_slot_from_vertical_deg.min;
    out.sidearm_arm_slot = v == null ? mk("sidearm_arm_slot", "degrees_from_vertical", null, null, R.LANDMARK_OCCLUDED, { reason: "throwing_arm_hidden_at_release" })
      : mk("sidearm_arm_slot", "degrees_from_vertical", v, v > min + fl ? "raised" : v < min - fl ? "clear" : null, null,
        { rule: INJURY_FLAG_RULES.sidearm_slot_from_vertical_deg, noise_floor: fl, caution_only: true, note: "the overhand gate refuses a wrist below the shoulder at release, so a true sidearm throw is refused upstream" });
  }
  return out;
}
