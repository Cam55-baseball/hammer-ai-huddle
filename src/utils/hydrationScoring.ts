/**
 * Performance-grade Hydration Scoring engine.
 *
 * Pure, deterministic. Given per-serving nutrition (water_g, electrolytes, sugar),
 * returns a 0–100 hydration score with tier and a short, human-readable insight.
 *
 * Formula:
 *   hydration_score = water% * 0.6 + electrolyte_score * 0.3 + sugar_penalty * 0.1
 */

export type HydrationTier = 'optimal' | 'high' | 'moderate' | 'low';

export interface HydrationNutritionInput {
  amount_oz: number;
  water_g: number;
  sodium_mg: number;
  potassium_mg: number;
  magnesium_mg: number;
  sugar_g: number;
  total_carbs_g?: number;
}

export interface HydrationProfile {
  water_percent: number;       // 0–100
  electrolyte_score: number;   // 0–100
  sugar_penalty: number;       // 0–100 (100 = no penalty)
  hydration_score: number;     // 0–100
  hydration_tier: HydrationTier;
  insight: string;
}

const OZ_TO_G = 29.5735;

// --- helpers ---------------------------------------------------------------

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

/**
 * Score electrolytes per 8oz serving against athletic-replenishment targets.
 * Targets (per 8oz): Na 110mg, K 30mg, Mg 6mg → roughly Gatorade-equivalent
 * electrolyte density. Weighted Na 50%, K 30%, Mg 20%.
 */
function scoreElectrolytes(na_mg: number, k_mg: number, mg_mg: number, oz: number): number {
  if (oz <= 0) return 0;
  const per8 = (v: number) => (v / oz) * 8;
  const na = clamp((per8(na_mg) / 110) * 100);
  const k  = clamp((per8(k_mg)  / 30)  * 100);
  const mg = clamp((per8(mg_mg) / 6)   * 100);
  return Math.round(na * 0.5 + k * 0.3 + mg * 0.2);
}

/**
 * Sugar penalty per 8oz. ≤2g = 100 (no penalty), scales linearly to 0 at 26g/8oz.
 */
function sugarPenalty(sugar_g: number, oz: number): number {
  if (oz <= 0) return 100;
  const per8 = (sugar_g / oz) * 8;
  if (per8 <= 2)  return 100;
  if (per8 >= 26) return 0;
  return Math.round(100 - ((per8 - 2) / 24) * 100);
}

function tierFor(score: number): HydrationTier {
  if (score >= 85) return 'optimal';
  if (score >= 70) return 'high';
  if (score >= 50) return 'moderate';
  return 'low';
}

function generateInsight(p: Omit<HydrationProfile, 'insight'>, n: HydrationNutritionInput): string {
  const parts: string[] = [];
  if (p.water_percent >= 95)      parts.push('Excellent water content');
  else if (p.water_percent >= 80) parts.push('High water content');
  else                            parts.push('Moderate water content');

  if (p.electrolyte_score >= 70)      parts.push('strong electrolyte replenishment');
  else if (p.electrolyte_score >= 35) parts.push('some electrolytes');
  else                                parts.push('minimal electrolytes');

  if (p.sugar_penalty <= 30)      parts.push('but high added sugar penalizes the score');
  else if (p.sugar_penalty <= 70) parts.push('with moderate sugar');

  const tierWord =
    p.hydration_tier === 'optimal'  ? 'Optimal hydration choice.' :
    p.hydration_tier === 'high'     ? 'High-quality hydration.' :
    p.hydration_tier === 'moderate' ? 'Moderate hydration value.' :
                                      'Low hydration value — favor water or electrolytes next.';

  return `${parts.join(', ')}. ${tierWord}`;
}

// --- public API ------------------------------------------------------------

export function computeHydrationProfile(n: HydrationNutritionInput): HydrationProfile {
  const servingG = n.amount_oz * OZ_TO_G;
  const water_percent = clamp(servingG > 0 ? (n.water_g / servingG) * 100 : 0);
  const electrolyte_score = scoreElectrolytes(n.sodium_mg, n.potassium_mg, n.magnesium_mg, n.amount_oz);
  const sugar_penalty = sugarPenalty(n.sugar_g, n.amount_oz);
  const hydration_score = clamp(
    Math.round(water_percent * 0.6 + electrolyte_score * 0.3 + sugar_penalty * 0.1)
  );
  const hydration_tier = tierFor(hydration_score);

  const partial = { water_percent: Math.round(water_percent), electrolyte_score, sugar_penalty, hydration_score, hydration_tier };
  return { ...partial, insight: generateInsight(partial, n) };
}

/**
 * Tailwind/HSL-friendly color tokens for tiers. Components can map these as needed.
 */
export const TIER_LABEL: Record<HydrationTier, string> = {
  optimal:  'Optimal',
  high:     'High Quality',
  moderate: 'Moderate',
  low:      'Low',
};

export const TIER_TEXT_CLASS: Record<HydrationTier, string> = {
  optimal:  'text-emerald-500',
  high:     'text-blue-500',
  moderate: 'text-amber-500',
  low:      'text-destructive',
};

export const TIER_BG_CLASS: Record<HydrationTier, string> = {
  optimal:  'bg-emerald-500/10 border-emerald-500/30',
  high:     'bg-blue-500/10 border-blue-500/30',
  moderate: 'bg-amber-500/10 border-amber-500/30',
  low:      'bg-destructive/10 border-destructive/30',
};
