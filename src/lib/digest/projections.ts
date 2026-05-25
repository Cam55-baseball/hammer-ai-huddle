/**
 * Digest & Forecast — pure deterministic projections over canonical ASB ledger rows.
 *
 * No writes. No smoothing. No imputation. No defaults-to-zero certainty.
 * Every projection carries sourceEventIds[] so the UI can drill to /replay/:eventId.
 * When source data is absent: value=null, confidence='n/a', missingness='no_signal'.
 */
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

export type DigestConfidence = "n/a" | "low" | "medium" | "high";
export type DigestMissingness = "ok" | "partial" | "stale" | "no_signal";

export interface DigestProjection {
  /** Numeric value (count, hours, days) or human-readable scalar. null when absent. */
  value: number | string | null;
  /** Difference vs prior window. null when either side missing. */
  delta: number | null;
  confidence: DigestConfidence;
  missingness: DigestMissingness;
  sourceEventIds: string[];
  engineVersion: string | null;
}

export interface Window {
  startMs: number;
  endMs: number;
}

export function lastNDays(n: number, now: Date = new Date()): Window {
  const endMs = now.getTime();
  return { startMs: endMs - n * 86400 * 1000, endMs };
}

export function priorNDays(n: number, now: Date = new Date()): Window {
  const endMs = now.getTime() - n * 86400 * 1000;
  return { startMs: endMs - n * 86400 * 1000, endMs };
}

function withinWindow(row: AsbEventRow, w: Window): boolean {
  const t = Date.parse(row.occurred_at);
  return !Number.isNaN(t) && t >= w.startMs && t < w.endMs;
}

function topicMatches(topicId: string, prefix: string): boolean {
  return topicId === prefix || topicId.startsWith(prefix + ".");
}

function filterByTopic(rows: AsbEventRow[], prefix: string, w?: Window): AsbEventRow[] {
  return rows.filter((r) => topicMatches(r.topic_id, prefix) && (!w || withinWindow(r, w)));
}

function engineVersionOf(rows: AsbEventRow[]): string | null {
  for (const r of rows) if (r.engine_version) return r.engine_version;
  return null;
}

function emptyProjection(): DigestProjection {
  return {
    value: null,
    delta: null,
    confidence: "n/a",
    missingness: "no_signal",
    sourceEventIds: [],
    engineVersion: null,
  };
}

function confidenceFromSampleSize(n: number): DigestConfidence {
  if (n === 0) return "n/a";
  if (n < 3) return "low";
  if (n < 10) return "medium";
  return "high";
}

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────────

export function compareWindowCounts(
  rows: AsbEventRow[],
  topicPrefix: string,
  curr: Window,
  prev: Window,
): DigestProjection {
  const c = filterByTopic(rows, topicPrefix, curr);
  const p = filterByTopic(rows, topicPrefix, prev);
  if (c.length === 0 && p.length === 0) return emptyProjection();
  return {
    value: c.length,
    delta: c.length - p.length,
    confidence: confidenceFromSampleSize(c.length + p.length),
    missingness: c.length === 0 ? "stale" : "ok",
    sourceEventIds: c.map((r) => r.event_id).slice(0, 25),
    engineVersion: engineVersionOf(c) ?? engineVersionOf(p),
  };
}

export function compareTopicFrequency(
  rows: AsbEventRow[],
  topicPrefix: string,
  curr: Window,
  prev: Window,
): DigestProjection {
  // Currently identical to compareWindowCounts; kept distinct for sentence routing.
  return compareWindowCounts(rows, topicPrefix, curr, prev);
}

const ESCALATION_PREFIXES = [
  "foundation.pattern",
  "behavioral.escalation",
  "behavioral.risk",
];

function escalationRows(rows: AsbEventRow[], w: Window): AsbEventRow[] {
  return rows.filter(
    (r) =>
      ESCALATION_PREFIXES.some((p) => topicMatches(r.topic_id, p)) && withinWindow(r, w),
  );
}

/** Topics that emerged in the current window but were absent in the prior window. */
export function detectEscalationEmergence(
  rows: AsbEventRow[],
  curr: Window,
  prev: Window,
): DigestProjection {
  const c = escalationRows(rows, curr);
  const p = escalationRows(rows, prev);
  if (c.length === 0 && p.length === 0) return emptyProjection();
  const priorTopics = new Set(p.map((r) => r.topic_id));
  const emerged = c.filter((r) => !priorTopics.has(r.topic_id));
  return {
    value: emerged.length,
    delta: c.length - p.length,
    confidence: confidenceFromSampleSize(c.length + p.length),
    missingness: c.length === 0 ? "stale" : "ok",
    sourceEventIds: emerged.map((r) => r.event_id).slice(0, 25),
    engineVersion: engineVersionOf(c) ?? engineVersionOf(p),
  };
}

