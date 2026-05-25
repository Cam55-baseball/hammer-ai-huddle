/**
 * Canonical missingness thresholds — single source of truth.
 *
 * All subsystems (digest, coach, forecast, sensor) MUST classify
 * missingness through `classifyMissingness` or the exported constants.
 * No subsystem may redeclare these values inline.
 *
 * States:
 *   no_signal  — no event exists in the observation window
 *   stale      — last event is older than the per-topic stale threshold
 *   partial    — event exists but payload missing required fields
 *   ok         — valid full event within window
 */

export const MISSINGNESS_STATES = ["no_signal", "stale", "partial", "ok"] as const;
export type MissingnessState = (typeof MISSINGNESS_STATES)[number];

/** Default observation window: 7 days. */
export const DEFAULT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Per-topic-prefix stale thresholds in hours. Mirrors values existing in
 *  digest/coach projections; kept here so they cannot drift. */
export const STALE_AFTER_HOURS: Readonly<Record<string, number>> = Object.freeze({
  "foundation.readiness": 36,
  "foundation.fatigue": 36,
  "analytics.workload": 168,
  "behavioral.": 336,
});

/** Default stale threshold when no topic-specific value exists (hours). */
export const DEFAULT_STALE_HOURS = 168;

/** Per-topic minimal required payload fields for `partial` classification. */
export const PARTIAL_REQUIRED_FIELDS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "foundation.readiness": ["score"],
  "foundation.fatigue": ["score"],
  "analytics.workload": ["load"],
});

export function staleThresholdHoursFor(topicPrefix: string): number {
  if (STALE_AFTER_HOURS[topicPrefix] !== undefined) return STALE_AFTER_HOURS[topicPrefix];
  for (const k of Object.keys(STALE_AFTER_HOURS)) {
    if (topicPrefix.startsWith(k)) return STALE_AFTER_HOURS[k];
  }
  return DEFAULT_STALE_HOURS;
}

interface ClassifyInput {
  occurred_at: string;
  topic_id: string;
  payload?: unknown;
}

/** Deterministic missingness classification used by all subsystems. */
export function classifyMissingness(
  events: ClassifyInput[],
  topicPrefix: string,
  now: Date = new Date(),
): MissingnessState {
  const matched = events.filter(
    (e) => e.topic_id === topicPrefix || e.topic_id.startsWith(topicPrefix),
  );
  if (matched.length === 0) return "no_signal";

  const latest = matched.reduce((a, b) =>
    Date.parse(a.occurred_at) >= Date.parse(b.occurred_at) ? a : b,
  );
  const ageHours = (now.getTime() - Date.parse(latest.occurred_at)) / 3_600_000;
  if (ageHours > staleThresholdHoursFor(topicPrefix)) return "stale";

  const required = PARTIAL_REQUIRED_FIELDS[topicPrefix];
  if (required && latest.payload && typeof latest.payload === "object") {
    const p = latest.payload as Record<string, unknown>;
    if (required.some((f) => p[f] === undefined || p[f] === null)) return "partial";
  }
  return "ok";
}
