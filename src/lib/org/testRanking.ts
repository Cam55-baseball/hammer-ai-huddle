export interface TestRankRow {
  athlete_id: string;
  name: string;
  primary_position: string | null;
  league_tier: string | null;
  date_of_birth: string | null;
  value: number;
  test_date: string;
  verified: boolean;
}

export interface RankFilters {
  ageGroup: "all" | "13u" | "14-15" | "16-17" | "18+";
  position: string; // "all" or a position
  level: string; // "all" or a level
  verifiedOnly: boolean;
  lowerIsBetter: boolean;
}

export function ageOn(dob: string | null, today = new Date()): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let a = today.getUTCFullYear() - d.getUTCFullYear();
  const m = today.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < d.getUTCDate())) a--;
  return a;
}

export function inAgeGroup(age: number | null, g: RankFilters["ageGroup"]): boolean {
  if (g === "all") return true;
  if (age == null) return false;
  if (g === "13u") return age <= 13;
  if (g === "14-15") return age >= 14 && age <= 15;
  if (g === "16-17") return age >= 16 && age <= 17;
  return age >= 18;
}

export function rankRows(rows: TestRankRow[], f: RankFilters, today = new Date()): TestRankRow[] {
  return rows
    .filter((r) => (!f.verifiedOnly || r.verified))
    .filter((r) => f.position === "all" || r.primary_position === f.position)
    .filter((r) => f.level === "all" || r.league_tier === f.level)
    .filter((r) => inAgeGroup(ageOn(r.date_of_birth, today), f.ageGroup))
    .sort((a, b) => (f.lowerIsBetter ? a.value - b.value : b.value - a.value));
}

/** Plain-language warnings when a ranking isn't a fair comparison. */
export function rankingWarnings(rows: TestRankRow[], today = new Date()): string[] {
  const w: string[] = [];
  if (rows.length < 2) return ["Not enough data yet — fewer than 2 players have this test."];
  const pos = new Set(rows.map((r) => r.primary_position ?? "unknown"));
  if (pos.size > 1) w.push("Players play different positions — filter by position for a fairer ranking.");
  const lv = new Set(rows.map((r) => r.league_tier ?? "unknown"));
  if (lv.size > 1) w.push("Players play at different levels.");
  const ages = rows.map((r) => ageOn(r.date_of_birth, today)).filter((a): a is number => a != null);
  if (ages.length > 1 && Math.max(...ages) - Math.min(...ages) >= 2) w.push("Ages differ by 2 or more years.");
  if (rows.some((r) => r.verified) && rows.some((r) => !r.verified))
    w.push("Some results were entered by the athlete and not verified in person.");
  const days = rows.map((r) => Date.parse(r.test_date)).filter((n) => !Number.isNaN(n));
  if (days.length > 1 && (Math.max(...days) - Math.min(...days)) / 86400000 > 90)
    w.push("Tests were taken more than 90 days apart.");
  return w;
}
