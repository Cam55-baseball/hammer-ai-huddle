/** Availability is information only; the plan retains six training dates and one rest date. */
export function availableTrainingDays(days: unknown, restDow: number = 0): number[] {
  const r = Number.isInteger(restDow) && restDow >= 0 && restDow <= 6 ? restDow : 0;
  return [1, 2, 3, 4, 5, 6].map(k => (r + k) % 7).sort((a, b) => a - b);
}

export const AVAILABILITY_NOTICE = 'Hammers builds the full 6-day week the game demands. Do what you can; skipped work is tracked in Discipline.';
export function availabilityNotice(days: unknown): string | null {
  return typeof days === 'number' && Number.isFinite(days) && days < 6 ? AVAILABILITY_NOTICE : null;
}

export function unavailableTrainingDate(date: string, days: unknown, restDow: number = 0): boolean {
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
  return !availableTrainingDays(days, restDow).includes(dow);
}
