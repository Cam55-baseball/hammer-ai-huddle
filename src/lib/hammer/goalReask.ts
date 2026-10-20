/**
 * Owner rule (Oct 20): every 12 weeks the app asks the player to re-select
 * their priorities. Any goal change restarts the 12 weeks; answering "keep my
 * goals" also counts. No saved goals → ask now (nothing is guessed).
 */
export const GOAL_REASK_DAYS = 84;

/** Device calendar date; elapsed hours do not define a 12-week reminder. */
export function goalCalendarDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function dayNumber(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}T12:00:00Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) return null;
  return Math.floor(ms / 86_400_000);
}

export function goalReaskDue(input: { today: string; lastConfirmedAt: string | null | undefined; hasGoals: boolean }): boolean {
  const today = dayNumber(input.today);
  if (today === null) return false;
  if (!input.hasGoals) return true;
  if (!input.lastConfirmedAt) return true;
  const raw = input.lastConfirmedAt;
  // Reject rolled-over calendar dates before parsing a timestamp.
  if (dayNumber(raw.slice(0, 10)) === null) return false;
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return false;
  const last = dayNumber(raw.length === 10 ? raw : goalCalendarDate(parsed));
  return last !== null && today - last >= GOAL_REASK_DAYS;
}

export const GOAL_REASK_TEXT = "It's been 12 weeks. Are these still your top goals? Pick your order again or keep them.";
