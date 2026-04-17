/**
 * Performance-grade Hydration Scoring engine.
 *
 * Pure, deterministic. Given per-serving nutrition (water_g, electrolytes, sugar),
 * returns a 0–100 hydration score with tier and a short, human-readable insight.
 *
 * Formula:
 *   hydration_score = water% * 0.6 + electrolyte_score * 0.3 + sugar_score * 0.1
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
  sugar_score: number;         // 0–100 (100 = low sugar, positive contributor)
  hydration_score: number;     // 0–100
  hydration_tier: HydrationTier;
  insight: string;
  // Advanced fields — scaffolded, always present, null until implemented
  glucose_g: number | null;
  fructose_g: number | null;
  osmolality_estimate: number | null;
  absorption_score: number | null;
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
  return clamp(Math.round(na * 0.5 + k * 0.3 + mg * 0.2));
}

/**
 * Sugar score per 8oz. ≤2g = 100 (best), scales linearly to 0 at 26g/8oz.
 * Treated as a positive contributor: 100 = low sugar = good.
 */
function sugarScore(sugar_g: number, oz: number): number {
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

// --- Insight provider registry ---------------------------------------------

export interface InsightFragment {
  priority: number; // lower = earlier in output
  text: string;
}

export type InsightProvider = (
  p: Omit<HydrationProfile, 'insight'>,
  n: HydrationNutritionInput,
) => InsightFragment | null;

const waterInsightProvider: InsightProvider = (p) => {
  const text =
    p.water_percent >= 95 ? 'Excellent water content' :
    p.water_percent >= 80 ? 'High water content' :
    'Moderate water content';
  return { priority: 10, text };
};

const electrolyteInsightProvider: InsightProvider = (p) => {
  const text =
    p.electrolyte_score >= 70 ? 'strong electrolyte replenishment' :
    p.electrolyte_score >= 35 ? 'some electrolytes' :
    'minimal electrolytes';
  return { priority: 20, text };
};

const sugarInsightProvider: InsightProvider = (p) => {
  if (p.sugar_score <= 30) return { priority: 30, text: 'but high added sugar penalizes the score' };
  if (p.sugar_score <= 70) return { priority: 30, text: 'with moderate sugar' };
  return null;
};

const tierInsightProvider: InsightProvider = (p) => {
  const text =
    p.hydration_tier === 'optimal'  ? 'Optimal hydration choice.' :
    p.hydration_tier === 'high'     ? 'High-quality hydration.' :
    p.hydration_tier === 'moderate' ? 'Moderate hydration value.' :
    'Low hydration value — favor water or electrolytes next.';
  return { priority: 100, text };
};

/**
 * Registry of insight providers. Add new providers here for future
 * performance-based, activity-based, or personalized insights.
 */
const insightProviders: InsightProvider[] = [
  waterInsightProvider,
  electrolyteInsightProvider,
  sugarInsightProvider,
  tierInsightProvider,
];

function generateInsight(p: Omit<HydrationProfile, 'insight'>, n: HydrationNutritionInput): string {
  const fragments = insightProviders
    .map(provider => provider(p, n))
    .filter((f): f is InsightFragment => f !== null)
    .sort((a, b) => a.priority - b.priority);

  if (fragments.length === 0) return '';

  // Separate tier sentence (priority >= 100) from detail fragments
  const details = fragments.filter(f => f.priority < 100).map(f => f.text);
  const tier = fragments.find(f => f.priority >= 100);

  const detailStr = details.join(', ');
  return tier ? `${detailStr}. ${tier.text}` : `${detailStr}.`;
}

// --- public API ------------------------------------------------------------

export function computeHydrationProfile(n: HydrationNutritionInput): HydrationProfile {
  const servingG = n.amount_oz * OZ_TO_G;
  const water_percent = clamp(servingG > 0 ? (n.water_g / servingG) * 100 : 0);
  const electrolyte_score = scoreElectrolytes(n.sodium_mg, n.potassium_mg, n.magnesium_mg, n.amount_oz);
  const sugar_score_val = sugarScore(n.sugar_g, n.amount_oz);
  const hydration_score = clamp(
    Math.round(water_percent * 0.6 + electrolyte_score * 0.3 + sugar_score_val * 0.1)
  );
  const hydration_tier = tierFor(hydration_score);

  const partial: Omit<HydrationProfile, 'insight'> = {
    water_percent: Math.round(water_percent),
    electrolyte_score,
    sugar_score: sugar_score_val,
    hydration_score,
    hydration_tier,
    glucose_g: null,
    fructose_g: null,
    osmolality_estimate: null,
    absorption_score: null,
  };
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
