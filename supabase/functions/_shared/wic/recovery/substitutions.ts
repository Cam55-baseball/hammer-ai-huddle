// Phase 10 — Recovery Substitution Ladders

export interface RecoveryCatalogEntry {
  slug: string;
  name: string;
  recovery_category?: string | null;
  recovery_class?: string | null;
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

export interface RecoverySubstitutionLadder {
  equipment_unavailable: string[];
  environment_unavailable: string[];
  injury_restriction: string[];
  time_restriction: string[];
  coach_override: string[];
}

const EMPTY: RecoverySubstitutionLadder = {
  equipment_unavailable: [], environment_unavailable: [], injury_restriction: [], time_restriction: [], coach_override: [],
};

function dedupe<T>(a: T[]): T[] { return [...new Set(a)]; }

export function resolveRecoverySubstitutionLadder(input: {
  movement: RecoveryCatalogEntry;
  catalog: readonly RecoveryCatalogEntry[];
  availableEquipment?: readonly string[];
  environment?: "indoor" | "outdoor" | string;
  phase?: string;
  trainingAgeClass?: string;
}): RecoverySubstitutionLadder {
  const { movement, catalog, availableEquipment, environment, phase, trainingAgeClass } = input;
  const family = movement.substitution_family ?? movement.transfer_group ?? null;
  if (!family) return EMPTY;
  const members = catalog.filter((c) => c.slug !== movement.slug && ((c.substitution_family && c.substitution_family === movement.substitution_family) || (c.transfer_group && c.transfer_group === movement.transfer_group)));
  const seasonLegal = (c: RecoveryCatalogEntry) => !phase || !c.season_legality || c.season_legality[phase] !== false;
  const ageLegal = (c: RecoveryCatalogEntry) => !trainingAgeClass || !c.training_age_legality || c.training_age_legality[trainingAgeClass] !== false;
  const equipmentFits = (c: RecoveryCatalogEntry) => {
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

export function recoveryLadderCompleteness(l: RecoverySubstitutionLadder, familySize: number): { complete: boolean; score: number } {
  if (familySize <= 0) return { complete: true, score: 1 };
  const rungs = [l.equipment_unavailable, l.environment_unavailable, l.injury_restriction, l.time_restriction, l.coach_override];
  const filled = rungs.filter((r) => r.length > 0).length;
  return { complete: filled >= 2, score: filled / rungs.length };
}
