// Phase 10 — Cross-Sport Substitution Ladders

export interface CrossSportCatalogEntry {
  slug: string;
  name: string;
  cross_sport_category?: string | null;
  movement_transfer?: string | null;
  sport_transfer?: unknown;
  substitution_family?: string | null;
  transfer_group?: string | null;
  equipment_requirements?: string[] | null;
  regression_slug?: string | null;
  season_legality?: Record<string, boolean> | null;
  training_age_legality?: Record<string, boolean> | null;
  indoor_legal?: boolean | null;
  outdoor_legal?: boolean | null;
  travel_friendly?: boolean | null;
  default_sets?: number | null;
}

export interface CrossSportSubstitutionLadder {
  equipment_unavailable: string[];
  environment_unavailable: string[];
  injury_restriction: string[];
  time_restriction: string[];
  coach_override: string[];
}

const EMPTY: CrossSportSubstitutionLadder = {
  equipment_unavailable: [], environment_unavailable: [], injury_restriction: [], time_restriction: [], coach_override: [],
};

function dedupe<T>(a: T[]): T[] { return [...new Set(a)]; }

export function resolveCrossSportSubstitutionLadder(input: {
  movement: CrossSportCatalogEntry;
  catalog: readonly CrossSportCatalogEntry[];
  availableEquipment?: readonly string[];
  environment?: "indoor" | "outdoor" | string;
  phase?: string;
  trainingAgeClass?: string;
}): CrossSportSubstitutionLadder {
  const { movement, catalog, availableEquipment, environment, phase, trainingAgeClass } = input;
  const family = movement.substitution_family ?? movement.transfer_group ?? null;
  if (!family) return EMPTY;
  const members = catalog.filter((c) => c.slug !== movement.slug && ((c.substitution_family && c.substitution_family === movement.substitution_family) || (c.transfer_group && c.transfer_group === movement.transfer_group)));
  const seasonLegal = (c: CrossSportCatalogEntry) => !phase || !c.season_legality || c.season_legality[phase] !== false;
  const ageLegal = (c: CrossSportCatalogEntry) => !trainingAgeClass || !c.training_age_legality || c.training_age_legality[trainingAgeClass] !== false;
  const equipmentFits = (c: CrossSportCatalogEntry) => {
    if (!availableEquipment || availableEquipment.length === 0) return true;
    const req = c.equipment_requirements ?? [];
    if (req.length === 0) return true;
    const avail = new Set(availableEquipment.map((s) => s.toLowerCase()));
    return req.every((r) => avail.has(String(r).toLowerCase()));
  };
  const usable = members.filter((c) => seasonLegal(c) && ageLegal(c));
  return {
    equipment_unavailable: dedupe(usable.filter(equipmentFits).map((c) => c.slug)),
    environment_unavailable: dedupe(usable.filter((c) => environment === "indoor" ? c.indoor_legal !== false : environment === "outdoor" ? c.outdoor_legal !== false : true).map((c) => c.slug)),
    injury_restriction: dedupe([...(movement.regression_slug ? [movement.regression_slug] : []), ...usable.map((c) => c.slug)]),
    time_restriction: dedupe(usable.filter((c) => (c.default_sets ?? 3) <= (movement.default_sets ?? 3)).map((c) => c.slug)),
    coach_override: dedupe(usable.map((c) => c.slug)),
  };
}

export function crossSportLadderCompleteness(l: CrossSportSubstitutionLadder, familySize: number): { complete: boolean; score: number } {
  if (familySize <= 0) return { complete: true, score: 1 };
  const rungs = [l.equipment_unavailable, l.environment_unavailable, l.injury_restriction, l.time_restriction, l.coach_override];
  const filled = rungs.filter((r) => r.length > 0).length;
  return { complete: filled >= 2, score: filled / rungs.length };
}
