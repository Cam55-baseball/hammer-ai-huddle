// Performance rows: one per area the player actually has analyses in. No empty sections.
export interface AreaVideo { module: string; efficiency_score: number | null; created_at: string }
export interface AreaRow { area: string; latest: number | null; previous: number | null; trend: "up" | "down" | "flat" | null; count: number }

const LABEL: Record<string, string> = { hitting: "Hitting", pitching: "Pitching", throwing: "Throwing" };

export function buildAreaRows(videos: AreaVideo[]): AreaRow[] {
  const by = new Map<string, AreaVideo[]>();
  for (const v of videos) {
    if (!LABEL[v.module]) continue;
    by.set(v.module, [...(by.get(v.module) ?? []), v]);
  }
  return [...by.entries()].map(([m, list]) => {
    const scored = list.filter((v) => typeof v.efficiency_score === "number")
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const latest = scored[0]?.efficiency_score ?? null;
    const previous = scored[1]?.efficiency_score ?? null;
    const trend = latest == null || previous == null ? null : latest > previous ? "up" : latest < previous ? "down" : "flat";
    return { area: LABEL[m], latest, previous, trend, count: scored.length };
  });
}
