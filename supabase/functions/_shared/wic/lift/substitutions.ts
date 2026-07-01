// Phase 8 — Substitution Pathway Resolver
// Every prescribed lift exposes a full substitution ladder derived from the
// canonical exercise governance registry (wk_movement_catalog).

export interface CatalogEntry {
  slug: string;
  name: string;
  movement_category?: string | null;
  substitution_family?: string | null;
  equipment_requirements?: string[] | null;
  regression_slug?: string | null;
  season_legality?: Record<string, boolean> | null;
  training_age_legality?: Record<string, boolean> | null;
  default_sets?: number | null;
  default_reps?: number | null;
}

export interface SubstitutionLadder {
  equipment_unavailable: string[]; // slugs
  facility_unavailable: string[];
  injury_restriction: string[];
  time_restriction: string[];
  coach_override: string[];
}

export interface SubstitutionResolveInput {
  movement: CatalogEntry;
  catalog: readonly CatalogEntry[];
  availableEquipment?: readonly string[];
  phase?: string;
  trainingAgeClass?: string;
}

const EMPTY: SubstitutionLadder = {
  equipment_unavailable: [],
  facility_unavailable: [],
  injury_restriction: [],
  time_restriction: [],
  coach_override: [],
};

export function resolveSubstitutionLadder(input: SubstitutionResolveInput): SubstitutionLadder {
  const { movement, catalog, availableEquipment, phase, trainingAgeClass } = input;
  const family = movement.substitution_family;
  if (!family) return EMPTY;

  const familyMembers = catalog.filter(
    (c) => c.slug !== movement.slug && c.substitution_family === family,
  );

  const seasonLegal = (c: CatalogEntry) => {
    if (!phase || !c.season_legality) return true;
    return c.season_legality[phase] !== false;
  };
  const ageLegal = (c: CatalogEntry) => {
    if (!trainingAgeClass || !c.training_age_legality) return true;
    return c.training_age_legality[trainingAgeClass] !== false;
  };
  const equipmentFits = (c: CatalogEntry) => {
    if (!availableEquipment || availableEquipment.length === 0) return true;
    const req = c.equipment_requirements ?? [];
    if (req.length === 0) return true;
    const avail = new Set(availableEquipment.map((s) => s.toLowerCase()));
    return req.every((r) => avail.has(String(r).toLowerCase()));
  };

  const usable = familyMembers.filter((c) => seasonLegal(c) && ageLegal(c));

  // equipment_unavailable → any family member whose equipment set fits the
  // athlete's currently-available equipment.
  const equipmentUnavailable = usable.filter(equipmentFits).map((c) => c.slug);

  // facility_unavailable → prefer bodyweight-only or single-implement variants.
  const facilityUnavailable = usable
    .filter((c) => {
      const req = (c.equipment_requirements ?? []).map((s) => s.toLowerCase());
      return req.length === 0 || req.every((r) => r === "bodyweight" || r === "band" || r === "kb" || r === "db");
    })
    .map((c) => c.slug);

  // injury_restriction → the canonical regression (existing) plus family
  // members with lower recovery demand.
  const injuryRestriction = [
    ...(movement.regression_slug ? [movement.regression_slug] : []),
    ...usable.map((c) => c.slug),
  ].filter((v, i, arr) => v && arr.indexOf(v) === i);

  // time_restriction → shorter-dose family members (fewer default sets).
  const baseSets = movement.default_sets ?? 3;
  const timeRestriction = usable
    .filter((c) => (c.default_sets ?? 3) <= baseSets)
    .map((c) => c.slug);

  // coach_override → any family member.
  const coachOverride = usable.map((c) => c.slug);

  return {
    equipment_unavailable: dedupe(equipmentUnavailable),
    facility_unavailable: dedupe(facilityUnavailable),
    injury_restriction: dedupe(injuryRestriction),
    time_restriction: dedupe(timeRestriction),
    coach_override: dedupe(coachOverride),
  };
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * A ladder is "complete" if the category has any known alternates in the
 * catalog. If the family has zero members at all, the ladder is trivially
 * complete (nothing to substitute). If the family HAS members but the
 * resolver produced empty rungs across the board, the ladder is unresolved.
 */
export function ladderCompleteness(
  ladder: SubstitutionLadder,
  familySize: number,
): { complete: boolean; score: number } {
  if (familySize <= 0) return { complete: true, score: 1 };
  const rungs = [
    ladder.equipment_unavailable,
    ladder.facility_unavailable,
    ladder.injury_restriction,
    ladder.time_restriction,
    ladder.coach_override,
  ];
  const filled = rungs.filter((r) => r.length > 0).length;
  return { complete: filled >= 2, score: filled / rungs.length };
}
