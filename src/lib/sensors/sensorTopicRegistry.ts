/**
 * Sensor Fusion Adapter Layer — Topic Registry (deferred).
 *
 * Declarative, static mapping from future sensor metric_type identifiers
 * to ASB-compatible topic prefixes. No transformation. No inference.
 * No aggregation. Unknown metrics resolve to null.
 */

export const SENSOR_TOPIC_REGISTRY = {
  heart_rate: "sensor.heart_rate",
  hrv: "sensor.hrv",
  sleep_stage: "sensor.sleep",
  load: "sensor.external_load",
  gps_velocity: "sensor.movement.velocity",
} as const;

export type SensorMetricType = keyof typeof SENSOR_TOPIC_REGISTRY;
export type SensorTopicId = (typeof SENSOR_TOPIC_REGISTRY)[SensorMetricType];

export function resolveSensorTopic(metric_type: string): SensorTopicId | null {
  return (
    (SENSOR_TOPIC_REGISTRY as Record<string, SensorTopicId>)[metric_type] ??
    null
  );
}
