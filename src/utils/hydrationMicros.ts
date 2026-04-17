// Shared micronutrient keys + helpers for hydration logs.
// Mirrors the 13 keys used by parse-food-text / nutrition micros.

export const HYDRATION_MICRO_KEYS = [
  'vitamin_a_mcg',
  'vitamin_c_mg',
  'vitamin_d_mcg',
  'vitamin_e_mg',
  'vitamin_k_mcg',
  'vitamin_b6_mg',
  'vitamin_b12_mcg',
  'folate_mcg',
  'calcium_mg',
  'iron_mg',
  'magnesium_mg',
  'potassium_mg',
  'zinc_mg',
] as const;

export type HydrationMicroKey = typeof HYDRATION_MICRO_KEYS[number];
export type HydrationMicros = Record<HydrationMicroKey, number>;

export const EMPTY_MICROS: HydrationMicros = HYDRATION_MICRO_KEYS.reduce(
  (acc, k) => { acc[k] = 0; return acc; },
  {} as HydrationMicros,
);

/** Multiply a per-oz micro object by a serving size (oz) → totals for that log. */
export function multiplyMicros(
  perOz: Partial<HydrationMicros> | null | undefined,
  amountOz: number,
): HydrationMicros {
  const out = { ...EMPTY_MICROS };
  if (!perOz || !Number.isFinite(amountOz) || amountOz <= 0) return out;
  for (const k of HYDRATION_MICRO_KEYS) {
    const v = Number((perOz as any)[k]);
    out[k] = Number.isFinite(v) ? v * amountOz : 0;
  }
  return out;
}

/** Sum an array of (possibly partial / null) micro objects. */
export function sumMicros(items: Array<Partial<HydrationMicros> | null | undefined>): HydrationMicros {
  const out = { ...EMPTY_MICROS };
  for (const item of items) {
    if (!item) continue;
    for (const k of HYDRATION_MICRO_KEYS) {
      const v = Number((item as any)[k]);
      if (Number.isFinite(v)) out[k] += v;
    }
  }
  return out;
}

/** Display metadata for each micro key. */
export const MICRO_LABELS: Record<HydrationMicroKey, { short: string; unit: string; decimals: number }> = {
  vitamin_a_mcg:   { short: 'Vit A',  unit: 'mcg', decimals: 0 },
  vitamin_c_mg:    { short: 'Vit C',  unit: 'mg',  decimals: 0 },
  vitamin_d_mcg:   { short: 'Vit D',  unit: 'mcg', decimals: 1 },
  vitamin_e_mg:    { short: 'Vit E',  unit: 'mg',  decimals: 1 },
  vitamin_k_mcg:   { short: 'Vit K',  unit: 'mcg', decimals: 0 },
  vitamin_b6_mg:   { short: 'B6',     unit: 'mg',  decimals: 2 },
  vitamin_b12_mcg: { short: 'B12',    unit: 'mcg', decimals: 1 },
  folate_mcg:      { short: 'Folate', unit: 'mcg', decimals: 0 },
  calcium_mg:      { short: 'Ca',     unit: 'mg',  decimals: 0 },
  iron_mg:         { short: 'Fe',     unit: 'mg',  decimals: 1 },
  magnesium_mg:    { short: 'Mg',     unit: 'mg',  decimals: 0 },
  potassium_mg:    { short: 'K',      unit: 'mg',  decimals: 0 },
  zinc_mg:         { short: 'Zn',     unit: 'mg',  decimals: 1 },
};

export function formatMicro(key: HydrationMicroKey, value: number): string {
  const meta = MICRO_LABELS[key];
  return `${meta.short} ${value.toFixed(meta.decimals)} ${meta.unit}`;
}
