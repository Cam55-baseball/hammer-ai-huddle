/**
 * Coach Hammer snapshot coarsening + stable serialization (client mirror).
 *
 * MUST stay byte-identical in behaviour with
 * `supabase/functions/_shared/coachSnapshot.ts`. The React Query key uses
 * `coarseKey`, the edge function hashes the same string — so identical coarse
 * state on a later page load never re-invokes the function at all.
 */

/** Stable JSON stringify so key order can never bust the cache. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${
    Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
      .join(",")
  }}`;
}

function band(n: number, edges: number[]): number {
  for (let i = 0; i < edges.length; i++) {
    if (n < edges[i]) return i;
  }
  return edges.length;
}

/**
 * Round volatile fields so trivial jitter (a minute of staleness, one more
 * logged session, a fractional MPI tick) does not force a fresh generation.
 */
export function coarsen(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(coarsen);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "staleHours" && typeof v === "number") {
        out[k] = band(v, [6, 24, 72]);
      } else if (k === "hour" && typeof v === "number") {
        out[k] = band(v, [11, 16, 21]);
      } else if (k === "escalationCount" && typeof v === "number") {
        out[k] = v <= 0 ? 0 : v === 1 ? 1 : 2;
      } else if (k === "sessionsLast7Days" && typeof v === "number") {
        out[k] = band(v, [1, 3, 6]);
      } else if (k === "checkInsLast7Days" && typeof v === "number") {
        out[k] = band(v, [1, 3, 6]);
      } else if (k === "score" && typeof v === "number") {
        out[k] = Math.round(v);
      } else {
        out[k] = coarsen(v);
      }
    }
    return out;
  }
  return value;
}

/** Deterministic, day-scoped cache key for a snapshot. */
export function coarseKey(snapshot: unknown, planDate: string): string {
  return stableStringify({ day: planDate, snap: coarsen(snapshot) });
}
