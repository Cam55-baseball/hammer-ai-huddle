/**
 * Recovery clamp — pure fn.
 *
 * Consumes today's planned day-type, the athlete's Pitch Smart level, and
 * their recent load. Returns the effective day-type after enforcing:
 *   - Pitch Smart rest days from the most recent outing
 *   - Weekly pitch-cap (blocks new mound work when cap is hit)
 *
 * Constitutionally survivability-first per RW-1: this ALWAYS clamps down,
 * never up. If clamping fires, `reason` is a human-legible sentence.
 */
import type { PitcherDayType } from "./pitchingMicrocycle";
import type { PitcherLevel } from "./pitcherProfile";
import type { RecentPitchingLoad } from "./recentLoad";
import { baseballRestDays, softballRestDays } from "./restDays";


const MOUND_TYPES: ReadonlySet<PitcherDayType> = new Set([
  "start",
  "bullpen",
  "side",
]);

function daysBetweenIso(fromIso: string, todayIso: string): number {
  const a = new Date(fromIso + "T00:00:00Z").getTime();
  const b = new Date(todayIso + "T00:00:00Z").getTime();
  return Math.floor((b - a) / 86400_000);
}

export interface ClampInput {
  readonly sport: "baseball" | "softball";
  readonly level: PitcherLevel;
  readonly todayIso: string;
  readonly plannedDayType: PitcherDayType;
  readonly plannedPitches: number;      // ladder.dayPitches for today
  readonly weeklyCap: number;           // ladder.weeklyPitchCap
  readonly recent: RecentPitchingLoad | null;
}

export interface ClampResult {
  readonly dayType: PitcherDayType;
  readonly clamped: boolean;
  readonly reason: string | null;
  readonly restDaysRemaining: number;
}

export function clampDayTypeForRecovery(input: ClampInput): ClampResult {
  const { sport, level, todayIso, plannedDayType, plannedPitches, weeklyCap, recent } = input;

  // Game days are never clamped by us — the game is the authority.
  if (plannedDayType === "game") {
    return { dayType: plannedDayType, clamped: false, reason: null, restDaysRemaining: 0 };
  }

  // 1. Rest-day debt from the last outing.
  if (recent?.lastOuting) {
    const restNeeded =
      sport === "softball"
        ? softballRestDays(recent.lastOuting.pitches, level)
        : baseballRestDays(recent.lastOuting.pitches, level);
    const elapsed = daysBetweenIso(recent.lastOuting.isoDate, todayIso);
    const remaining = Math.max(0, restNeeded - elapsed);
    if (remaining > 0 && MOUND_TYPES.has(plannedDayType)) {
      const nextType: PitcherDayType = remaining >= 2 ? "flush" : "touch";
      return {
        dayType: nextType,
        clamped: true,
        reason: `Clamped from ${plannedDayType} → ${nextType} — ${remaining} rest day${remaining === 1 ? "" : "s"} remaining from ${recent.lastOuting.pitches}-pitch outing on ${recent.lastOuting.isoDate}.`,
        restDaysRemaining: remaining,
      };
    }
  }

  // 2. Weekly cap check — block new mound pitches if we'd blow past cap.
  if (recent && weeklyCap > 0 && MOUND_TYPES.has(plannedDayType) && plannedPitches > 0) {
    if (recent.weeklyTotal >= weeklyCap) {
      return {
        dayType: "flush",
        clamped: true,
        reason: `Clamped from ${plannedDayType} → flush — weekly cap reached (${recent.weeklyTotal}/${weeklyCap} pitches).`,
        restDaysRemaining: 0,
      };
    }
    if (recent.weeklyTotal + plannedPitches > weeklyCap) {
      return {
        dayType: "touch",
        clamped: true,
        reason: `Reduced from ${plannedDayType} → touch — this outing would exceed weekly cap (${recent.weeklyTotal + plannedPitches}/${weeklyCap}).`,
        restDaysRemaining: 0,
      };
    }
  }

  return { dayType: plannedDayType, clamped: false, reason: null, restDaysRemaining: 0 };
}
