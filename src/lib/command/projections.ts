/**
 * Athlete Command — pure read-only projections over canonical ASB ledger rows.
 *
 * No writes. No smoothing. No imputation. No defaulting to 0.
 * When the source is missing, returns { value: null, missingness: "no_signal" }.
 * Every projection carries `sourceEventId` so the UI can drill into /replay/:eventId
 * in one click, preserving lineage visibility.
 */
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

export type Missingness = "no_signal" | "stale" | "partial" | null;

export interface CardProjection<T> {
  value: T | null;
  sourceEventId: string | null;
  occurredAt: string | null;
  confidence: number | null;
  missingness: Missingness;
  engineVersion: string | null;
  topicId: string | null;
}

function getAt(obj: unknown, path: string[]): unknown {
  let cur: any = obj;
  for (const k of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[k];
  }
  return cur;
}

function getNumberAt(obj: unknown, path: string[]): number | null {
  const v = getAt(obj, path);
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function extractConfidence(payload: Record<string, unknown> | null | undefined): number | null {
  if (!payload) return null;
  return (
    getNumberAt(payload, ["confidence"]) ??
    getNumberAt(payload, ["state", "confidence"]) ??
    getNumberAt(payload, ["value", "confidence"])
  );
}

export function extractMissingness(payload: Record<string, unknown> | null | undefined): Missingness {
  if (!payload) return null;
  const candidates: unknown[] = [
    (payload as any).missingness,
    getAt(payload, ["state", "missingness"]),
    getAt(payload, ["value", "missingness"]),
  ];
  for (const c of candidates) {
    if (c === "no_signal" || c === "stale" || c === "partial") return c;
  }
  return null;
}

/** True if occurredAt is older than `hours`. Returns false if no timestamp. */
export function isStale(occurredAt: string | null, hours: number, now: Date = new Date()): boolean {
  if (!occurredAt) return false;
  const t = Date.parse(occurredAt);
  if (Number.isNaN(t)) return false;
  return now.getTime() - t > hours * 3600 * 1000;
}

export const EMPTY_PROJECTION: CardProjection<never> = {
  value: null,
  sourceEventId: null,
  occurredAt: null,
  confidence: null,
  missingness: "no_signal",
  engineVersion: null,
  topicId: null,
};

/** Project a single latest event into a card projection.
 * If `staleAfterHours` is provided and the event is older, mark missingness="stale"
 * (without altering the value itself — lineage stays intact). */
export function projectLatest<T = unknown>(
  ev: AsbEventRow | null | undefined,
  opts: { staleAfterHours?: number; valuePath?: string[] } = {}
): CardProjection<T> {
  if (!ev) return EMPTY_PROJECTION as CardProjection<T>;
  const payload = (ev.payload ?? {}) as Record<string, unknown>;
  const conf = extractConfidence(payload);
  let miss = extractMissingness(payload);
  if (!miss && opts.staleAfterHours != null && isStale(ev.occurred_at, opts.staleAfterHours)) {
    miss = "stale";
  }
  const value = opts.valuePath
    ? ((getAt(payload, opts.valuePath) ?? null) as T | null)
    : ((payload as unknown) as T);
  return {
    value,
    sourceEventId: ev.event_id,
    occurredAt: ev.occurred_at,
    confidence: conf,
    missingness: miss,
    engineVersion: ev.engine_version,
    topicId: ev.topic_id,
  };
}

/** Find the latest row whose topic starts with `prefix` (case-sensitive). */
export function latestByTopicPrefix(rows: AsbEventRow[] | undefined, prefix: string): AsbEventRow | null {
  if (!rows?.length) return null;
  for (const r of rows) {
    if (r.topic_id === prefix || r.topic_id.startsWith(prefix + ".")) return r;
  }
  return null;
}

/** Count events whose topic starts with `prefix` in the last `days` days. */
export function windowCount(
  rows: AsbEventRow[] | undefined,
  prefix: string,
  days: number,
  now: Date = new Date()
): { count: number; latest: AsbEventRow | null } {
  if (!rows?.length) return { count: 0, latest: null };
  const cutoff = now.getTime() - days * 86400 * 1000;
  let count = 0;
  let latest: AsbEventRow | null = null;
  for (const r of rows) {
    if (r.topic_id !== prefix && !r.topic_id.startsWith(prefix + ".")) continue;
    const t = Date.parse(r.occurred_at);
    if (Number.isNaN(t) || t < cutoff) continue;
    count++;
    if (!latest || Date.parse(latest.occurred_at) < t) latest = r;
  }
  return { count, latest };
}

/** Bucket day_type events by date (YYYY-MM-DD from occurred_at). */
export function scheduleByDay(rows: AsbEventRow[] | undefined): Array<{ date: string; eventType: string; row: AsbEventRow }> {
  if (!rows?.length) return [];
  const out: Array<{ date: string; eventType: string; row: AsbEventRow }> = [];
  for (const r of rows) {
    if (!r.topic_id.startsWith("athlete.schedule.day_type")) continue;
    const date = r.occurred_at.slice(0, 10);
    const eventType = ((r.payload as any)?.event_type ?? "unknown") as string;
    out.push({ date, eventType, row: r });
  }
  return out;
}
