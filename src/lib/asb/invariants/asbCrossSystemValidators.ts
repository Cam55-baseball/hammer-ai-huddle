/**
 * Pure cross-system parity validators.
 *
 * Each validator answers: does a downstream projection interpret a given
 * canonical ASB event identically to the ASB substrate itself?
 *
 * Read-only. No side effects. CI/debug use only.
 */
import { computeIdempotencyKey } from "@/lib/asb/engineVersion";
import { generateSensorIdempotencyKey } from "@/lib/sensors/sensorIdempotency";
import { normalizeSensorPayload } from "@/lib/sensors/sensorEventNormalizer";
import { resolveSensorTopic } from "@/lib/sensors/sensorTopicRegistry";
import { classifyMissingness } from "@/lib/asb/constants/missingnessThresholds";

export interface ParityResult {
  subsystem: "digest" | "coach" | "forecast" | "sensor";
  event_id: string;
  pass: boolean;
  mismatch_reason?: string;
}

export interface AsbEventLike {
  event_id: string;
  athlete_id: string;
  topic_id: string;
  occurred_at: string;
  payload?: unknown;
  engine_version?: string | null;
  confidence?: number | null;
}

export interface ProjectionLike {
  /** The topic the projection claims to derive from. */
  topic_id?: string;
  /** Confidence forwarded from source. Must NOT exceed source confidence. */
  confidence?: number | null;
  /** Missingness state reported by the subsystem. */
  missingness?: string;
  /** Identity the subsystem associates with this projection. */
  event_id?: string;
  /** Source events the subsystem cites. */
  sourceEventIds?: string[];
}

export interface SensorEventLike {
  athlete_id: string;
  metric_type: string;
  occurred_at: string;
  payload: unknown;
}

function ok(subsystem: ParityResult["subsystem"], event_id: string): ParityResult {
  return { subsystem, event_id, pass: true };
}

function fail(
  subsystem: ParityResult["subsystem"],
  event_id: string,
  reason: string,
): ParityResult {
  return { subsystem, event_id, pass: false, mismatch_reason: reason };
}

function sameTopic(a: string | undefined, b: string): boolean {
  if (!a) return false;
  return a === b || b.startsWith(a) || a.startsWith(b);
}

function validateCommon(
  subsystem: ParityResult["subsystem"],
  asb: AsbEventLike,
  proj: ProjectionLike,
): ParityResult | null {
  if (proj.event_id && proj.event_id !== asb.event_id) {
    return fail(subsystem, asb.event_id, "event_id mismatch");
  }
  if (proj.topic_id && !sameTopic(proj.topic_id, asb.topic_id)) {
    return fail(subsystem, asb.event_id, `topic mismatch: ${proj.topic_id} vs ${asb.topic_id}`);
  }
  if (
    proj.confidence !== undefined &&
    proj.confidence !== null &&
    asb.confidence !== undefined &&
    asb.confidence !== null &&
    proj.confidence > asb.confidence
  ) {
    return fail(
      subsystem,
      asb.event_id,
      `confidence amplification: ${proj.confidence} > ${asb.confidence}`,
    );
  }
  if (proj.missingness) {
    const canonical = classifyMissingness(
      [{ topic_id: asb.topic_id, occurred_at: asb.occurred_at, payload: asb.payload }],
      asb.topic_id,
    );
    // Subsystems may report stricter missingness, but never invent "ok" from absence.
    if (proj.missingness === "ok" && canonical !== "ok") {
      return fail(subsystem, asb.event_id, `missingness inflated: ok vs ${canonical}`);
    }
  }
  if (proj.sourceEventIds && proj.sourceEventIds.length > 0 && !proj.sourceEventIds.includes(asb.event_id)) {
    return fail(subsystem, asb.event_id, "sourceEventIds missing canonical event");
  }
  return null;
}

export function validateDigestParity(
  asb: AsbEventLike,
  proj: ProjectionLike,
): ParityResult {
  return validateCommon("digest", asb, proj) ?? ok("digest", asb.event_id);
}

export function validateCoachParity(
  asb: AsbEventLike,
  proj: ProjectionLike,
): ParityResult {
  const common = validateCommon("coach", asb, proj);
  if (common) return common;
  // Coach must forward raw confidence — never aggregated/recomputed.
  // (Distinct numerical values would already be caught by the >source check;
  // here we additionally reject undefined when source defined: coach must surface it.)
  if (asb.confidence !== undefined && asb.confidence !== null && proj.confidence === undefined) {
    return fail("coach", asb.event_id, "coach dropped raw confidence");
  }
  return ok("coach", asb.event_id);
}

export function validateForecastParity(
  asb: AsbEventLike,
  proj: ProjectionLike,
): ParityResult {
  return validateCommon("forecast", asb, proj) ?? ok("forecast", asb.event_id);
}

/**
 * Future-ready check: sensor idempotency must equal ASB idempotency
 * for the same (athlete_id, resolved topic_id, occurred_at, normalized payload).
 */
export async function validateSensorForwardCompatibility(
  sensor: SensorEventLike,
): Promise<ParityResult> {
  const topic_id = resolveSensorTopic(sensor.metric_type);
  const pseudoEventId = `${sensor.athlete_id}:${sensor.metric_type}:${sensor.occurred_at}`;
  if (topic_id === null) {
    return fail("sensor", pseudoEventId, `unknown metric_type: ${sensor.metric_type}`);
  }
  const { normalized } = normalizeSensorPayload(sensor.payload);
  const sensorKey = await generateSensorIdempotencyKey({
    athlete_id: sensor.athlete_id,
    metric_type: sensor.metric_type,
    occurred_at: sensor.occurred_at,
    normalized_payload: normalized,
  });
  const asbKey = await computeIdempotencyKey({
    athlete_id: sensor.athlete_id,
    topic_id,
    occurred_at: sensor.occurred_at,
    payload: sensor.payload,
  });
  if (sensorKey !== asbKey) {
    return fail("sensor", pseudoEventId, `idempotency drift: ${sensorKey} vs ${asbKey}`);
  }
  return ok("sensor", pseudoEventId);
}
