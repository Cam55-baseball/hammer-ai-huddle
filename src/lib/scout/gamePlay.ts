/**
 * Scout "Game play and stats" — box-score lines built only from what was
 * logged. Anything not logged comes back null so the screen can say
 * "Not yet measured" instead of showing a made-up zero.
 */
export interface ScoutGame {
  game_id: string;
  game_date: string;
  opponent: string | null;
  my_score: number | null;
  opp_score: number | null;
  verified_at: string | null;
  verified_role: string | null;
  results: string[];
  rbi: number;
  steals: number;
  steal_logs: number;
  pitches: number;
  top_velo: number | null;
  putouts: number;
  assists: number;
  errors: number;
  defense_logs: number;
}

const HITS = new Set(["1B", "2B", "3B", "HR"]);
const XBH = new Set(["2B", "3B", "HR"]);
const WALKS = new Set(["BB", "IBB"]);
const STRIKEOUTS = new Set(["K", "KL", "KS", "SO", "K_LOOKING", "K_SWINGING"]);
const NOT_AT_BAT = new Set(["BB", "IBB", "HBP", "SAC", "SF", "CI"]);

export interface Hitting { atBats: number; hits: number; extraBaseHits: number; walks: number; strikeouts: number; stolenBases: number | null }
export interface Pitching { pitchCount: number | null; topVelo: number | null }
export interface Fielding { putouts: number; assists: number; errors: number }

export function hitting(g: Pick<ScoutGame, "results" | "steals" | "steal_logs">): Hitting | null {
  const r = g.results.map((x) => String(x).toUpperCase());
  if (r.length === 0) return null;
  return {
    atBats: r.filter((x) => !NOT_AT_BAT.has(x)).length,
    hits: r.filter((x) => HITS.has(x)).length,
    extraBaseHits: r.filter((x) => XBH.has(x)).length,
    walks: r.filter((x) => WALKS.has(x)).length,
    strikeouts: r.filter((x) => STRIKEOUTS.has(x)).length,
    stolenBases: g.steal_logs > 0 ? g.steals : null,
  };
}

export function pitching(g: Pick<ScoutGame, "pitches" | "top_velo">): Pitching | null {
  if (!g.pitches && g.top_velo == null) return null;
  return { pitchCount: g.pitches || null, topVelo: g.top_velo };
}

export function fielding(g: Pick<ScoutGame, "putouts" | "assists" | "errors" | "defense_logs">): Fielding | null {
  if (!g.defense_logs) return null;
  return { putouts: g.putouts, assists: g.assists, errors: g.errors };
}

/** Count pitches per strike-zone square (1–9) and per out-of-zone band. Unknown shapes are skipped. */
export function zoneCounts(locations: unknown[]): { zones: Record<number, number>; outside: number; total: number } {
  const zones: Record<number, number> = {};
  let outside = 0;
  let total = 0;
  for (const l of locations) {
    const loc = l as { zone?: unknown; outZone?: unknown } | null;
    const z = Number(loc?.zone);
    if (Number.isInteger(z) && z >= 1 && z <= 9) { zones[z] = (zones[z] ?? 0) + 1; total++; }
    else if (loc?.outZone) { outside++; total++; }
  }
  return { zones, outside, total };
}
