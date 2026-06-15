# Hammers Video Analysis — Implementation Authorization (Tracking)

The Metric Constitution (Phase 3), Event Constitution (Phase 3A), and the prior Phase-0…Phase-2 capability audits are the binding scope. Six phases ship in order; Phase N may not begin until Phase N−1's acceptance tests pass.

## Status

- **Phase 0 — Determinism Foundation: IN PROGRESS**
  - ✅ Schema migration shipped: `videos` extended (sha256, fps_true, duration, w/h, orientation, landing time, calibration, direction) + 5 new tables (`video_landmark_runs`, `video_event_runs`, `video_metric_runs`, `video_coaching_runs`, `video_analysis_runs`) with RLS + GRANTs + updated_at triggers.
  - ✅ Version constants: `src/lib/biomech/versions.ts` (LANDMARK_MODEL_VERSION, DETECTOR_VERSION, METRIC_ENGINE_VERSION).
  - ✅ Deterministic SHA-256 + canonical-JSON hash + `buildCacheFingerprint`: `src/lib/biomech/fingerprint.ts` (browser + Node fallback; 5/5 unit tests green).
  - ✅ Append-only audit-trail writer: `src/lib/biomech/auditTrail.ts`.
  - ✅ Replay-determinism CLI: `scripts/replay/verify-determinism.ts` (10× equivalence).
  - ⏭ Next in Phase 0: wire `analyze-video` edge function to (a) compute video_sha256_hex on upload, (b) write a `video_analysis_runs` row on every attempt, (c) replace input-only cache fingerprint with the new builder, (d) retire the `Pass-2 Pro escalation` path, (e) rewrite `recompute-report-card` as a thin re-runner.

- Phase 1 — Video Processing Layer: not started.
- Phase 2 — Landmark & Measurement Layer (MediaPipe): not started.
- Phase 3 — Event Engine (E-1…E-10): not started.
- Phase 4 — Metric Engine: not started.
- Phase 5 — Coaching Layer: not started.
- Phase 6 — Observability: not started.

## Cache fingerprint contract (active)

```
cache_fingerprint = SHA256(
  video_sha256_hex || ":" ||
  LANDMARK_MODEL_VERSION || ":" ||
  DETECTOR_VERSION || ":" ||
  METRIC_ENGINE_VERSION || ":" ||
  fps_true.toFixed(6) || ":" ||
  (landing_time_sec?.toFixed(6) ?? "null") || ":" ||
  direction_sign || ":" ||
  calibration_h_px.toFixed(6)
)
```

Prompt text, athlete-context snapshots, and AI model id are constitutionally **excluded**. They live on `video_coaching_runs`.

## Acceptance criteria (release gate, unchanged)

1. 10× landmarks_sha256_hex identical.
2. 10× events_sha256_hex identical.
3. 10× metrics_sha256_hex identical.
4. Per-tile confidence identical.
5. Tile status + value identical.
6. Coaching narrative may differ; cited metric record byte-identical.
7. Metric lineage viewer resolves every metric → events → landmarks chain.
8. `scripts/replay/verify-determinism.ts` exits 0 in CI.