/** Topics seen in the prior window but absent in the current window. */
export function detectEscalationResolution(
  rows: AsbEventRow[],
  curr: Window,
  prev: Window,
): DigestProjection {
  const c = escalationRows(rows, curr);
  const p = escalationRows(rows, prev);
  if (c.length === 0 && p.length === 0) return emptyProjection();
  const currTopics = new Set(c.map((r) => r.topic_id));
  const resolved = p.filter((r) => !currTopics.has(r.topic_id));
  return {
    value: resolved.length,
    delta: null,
    confidence: confidenceFromSampleSize(p.length),
    missingness: "ok",
    sourceEventIds: resolved.map((r) => r.event_id).slice(0, 25),
    engineVersion: engineVersionOf(p) ?? engineVersionOf(c),
  };
}

export function detectScheduleContinuityShift(
  rows: AsbEventRow[],
  curr: Window,
  prev: Window,
): DigestProjection {
  const c = filterByTopic(rows, "athlete.schedule", curr);
  const p = filterByTopic(rows, "athlete.schedule", prev);
  if (c.length === 0 && p.length === 0) return emptyProjection();
  const currDays = new Set(c.map((r) => r.occurred_at.slice(0, 10))).size;
  const prevDays = new Set(p.map((r) => r.occurred_at.slice(0, 10))).size;
  return {
    value: currDays,
    delta: currDays - prevDays,
    confidence: confidenceFromSampleSize(c.length + p.length),
    missingness: c.length === 0 ? "stale" : "ok",
    sourceEventIds: c.map((r) => r.event_id).slice(0, 25),
    engineVersion: engineVersionOf(c) ?? engineVersionOf(p),
  };
}

export function detectBehavioralTrendShift(
  rows: AsbEventRow[],
  curr: Window,
  prev: Window,
): DigestProjection {
  return compareWindowCounts(rows, "behavioral", curr, prev);
}

/**
 * Bounded continuation projection: how long has the current observed pattern persisted?
 * Returns the number of consecutive days (looking back from now) with at least one
 * event matching topicPrefix. No future-state prediction. No certainty fabrication.
 */
export function boundedForecastWindow(
  rows: AsbEventRow[],
  topicPrefix: string,
  horizonDays: number,
  now: Date = new Date(),
): DigestProjection & { horizonDays: number } {
  const matching = rows.filter((r) => topicMatches(r.topic_id, topicPrefix));
  if (matching.length === 0) {
    return { ...emptyProjection(), horizonDays };
  }
  const daysWithEvents = new Set(matching.map((r) => r.occurred_at.slice(0, 10)));
  let consecutive = 0;
  for (let i = 0; i < horizonDays; i++) {
    const d = new Date(now.getTime() - i * 86400 * 1000).toISOString().slice(0, 10);
    if (daysWithEvents.has(d)) consecutive++;
    else break;
  }
  return {
    value: consecutive,
    delta: null,
    confidence: confidenceFromSampleSize(matching.length),
    missingness: consecutive === 0 ? "stale" : "ok",
    sourceEventIds: matching.slice(0, 25).map((r) => r.event_id),
    engineVersion: engineVersionOf(matching),
    horizonDays,
  };
}

/** Hours since last event matching prefix; null when none. */
export function hoursSinceLast(
  rows: AsbEventRow[],
  topicPrefix: string,
  now: Date = new Date(),
): DigestProjection {
  const matching = rows.filter((r) => topicMatches(r.topic_id, topicPrefix));
  if (matching.length === 0) return emptyProjection();
  const latest = matching.reduce((acc, r) =>
    Date.parse(r.occurred_at) > Date.parse(acc.occurred_at) ? r : acc,
  );
  const hours = Math.round((now.getTime() - Date.parse(latest.occurred_at)) / 3600000);
  return {
    value: hours,
    delta: null,
    confidence: confidenceFromSampleSize(matching.length),
    missingness: hours > 168 ? "stale" : "ok",
    sourceEventIds: [latest.event_id],
    engineVersion: latest.engine_version,
  };
}

export function extractReplaySources(p: DigestProjection): string[] {
  return p.sourceEventIds.slice();
}
