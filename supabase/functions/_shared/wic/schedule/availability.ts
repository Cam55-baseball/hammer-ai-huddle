/** A declared smaller week only removes training dates; it never adds dose. */
export function availableTrainingDays(days: unknown, restDow: number = 0): number[] {
  const count = typeof days === 'number' && Number.isFinite(days)
    ? Math.max(1, Math.min(6, Math.floor(days))) : 6;
  // Spread shorter weeks, retaining the chosen rest day (default Sunday) in every case.
  // Offsets from the rest day keep the same spacing as the Sunday-rest order.
  const r = Number.isInteger(restDow) && restDow >= 0 && restDow <= 6 ? restDow : 0;
  const order = [1, 3, 5, 2, 4, 6].map(k => (r + k) % 7);
  return order.slice(0, count).sort((a, b) => a - b);
}

export function unavailableTrainingDate(date: string, days: unknown, restDow: number = 0): boolean {
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
  return !availableTrainingDays(days, restDow).includes(dow);
}
