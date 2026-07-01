// Phase 9 — Speed Substitution Pathway Resolver
// Every Speed prescription exposes a full substitution ladder derived from the
// canonical exercise governance registry (wk_movement_catalog).

export interface SpeedCatalogEntry {
  slug: string;
  name: string;
  speed_category?: string | null;
  transfer_group?: string | null;
  substitution_family?: string | null;
  equipment_requirements?: string[] | null;
  regression_slug?: string | null;
  season_legality?: Record<string, boolean> | null;
  training_age_legality?: Record<string, boolean> | null;
  default_sets?: number | null;
  default_reps?: number | null;
}

export interface SpeedSubstitutionLadder {
  equipment_unavailable: string[];
  environment_unavailable: string[]; // indoor/outdoor swap
  injury_restriction: string[];
  time_restriction: string[];
  coach_override: string[];
}

export interface SpeedSubstitutionResolveInput {
  movement: SpeedCatalogEntry;
  catalog: readonly SpeedCatalogEntry[];
  availableEquipment?: readonly string[];
  environment?: "indoor" | "outdoor" | string;
  phase?: string;
  trainingAgeClass?: string;
}

const EMPTY: SpeedSubstitutionLadder = {
  equipment_unavailable: [],
  environment_unavailable: [],
  injury_restriction: [],
  time_restriction: [],
  coach_override: [],
};

function dedupe<T>(a: T[]): T[] { return [...new Set(a)]; }

export function resolveSpeedSubstitutionLadder(
  input: SpeedSubstitutionResolveInput,
): SpeedSubstitutionLadder {
  const { movement, catalog, availableEquipment, environment, phase, trainingAgeClass } = input;
  // Family membership: prefer transfer_group when substitution_family is null.
  const family = movement.substitution_family ?? movement.transfer_group ?? null;
  if (!family) return EMPTY;

  const members = catalog.filter((c) =>
    c.slug !== movement.slug &&
    ((c.substitution_family && c.substitution_family === movement.substitution_family) ||
     (c.transfer_group && c.transfer_group === movement.transfer_group))
  );

  const seasonLegal = (c: SpeedCatalogEntry) =>
    !phase || !c.season_legality || c.season_legality[phase] !== false;
  const ageLegal = (c: SpeedCatalogEntry) =>
    !trainingAgeClass || !c.training_age_legality ||
    c.training_age_legality[trainingAgeClass] !== false;
  const equipmentFits = (c: SpeedCatalogEntry) => {
    if (!availableEquipment || availableEquipment.length === 0) return true;
    const req = c.equipment_requirements ?? [];
    if (req.length === 0) return true;
    const avail = new Set(availableEquipment.map((s) => s.toLowerCase()));
    return req.every((r) => avail.has(String(r).toLowerCase()));
  };

  const usable = members.filter((c) => seasonLegal(c) && ageLegal(c));

  const equipmentUnavailable = usable.filter(equipmentFits).map((c) => c.slug);

  // Environment swap — if outdoor, prefer indoor-compatible (bodyweight / no
  // "field" equipment); if indoor, prefer outdoor-compatible (sled, hill,
  // turf). Since we lack an explicit environment column, we approximate via
  // equipment: "sled"/"hill"/"turf" → outdoor; "band"/"treadmill"/"bodyweight"
  // → indoor-friendly.
  const OUTDOOR_HINTS = new Set(["sled", "hill", "turf", "field"]);
  const INDOOR_HINTS = new Set(["band", "treadmill", "bodyweight", "wall"]);
  const environmentUnavailable = usable
    .filter((c) => {
      const req = (c.equipment_requirements ?? []).map((s) => s.toLowerCase());
      if (environment === "outdoor") {
        return req.length === 0 || req.some((r) => INDOOR_HINTS.has(r));
      }
      if (environment === "indoor") {
        return req.length === 0 || req.some((r) => OUTDOOR_HINTS.has(r));
      }
      return true;
    })
    .map((c) => c.slug);

  const injuryRestriction = dedupe([
    ...(movement.regression_slug ? [movement.regression_slug] : []),
    ...usable.map((c) => c.slug),
  ]);

  const baseSets = movement.default_sets ?? 3;
  const timeRestriction = usable
    .filter((c) => (c.default_sets ?? 3) <= baseSets)
    .map((c) => c.slug);

  const coachOverride = usable.map((c) => c.slug);

  return {
    equipment_unavailable: dedupe(equipmentUnavailable),
    environment_unavailable: dedupe(environmentUnavailable),
    injury_restriction: dedupe(injuryRestriction),
    time_restriction: dedupe(timeRestriction),
    coach_override: dedupe(coachOverride),
  };
}

export function speedLadderCompleteness(
  ladder: SpeedSubstitutionLadder,
  familySize: number,
): { complete: boolean; score: number } {
  if (familySize <= 0) return { complete: true, score: 1 };
  const rungs = [
    ladder.equipment_unavailable,
    ladder.environment_unavailable,
    ladder.injury_restriction,
    ladder.time_restriction,
    ladder.coach_override,
  ];
  const filled = rungs.filter((r) => r.length > 0).length;
  return { complete: filled >= 2, score: filled / rungs.length };
}
