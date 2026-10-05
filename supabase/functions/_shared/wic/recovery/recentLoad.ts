/**
 * Stage 4 (owner-authorised 2026-10-05) — what the athlete actually did lately
 * feeds the recovery limit.
 *
 * Pure. Counts only dated records of things that happened before the plan date:
 *  - logged games (gp_games with a logged status, not deleted/ignored);
 *    a doubleheader counts twice;
 *  - confirmed pitching outings (start/relief, status thrown) not already on
 *    a counted game date;
 *  - practices on the athlete's own schedule whose date has passed and that
 *    were not cancelled (there is no separate practice log in the app).
 * A game on the calendar that was never logged does not count.
 *
 * Effect: at most ONE recovery-limit step. It never adds work, never changes
 * slot count, and the governor's floor (1) still holds. No records → no effect.
 */
export interface RecentGameRow {
  game_date: string | null;
  status: string | null;
  is_doubleheader?: boolean | null;
  ignored_for_training?: boolean | null;
  deleted_at?: string | null;
}
export interface RecentPracticeRow {
  scheduled_date: string | null;
  status: string | null;
  intensity?: string | null;
  practice_kind?: string | null;
}
export interface RecentLoadInput {
  planDate: string;
  games: RecentGameRow[];
  practices: RecentPracticeRow[];
  /** Confirmed thrown start/relief dates (from the pitcher schedule). */
  outingDates: string[];
}
export interface RecentLoadEffect {
  applied: boolean;
  gameDays: number;
  games: number;
  practices: number;
  evidenceDates: string[];
  reason: string | null;
}

const LOGGED = new Set(["final", "draft"]);
const shift = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const GAME_WINDOW_DAYS = 3;
export const PRACTICE_WINDOW_DAYS = 2;

export function recentLoadEffect(input: RecentLoadInput): RecentLoadEffect {
  const gameFrom = shift(input.planDate, -GAME_WINDOW_DAYS);
  const practiceFrom = shift(input.planDate, -PRACTICE_WINDOW_DAYS);
  const inGame = (d: string) => d >= gameFrom && d < input.planDate;

  let games = 0;
  const gameDates = new Set<string>();
  for (const g of input.games) {
    const d = String(g.game_date ?? "").slice(0, 10);
    if (!d || !inGame(d) || g.deleted_at || g.ignored_for_training) continue;
    if (!LOGGED.has(String(g.status ?? "").toLowerCase())) continue;
    games += g.is_doubleheader ? 2 : 1;
    gameDates.add(d);
  }
  for (const d0 of input.outingDates) {
    const d = d0.slice(0, 10);
    if (!inGame(d) || gameDates.has(d)) continue;
    games += 1;
    gameDates.add(d);
  }

  let practiceUnits = 0;
  let practices = 0;
  const practiceDates = new Set<string>();
  for (const p of input.practices) {
    const d = String(p.scheduled_date ?? "").slice(0, 10);
    if (!d || d < practiceFrom || d >= input.planDate) continue;
    const st = String(p.status ?? "").toLowerCase();
    if (st === "canceled" || st === "cancelled" || st === "rescheduled") continue;
    const intensity = String(p.intensity ?? "moderate").toLowerCase();
    if (intensity === "light") continue;
    const heavy = intensity === "high" || intensity === "hard" || p.practice_kind === "showcase" || p.practice_kind === "team";
    practiceUnits += heavy ? 1 : 0.5;
    practices += 1;
    practiceDates.add(d);
  }

  const applied = games + practiceUnits >= 2;
  const reason = !applied
    ? null
    : games >= 2
      ? "You've played a lot of games the last few days, so today is lighter to help you recover."
      : games >= 1
        ? "Games and practice have stacked up the last few days, so today is lighter to help you recover."
        : "You've had hard practices back to back, so today is lighter to help you recover.";
  return {
    applied,
    gameDays: gameDates.size,
    games,
    practices,
    evidenceDates: [...new Set([...gameDates, ...practiceDates])].sort(),
    reason,
  };
}
