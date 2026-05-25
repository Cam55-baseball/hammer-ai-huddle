/**
 * Coach-side multi-athlete projections.
 * Pure functions over canonical ASB rows. No smoothing, no imputation,
 * no fabricated certainty. Missingness is a first-class signal.
 */
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import {
  projectLatest,
  isStale,
  extractConfidence,
  extractMissingness,
  type CardProjection,
} from "@/lib/command/projections";

export type RosterRowsByAthlete = Map<string, AsbEventRow[]>;

export function bucketByAthlete(rows: AsbEventRow[]): RosterRowsByAthlete {
  const m: RosterRowsByAthlete = new Map();
  for (const r of rows) {
    if (!r.athlete_id) continue;
    const arr = m.get(r.athlete_id);
    if (arr) arr.push(r);
    else m.set(r.athlete_id, [r]);
  }
  return m;
}

/** Latest projection for a topic-prefix match within one athlete's rows.
 *  Rows are expected to arrive in occurred_at DESC order. */
export function latestByTopicPrefix(
  rows: AsbEventRow[],
  prefix: string,
  staleAfterHours?: number,
): CardProjection<unknown> {
  const latest = rows.find((r) => {
    const t = r.topic_id ?? "";
    return t === prefix || t.startsWith(prefix + ".") || t.startsWith(prefix);
  }) ?? null;
  return projectLatest(latest, { staleAfterHours });
}

/** Latest projection for an exact topic match. */
export function latestByTopic(
  rows: AsbEventRow[],
  topicId: string,
  staleAfterHours?: number,
): CardProjection<unknown> {
  const latest = rows.find((r) => r.topic_id === topicId) ?? null;
  return projectLatest(latest, { staleAfterHours });
}

/** Coach-facing per-athlete snapshot — discrete projections only, no aggregate score. */
export interface AthleteRosterSnapshot {
  athleteId: string;
  readiness: CardProjection<unknown>;
  fatigue: CardProjection<unknown>;
  workload: CardProjection<unknown>;
  lastEventAt: string | null;
  totalEvents: number;
}

export function snapshotAthlete(athleteId: string, rows: AsbEventRow[]): AthleteRosterSnapshot {
  return {
    athleteId,
    readiness: latestByTopicPrefix(rows, "foundation.readiness", 36),
    fatigue: latestByTopicPrefix(rows, "foundation.fatigue", 36),
    workload: latestByTopicPrefix(rows, "analytics.workload", 168),
    lastEventAt: rows[0]?.occurred_at ?? null,
    totalEvents: rows.length,
  };
}

/** Escalation row — strictly filtered to declared topic prefixes + severity gate. */
export interface EscalationRow {
  eventId: string;
  athleteId: string;
  topicId: string;
  occurredAt: string;
  confidence: number | null;
  missingness: ReturnType<typeof extractMissingness>;
  engineVersion: string | null;
  severity: string | null;
}

const ESCALATION_PREFIXES = [
  "foundation.pattern.",
  "behavioral.escalation.",
  "behavioral.risk.",
];

function severityOf(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const v = (payload as any).severity;
  return typeof v === "string" ? v : null;
}

export function escalationsFromRows(rows: AsbEventRow[]): EscalationRow[] {
  const out: EscalationRow[] = [];
  for (const r of rows) {
    const topic = r.topic_id ?? "";
    const sev = severityOf(r.payload);
    const matchesPrefix = ESCALATION_PREFIXES.some((p) => topic.startsWith(p));
    const matchesSeverity = sev === "high" || sev === "critical";
    if (!matchesPrefix && !matchesSeverity) continue;
    out.push({
      eventId: r.event_id,
      athleteId: r.athlete_id!,
      topicId: topic,
      occurredAt: r.occurred_at,
      confidence: extractConfidence(r.payload as any),
      missingness: extractMissingness(r.payload as any),
      engineVersion: r.engine_version ?? null,
      severity: sev,
    });
  }
  return out;
}

/** Missing-signal row — per athlete per critical topic prefix. */
export interface MissingSignalRow {
  athleteId: string;
  topicPrefix: string;
  reason: "no_signal" | "stale";
  lastSeenAt: string | null;
  thresholdHours: number;
}

const CRITICAL_TOPICS: Array<{ prefix: string; hours: number }> = [
  { prefix: "foundation.readiness", hours: 36 },
  { prefix: "foundation.fatigue", hours: 36 },
  { prefix: "analytics.workload", hours: 168 },
  { prefix: "behavioral.", hours: 336 },
];

export function missingSignalsFromBuckets(
  buckets: RosterRowsByAthlete,
  athleteIds: string[],
): MissingSignalRow[] {
  const out: MissingSignalRow[] = [];
  for (const athleteId of athleteIds) {
    const rows = buckets.get(athleteId) ?? [];
    for (const { prefix, hours } of CRITICAL_TOPICS) {
      const matched = rows.filter((r) => (r.topic_id ?? "").startsWith(prefix));
      if (matched.length === 0) {
        out.push({ athleteId, topicPrefix: prefix, reason: "no_signal", lastSeenAt: null, thresholdHours: hours });
        continue;
      }
      const last = matched[0];
      if (isStale(last.occurred_at, hours)) {
        out.push({
          athleteId,
          topicPrefix: prefix,
          reason: "stale",
          lastSeenAt: last.occurred_at,
          thresholdHours: hours,
        });
      }
    }
  }
  return out;
}

/** Workload continuity per athlete — raw counts only. No smoothing. */
export interface WorkloadContinuity {
  athleteId: string;
  last7dCount: number;
  prior7dCount: number;
  lastWorkloadAt: string | null;
}

export function workloadContinuityFromBuckets(
  buckets: RosterRowsByAthlete,
  athleteIds: string[],
  now: Date = new Date(),
): WorkloadContinuity[] {
  const t = now.getTime();
  const day = 86400 * 1000;
  return athleteIds.map((athleteId) => {
    const rows = (buckets.get(athleteId) ?? []).filter((r) =>
      (r.topic_id ?? "").startsWith("analytics."),
    );
    let last7 = 0;
    let prior7 = 0;
    let lastAt: string | null = null;
    for (const r of rows) {
      const ts = Date.parse(r.occurred_at);
      if (Number.isNaN(ts)) continue;
      const ageDays = (t - ts) / day;
      if (ageDays <= 7) last7 += 1;
      else if (ageDays <= 14) prior7 += 1;
      if (!lastAt) lastAt = r.occurred_at;
    }
    return { athleteId, last7dCount: last7, prior7dCount: prior7, lastWorkloadAt: lastAt };
  });
}
