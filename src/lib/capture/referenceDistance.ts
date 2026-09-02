/**
 * Reference distance — the one real-world measurement that turns pixels into
 * miles per hour.
 *
 * Ball-flight math (velocity, movement, location) needs a known distance in
 * the frame to scale against. Mechanics analysis does NOT need it, so this is
 * always skippable.
 *
 * Youth leagues run many different mound distances, so this is a preset list
 * PLUS free manual entry. The "standard" distance for each sport only
 * pre-fills the picker — it is never the only option.
 */

import { baseballLeagueDistances } from "@/data/baseball/leagueDistances";
import { softballLeagueDistances } from "@/data/softball/leagueDistances";

export type ReferenceSport = "baseball" | "softball";

export interface ReferenceDistanceOption {
  /** Stable id used as the select value. */
  id: string;
  /** Plain-language label a parent can recognize. */
  label: string;
  feet: number;
}

/** Pre-filled default only — the user can change it to anything. */
export const DEFAULT_DISTANCE_FT: Record<ReferenceSport, number> = {
  baseball: 60.5,
  softball: 43,
};

function feetLabel(feet: number): string {
  if (Number.isInteger(feet)) return `${feet} ft`;
  const whole = Math.floor(feet);
  const inches = Math.round((feet - whole) * 12);
  return `${whole} ft ${inches} in`;
}

/**
 * Preset distances for a sport, youth through professional, de-duplicated by
 * distance so the list reads like a human wrote it.
 */
export function referenceDistancePresets(sport: ReferenceSport): ReferenceDistanceOption[] {
  const source = sport === "softball" ? softballLeagueDistances : baseballLeagueDistances;
  const byFeet = new Map<number, string[]>();
  for (const league of source) {
    const bucket = byFeet.get(league.mound_ft) ?? [];
    bucket.push(league.label);
    byFeet.set(league.mound_ft, bucket);
  }
  return [...byFeet.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([feet, levels]) => ({
      id: `ft_${feet}`,
      label: `${feetLabel(feet)} — ${levels.join(", ")}`,
      feet,
    }));
}

export const MIN_DISTANCE_FT = 1;
export const MAX_DISTANCE_FT = 500;

export function isValidDistance(feet: unknown): feet is number {
  return (
    typeof feet === "number" &&
    Number.isFinite(feet) &&
    feet >= MIN_DISTANCE_FT &&
    feet <= MAX_DISTANCE_FT
  );
}

/** Plain-language explanation shown wherever the distance is collected. */
export const REFERENCE_DISTANCE_HELP =
  "How far is the pitcher from home plate on your field? We use that one measurement to turn the video into a real speed. Every league is different — pick yours or type it in. You can skip this if you only want mechanics feedback.";
