// Client mirror of supabase/functions/_shared/hydrationCategoryRules.ts
// Kept in sync manually — edge module is server source of truth, this is its
// browser twin so the client can enforce micronutrient completeness too.

import { HYDRATION_MICRO_KEYS, type HydrationMicroKey, type HydrationMicros } from './hydrationMicros';

export type Category =
  | 'dairy' | 'plant_milk' | 'citrus_juice' | 'fruit_juice' | 'coconut_water'
  | 'sports_drink' | 'energy_drink' | 'coffee' | 'tea' | 'soda'
  | 'kombucha' | 'kefir' | 'broth' | 'wine' | 'beer' | 'smoothie'
  | 'water' | 'other';

export const REQUIRED_MICROS: Record<Category, HydrationMicroKey[]> = {
  dairy:         ['calcium_mg','potassium_mg','magnesium_mg','zinc_mg'],
  plant_milk:    ['calcium_mg','vitamin_d_mcg','vitamin_b12_mcg'],
  citrus_juice:  ['vitamin_c_mg','folate_mcg','potassium_mg'],
  fruit_juice:   ['potassium_mg','vitamin_c_mg'],
  coconut_water: ['potassium_mg','magnesium_mg'],
  sports_drink:  ['potassium_mg'],
  energy_drink:  ['vitamin_b6_mg','vitamin_b12_mcg'],
  kombucha:      ['vitamin_b12_mcg'],
  kefir:         ['calcium_mg','vitamin_b12_mcg'],
  broth:         ['potassium_mg'],
  wine:          ['potassium_mg'],
  beer:          ['potassium_mg'],
  smoothie:      ['potassium_mg','vitamin_c_mg'],
  coffee:        [],
  tea:           [],
  soda:          [],
  water:         [],
  other:         [],
};

export const FALLBACK_MINIMUMS: Record<Category, Partial<HydrationMicros>> = {
  dairy:         { calcium_mg: 15, potassium_mg: 18, magnesium_mg: 1.4, zinc_mg: 0.1, vitamin_a_mcg: 14, vitamin_b12_mcg: 0.05 },
  plant_milk:    { calcium_mg: 14, vitamin_d_mcg: 0.3, vitamin_b12_mcg: 0.15 },
  citrus_juice:  { vitamin_c_mg: 10, folate_mcg: 9, potassium_mg: 24 },
  fruit_juice:   { potassium_mg: 14, vitamin_c_mg: 1 },
  coconut_water: { potassium_mg: 75, magnesium_mg: 7.5, calcium_mg: 7, folate_mcg: 0.9 },
  sports_drink:  { potassium_mg: 4, vitamin_b12_mcg: 0.04 },
  energy_drink:  { vitamin_b6_mg: 0.5, vitamin_b12_mcg: 0.7 },
  kombucha:      { vitamin_b12_mcg: 0.06, folate_mcg: 0.5 },
  kefir:         { calcium_mg: 13, potassium_mg: 16, vitamin_b12_mcg: 0.1, magnesium_mg: 1.4 },
  broth:         { potassium_mg: 10, calcium_mg: 3, iron_mg: 0.1 },
  wine:          { potassium_mg: 32, magnesium_mg: 3, iron_mg: 0.13 },
  beer:          { potassium_mg: 8, magnesium_mg: 2, folate_mcg: 1.5 },
  smoothie:      { potassium_mg: 20, vitamin_c_mg: 3, calcium_mg: 5 },
  coffee:        {},
  tea:           {},
  soda:          {},
  water:         {},
  other:         {},
};

export const ZERO_ALLOWED: Set<Category> = new Set(['water','coffee','tea','soda']);

// Map app-level liquid_type values (e.g. "milk", "goat_milk", "juice_natural")
// onto our nutritional categories, then pattern-match the free-text name.
const LIQUID_TYPE_MAP: Record<string, Category> = {
  water: 'water',
  coconut_water: 'coconut_water',
  juice_natural: 'fruit_juice',
  juice_artificial: 'soda',
  milk: 'dairy',
  goat_milk: 'dairy',
  smoothie: 'smoothie',
  tea: 'tea',
  coffee: 'coffee',
  sports_drink: 'sports_drink',
  soda: 'soda',
  energy_drink: 'energy_drink',
};

