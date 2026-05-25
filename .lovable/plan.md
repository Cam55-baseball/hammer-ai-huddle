# Backlog #7 — Sensor Fusion Adapter Layer (Deferred Scaffold)

Pure, compile-time-only readiness layer. No ingestion, no DB writes, no hooks, no routes, no UI, no edge functions. Mirrors ASB idempotency exactly so a future bridge can plug in without breaking replay determinism.

## Scope

Create a single new directory `src/lib/sensors/` with five files. Nothing else in the app imports from it (verified by grep). Deleting the directory must cause zero downstream breakage.

## Files

### 1. `src/lib/sensors/sensorContract.ts`
Type-only module. Exports:
- `SensorSource` union: `"apple_health" | "garmin" | "wearable_generic" | "manual_device"`
- `SensorEvent` interface matching the spec exactly (`sensor_event_id`, `athlete_id`, `source`, `metric_type`, `value: number | string | null`, `unit: string | null`, `occurred_at`, `ingested_at`, `device_metadata: Record<string, unknown>`, `idempotency_key`, `engine_version`)
- `SensorToASBBridge` interface with `translate(sensorEvent: SensorEvent): null` — reserved placeholder, always null
- No runtime values, no implementations

### 2. `src/lib/sensors/sensorTopicRegistry.ts`
Static `as const` mapping object `SENSOR_TOPIC_REGISTRY`:
```
heart_rate    → sensor.heart_rate
hrv           → sensor.hrv
sleep_stage   → sensor.sleep
load          → sensor.external_load
gps_velocity  → sensor.movement.velocity
```
Plus a pure `resolveSensorTopic(metric_type: string): string | null` lookup. No inference, no aggregation, no fallback transformation — unknown metrics return `null`.

### 3. `src/lib/sensors/sensorEventNormalizer.ts`
Pure functions only. Reuses `canonicalPayload` from `src/lib/asb/engineVersion.ts` for stable key ordering. Exports:
- `NOISE_FIELDS` constant: device-jitter fields stripped from `device_metadata` (e.g. `battery_level`, `signal_strength`, `rssi`, `sample_seq`, `_raw`) — declarative list only
- `stripDeviceNoise(meta: Record<string, unknown>): Record<string, unknown>`
- `normalizeSensorPayload(event: Pick<SensorEvent, "metric_type" | "value" | "unit" | "occurred_at" | "device_metadata">): { normalized: string; hashBasis: string }` — returns canonical JSON string + the exact string fed to the hasher
- No side effects, no async I/O beyond what `canonicalPayload` does (sync).

### 4. `src/lib/sensors/sensorIdempotency.ts`
Mirrors `computeIdempotencyKey` from `src/lib/asb/engineVersion.ts` byte-for-byte so future bridge output collides correctly with ASB dedupe. Exports:
- `generateSensorIdempotencyKey({ athlete_id, metric_type, occurred_at, normalized_payload }): Promise<string>` — composes material as `athlete_id | topic_id | occurred_at | normalized_payload` where `topic_id` comes from `resolveSensorTopic(metric_type)` (throws if unknown to prevent silent miscoding) and hashes via the same sha256-hex routine. Implementation re-uses the ASB hasher pattern (small private `sha256Hex` copy or import — see Technical notes).

### 5. `src/lib/sensors/__tests__/sensorContract.test.ts` (optional, recommended)
Vitest sanity:
- Topic registry is frozen / deterministic
- `generateSensorIdempotencyKey` equals `computeIdempotencyKey` when fed equivalent inputs (cross-checks parity)
- `SensorToASBBridge.translate()` returns `null`

## Verification Matrix

| Check | Method |
|---|---|
| No imports from `asb_events`, `digest`, `coach`, `command` | `rg "from ['\"]@/(integrations/supabase\|lib/(digest\|coach\|command))" src/lib/sensors` → empty |
| No Supabase calls | `rg "supabase" src/lib/sensors` → empty |
| No DB tables | No migration file added |
| No edge functions | No `supabase/functions/sensor*` added |
| Idempotency parity | Test asserts equality vs `computeIdempotencyKey` |
| Zero downstream coupling | `rg "from ['\"]@/lib/sensors" src` → empty |
| Bridge inert | `translate()` returns `null` (type signature enforces) |
| Build passes | Standard build check |

## Technical notes

- Import `canonicalPayload` from `@/lib/asb/engineVersion` (pure helper, no runtime side effects, safe to share).
- For `sha256Hex`: re-import via a small local copy in `sensorIdempotency.ts` to keep the sensor module self-contained AND assert parity in tests. Alternative: export `sha256Hex` from `engineVersion.ts` — but that's a touch to an ASB file. Prefer **local copy + parity test** to keep ASB sealed.
- All files use TypeScript `as const` and `readonly` where applicable.
- No React, no hooks, no JSX.

## Build Order

1. `sensorContract.ts` (types + bridge interface)
2. `sensorTopicRegistry.ts` (frozen mapping + resolver)
3. `sensorEventNormalizer.ts` (noise strip + canonical serialization)
4. `sensorIdempotency.ts` (hash, mirrors ASB)
5. `__tests__/sensorContract.test.ts` (parity + inertness)
6. Run grep guards from verification matrix

## Out of Scope (explicit)

- No wearable SDK integration
- No `asb_events` writes or bridge execution
- No UI, no routes, no sidebar entries
- No hooks, no React Query
- No migration, no RLS changes
- No `/command`, `/digest`, `/coach` modifications
