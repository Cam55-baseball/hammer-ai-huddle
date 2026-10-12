/** Pure formatters for the coach "Game stats" tab. Counts only logged at-bats. */
export interface CoachGame {
  game_id: string;
  game_date: string;
  opponent: string | null;
  my_score: number | null;
  opp_score: number | null;
  results: string[];
  rbi: number;
  pitches: number;
  verified_at: string | null;
  verified_role: "coach" | "organization" | null;
}

/** Plan v3.1 Phase 4 — every game stat is labeled athlete-entered or verified. */
export function verificationLabel(g: Pick<CoachGame, "verified_at" | "verified_role">): string {
  if (!g.verified_at) return "Source: athlete-entered";
  const who = g.verified_role === "organization" ? "organization" : "coach";
  return `Verified by ${who} on ${String(g.verified_at).slice(0, 10)}`;
}

const HITS = new Set(["1B", "2B", "3B", "HR"]);
const NOT_AT_BAT = new Set(["BB", "IBB", "HBP", "SAC", "SF", "CI"]);

export function hittingLine(results: string[], rbi: number): string | null {
  const r = results.map((x) => x.toUpperCase());
  const ab = r.filter((x) => !NOT_AT_BAT.has(x)).length;
  if (r.length === 0) return null;
  const h = r.filter((x) => HITS.has(x)).length;
  const extra = r.filter((x) => x === "2B" || x === "3B" || x === "HR");
  let line = `${h} for ${ab}`;
  if (extra.length) line += ` (${extra.join(", ")})`;
  if (rbi > 0) line += `, ${rbi} RBI`;
  return line;
}

export function scoreLine(g: Pick<CoachGame, "my_score" | "opp_score">): string {
  if (g.my_score == null || g.opp_score == null) return "Score not entered";
  const res = g.my_score > g.opp_score ? "Won" : g.my_score < g.opp_score ? "Lost" : "Tied";
  return `${res} ${g.my_score}–${g.opp_score}`;
}

export function seasonTotals(games: CoachGame[]): { hits: number; ab: number; pitches: number } {
  let hits = 0, ab = 0, pitches = 0;
  for (const g of games) {
    const r = g.results.map((x) => x.toUpperCase());
    ab += r.filter((x) => !NOT_AT_BAT.has(x)).length;
    hits += r.filter((x) => HITS.has(x)).length;
    pitches += g.pitches;
  }
  return { hits, ab, pitches };
}
