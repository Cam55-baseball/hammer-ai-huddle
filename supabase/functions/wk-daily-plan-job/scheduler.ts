/**
 * Batching for the daily plan job (case 19). Each run builds as many missing
 * plans as fit in its time budget, CONCURRENCY at a time, and stops cleanly
 * before the platform limit. Whatever is left is simply still "missing" and
 * the next hourly run picks it up first — no state to carry between runs.
 */
export const CONCURRENCY = 10;
/** Stop starting new builds after this long (the platform cuts a request off after 150 s without a reply). */
export const RUN_BUDGET_MS = 110_000;

export async function runPool<T>(
  items: readonly T[],
  work: (item: T) => Promise<void>,
  opts: { concurrency?: number; budgetMs?: number; now?: () => number } = {},
): Promise<{ processed: number; leftover: number; elapsedMs: number }> {
  const now = opts.now ?? (() => Date.now());
  const start = now();
  const budget = opts.budgetMs ?? RUN_BUDGET_MS;
  let next = 0, processed = 0;
  const lane = async () => {
    while (next < items.length && now() - start < budget) {
      const item = items[next++];
      await work(item);
      processed++;
    }
  };
  await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? CONCURRENCY, items.length) }, lane));
  return { processed, leftover: items.length - processed, elapsedMs: now() - start };
}
