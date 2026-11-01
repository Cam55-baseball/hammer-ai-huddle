/**
 * Owner Nov 1 round 2 (item 2): saved FUTURE days whose season no longer matches
 * the athlete's season for that date are rebuilt. Logged or marked days are never
 * touched. Pure: the caller supplies the expected season per date.
 */
export interface SavedDayRow { plan_date: string; phase: string | null; status: string | null }

const marked = (s: string | null) => !!s && s !== "planned" && s !== "pending";

export function staleSeasonDates(
  rows: readonly SavedDayRow[],
  loggedDates: ReadonlySet<string>,
  today: string,
  expectedPhase: (date: string) => string | null,
): string[] {
  const byDate = new Map<string, SavedDayRow[]>();
  for (const r of rows) if (r.plan_date > today) byDate.set(r.plan_date, [...(byDate.get(r.plan_date) ?? []), r]);
  const out: string[] = [];
  for (const [date, rs] of byDate) {
    if (loggedDates.has(date) || rs.some((r) => marked(r.status))) continue;
    const want = expectedPhase(date);
    if (!want) continue;
    if (rs.some((r) => r.phase && r.phase !== want)) out.push(date);
  }
  return out.sort();
}
