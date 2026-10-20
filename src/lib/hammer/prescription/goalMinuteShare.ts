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

  // Fund from the lowest-ranked categories first, down to their minimums only.
  const funders = rows
    .filter(r => r.category !== top && r.category !== second)
    .map(r => ({ category: r.category, spare: Math.max(0, clean(r.baseMin) - clean(r.minMin)) }))
    .filter(r => r.spare > 0)
    .sort((a, b) => ranked.indexOf(b.category) - ranked.indexOf(a.category));
  let available = funders.reduce((sum, r) => sum + r.spare, 0);

  for (const [category, want] of wanted) {
    const grant = Math.min(want, available);
    if (grant <= 0) continue;
    available -= grant;
    result[category] = base(category) + grant;
    // Take the grant proportionally from funders' spare minutes.
    let remaining = grant;
    const totalSpare = funders.reduce((sum, r) => sum + r.spare, 0);
    for (const f of funders) {
      if (remaining <= 0 || totalSpare <= 0) break;
      const take = Math.min(f.spare, (grant * f.spare) / totalSpare);
      f.spare -= take;
      result[f.category] = Math.max(clean(rows.find(r => r.category === f.category)?.minMin ?? 0), result[f.category]! - take);
      remaining -= take;
    }
  }
  // Round to whole minutes without dropping any category below its minimum.
  for (const row of rows) {
    result[row.category] = Math.max(clean(row.minMin), Math.round(result[row.category]!));
  }
  return result;
}
