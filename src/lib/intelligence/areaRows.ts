// Performance rows: one per area the player actually has analyses in. No empty sections.
// Analysis scores are locked from players, so rows show only counts and link to the report card.
export interface AreaVideo { module: string; created_at: string }
export interface AreaRow { area: string; count: number; lastAt: string }

const LABEL: Record<string, string> = { hitting: "Hitting", pitching: "Pitching", throwing: "Throwing" };

export function buildAreaRows(videos: AreaVideo[]): AreaRow[] {
  const by = new Map<string, AreaRow>();
  for (const v of videos) {
    const area = LABEL[v.module];
    if (!area) continue;
    const r = by.get(area) ?? { area, count: 0, lastAt: v.created_at };
    r.count += 1;
    if (Date.parse(v.created_at) > Date.parse(r.lastAt)) r.lastAt = v.created_at;
    by.set(area, r);
  }
  return [...by.values()];
}
