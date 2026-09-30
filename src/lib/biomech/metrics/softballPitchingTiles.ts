/**
 * Softball windmill pitching card — pose-only, built from
 * docs/SOFTBALL-PITCHING-DOCTRINE.md after the owner's elite filter.
 * Every standard carries SOURCED or PROPOSED and must stay marked in the app.
 *
 * Elite filter (2026-09-30): 13 doctrine tiles → 7 card items.
 *   CUT: windup_trunk_tibia, windup_hip_square, windup_foot_power_line,
 *        sfc_hip_shoulder_rotation, ft_knee_ankle (proposed ≤10°/≥20° numbers on
 *        qualitative descriptions, structure/style, edges uncallable).
 *   MERGED: sfc_arm_path + accel_arm_path(a) → arm_path.
 *   RECORD-ONLY: trunk flexion (more flexion ↔ more velocity — NEVER a fault).
 *   SAFETY FLAGS (weight 0): windup + SFC knee valgus.
 * No 20-80 grade anywhere. UNVALIDATED: no softball pitching clip exists.
 */
import type { LandmarkSeries } from "../pose/landmarkSeriesFormat";
import { pointPx, mid, round4, LM } from "../anchors/poseKinematics";
import { detectWindmillAnchors, WINDMILL_FLOORS, type WindmillAnchors } from "../anchors/windmillAnchors";
import { detectCameraView, type CameraView } from "../camera/cameraView";
import { frontAnkleIndex, rearAnkleIndex, type Handedness } from "../side/strideSide";

export const SOFTBALL_PITCHING_TILES_VERSION = "softball_pitching_tiles@1.1.0-2026-09-30-separation-baseline-stride-sfc-release-unvalidated";

export type SpBasis = "SOURCED" | "PROPOSED" | "SOURCED_BAND" | "SOURCED_CORRELATION" | "SOURCED_MIXED";
export type SpKey = "stride_profile" | "stride_triple_extension" | "trunk_flexion" | "sfc_separation" | "sfc_foot_angle" | "arm_path" | "windup_knee_valgus_flag" | "sfc_knee_valgus_flag";

/**
 * Separation noise floors — still clip 15d75bc9, measured BEFORE use, from
 * MediaPipe world landmarks (hip line vs shoulder line in the ground plane).
 * Separation: full still range 6.0° (−5.1..0.9). Pelvis rotation speed after a
 * 5-frame smooth + central difference: ±24.5°/s. Values inside these are missing.
 */
export const SEPARATION_FLOORS = { separation_deg: 6.0, pelvis_speed_dps: 25 } as const;

/** Standards. basis stays attached to every tile result and every label. */
export const SP_STANDARDS = {
  // Owner ruling 2026-09-30: top of backswing is NOT measured (phase order unresolved); SFC + release only, never graded.
  stride_profile: { basis: "SOURCED" as SpBasis, moments: ["sfc", "release"], never_graded_until: "phase_order_resolved", reference_pct: { youth: { sfc: 89, release: 68 }, collegiate: { sfc: 89, release: 73 } }, camera: "side_on" },
  stride_triple_extension: { basis: "SOURCED" as SpBasis, pass_fail_basis: "PROPOSED", camera: "two_view" },
  trunk_flexion: { basis: "SOURCED_CORRELATION" as SpBasis, never_graded: true, camera: "side_on", source: "PubMed 30038835 (youth, r 0.42–0.48)" },
  // Owner ruling 2026-09-30: record-only, per-athlete baseline. Never a population threshold.
  sfc_separation: { basis: "SOURCED_MIXED" as SpBasis, never_graded: true, per_athlete_baseline: true, camera: "any_single_3d_estimate", source: "Jump et al. 2026 (counter-rotation ↔ velocity); PMC8358524 (no angle ↔ speed)" },
  sfc_foot_angle: { basis: "SOURCED_BAND" as SpBasis, band_deg_arm_side: [0, 45], camera: "plate_line", do_not_alter: true },
  arm_path: { basis: "SOURCED" as SpBasis, threshold_basis: "PROPOSED", camera: "plate_line" },
  windup_knee_valgus_flag: { basis: "SOURCED" as SpBasis, grading_weight: 0, camera: "plate_line", source: "PubMed 34250163" },
  sfc_knee_valgus_flag: { basis: "SOURCED" as SpBasis, grading_weight: 0, camera: "plate_line", source: "PubMed 34250163" },
} as const;

