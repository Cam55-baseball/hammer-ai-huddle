/**
 * Wave 2 — Operational telemetry.
 *
 * Pure reducers over recent ASB event rows. No writes. No mutation.
 * Every metric is derived; the ledger remains canonical truth.
 */

export interface OpsEventLike {
  event_id: string;
  topic_id: string;
  occurred_at: string;
  ingested_at?: string | null;
  payload?: Record<string, unknown> | null;
  confidence?: number | null;
}

export interface OpsTelemetrySnapshot {
  windowStart: string;
  windowEnd: string;
  totalEvents: number;
  throughputPerMin: number;
  topTopics: Array<{ topic: string; count: number }>;
  overrideCount: number;
  escalationCount: number;
  avgConfidence: number | null;
  missingnessRate: number;
  ingestionLagP95Ms: number | null;
}

const RUNTIME_OVERRIDE_TOPICS = new Set([
  "prescription.override.requested",
  "prescription.override.acknowledged",
  "session.block.modified",
  "session.block.skipped",
  "session.block.substituted",
  "session.deviation.logged",
]);

const ESCALATION_MARKERS = new Set(["escalate", "watch"]);

function pct(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export function buildTelemetry(
  events: OpsEventLike[],
  now: Date = new Date(),
): OpsTelemetrySnapshot {
  const end = now.toISOString();
  const sorted = [...events].sort((a, b) =>
    a.occurred_at.localeCompare(b.occurred_at),
  );
  const start = sorted[0]?.occurred_at ?? end;

  const topicCounts = new Map<string, number>();
  let overrideCount = 0;
  let escalationCount = 0;
  let confSum = 0;
  let confN = 0;
  let missingN = 0;
  const lags: number[] = [];

  for (const e of sorted) {
    topicCounts.set(e.topic_id, (topicCounts.get(e.topic_id) ?? 0) + 1);
    if (RUNTIME_OVERRIDE_TOPICS.has(e.topic_id)) overrideCount += 1;
    const state = (e.payload as { state?: string } | null)?.state;
    if (state && ESCALATION_MARKERS.has(state)) escalationCount += 1;
    if (typeof e.confidence === "number") {
      confSum += e.confidence;
      confN += 1;
    }
    const missingness = (e.payload as { missingness?: string } | null)?.missingness;
    if (missingness && missingness !== "complete") missingN += 1;
    if (e.ingested_at) {
      const lag = Date.parse(e.ingested_at) - Date.parse(e.occurred_at);
      if (Number.isFinite(lag) && lag >= 0) lags.push(lag);
    }
  }

  const windowMs = Date.parse(end) - Date.parse(start);
  const windowMin = Math.max(windowMs / 60_000, 1 / 60);

  const topTopics = [...topicCounts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    windowStart: start,
    windowEnd: end,
    totalEvents: sorted.length,
    throughputPerMin: +(sorted.length / windowMin).toFixed(2),
    topTopics,
    overrideCount,
    escalationCount,
    avgConfidence: confN ? +(confSum / confN).toFixed(3) : null,
    missingnessRate: sorted.length ? +(missingN / sorted.length).toFixed(3) : 0,
    ingestionLagP95Ms: pct(lags, 95),
  };
}
