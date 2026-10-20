/** Calendar-day comparison: no UTC-midnight drift and no invented due date. */
export function promptDue(nextDate: string | null | undefined, hasHistory: boolean, today: string): boolean {
  if (!hasHistory) return true;
  return Boolean(nextDate && /^\d{4}-\d{2}-\d{2}$/.test(nextDate) && nextDate <= today);
}

export function promptDaysPast(nextDate: string | null | undefined, today: string): number {
  if (!nextDate || !/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) return 0;
  return Math.max(0, Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${nextDate}T12:00:00Z`)) / 86400000));
}

export function gamePromptVisibility(input: { todayScheduled: boolean; todayLogged: boolean; yesterdayScheduled: boolean; yesterdayLogged: boolean; yesterdayAsked: boolean }) {
  return { today: input.todayScheduled && !input.todayLogged, yesterday: input.yesterdayScheduled && !input.yesterdayLogged && !input.yesterdayAsked };
}