/** sfc_hip_shoulder_rotation was cut as a GRADED tile; it returns as record-only `sfc_separation`. */
export const SP_CUT_BY_ELITE_FILTER = ["windup_trunk_tibia", "windup_hip_square", "windup_foot_power_line", "ft_knee_ankle", "accel_arm_path"] as const;

export interface SpTile {
  readonly key: SpKey;
  readonly basis: SpBasis;
  readonly values: Readonly<Record<string, number | null>>;
  readonly verdict: "pass" | "fail" | null;
  readonly graded: boolean;
  readonly grading_weight: number;
  readonly flag: "raised" | "clear" | null;
  readonly missing_reason: string | null;
  readonly lineage: Readonly<Record<string, unknown>>;
}
export interface SoftballPitchingResult {
  readonly version: string;
  readonly validated: false;
  readonly anchors: WindmillAnchors;
  readonly view: CameraView | null;
  readonly tiles: Readonly<Record<SpKey, SpTile>>;
}

const KEYS = Object.keys(SP_STANDARDS) as SpKey[];
const base = (key: SpKey): Omit<SpTile, "values" | "verdict" | "graded" | "missing_reason" | "lineage" | "flag"> =>
  ({ key, basis: SP_STANDARDS[key].basis, grading_weight: key.endsWith("_flag") || key === "trunk_flexion" || key === "sfc_separation" || key === "stride_profile" ? 0 : 1 });
const refuse = (key: SpKey, reason: string, lineage: Record<string, unknown> = {}): SpTile =>
  ({ ...base(key), values: {}, verdict: null, graded: false, flag: null, missing_reason: reason, lineage: { unvalidated: true, reason, ...lineage } });

export interface SpOptions {
  readonly throwing_side: Handedness | null;
  /** Needed to grade the stride profile; otherwise it is recorded ungraded. */
  readonly pitch_type?: string | null;
  readonly age_band?: "youth" | "collegiate" | null;
}

