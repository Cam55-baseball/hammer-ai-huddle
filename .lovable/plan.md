# Lock Phase 9 invariants to project memory

## Goal
Persist the Phase 9 hardening contract so all future work treats it as immutable. No code, schema, or DB changes — memory only.

## Memory writes

**1. New feature memory: `mem://features/behavioral-engine/phase-9-architecture`**

Captures the canonical contract:

- **Source of truth**: `custom_activity_logs` is the ONLY behavioral source. `athlete_daily_log` is used solely for `injury_mode` override. Snapshot input tag: `"source": "custom_activity_logs_v2"`.
- **NN system**: If NN templates exist, ALL must complete per day; else fallback to "any completion". 7-day rolling window in `nn_miss_count_7d`. Emits `nn_miss` event with magnitude.
- **Streaks (independent)**:
  - `performance_streak` = consecutive days all NN met (or any-completion fallback).
  - `discipline_streak` = consecutive days any activity logged.
  - Injury days do NOT break streaks. Missed days reset immediately.
- **Hammer State v3 formula** (deterministic):
  `final_score = clamp((activityScore*0.55 + consistencyScore*0.25 + neuroBlend*0.20) * damping_multiplier - min(nn_miss_count_7d*8, 30) + min(performance_streak*1.5, 15))`
  Thresholds: prime ≥80, ready 60–79, caution 40–59, recover <40.
- **Version source of truth**: `engine_snapshot_versions.engine_version` (currently `v3.0.0`). `snapshot.schema_version` is **deprecated** for validation.
- **Behavioral events**: `nn_miss`, `consistency_drop`, `consistency_recover`, `identity_tier_change`. No duplicates within same minute. UI shows ONE active message at a time. Priority: `nn_miss > consistency_drop > tier_change > recover`.
- **Realtime trigger**: On any completed activity → `compute-hammer-state` + `evaluate-behavioral-state` invoked fire-and-forget, 8s throttle. Cron is fallback only.
- **System user exclusion**: `00000000-0000-0000-0000-000000000001` MUST never appear in `hammer_state_snapshots`, `user_consistency_snapshots`, or `behavioral_events`. Hard-excluded in both edge functions.
- **Performance budget**: All engine edge functions must remain <2000ms. Current: evaluate ~895ms, compute ~660ms.

**2. Update `mem://index.md`** — add 4 Core invariants (always-applied one-liners):

- Behavioral engine source of truth = `custom_activity_logs` ONLY; `athlete_daily_log` is injury-override only.
- Hammer engine version = `engine_snapshot_versions.engine_version` ONLY; `snapshot.schema_version` is deprecated.
- System user `00000000-0000-0000-0000-000000000001` must be excluded from all behavioral pipelines.
- Activity completion must trigger realtime engine recompute (8s throttle, fire-and-forget); cron is fallback.

Plus add to Memories list:
- `[Phase 9 Behavioral Engine](mem://features/behavioral-engine/phase-9-architecture)` — Source of truth, NN, streaks, Hammer v3, events, realtime.

## Out of scope
No code, schema, function, or DB changes. Phase 9 is locked; this only encodes the contract so future edits can't silently violate it.