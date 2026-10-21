import { isSameOrLowerRisk, type RiskFacts } from "./alternativeRisk";
import { isMovementSeasonLegal, seasonContextFromPhase } from "../../../supabase/functions/_shared/wic/season";

export interface SwapEligibilityFacts extends RiskFacts {
  slug: string;
  is_active?: boolean | null;
  movement_category: string | null;
  substitution_family: string | null;
  dosage_unit: string | null;
  season_legality: Record<string, boolean> | null;
  training_age_legality: Record<string, boolean> | null;
  season_eligibility?: string[] | null;
  phase_allow?: string[] | null;
  is_eccentric_dominant?: boolean | null;
}

/** Display prefilter only; fresh server certification is still required for universal Swap. */
export function eligibleSwapCandidate(anchor: SwapEligibilityFacts, candidate: SwapEligibilityFacts, context: {
  category: string | null; unit: string | null; phase: string | null;
  trainingAge: string | null; approvedEquivalent?: boolean;
}): boolean {
  const { category, unit, phase, trainingAge } = context;
  if (!category || !unit?.trim() || !phase || !trainingAge) return false;
  if (candidate.is_active !== true || candidate.movement_category !== category) return false;
  if (!context.approvedEquivalent && (!anchor.substitution_family || candidate.substitution_family !== anchor.substitution_family)) return false;
  if (candidate.dosage_unit?.trim().toLowerCase() !== unit.trim().toLowerCase()) return false;
  if (candidate.season_legality?.[phase] !== true || candidate.training_age_legality?.[trainingAge] !== true) return false;
  if (!isMovementSeasonLegal(seasonContextFromPhase(phase), candidate).legal) return false;
  return isSameOrLowerRisk(anchor, candidate);
}