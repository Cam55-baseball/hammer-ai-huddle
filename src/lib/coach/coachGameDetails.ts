// Owner Nov 5 round 2, Part 1 — coach "Add more details". Every field is optional
// and lands on the same game record the player's own game log uses (gp_games).
// The server (coach_game_add_details) re-checks keys and ranges; this mirrors it.

export const POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "DP", "FLEX"] as const;
export const HOME_AWAY = [["home", "Home"], ["away", "Away"], ["neutral", "Neutral"]] as const;
export const GAME_TYPES = [["regular_season", "Regular season"], ["tournament", "Tournament"], ["scrimmage", "Scrimmage"], ["showcase", "Showcase"], ["playoff", "Playoff"]] as const;

type NumField = { key: string; label: string; min: number; max: number; decimal?: boolean };

/** Game-wide details (same for every player in the game). */
export const GAME_NUM_FIELDS: NumField[] = [
  { key: "innings_played", label: "Innings played", min: 0, max: 30, decimal: true },
];

/** One player's own details. */
export const PLAYER_NUM_FIELDS: NumField[] = [
  { key: "lineup_slot", label: "Lineup spot (batting order)", min: 1, max: 12 },
  { key: "innings_caught", label: "Innings caught", min: 0, max: 30 },
];

/** Pitching line — same fields and words as the player's own pitching line. */
export const PITCHING_FIELDS: NumField[] = [
  ["batters_faced", "Batters faced"], ["pitcher_outs", "Outs recorded"], ["pitcher_innings", "Innings pitched in"],
  ["pitcher_strikeouts", "Strikeouts"], ["pitcher_walks", "Walks"], ["pitcher_hits", "Hits allowed"],
  ["pitcher_home_runs", "Home runs allowed"], ["pitcher_at_bats_against", "At-bats against"], ["pitcher_runs", "Runs allowed"],
  ["pitcher_earned_runs", "Earned runs"], ["pitcher_first_pitch_strikes", "Batters who got a first-pitch strike"],
  ["pitcher_two_ball_batters", "Batters who reached a two-ball count"], ["pitcher_runners_on", "Runners who reached base"],
  ["pitcher_runners_stranded", "Runners left on base"], ["pitcher_sb_allowed", "Stolen bases allowed"],
  ["pitcher_steal_attempts", "Steal attempts"], ["pitcher_pickoffs", "Pickoffs"], ["pitcher_pickoff_attempts", "Pickoff attempts"],
  ["pitcher_pfp_chances", "Fielding plays as pitcher"], ["pitcher_pfp_errors", "Fielding errors as pitcher"],
].map(([key, label]) => ({ key, label, min: 0, max: 300 }));

export interface DetailsInput {
  values: Record<string, string>;
  positions?: string[];
  home_away?: string;
  game_type?: string;
  venue?: string;
  notes?: string;
}

export type Details = Record<string, number | string | string[]>;

const ALL_NUM = [...GAME_NUM_FIELDS, ...PLAYER_NUM_FIELDS, ...PITCHING_FIELDS];

/** Blank stays blank (never saved as 0). Returns the cleaned details or the first error. */
export function cleanDetails(input: DetailsInput): { details: Details; error: string | null } {
  const details: Details = {};
  for (const f of ALL_NUM) {
    const raw = (input.values[f.key] ?? "").trim();
    if (!raw) continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < f.min || n > f.max || (!f.decimal && !Number.isInteger(n))) {
      return { details, error: `${f.label} must be a ${f.decimal ? "number" : "whole number"} from ${f.min} to ${f.max}.` };
    }
    details[f.key] = n;
  }
  if (typeof details.pitcher_earned_runs === "number" && typeof details.pitcher_runs === "number" && details.pitcher_earned_runs > details.pitcher_runs) {
    return { details, error: "Earned runs can't be more than runs allowed." };
  }
  const pos = (input.positions ?? []).filter((p) => (POSITIONS as readonly string[]).includes(p));
  if (pos.length) details.my_positions = [...new Set(pos)];
  if (input.home_away && HOME_AWAY.some(([v]) => v === input.home_away)) details.home_away = input.home_away;
  if (input.game_type && GAME_TYPES.some(([v]) => v === input.game_type)) details.game_type = input.game_type;
  const venue = (input.venue ?? "").trim();
  if (venue) { if (venue.length > 120) return { details, error: "Field or park name is too long." }; details.venue = venue; }
  const notes = (input.notes ?? "").trim();
  if (notes) { if (notes.length > 2000) return { details, error: "Notes are too long." }; details.general_notes = notes; }
  return { details, error: null };
}

export const hasDetails = (d: Details) => Object.keys(d).length > 0;

export const emptyDetails = (): DetailsInput => ({ values: {}, positions: [], home_away: "", game_type: "", venue: "", notes: "" });