const CATEGORY_PATTERNS: Array<[Category, RegExp]> = [
  ['water',         /^(plain |distilled |sparkling |mineral |tap )?water$|^seltzer$/i],
  ['coffee',        /\b(black coffee|espresso|americano|cold brew)\b|^coffee$/i],
  ['tea',           /\b(green tea|black tea|oolong|herbal tea|matcha)\b|^tea$|^iced tea$/i],
  ['plant_milk',    /\b(almond|oat|soy|rice|cashew|hemp|pea) ?milk\b/i],
  ['kefir',         /\bkefir\b/i],
  ['kombucha',      /\bkombucha\b/i],
  ['coconut_water', /\bcoconut water\b/i],
  ['dairy',         /\b(cow|goat|sheep|whole|skim|2%|1%|chocolate|strawberry)? ?milk\b|\b(buttermilk|half and half|cream)\b/i],
  ['citrus_juice',  /\b(orange|grapefruit|lemon|lime|tangerine) juice\b|\boj\b/i],
  ['fruit_juice',   /\b(apple|grape|cranberry|pineapple|pomegranate|cherry|pear|mango) juice\b|\bjuice\b/i],
  ['sports_drink',  /\b(gatorade|powerade|bodyarmor|liquid iv|liquid i\.v\.|nuun|propel|electrolyte|sports drink|pedialyte)\b/i],
  ['energy_drink',  /\b(red bull|monster|rockstar|bang|celsius|c4|ghost|reign|alani|energy drink)\b/i],
  ['soda',          /\b(coke|cola|pepsi|sprite|fanta|dr pepper|mountain dew|root beer|ginger ale|soda|pop|7up)\b/i],
  ['broth',         /\b(bone broth|chicken broth|beef broth|veg(etable)? broth|broth|stock|consomm[eé])\b/i],
  ['wine',          /\b(red wine|white wine|rose|rosé|wine|champagne|prosecco)\b/i],
  ['beer',          /\b(beer|lager|ipa|stout|ale|pilsner)\b/i],
  ['smoothie',      /\b(smoothie|shake|protein shake|frappe)\b/i],
];

export function inferCategory(name?: string | null, hint?: string | null): Category {
  // 1) Direct liquid_type map (most reliable for preset path)
  if (hint && LIQUID_TYPE_MAP[hint]) return LIQUID_TYPE_MAP[hint];
  if (name && LIQUID_TYPE_MAP[name]) return LIQUID_TYPE_MAP[name];

  // 2) Free-text regex on combined haystack
  const haystack = `${name || ''} ${hint || ''}`.toLowerCase().trim();
  if (!haystack) return 'other';
  for (const [cat, re] of CATEGORY_PATTERNS) {
    if (re.test(haystack)) return cat;
  }
  return 'other';
}

export function isComplete(
  category: Category,
  micros: Partial<HydrationMicros> | null | undefined,
): { ok: boolean; missing: HydrationMicroKey[] } {
  const m = micros || {};
  const required = REQUIRED_MICROS[category] || [];
  const missing: HydrationMicroKey[] = [];
  for (const k of required) {
    const v = Number((m as any)[k]);
    if (!Number.isFinite(v) || v <= 0) missing.push(k);
  }
  if (required.length === 0 && !ZERO_ALLOWED.has(category)) {
    const allZero = HYDRATION_MICRO_KEYS.every(k => !Number((m as any)[k]));
    if (allZero) return { ok: false, missing: ['potassium_mg'] };
  }
  return { ok: missing.length === 0, missing };
}

/** Fill any required key still at 0 with category fallback. Never overwrites non-zero. */
export function applyFallbacks(
  category: Category,
  micros: Partial<HydrationMicros> | null | undefined,
): HydrationMicros {
  const fb = FALLBACK_MINIMUMS[category] || {};
  const out: HydrationMicros = { ...({} as HydrationMicros) };
  // Seed all 13 keys to existing or 0
  for (const k of HYDRATION_MICRO_KEYS) {
    const v = Number((micros as any)?.[k]);
    out[k] = Number.isFinite(v) ? v : 0;
  }
  for (const [k, v] of Object.entries(fb)) {
    const cur = Number(out[k as HydrationMicroKey]);
    if (!cur || cur <= 0) out[k as HydrationMicroKey] = Number(v) || 0;
  }
  return out;
}
