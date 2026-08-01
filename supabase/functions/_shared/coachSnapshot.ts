/**
 * Coach Hammer snapshot coarsening + stable serialization.
 *
 * MUST stay byte-identical in behaviour with `src/lib/hammer/coachSnapshot.ts`.
 * The client keys its React Query cache on `coarseKey(snapshot)`; the edge
 * function keys the DB cache on `sha256(coarseKey(snapshot))`. If the two
 * diverge, the client re-invokes the function even when the server would just
 * replay — so any change here must be mirrored there.
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
        // fresh / today / stale / very stale
        out[k] = band(v, [6, 24, 72]);
      } else if (k === "hour" && typeof v === "number") {
        // morning / midday / evening / night
        out[k] = band(v, [11, 16, 21]);
      } else if (k === "escalationCount" && typeof v === "number") {
        // none / one / several — the prompt only branches on > 0
        out[k] = v <= 0 ? 0 : v === 1 ? 1 : 2;
      } else if (k === "sessionsLast7Days" && typeof v === "number") {
        out[k] = band(v, [1, 3, 6]);
      } else if (k === "checkInsLast7Days" && typeof v === "number") {
        out[k] = band(v, [1, 3, 6]);
      } else if (k === "score" && typeof v === "number") {
        // MPI and behavioural scores: whole numbers only
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

export async function hashSnapshot(
  snapshot: unknown,
  planDate: string,
): Promise<string> {
  const bytes = new TextEncoder().encode(coarseKey(snapshot, planDate));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