export function runSoftballPitchingTiles(s: LandmarkSeries, o: SpOptions): SoftballPitchingResult {
  const an = detectWindmillAnchors(s, o.throwing_side);
  const view = detectCameraView(s).view;
  const tiles = {} as Record<SpKey, SpTile>;
  if (!an.ok || !o.throwing_side || an.stature_px == null || an.direction_sign == null) {
    const why = an.refusal_detail ?? "no_windmill_delivery";
    for (const k of KEYS) tiles[k] = refuse(k, why, { gate: why });
    return { version: SOFTBALL_PITCHING_TILES_VERSION, validated: false, anchors: an, view, tiles };
  }
  const side = o.throwing_side, st = an.stature_px, dir = an.direction_sign, A = an.anchors;
  const F = s.frames, P = (k: number | null, i: number) => (k == null ? null : pointPx(s, F[k], i));
  const fa = frontAnkleIndex(side), ra = rearAnkleIndex(side);

  // Plate-line tiles — frontal-plane; refuse side-on, and no plate-line softball clip exists to build against.
  const plate = (k: SpKey) => refuse(k, view === "side_on" ? "camera_view_mismatch:needs_plate_line_view" : "not_built:no_plate_line_softball_clip", { camera: "plate_line" });
  for (const k of ["sfc_foot_angle", "arm_path", "windup_knee_valgus_flag", "sfc_knee_valgus_flag"] as SpKey[]) tiles[k] = plate(k);

  const sideOnOnly = view === "on_line" ? "camera_view_mismatch:needs_side_on_view" : null;

  // Stride — ankle-to-ankle horizontal distance as % of stature at SFC and release ONLY (owner ruling 2026-09-30).
  // Top of backswing is not measured: the published profile's phase order is unresolved. Never graded.
  const pct = (k: number | null) => { const f = P(k, fa), r = P(k, ra); return f && r ? round4(Math.abs(f.x - r.x) / st * 100) : null; };
  if (sideOnOnly) tiles.stride_profile = refuse("stride_profile", sideOnOnly);
  else {
    const v = { sfc: pct(A.sfc.k), release: pct(A.release.k) };
    tiles.stride_profile = { ...base("stride_profile"), values: v, verdict: null, graded: false, flag: null,
      missing_reason: v.sfc == null ? "stride_foot_unobserved" : null,
      lineage: { unvalidated: true, floor_pct: WINDMILL_FLOORS.ankle_x_pct, top_of_backswing: "not_measured:phase_order_unresolved", ungraded_reason: "phase_order_unresolved:see_doctrine_open_question", age_band: o.age_band ?? null, pitch_type: o.pitch_type ?? null } };
  }

  // Trunk flexion toward the plate — RECORD ONLY. More flexion correlates with MORE velocity; never a fault.
  const trunk = (k: number | null) => {
    const S = mid(P(k, LM.L_SHOULDER), P(k, LM.R_SHOULDER)), H = mid(P(k, LM.L_HIP), P(k, LM.R_HIP));
    return S && H && H.y > S.y ? round4((Math.atan2((S.x - H.x) * dir, H.y - S.y) * 180) / Math.PI) : null;
  };
  const tv = { top: trunk(A.top_of_backswing.k), sfc: trunk(A.sfc.k), release: trunk(A.release.k) };
  tiles.trunk_flexion = sideOnOnly ? refuse("trunk_flexion", sideOnOnly)
    : { ...base("trunk_flexion"), values: tv, verdict: null, graded: false, flag: null, missing_reason: tv.sfc == null ? "trunk_unobserved_at_sfc" : null,
        lineage: { unvalidated: true, never_graded: "more_flexion_correlates_with_more_velocity", floor_deg: WINDMILL_FLOORS.trunk_deg } };

  // Triple extension — channels (a) drive hip+knee extend and (c) trunk toward plate, side-on. (b) needs the plate line → never graded one-view.
  const rk = ra === 27 ? LM.L_KNEE : LM.R_KNEE, rh = ra === 27 ? LM.L_HIP : LM.R_HIP, rs = ra === 27 ? LM.L_SHOULDER : LM.R_SHOULDER;
  const ang = (k: number | null, a: number, b: number, c: number) => {
    const p = P(k, a), q = P(k, b), r = P(k, c); if (!p || !q || !r) return null;
    const u = { x: p.x - q.x, y: p.y - q.y }, w = { x: r.x - q.x, y: r.y - q.y };
    return (Math.acos(Math.max(-1, Math.min(1, (u.x * w.x + u.y * w.y) / (Math.hypot(u.x, u.y) * Math.hypot(w.x, w.y) || 1)))) * 180) / Math.PI;
  };
  if (sideOnOnly || A.stride_start.k == null) tiles.stride_triple_extension = refuse("stride_triple_extension", sideOnOnly ?? `stride_start_missing:${A.stride_start.missing_reason}`);
  else {
    const kneeD = (ang(A.sfc.k, rh, rk, ra) ?? NaN) - (ang(A.stride_start.k, rh, rk, ra) ?? NaN);
    const hipD = (ang(A.sfc.k, rs, rh, rk) ?? NaN) - (ang(A.stride_start.k, rs, rh, rk) ?? NaN);
    const chA = Number.isFinite(kneeD) && Number.isFinite(hipD) ? kneeD > WINDMILL_FLOORS.knee_deg && hipD > WINDMILL_FLOORS.hip_deg : null;
    const chC = tv.sfc == null ? null : tv.sfc > WINDMILL_FLOORS.trunk_deg;
    tiles.stride_triple_extension = { ...base("stride_triple_extension"), values: { knee_extension_deg: Number.isFinite(kneeD) ? round4(kneeD) : null, hip_extension_deg: Number.isFinite(hipD) ? round4(hipD) : null, trunk_toward_plate_deg: tv.sfc },
      verdict: null, graded: false, flag: null, missing_reason: chA == null ? "drive_leg_unobserved" : null,
      lineage: { unvalidated: true, channel_a: chA, channel_b: "needs_plate_line_view", channel_c: chC, ungraded_reason: "channel_b_needs_plate_line:two_view_capture_required" } };
  }
  tiles.sfc_separation = measureSeparation(s, A.sfc.k, A.stride_start.k ?? A.wu_end.k, side);
  return { version: SOFTBALL_PITCHING_TILES_VERSION, validated: false, anchors: an, view, tiles };
}


