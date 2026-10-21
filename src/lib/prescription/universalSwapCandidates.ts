import { eligibleSwapCandidate, type SwapEligibilityFacts } from "./swapEligibility";
import { sameDoseSwap, type SwapDose } from "./sameDoseSwap";

/** Catalog-backed previews only. A server must certify and atomically save the chosen row. */
export interface UniversalSwapMovement extends SwapEligibilityFacts {
  name: string;
  primary_adaptation: string | null;
  equipment_requirements: string[] | null;
}

export interface SwapAvailability {
  have: readonly string[];
  lacks: readonly string[];
  /** Availability is explicit for this visit; a remembered profile is only a starting point. */
  confirmed: boolean;
}

const ALIASES: Readonly<Record<string, string>> = {
  db: "dumbbell", dumbbells: "dumbbell", kb: "kettlebell", kettlebells: "kettlebell",
  band: "bands", resistance_band: "bands", resistance_bands: "bands",
  rack: "squat_rack", hex_bar: "trap_bar", medicine_ball: "med_ball",
};
const normalize = (value: string) => {
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ALIASES[key] ?? key;
};
// Space, a partner, wall and steps are NOT assumed to exist or to be safe.
const NO_GEAR = new Set(["none", "bodyweight"]);

export function hasSwapRequirements(requirements: readonly string[] | null, availability: SwapAvailability): boolean {
  if (!availability.confirmed || requirements === null) return false;
  const have = new Set(availability.have.map(normalize));
  const lacks = new Set(availability.lacks.map(normalize));
  return requirements.every(raw => {
    const key = normalize(raw);
    return key.length > 0 && !lacks.has(key) && (NO_GEAR.has(key) || have.has(key));
  });
}

export interface UniversalSwapContext {
  category: string | null;
  phase: string | null;
  trainingAge: string | null;
  sport: string | null;
  ageYears: number | null;
  injuryRestrictions: readonly string[] | null;
  /** Current safety answer; false/unknown cannot offer a replacement. Never overrides a stop. */
  sessionAllowed: boolean;
  availability: SwapAvailability;
}

export function previewUniversalSwap(
  original: UniversalSwapMovement,
  dose: SwapDose,
  catalog: readonly UniversalSwapMovement[],
  context: UniversalSwapContext,
): { candidates: Array<{ movement: UniversalSwapMovement; dose: SwapDose; reason: string }>; blocked: boolean } {
  const intent = original.primary_adaptation?.trim();
  if (!context.sessionAllowed || !context.availability.confirmed || context.injuryRestrictions === null ||
      context.ageYears === null || !Number.isFinite(context.ageYears) || context.ageYears < 0 ||
      !intent || original.is_active !== true || original.movement_category !== context.category) {
    return { candidates: [], blocked: true };
  }
  const restrictions = new Set(context.injuryRestrictions.map(normalize));
  const candidates: Array<{ movement: UniversalSwapMovement; dose: SwapDose; reason: string }> = [];
  const seen = new Set<string>();
  // Duplicate catalog identities are ambiguous, even when one of the rows looks valid.
  const counts = new Map<string, number>();
  for (const row of catalog) counts.set(row.slug, (counts.get(row.slug) ?? 0) + 1);
  for (const movement of catalog) {
    if (movement.slug === original.slug || !movement.slug.trim() || !movement.name.trim() ||
        seen.has(movement.slug) || counts.get(movement.slug) !== 1 ||
        movement.primary_adaptation?.trim() !== intent || movement.min_age_years === null ||
        movement.min_age_years === undefined || movement.min_age_years > context.ageYears ||
        movement.contraindications === null || movement.contraindications === undefined ||
        movement.contraindications.some(value => restrictions.has(normalize(value))) ||
        !hasSwapRequirements(movement.equipment_requirements, context.availability) ||
        !eligibleSwapCandidate(original, movement, { ...context, unit: dose.dosage_unit })) continue;
    seen.add(movement.slug);
    candidates.push({ movement, dose: sameDoseSwap(dose, movement),
      reason: "Same training job and amount of work, using what you confirmed today." });
  }
  return { candidates, blocked: false };
}