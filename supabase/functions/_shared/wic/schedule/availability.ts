/** A declared smaller week only removes training dates; it never adds dose. */
export function availableTrainingDays(days: unknown): number[] {
  const count = typeof days === 'number' && Number.isFinite(days)
    ? Math.max(1, Math.min(6, Math.floor(days))) : 6;
  // Spread shorter weeks, retaining Sunday as rest in every case.
  const order = [1, 3, 5, 2, 4, 6];
  return order.slice(0, count).sort((a, b) => a - b);
}

export function unavailableTrainingDate(date: string, days: unknown): boolean {
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
  return !availableTrainingDays(days).includes(dow);
}