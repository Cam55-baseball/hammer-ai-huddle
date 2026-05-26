/**
 * Wave 3 — Projections layer.
 *
 * Pure deterministic event→state builders. Memoized by (scope, last_event_id).
 * No supabase, no Date.now(), no Math.random(), no UI imports.
 * Returned states are frozen; consumers must treat them as immutable.
 */
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

export type Scope = "self" | "coach" | "org" | "external";

export interface ProjectionMeta {
  lastEventId: string | null;
  sourceCount: number;
  scope: Scope;
}

/** Deterministic key: scope::lastEventId. */
export function projectionKey(scope: Scope, lastEventId: string | null): string {
  return `${scope}::${lastEventId ?? "∅"}`;
}

/**
 * Stable sort + scope filter. Cycle events with `visibility_scope === 'self'`
 * are excluded from coach/org/external projections by construction.
 */
export function prepareRows(
  rows: AsbEventRow[] | undefined,
  scope: Scope,
  topicPrefixes: string[],
): AsbEventRow[] {
  if (!rows || rows.length === 0) return [];
  const filtered: AsbEventRow[] = [];
  for (const r of rows) {
    if (!topicPrefixes.some((p) => r.topic_id?.startsWith(p))) continue;
    const vis = (r.payload as { visibility_scope?: Scope } | undefined)
      ?.visibility_scope;
    if (vis === "self" && scope !== "self") continue;
    filtered.push(r);
  }
  // Deterministic order: (occurred_at, event_id) ascending.
  return filtered.sort((a, b) => {
    if (a.occurred_at !== b.occurred_at) {
      return a.occurred_at < b.occurred_at ? -1 : 1;
    }
    return a.event_id < b.event_id ? -1 : 1;
  });
}

export function lastIdOf(rows: AsbEventRow[]): string | null {
  return rows.length ? rows[rows.length - 1].event_id : null;
}

/** Build a memoized projection. Pure cache; never mutates returned state. */
export function memoize<S>(
  builder: (rows: AsbEventRow[], scope: Scope) => S,
): (rows: AsbEventRow[] | undefined, scope: Scope, prefixes: string[]) => {
  state: S;
  meta: ProjectionMeta;
} {
  const cache = new Map<string, { state: S; meta: ProjectionMeta }>();
  return (rows, scope, prefixes) => {
    const prepared = prepareRows(rows, scope, prefixes);
    const last = lastIdOf(prepared);
    const key = projectionKey(scope, last);
    const hit = cache.get(key);
    if (hit && hit.meta.sourceCount === prepared.length) return hit;
    const state = Object.freeze(builder(prepared, scope)) as S;
    const meta: ProjectionMeta = {
      lastEventId: last,
      sourceCount: prepared.length,
      scope,
    };
    const entry = { state, meta };
    cache.set(key, entry);
    return entry;
  };
}
