import { recordedSwapDose, sameDoseSwap, type SwapDose } from "./sameDoseSwap.ts";
import { isMovementSeasonLegal, seasonContextFromPhase } from "../wic/season.ts";

type Row = Record<string, unknown>;
const nonempty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const cost = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const costs = ["cns_cost", "volume_cost", "contacts_per_rep", "joint_stress", "recovery_window_hours"] as const;

/** Catalog identity precondition only. No athlete safety, access or save authority. */
export function requireSwapCatalogSource(source: Row, saved: Row): void {
  recordedSwapDose(saved);
  if (source.is_active !== true || source.superseded_by !== null ||
      !nonempty(source.slug) || source.slug !== saved.movement_slug ||
      !nonempty(source.movement_category) || !nonempty(source.substitution_family) ||
      !nonempty(source.primary_adaptation) || !nonempty(source.dosage_unit) ||
      !Array.isArray(source.equipment_requirements) ||
      !source.equipment_requirements.every(nonempty)) {
    throw new Error("This exercise's replacement details could not be checked. Your session is unchanged.");
  }
  sameDoseSwap(saved as unknown as SwapDose, { dosage_unit: source.dosage_unit });
}

export interface SwapCatalogFacts {
  phase: string;
  sport: "baseball" | "softball";
  position: string;
  ageYears: number;
  trainingAge: string;
  trainingAgeYears: number;
  injuryRestrictions: readonly string[];
  gameDay: boolean;
  practiceDay: boolean;
}

/** Pure necessary conditions, NOT full certification. Caller must still read fresh
 * canonical athlete/day facts and run every applicable session/final check under
 * the shared transaction lock. Nothing here writes or constructs a saved row.
 */
export function checkSwapCatalogPair(source: Row, target: Row, saved: Row, facts: SwapCatalogFacts): SwapDose {
  requireSwapCatalogSource(source, saved);
  if (!nonempty(facts.position) || !nonempty(facts.trainingAge) ||
      !["os_q1", "os_q2", "os_q3", "os_q4", "in_season", "post_season"].includes(facts.phase) ||
      !["baseball", "softball"].includes(facts.sport) ||
      !cost(facts.ageYears) || !cost(facts.trainingAgeYears) ||
      !Array.isArray(facts.injuryRestrictions) || !facts.injuryRestrictions.every(nonempty) ||
      typeof facts.gameDay !== "boolean" || typeof facts.practiceDay !== "boolean") throw new Error("Missing current catalog-check facts.");
  if (source.slug === target.slug || target.is_active !== true || target.superseded_by !== null ||
      !nonempty(target.slug) || !nonempty(target.name) ||
      ["movement_category", "substitution_family", "primary_adaptation"].some(key => source[key] !== target[key]) ||
      !nonempty(target.dosage_unit) || !Array.isArray(target.equipment_requirements) ||
      !target.equipment_requirements.every(nonempty)) throw new Error("Replacement identity or intent differs.");
  for (const row of [source, target]) {
    const season = row.season_legality as Record<string, unknown> | null;
    const training = row.training_age_legality as Record<string, unknown> | null;
    if ((row.sport_scope !== "both" && row.sport_scope !== facts.sport) ||
        !Array.isArray(row.position_scope) || !row.position_scope.includes(facts.position) ||
        !cost(row.min_age_years) || row.min_age_years > facts.ageYears ||
        !cost(row.min_training_age_years) || row.min_training_age_years > facts.trainingAgeYears ||
        !Array.isArray(row.contraindications) || !row.contraindications.every(nonempty) ||
        row.contraindications.some(value => facts.injuryRestrictions.includes(value)) ||
        season?.[facts.phase] !== true || training?.[facts.trainingAge] !== true ||
        typeof row.eccentric_overload !== "boolean" || typeof row.is_eccentric_dominant !== "boolean" ||
        (facts.gameDay && row.game_day_legal !== true) || (facts.practiceDay && row.practice_day_legal !== true) ||
        !isMovementSeasonLegal(seasonContextFromPhase(facts.phase), row as unknown as Parameters<typeof isMovementSeasonLegal>[1]).legal) {
      throw new Error("Source or replacement catalog legality is missing or forbidden.");
    }
  }
  if (costs.some(key => !cost(source[key]) || !cost(target[key]) || target[key] > source[key])) {
    throw new Error("Replacement workload is missing or higher in a channel.");
  }
  return sameDoseSwap(saved as unknown as SwapDose, { dosage_unit: target.dosage_unit });
}