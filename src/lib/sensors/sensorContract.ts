/**
 * Sensor Fusion Adapter Layer — Contract (deferred).
 *
 * Type-only module. No runtime behavior. No ingestion. No DB writes.
 * Defines the canonical future shape of sensor events and the reserved
 * placeholder bridge interface. Deleting this directory must cause
 * zero downstream breakage.
 */

export type SensorSource =
  | "apple_health"
  | "garmin"
  | "wearable_generic"
  | "manual_device";

export interface SensorEvent {
  sensor_event_id: string;
  athlete_id: string;
  source: SensorSource;
  metric_type: string;
  value: number | string | null;
  unit: string | null;

  occurred_at: string;
  ingested_at: string;

  device_metadata: Record<string, unknown>;

  idempotency_key: string;
  engine_version: string;
}

/**
 * DO NOT IMPLEMENT YET.
 * Future: sensor → ASB bridge. Always returns null for now to prevent
 * accidental early coupling between the sensor adapter layer and the
 * canonical ASB event ledger.
 */
export interface SensorToASBBridge {
  translate(sensorEvent: SensorEvent): null;
}
