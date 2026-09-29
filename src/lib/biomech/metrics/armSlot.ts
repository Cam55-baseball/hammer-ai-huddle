/**
 * Arm slot — CONTEXT ONLY (owner 2026-09-29). Never graded, never a flag,
 * never shown to the athlete as a verdict. Stored for staff and used only to
 * decide which checks the card emphasises and which coaching lines a low-slot
 * thrower reads. Shared by the throwing and pitching cards.
 *
 * Measure: elevation of the throwing wrist above the throwing shoulder at
 * release, as a fraction of the stance-lock arm length (shoulder→elbow→wrist).
 * The vertical axis is visible from any camera, so this does not depend on
 * view; it does NOT see trunk lateral tilt, which also sets a real slot — the
 * lineage says so. Near a boundary → "undetermined", never a guess.
 */
import type { LandmarkSeries } from "../pose/landmarkSeriesFormat";
import type { Handedness } from "../side/strideSide";
import { point, round4, LM } from "../anchors/poseKinematics";

export type ArmSlotClass = "high" | "low" | "undetermined";
/** Elevation (deg) at or below which the slot is low (roughly shoulder height or under). */
export const LOW_SLOT_MAX_DEG = 15;
/** Elevation at or above which the slot is clearly not low. */
export const HIGH_SLOT_MIN_DEG = 30;

export interface ArmSlotContext {
  readonly audience: "staff";
  readonly graded: false;
  readonly slot: ArmSlotClass;
  readonly elevation_deg: number | null;
  readonly lineage: Readonly<Record<string, unknown>>;
}

export function measureArmSlot(series: LandmarkSeries, releaseK: number | null, side: Handedness | null): ArmSlotContext {
  const base = { audience: "staff" as const, graded: false as const };
  if (releaseK == null || releaseK < 0 || !side) return { ...base, slot: "undetermined", elevation_deg: null, lineage: { reason: "release_or_side_unavailable" } };
  const W = series.header.width, H = series.header.height;
  const S = side === "R" ? LM.R_SHOULDER : LM.L_SHOULDER, E = side === "R" ? LM.R_ELBOW : LM.L_ELBOW, Wr = side === "R" ? LM.R_WRIST : LM.L_WRIST;
  const vals: number[] = [];
  for (const k of [releaseK - 1, releaseK, releaseK + 1]) {
    const f = series.frames[k]; if (!f) continue;
    const s = point(f, S), e = point(f, E), w = point(f, Wr);
    if (!s || !e || !w) continue;
    const arm = Math.hypot((e.x - s.x) * W, (e.y - s.y) * H) + Math.hypot((w.x - e.x) * W, (w.y - e.y) * H);
    if (arm <= 0) continue;
    const rise = Math.max(-1, Math.min(1, ((s.y - w.y) * H) / arm));
    vals.push((Math.asin(rise) * 180) / Math.PI);
  }
  if (vals.length < 2) return { ...base, slot: "undetermined", elevation_deg: null, lineage: { reason: "throwing_arm_unobserved_at_release" } };
  vals.sort((a, b) => a - b);
  const el = vals[Math.floor((vals.length - 1) / 2)];
  const slot: ArmSlotClass = el <= LOW_SLOT_MAX_DEG ? "low" : el >= HIGH_SLOT_MIN_DEG ? "high" : "undetermined";
  return { ...base, slot, elevation_deg: round4(el), lineage: { method: "wrist_rise_over_arm_length_at_release_median3", low_max_deg: LOW_SLOT_MAX_DEG, high_min_deg: HIGH_SLOT_MIN_DEG, blind_to: "trunk lateral tilt", unvalidated: true } };
}
