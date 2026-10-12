// Coach drill-assignment safety check (Plan v3.1 Phase 5).
// A coach-picked drill is checked against the player's age, sport and
// equipment before it can be assigned. Failing drills show the reason and
// offer safe alternatives (same skill, no missing equipment, age-legal).
// Pure functions — no dose changes, no fabrication.

export interface DrillSafetyInput {
  id: string;
  name: string;
  module: string | null;
  skill_target: string | null;
  sport: string | null;
  progression_level: number | null;
  requiredEquipment: string[]; // from drill_equipment where required = true
}

export interface AthleteSafetyContext {
  ageYears: number | null; // null = unknown
  sport: string | null;
  equipment: string[]; // equipment the player has
}

export interface DrillSafetyResult {
  ok: boolean;
  reasons: string[];
}

/** Highest drill progression level an athlete of this age may be assigned. */
export function maxLevelForAge(ageYears: number | null): number {
  if (ageYears == null) return 5; // unknown age: block College/Pro/Elite only
  if (ageYears < 8) return 2; // Tee Ball / Youth
  if (ageYears <= 11) return 3; // up to MS
  if (ageYears <= 13) return 4; // up to HS
  if (ageYears <= 17) return 5; // up to College
  return 7;
}

const norm = (s: string) => s.trim().toLowerCase();

export function checkDrillSafety(
  drill: DrillSafetyInput,
  athlete: AthleteSafetyContext,
): DrillSafetyResult {
  const reasons: string[] = [];

  const level = drill.progression_level ?? 4;
  const max = maxLevelForAge(athlete.ageYears);
  if (level > max) {
    reasons.push(
      athlete.ageYears == null
        ? "Too advanced — this drill is above high-school level and we don't know the player's age."
        : `Too advanced for a ${athlete.ageYears}-year-old.`,
    );
  }

  const dSport = drill.sport ? norm(drill.sport) : null;
  const aSport = athlete.sport ? norm(athlete.sport) : null;
  if (dSport && aSport && dSport !== "both" && dSport !== aSport) {
    reasons.push(`Made for ${drill.sport}, not ${athlete.sport}.`);
  }

  const owned = new Set(athlete.equipment.map(norm));
  const missing = drill.requiredEquipment.filter((e) => !owned.has(norm(e)));
  if (missing.length > 0) {
    reasons.push(`Needs equipment the player doesn't have: ${missing.join(", ")}.`);
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * Safe alternatives for a drill that failed the check: same skill work
 * (module + skill target), same sport, and fully legal for this athlete.
 */
export function findSafeAlternatives(
  drills: DrillSafetyInput[],
  failed: DrillSafetyInput,
  athlete: AthleteSafetyContext,
  limit = 3,
): DrillSafetyInput[] {
  return drills
    .filter((d) => d.id !== failed.id)
    .filter((d) => d.module === failed.module && d.skill_target === failed.skill_target)
    .filter((d) => checkDrillSafety(d, athlete).ok)
    .slice(0, limit);
}
