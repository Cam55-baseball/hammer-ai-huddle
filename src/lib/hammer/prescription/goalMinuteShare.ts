/**
 * Owner rule (Oct 20): within the existing session caps and rest rules, the
 * top-ranked goal's category gets about 25% more weekly skill minutes and the
 * second about 10% more, taken from categories ranked lower but never below
 * their minimums. Total weekly minutes are conserved — the boost is funded
 * only by real spare minutes above lower categories' floors, never invented.
 */

export interface CategoryMinutes {
  readonly category: string;
  /** This week's planned skill minutes before goal weighting. */
  readonly baseMin: number;
  /** The category's weekly minimum; the share never takes a category below it. */
  readonly minMin: number;
}

export const TOP_GOAL_BOOST = 0.25;
export const SECOND_GOAL_BOOST = 0.10;

const clean = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * Returns adjusted weekly minutes per category. Unranked or unknown categories
 * keep their base minutes. When lower categories cannot fund the full boost
 * without dropping below their minimums, the boost shrinks to what is actually
 * available — floors always win.
 */
export function goalMinuteShare(
  rows: readonly CategoryMinutes[],
  ranked: readonly string[],
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const row of rows) result[row.category] = clean(row.baseMin);
  const top = ranked[0];
  const second = ranked[1];
  const has = (c: string | undefined): c is string => Boolean(c && rows.some(r => r.category === c));
  if (!has(top)) return result;

  const base = (c: string) => clean(rows.find(r => r.category === c)?.baseMin ?? 0);
  const wanted = new Map<string, number>([[top, base(top) * TOP_GOAL_BOOST]]);
  if (has(second) && second !== top) wanted.set(second, base(second) * SECOND_GOAL_BOOST);

  // Each boost is funded only by categories ranked below the boosted one,
  // taken from the lowest-ranked first, down to their minimums only. The
  // second-ranked goal funds the top goal only as a last resort — its own
  // boost is protected unless the top goal cannot be funded otherwise.
  const spare = new Map(rows.map(r => [r.category, Math.max(0, clean(r.baseMin) - clean(r.minMin))]));
  const rankOf = (c: string) => { const i = ranked.indexOf(c); return i === -1 ? ranked.length : i; };

  for (const [category, want] of wanted) {
    const funders = rows
      .filter(r => r.category !== category && rankOf(r.category) > rankOf(category) && (spare.get(r.category) ?? 0) > 0)
      .sort((a, b) => {
        const aSecond = a.category === second ? 1 : 0;
        const bSecond = b.category === second ? 1 : 0;
        return aSecond - bSecond || rankOf(b.category) - rankOf(a.category);
      });
    const available = funders.reduce((sum, r) => sum + (spare.get(r.category) ?? 0), 0);
    const grant = Math.min(want, available);
    if (grant <= 0) continue;
    result[category] = (result[category] ?? base(category)) + grant;
    // Take proportionally from lower categories first; the second-ranked goal
    // covers only the shortfall, so its own boost survives when others can pay.
    const takeFrom = (pool: readonly typeof funders, amount: number) => {
      const poolSpare = pool.reduce((sum, r) => sum + (spare.get(r.category) ?? 0), 0);
      if (poolSpare <= 0) return 0;
      let taken = 0;
      for (const f of pool) {
        const fSpare = spare.get(f.category) ?? 0;
        const take = Math.min(fSpare, (amount * fSpare) / poolSpare);
        spare.set(f.category, fSpare - take);
        result[f.category] = Math.max(clean(rows.find(r => r.category === f.category)?.minMin ?? 0), result[f.category]! - take);
        taken += take;
      }
      return taken;
    };
    const primary = funders.filter(f => f.category !== second);
    const taken = takeFrom(primary, grant);
    if (taken < grant - 1e-9) takeFrom(funders.filter(f => f.category === second), grant - taken);
  }
  // Round to whole minutes without dropping any category below its minimum.
  for (const row of rows) {
    result[row.category] = Math.max(clean(row.minMin), Math.round(result[row.category]!));
  }
  return result;
}
