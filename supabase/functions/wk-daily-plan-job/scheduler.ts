/**
 * Batching for the daily plan job (case 19). A run fans out to WORKERS
 * parallel slices; each slice builds CONCURRENCY plans at a time and stops
 * starting new builds at WORKER_BUDGET_MS, so every request answers inside
 * the platform's 150 s no-reply cutoff. Leftovers stay "missing" and the next
 * run (every 10 minutes) takes them first. Duplicate builds are prevented by
 * an atomic per-(player, day) claim, not by timing.
 */
export const WORKERS = 8;
export const CONCURRENCY = 10;
export const WORKER_BUDGET_MS = 100_000;
/** Kept for callers that run a single pool. */
export const RUN_BUDGET_MS = WORKER_BUDGET_MS;

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
