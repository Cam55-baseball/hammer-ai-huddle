/**
 * Pitch-Count & Innings Ladder — pure, replay-safe.
 *
 * Produces per-outing pitch caps, weekly ceilings, innings targets, and
 * required rest days for the athlete's sport, level, role, rung, and quarter.
 *
 * References (conservative — the engine never authors organism truth):
 *   - USA Baseball Pitch Smart (youth / HS pitch counts & rest)
 *   - NCAA typical starter pen volumes
 *   - Softball: NFHS / NCAA / NPF workload norms (higher tolerance,
 *     shorter rest, but never zero rest for high-effort circle work)
 */
import type { RoadmapRung } from "@/lib/hammer/roadmap/roadmapLadder";
import type { QuarterDescriptor } from "@/lib/hammer/roadmap/seasonQuarters";
import type { PitcherLevel, PitcherProfile, PitcherRole } from "./pitcherProfile";
import type { PitcherDayType } from "./pitchingMicrocycle";
import { baseballRestDays, softballRestDays } from "./restDays";

export interface PitchLadderPrescription {
  readonly outingPitchCap: number;      // per outing
  readonly weeklyPitchCap: number;
  readonly targetInnings: number;       // per outing target
  readonly restDaysAfterOuting: number; // ≥ 0
  readonly intentPercent: number;       // 0..100
  readonly headline: string;
  readonly rationale: string;
}

// Base per-outing pitch caps (baseball starters). Everything else scales off.
// Sources: Pitch Smart daily maximums.
const BASEBALL_OUTING_CAP: Record<PitcherLevel, number> = {
  youth:         50,   // ages 9-10 daily max
  middle_school: 75,   // ages 11-12 typical
  high_school:  100,   // ages 13-16 daily max ~95, 17-18 up to 105
  travel:        95,
  college:      110,
  pro:          105,
  unknown:       60,
};

const SOFTBALL_OUTING_CAP: Record<PitcherLevel, number> = {
  youth:         60,
  middle_school: 85,
  high_school:  110,
  travel:       105,
  college:      130,
  pro:          140,
  unknown:       70,
};

function roleMultiplier(role: PitcherRole): number {
  switch (role) {
    case "reliever": return 0.35;
    case "closer":   return 0.25;
    case "two_way":  return 0.75;
    case "starter":  return 1.0;
    case "undecided":return 0.85;
  }
}

function rungMultiplier(rung: RoadmapRung): number {
  switch (rung) {
    case "foundation": return 0.55;
    case "build":      return 0.75;
    case "bridge":     return 0.90;
    case "peak":       return 1.00;
    case "sustain":    return 0.95;
  }
}

function intentForDay(dayType: PitcherDayType, rung: RoadmapRung): number {
  const rungBoost = rungMultiplier(rung); // 0.55..1.0
  const base: Record<PitcherDayType, number> = {
    start:         95,
    game:          95,
    bullpen:       80,
    side:          60,
    touch:         40,
    long_toss:     75,
    flush:         30,
    fielding_only: 30,
    rest:          0,
    available:     70,
  };
  return Math.round(Math.min(100, base[dayType] * (0.85 + 0.15 * rungBoost)));
}

function pitchesPerInning(level: PitcherLevel, sport: "baseball" | "softball"): number {
  if (sport === "softball") return level === "college" || level === "pro" ? 14 : 16;
  if (level === "college" || level === "pro") return 15;
  if (level === "high_school" || level === "travel") return 16;
  return 18;
}

interface Input {
  readonly sport: "baseball" | "softball";
  readonly rung: RoadmapRung;
  readonly quarter: QuarterDescriptor;
  readonly profile: PitcherProfile;
  readonly dayType: PitcherDayType;
}

export function prescribePitchLadder(input: Input): PitchLadderPrescription {
  const { sport, rung, quarter, profile, dayType } = input;
  const level = profile.level;
  const table = sport === "softball" ? SOFTBALL_OUTING_CAP : BASEBALL_OUTING_CAP;
  const rawCap = table[level] * roleMultiplier(profile.role) * rungMultiplier(rung) * quarter.volumeCeilingMultiplier;
  const outingCap = Math.max(15, Math.round(rawCap));

  // Weekly cap: starters ~2 outings/wk (1 start + 1 pen), softball starters
  // often 2-3, relievers count differently — approximate as 2.5 outing-equivalents.
  const outingsPerWeek = sport === "softball"
    ? (profile.role === "starter" || profile.role === "two_way" ? 3 : 4)
    : (profile.role === "starter" || profile.role === "two_way" ? 2 : 3);
  const weeklyCap = Math.round(outingCap * outingsPerWeek * 0.85);

  // Per-day pitch target based on day-type
  let dayPitches: number;
  switch (dayType) {
    case "start":         dayPitches = outingCap; break;
    case "game":          dayPitches = outingCap; break;
    case "bullpen":       dayPitches = Math.round(outingCap * 0.5); break;
    case "side":          dayPitches = Math.round(outingCap * 0.3); break;
    case "touch":         dayPitches = 15; break;
    case "long_toss":     dayPitches = 0; break;
    case "flush":         dayPitches = 0; break;
    case "fielding_only": dayPitches = 0; break;
    case "available":     dayPitches = Math.round(outingCap * 0.4); break; // if summoned
    case "rest":          dayPitches = 0; break;
  }

  const targetInnings = dayPitches > 0
    ? Math.max(0, Math.round((dayPitches / pitchesPerInning(level, sport)) * 10) / 10)
    : 0;

  const rest = dayPitches > 0
    ? (sport === "softball" ? softballRestDays(dayPitches, level) : baseballRestDays(dayPitches, level))
    : 0;

  const intent = intentForDay(dayType, rung);

  const headline =
    dayPitches > 0
      ? `${dayPitches} pitch cap · ${intent}% intent${targetInnings > 0 ? ` · ~${targetInnings} IP` : ""}`
      : `No mound work · ${intent}% throwing intent`;

  const rationale =
    `${sport === "softball" ? "Softball" : "Baseball"} ${profile.role.replace("_", " ")} at ` +
    `${labelLevel(level)} level · ${rung} rung · ${quarter.accent} quarter. ` +
    (dayPitches > 0
      ? `Cap ${dayPitches} pitches; earn ${rest} rest day${rest === 1 ? "" : "s"} after this outing before mound work returns.`
      : `Non-mound day — protect the arm for the next outing.`);

  return {
    outingPitchCap: outingCap,
    weeklyPitchCap: weeklyCap,
    targetInnings,
    restDaysAfterOuting: rest,
    intentPercent: intent,
    headline,
    rationale,
  };
}

function labelLevel(l: PitcherLevel): string {
  switch (l) {
    case "youth":         return "youth";
    case "middle_school": return "middle school";
    case "high_school":   return "high school";
    case "travel":        return "travel";
    case "college":       return "college";
    case "pro":           return "pro";
    case "unknown":       return "unspecified";
  }
}
