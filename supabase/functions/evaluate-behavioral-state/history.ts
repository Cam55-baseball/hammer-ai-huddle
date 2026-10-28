export const IDENTITY_HISTORY_DAYS = 365;

export function identityHistoryStart(today: string): string {
  const start = new Date(`${today}T00:00:00Z`);
  // Include the preceding partial week so weekly rest caps remain accurate.
  start.setUTCDate(start.getUTCDate() - (IDENTITY_HISTORY_DAYS - 1) - 6);
  return start.toISOString().slice(0, 10);
}

/** Complete, stable pages; never replace failed history with an empty streak. */
export async function readIdentityHistory<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < 100_000; from += 500) {
    const result = await page(from, from + 499);
    if (result.error) throw result.error;
    if (!result.data) throw new Error('Identity history unavailable');
    rows.push(...result.data);
    if (result.data.length < 500) return rows;
  }
  throw new Error('Identity history incomplete');
}