/**
 * Owner Nov 9 (round 3): block physically impossible numbers WHEN TYPED.
 * Every screen where a person types a measurement asks this ONE judge, which reads the ONE metric
 * dictionary (with unit conversion) — the same bounds ledger-save uses as the backup.
 * Pure and hook-free. Blank or non-numeric input is not judged here (required-field rules stay
 * with each screen); unknown metric names are never blocked (missing beats fabricated).
 */
import { canonicalize, metricDef } from "../../../supabase/functions/_shared/ledger/metricDictionary";

export const IMPOSSIBLE_NUMBER_MESSAGE = "That number doesn't look right — double-check it.";

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const s = String(value).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * True when a typed value is outside the metric's physical range.
 * `metric` is a canonical key or any dictionary alias (e.g. "checkin.weight_lbs", "six_week.ten_yard_dash").
 * `unit` is the unit the screen collects in (defaults to the alias/canonical unit).
 */
export function isImpossibleEntry(metric: string, value: unknown, unit?: string | null): boolean {
  const n = toNumber(value);
  if (n == null) return false;
  const c = canonicalize(metric, n, unit ?? null);
  if (!c || c.value == null) return false;
  const d = metricDef(c.key);
  if (!d || d.physMin == null || d.physMax == null) return false;
  return c.value < d.physMin || c.value > d.physMax;
}

/** Field name → true for each impossible field in a form. */
export function impossibleFields<K extends string>(
  fields: Partial<Record<K, { metric: string; value: unknown; unit?: string | null }>>,
): Partial<Record<K, true>> {
  const out: Partial<Record<K, true>> = {};
  for (const [name, f] of Object.entries(fields) as Array<[K, { metric: string; value: unknown; unit?: string | null } | undefined]>) {
    if (f && isImpossibleEntry(f.metric, f.value, f.unit)) out[name] = true;
  }
  return out;
}

export function anyImpossible(flags: Partial<Record<string, true>>): boolean {
  return Object.values(flags).some(Boolean);
}
