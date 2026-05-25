# Backlog #8 — Cross-Substrate Consistency Hardening

A read-only invariance + parity layer that seals ASB, Digest, Coach, Forecast, and Sensor subsystems to a single canonical interpretation. No routes, no UI, no schema, no runtime behavior changes.

## Scope

Additive-only. Pure TypeScript. Zero coupling to Supabase, hooks, or React. CI/debug-only execution. Deleting `src/lib/asb/invariants/` must cause zero runtime breakage.

## Files to create

### 1. `src/lib/asb/constants/missingnessThresholds.ts`
Single source of truth for missingness semantics.

```text
MISSINGNESS_STATES = "no_signal" | "stale" | "partial" | "ok"
THRESHOLDS = {
  staleAfterMs: 7 * 24h,
  partialRequiredFields: per-topic minimal field set,
  windowMs: 7 * 24h (default observation window)
}
classifyMissingness(events, topic, now) → MissingnessState
```
All subsystems must import from here; no inline thresholds elsewhere.

### 2. `src/lib/asb/invariants/asbInvariantChecks.ts`
CI/debug entry point.

```text
runInvariantSuite(sample: AsbEvent[]): ParityResult[]
runInvariantSuite() asserts:
  - 100% parity across sampled events
  - zero topic drift
  - zero divergence in identity / missingness / confidence
```
Pure — no I/O. Caller supplies sample dataset.

### 3. `src/lib/asb/invariants/asbParityMatrix.ts`
Cross-system check registry.

```text
ParityResult { subsystem, event_id, pass, mismatch_reason? }

buildParityMatrix(asbEvent) runs:
  - asb→digest identity match
  - asb→coach identity match
  - asb→forecast inclusion consistency
  - sensor→asb idempotency parity (future-ready, inert)
  - topic mapping consistency across layers
```

### 4. `src/lib/asb/invariants/asbCrossSystemValidators.ts`
Pure validators.

```text
validateDigestParity(asbEvent, digestProjection): ParityResult
validateCoachParity(asbEvent, coachProjection): ParityResult
validateForecastParity(asbEvent, forecastProjection): ParityResult
validateSensorForwardCompatibility(sensorEvent): ParityResult
```
Each enforces: identity equality, topic interpretation equality, missingness classification equality, confidence forwarding (no amplification, no recomputation).

### 5. `src/lib/asb/invariants/__tests__/parity.test.ts`
- Sampled ASB events → all validators return `pass: true`
- Sensor `generateSensorIdempotencyKey` ≡ ASB `computeIdempotencyKey` (byte-for-byte)
- Missingness states identical across digest + coach selectors for same input
- Coach projection never aggregates confidence (raw forward only)
- Forecast confidence ≤ source ASB confidence

### 6. CI guard script — `scripts/check-invariants.sh` (or extend existing CI step)
Grep-based forbidden-pattern guard:
- No `staleAfterMs|partialRequiredFields` literal outside `missingnessThresholds.ts`
- No `sha256(` identity composition outside `engineVersion.ts` + `sensorIdempotency.ts`
- No subsystem imports another subsystem's `projections.ts`
- No re-declaration of topic maps outside `sensorTopicRegistry.ts`

## Refactor (minimal, parity-preserving)

Only if existing files contain inline thresholds, replace with imports from `missingnessThresholds.ts`. No behavior change — values stay identical.
- `src/lib/digest/projections.ts` — if any `staleAfter` / window constants inline, point at central constants.
- `src/lib/coach/projections.ts` — same.

If thresholds are already implicit/derived, leave files untouched and only export the canonical constants for future use.

## Invariant rules enforced

| Rule | Authority |
|---|---|
| Event identity | `computeIdempotencyKey` in `engineVersion.ts` |
| Topic resolution (sensor) | `sensorTopicRegistry.ts` |
| Topic resolution (ASB/digest/coach/forecast) | prefix match only, no remap |
| Missingness thresholds | `missingnessThresholds.ts` |
| Confidence | ASB-emitted, pass-through only; coach raw, forecast ≤ source |

## Acceptance criteria

- `runInvariantSuite()` returns 100% pass on sampled fixture
- Sensor idempotency ≡ ASB idempotency (test asserts equality)
- Single missingness threshold source (grep-verified)
- No subsystem cross-imports another's projection logic
- No new routes, hooks, edge functions, migrations
- Deleting `src/lib/asb/invariants/` leaves app fully functional
- All existing tests still pass

## Build order

1. `missingnessThresholds.ts`
2. `asbCrossSystemValidators.ts`
3. `asbParityMatrix.ts`
4. `asbInvariantChecks.ts`
5. Parity tests
6. CI grep guard script
7. Minimal refactor of digest/coach to import central thresholds (only if inline duplicates exist)

## Out of scope

No new ASB writes. No runtime invariant enforcement on hot paths. No sensor activation. No UI surface. No new doctrine. No edge functions. No schema.
