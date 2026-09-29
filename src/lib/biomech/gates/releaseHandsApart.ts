/**
 * Slot-free release gate shared by the throwing AND pitching cards (owner
 * 2026-09-29: sidearm throwers and pitchers must be allowed in). Replaces the
 * old "throwing wrist above shoulder" check, which also kept batting swings out.
 * At a real release the hands are apart; on a swing both hands are on the bat.
 * Both swing fixtures read 0.62–0.63 throwing-forearm lengths. Unvalidated on a real throw/pitch.
 * ONE implementation — do not copy into either card.
 */
import type { LandmarkSeries } from "../pose/landmarkSeriesFormat";
import type { Handedness } from "../side/strideSide";
import { point, round4, LM } from "../anchors/poseKinematics";

export const HANDS_APART_MIN_FOREARMS = 1.5;

export interface HandsApartResult {
  readonly ok: boolean;
  readonly hand_gap_forearms: number | null;
  readonly reason: "throwing_arm_unobserved_at_release" | "hands_together_at_release" | null;
}

export function handsApartAtRelease(series: LandmarkSeries, releaseK: number, side: Handedness): HandsApartResult {
  const f = series.frames[releaseK];
  const wrist = f && point(f, side === "R" ? LM.R_WRIST : LM.L_WRIST);
  const glove = f && point(f, side === "R" ? LM.L_WRIST : LM.R_WRIST);
  const elbow = f && point(f, side === "R" ? LM.R_ELBOW : LM.L_ELBOW);
  if (!wrist || !glove || !elbow) return { ok: false, hand_gap_forearms: null, reason: "throwing_arm_unobserved_at_release" };
  const W = series.header.width, H = series.header.height;
  const forearm = Math.hypot((wrist.x - elbow.x) * W, (wrist.y - elbow.y) * H);
  const gap = forearm > 0 ? Math.hypot((wrist.x - glove.x) * W, (wrist.y - glove.y) * H) / forearm : 0;
  return gap >= HANDS_APART_MIN_FOREARMS
    ? { ok: true, hand_gap_forearms: round4(gap), reason: null }
    : { ok: false, hand_gap_forearms: round4(gap), reason: "hands_together_at_release" };
}
