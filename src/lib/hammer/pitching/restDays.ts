/**
 * Pitch Smart rest-day tables — SINGLE SOURCE OF TRUTH.
 *
 * These tables were previously duplicated verbatim in `recoveryClamp.ts` and
 * `pitchLadder.ts`. Any edit to one copy silently desynced the enforced clamp
 * from the displayed ladder. Both now import from here — do not re-inline.
 *
 * Rest days required after outings AT/ABOVE certain pitch thresholds.
 */
import type { PitcherLevel } from "./pitcherProfile";

export function baseballRestDays(pitches: number, level: PitcherLevel): number {
  const isYouth = level === "youth" || level === "middle_school";
  if (isYouth) {
    if (pitches >= 66) return 4;
    if (pitches >= 51) return 3;
    if (pitches >= 36) return 2;
    if (pitches >= 21) return 1;
    return 0;
  }
  // HS+ (Pitch Smart 13-16 / 17-18)
  if (pitches >= 76) return 4;
  if (pitches >= 61) return 3;
  if (pitches >= 46) return 2;
  if (pitches >= 31) return 1;
  return 0;
}

export function softballRestDays(pitches: number, level: PitcherLevel): number {
  // Softball tolerates less rest but is not free. Conservative bands.
  const isYouth = level === "youth" || level === "middle_school";
  if (isYouth) {
    if (pitches >= 90) return 2;
    if (pitches >= 60) return 1;
    return 0;
  }
  if (pitches >= 130) return 2;
  if (pitches >= 90) return 1;
  return 0;
}
