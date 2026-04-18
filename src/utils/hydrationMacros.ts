// Per-oz macro shape returned by hydration AI functions and stored on
// hydration_beverage_database / hydration_logs.

import { multiplyMicros, type HydrationMicros } from './hydrationMicros';

export interface HydrationMacrosPerOz {
  water_g: number;
  sodium_mg: number;
  potassium_mg: number;
  magnesium_mg: number;
  calcium_mg: number;
  sugar_g: number;
  glucose_g: number;
  fructose_g: number;
  total_carbs_g: number;
  osmolality_estimate: number;
}

export interface HydrationMacrosTotals extends HydrationMacrosPerOz {}

export const EMPTY_MACROS_PER_OZ: HydrationMacrosPerOz = {
  water_g: 0,
  sodium_mg: 0,
  potassium_mg: 0,
  magnesium_mg: 0,
  calcium_mg: 0,
  sugar_g: 0,
  glucose_g: 0,
  fructose_g: 0,
  total_carbs_g: 0,
  osmolality_estimate: 0,
};

const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

/** Sanitize and clamp a per-oz macro object to physiologically plausible ranges. */
export function sanitizeMacrosPerOz(m: Partial<HydrationMacrosPerOz> | null | undefined): HydrationMacrosPerOz {
  const src = m ?? {};
  return {
    water_g:             clamp(num(src.water_g),             0, 29.6),
    sodium_mg:           clamp(num(src.sodium_mg),           0, 200),
    potassium_mg:        clamp(num(src.potassium_mg),        0, 500),
    magnesium_mg:        clamp(num(src.magnesium_mg),        0, 200),
    calcium_mg:          clamp(num(src.calcium_mg),          0, 200),
    sugar_g:             clamp(num(src.sugar_g),             0, 12),
    glucose_g:           clamp(num(src.glucose_g),           0, 12),
    fructose_g:          clamp(num(src.fructose_g),          0, 12),
    total_carbs_g:       clamp(num(src.total_carbs_g),       0, 20),
    osmolality_estimate: clamp(num(src.osmolality_estimate), 0, 2000),
  };
}

/** Multiply per-oz macros by serving size (oz) → totals for the log. */
export function multiplyMacros(perOz: HydrationMacrosPerOz, oz: number): HydrationMacrosTotals {
  const out = { ...EMPTY_MACROS_PER_OZ };
  if (!Number.isFinite(oz) || oz <= 0) return out;
  for (const k of Object.keys(perOz) as (keyof HydrationMacrosPerOz)[]) {
    out[k] = num(perOz[k]) * oz;
  }
  return out;
}

/** Mirror Ca/K/Mg between macros and micros so scoring + UI agree. */
export function mirrorElectrolytes(
  macros: HydrationMacrosPerOz,
  micros: Partial<HydrationMicros> | null | undefined,
): { macros: HydrationMacrosPerOz; micros: Partial<HydrationMicros> } {
  const microsObj = { ...(micros ?? {}) } as Partial<HydrationMicros>;
  // Take the max of the two sources for each electrolyte.
  const ca = Math.max(num(macros.calcium_mg),   num(microsObj.calcium_mg));
  const mg = Math.max(num(macros.magnesium_mg), num(microsObj.magnesium_mg));
  const k  = Math.max(num(macros.potassium_mg), num(microsObj.potassium_mg));
  const merged = { ...macros, calcium_mg: ca, magnesium_mg: mg, potassium_mg: k };
  microsObj.calcium_mg   = ca;
  microsObj.magnesium_mg = mg;
  microsObj.potassium_mg = k;
  return { macros: merged, micros: microsObj };
}

export { multiplyMicros };
