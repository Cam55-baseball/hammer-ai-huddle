// Game-linked flush (owner approved 2026-10-07): after a game the player saved
// yesterday, the next plan offers a short easy flush as an OPTIONAL extra the
// player may skip. Display-only: never a new card, never replaces or changes
// planned work, never on a game day, never when the day's conditioning is
// already an easy flush.

export interface GameFlushInput {
  planDate: string;
  /** Saved games (date + whether the player wants it ignored for training). */
  games: ReadonlyArray<{ date: string; ignored?: boolean; source?: string }>;
  isGameDay: boolean;
  /** Conditioning path chosen for today, if any. */
  conditioningPath: string | null;
  /** Rest/hold day: nothing is added. */
  holdDay: boolean;
}

export interface GameFlushOption {
  optional: true;
  slugs: string[];
  title: string;
  why: string;
}

const FLUSH_PATHS = new Set(["pitcher_after_start", "travel_day"]);

function shift(d: string, days: number): string {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

export function gameFlushFor(input: GameFlushInput): GameFlushOption | null {
  if (input.isGameDay || input.holdDay) return null;
  if (input.conditioningPath && FLUSH_PATHS.has(input.conditioningPath)) return null;
  const y = shift(input.planDate, -1);
  const played = input.games.some((g) => g.date === y && g.ignored !== true && (g.source ?? "gp_games") === "gp_games");
  if (!played) return null;
  return {
    optional: true,
    slugs: ["rc_postgame_flush", "rc_breathing_reset"],
    title: "Optional: easy flush after yesterday's game",
    why: "You played yesterday. A few easy minutes of light jogging, stretching and breathing can help your body recover. It's optional, so skip it if you like. It doesn't replace anything in today's plan.",
  };
}
