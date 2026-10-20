/**
 * Owner rule (Oct 20): every 12 weeks the app asks the player to re-select
 * their priorities. Any goal change restarts the 12 weeks; answering "keep my
 * goals" also counts. No saved goals → ask now (nothing is guessed).
 */
export const GOAL_REASK_DAYS = 84;

export function goalReaskDue(input: { today: string; lastConfirmedAt: string | null | undefined; hasGoals: boolean }): boolean {
  if (!input.hasGoals) return true;
  if (!input.lastConfirmedAt) return true;
  const last = Date.parse(input.lastConfirmedAt);
  const now = Date.parse(`${input.today.slice(0, 10)}T12:00:00Z`);
  if (!Number.isFinite(last) || !Number.isFinite(now)) return false; // unknown date: never nag on bad data
  return Math.floor((now - last) / 86_400_000) >= GOAL_REASK_DAYS;
}

export const GOAL_REASK_TEXT = "It's been 12 weeks. Are these still your top goals? Pick your order again or keep them.";