/**
 * Separation — RECORD ONLY, per-athlete baseline (owner ruling). Read from
 * MediaPipe world landmarks: yaw of the hip line and shoulder line in the
 * ground plane. This is ONE 3-D estimate (no second estimate yet), so it is
 * marked unconfirmed. Values inside the still-clip floor are missing.
 */
function measureSeparation(s: LandmarkSeries, sfc: number | null, from: number | null, side: Handedness): SpTile {
  const yaw = (k: number, a: number, b: number) => { const w = s.frames[k]?.world as number[] | undefined; if (!w || w.length < 99) return null; return (Math.atan2(w[b * 3 + 2] - w[a * 3 + 2], w[b * 3] - w[a * 3]) * 180) / Math.PI; };
  const wrap = (d: number) => ((d + 540) % 360) - 180;
  if (sfc == null) return refuse("sfc_separation", "sfc_missing");
  const ph = yaw(sfc, LM.L_HIP, LM.R_HIP), sh = yaw(sfc, LM.L_SHOULDER, LM.R_SHOULDER);
  const raw = ph != null && sh != null ? wrap(sh - ph) : null;
  const sep = raw == null || Math.abs(raw) < SEPARATION_FLOORS.separation_deg ? null : round4(Math.abs(raw));
  // Pelvis rotation speed before SFC: unwrap, 5-frame smooth, central difference.
  let peak: number | null = null;
  if (from != null && from < sfc) {
    const t: number[] = [], y: number[] = [];
    for (let k = Math.max(0, from - 2); k <= Math.min(s.frames.length - 1, sfc + 2); k++) {
      const v = yaw(k, LM.L_HIP, LM.R_HIP); if (v == null) continue;
      y.push(v); t.push(s.frames[k].timestamp_seconds);
    }
    // re-unwrap cleanly
    for (let i = 1; i < y.length; i++) y[i] = y[i - 1] + wrap(y[i] - y[i - 1]);
    const sm = y.map((_, i) => { const w = y.slice(Math.max(0, i - 2), i + 3); return w.reduce((a, b) => a + b, 0) / w.length; });
    const sign = side === "R" ? 1 : -1; // toward the throwing-arm side; convention UNVERIFIED on a real clip
    for (let i = 1; i < sm.length - 1; i++) {
      const dt = t[i + 1] - t[i - 1]; if (!(dt > 0)) continue;
      const v = ((sm[i + 1] - sm[i - 1]) / dt) * sign;
      if (v > SEPARATION_FLOORS.pelvis_speed_dps && (peak == null || v > peak)) peak = round4(v);
    }
  }
  return { ...base("sfc_separation"), values: { separation_at_sfc_deg: sep, peak_pelvic_counter_rotation_dps: peak }, verdict: null, graded: false, flag: null,
    missing_reason: sep == null && peak == null ? (raw == null ? "world_landmarks_unavailable_at_sfc" : "within_still_clip_noise") : null,
    lineage: { unvalidated: true, never_graded: "per_athlete_baseline_only", source_3d: "mediapipe_world_single_estimate_unconfirmed", direction_convention: "unverified_no_softball_clip", floors: SEPARATION_FLOORS, evidence: "mixed" } };
}
