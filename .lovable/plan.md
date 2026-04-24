

# Hammers Modality — Phases A2–H Full Build Plan

Phase A1 shipped. This plan executes **A2 through H** in sequence, additive-only, no deletions.

---

## A2 — Nightly HIE Batch
- **New edge function** `nightly-hie-process/index.ts`: loops every active user from `athlete_mpi_settings`, invokes `hie-analyze` per user using continuation-token pattern (mirror `nightly-mpi-process` lines 113–129). Reuses `hie_execution_locks` via existing `try_acquire_hie_lock` RPC.
- **`hie-analyze` edit**: drop the implicit session gate; produce snapshot at any input level. Stamp `development_confidence` (0–40 provisional, 40–70 developing, 70+ mature).
- **Cron**: `cron.schedule('nightly-hie-6am', '0 6 * * *', ...)` via `pg_net.http_post` to the new function.

## A3 — Post-Input HIE Refresh Worker
- **Migration**: trigger on `performance_sessions`, `custom_activity_logs`, `tex_vision_sessions`, `vault_focus_quizzes` inserts → `INSERT INTO hie_dirty_users (user_id, dirtied_at) ON CONFLICT (user_id) DO UPDATE SET dirtied_at = now()`. New table `hie_dirty_users` (user_id PK, dirtied_at, processing_started_at).
- **New edge function** `hie-refresh-worker`: pulls oldest 50 dirty rows, invokes `hie-analyze` per user, deletes row on success. Bounded throughput.
- **Cron**: every 15 minutes.

## A4 — Engine Health Dashboard
- **New page** `/admin/engine-health` (owner+admin gated via `useOwnerAccess` + `useAdminAccess`).
- **New hook** `useEngineHealth()` — pulls snapshot coverage %, provisional vs mature counts, last cron runs from `audit_log`, lock table size, average computation time.
- **Tiles**: HIE coverage, MPI coverage, last `nightly-mpi-process` run, last `nightly-hie-process` run, dirty queue depth, failures last 24h.

## F1–F2 — Sleep Consistency + Session Start Mood (foundational data)
- **Migration**: add `sleep_consistency_score numeric` to `vault_focus_quizzes` (computed in app from 7-day std-dev).
- **Migration**: new table `session_start_moods` (id, session_id FK, user_id, mood int 1-5, energy int 1-5, captured_at, schema_version int default 1). RLS: user owns own.
- **UI**: 1-tap mood/energy chip injected into Practice Hub session intent gate (additive — does not block).

## D1–D2 — Hammer State Core
- **Migration**: `hammer_state_snapshots` (id, user_id, computed_at, arousal_score numeric, arousal_inputs jsonb, recovery_score numeric, recovery_inputs jsonb, motor_state text check in ('acquisition','consolidation','retention'), motor_inputs jsonb, cognitive_load numeric, cognitive_inputs jsonb, dopamine_load numeric, dopamine_inputs jsonb, overall_state text check in ('prime','ready','caution','recover'), schema_version int default 1). Indexed on (user_id, computed_at desc). RLS: user reads own; service role writes.
- **New edge function** `compute-hammer-state`: aggregates last-24h `vault_focus_quizzes`, `tex_vision_sessions`, `mindfulness_sessions`, `performance_sessions`, `custom_activity_logs`, `physio_daily_reports`, `nutrition_logs`, `session_start_moods`. Outputs one row per active user per run.
- **Cron**: every 15 minutes. Also invoked on-demand from `hie-refresh-worker` for freshly dirty users.
- **New hook** `useHammerState()` returns latest row.

## C1–C2 — Unified Readiness Layer (synthesis)
- **New hook** `useReadinessState()` — synthesizes `hie_snapshots.readiness_score`, `physio_daily_reports.regulation_score`, latest `vault_focus_quizzes`. Confidence-weighted average. Outputs `{ state, score, sources[], confidence }`.
- **New component** `<ReadinessChip />` — compact (badge) + expanded (source breakdown bottom sheet). Adopted by TodayCommandBar, existing `ReadinessCard`, Game Plan header, Practice Hub header. Existing components untouched.

## C3 — Route Aliasing
- **`App.tsx`**: add `<Navigate>` aliases for legacy `/complete-*` paths → tier equivalents. All existing routes preserved.

## B1–B3 — Today Command Bar + Quick Log
- **New hook** `useNextAction()` — derives next action from {time of day, calendar, last session age, readiness}. Returns `{ moduleHint, label, route, ctaLabel }`.
- **New component** `<TodayCommandBar />` — three slots: HammerStateBadge | NextAction text | `[Log Now]` CTA. Mounted at top of `Dashboard.tsx`, **above** existing Game Plan (does not displace anything else).
- **New component** `<QuickLogSheet />` — bottom sheet, 4 fields max (activity chip, duration, RPE 1–10, optional note). Saves to `custom_activity_logs` immediately. Optional "Add detail" expand for intent/side/micro-layer captured **after** save.
- **Edit** `useSessionDefaults.ts` — expand keys from current single-module to all modules.

## D3 — Hammer State Surfaces
- **HammerStateBadge** in TodayCommandBar.
- **Practice Hub**: drill recommendation weighting hook reads `motor_state` (acquisition → fewer reps higher quality, consolidation → spaced reps, retention → maintenance volume).
- **HIE outputs**: `hie-analyze` orders `weakness_clusters` by arousal/recovery mismatch first when Hammer State is `caution` or `recover`.
- **Calendar**: red-state day shows "Recovery suggested" overlay (non-blocking).

## F3–F5 — Data Expansion
- **Migration**: `nutrition_logs.minutes_since_last_meal int` (auto-computed via app on insert from prior meal timestamp).
- **Migration**: `environment_snapshots` (id, user_id, captured_at, weather jsonb, temp_f, humidity, conditions text). Auto-attached on `performance_sessions` insert via trigger calling existing `get-weather` function.
- **Migration**: `wearable_metrics` (id, user_id, captured_at, source text, hrv_ms int, rhr_bpm int, sleep_min int, raw jsonb, schema_version int default 1). Empty for now; future-proofed.
- All three feed `compute-hammer-state` as additional input arrays.

## E — Neuro Module Tag Map
- **Insert** into `engine_settings` key `module_neuro_map` (single jsonb row, owner-editable). Maps every module → {dopamine, norepinephrine, acetylcholine, serotonin, GABA, cns_load} weights per the audit matrix.
- **`compute-hammer-state`** uses map for input weighting.
- **`<WhyButton />`** uses map to label "this surfaced because your acetylcholine load is elevated and Tex Vision targets it".
- **Owner UI** in `/admin/engine-settings`: editor for the map.

## G1 — JSONB Schema Versioning
- **Migration**: add `schema_version int default 1` columns to: `performance_sessions` (drill_blocks/composite_indexes/micro_layer_data — single column applies to all jsonb), `hie_snapshots`, `mpi_scores`, `vault_focus_quizzes`, `hammer_state_snapshots`.
- **New helper** `src/lib/jsonbMigrations.ts`: `migrateJsonb(payload, expectedVersion)` runs registered up-migrations. Versioned reads enforced in hooks.

## G2 — Drill Versioning
- **Migration**: `drill_definitions_versions` (id, drill_id FK, version_number int, definition jsonb, created_at, created_by). Add `current_version_id` FK to `drill_definitions`. Trigger on `drill_definitions` UPDATE captures prior state into versions table.
- **HIE/MPI references** in `hie_snapshots.weakness_clusters` and `mpi_scores.scoring_inputs` store `drill_version_id` snapshot for forever-traceability.

## G3 — Append-Only Session Ledger
- **Migration**: `performance_sessions_ledger` (id, session_id, snapshot jsonb, captured_at, reason text). Trigger on `performance_sessions` INSERT/UPDATE/soft-delete captures full row. Existing 48h edit / 24h delete windows still apply; ledger preserves forever.

## G4 — Engine Override Transparency
- **Migration**: `engine_settings.is_override boolean default true`. Backfill rows that match `ENGINE_CONTRACT` defaults to `false`.
- **New component** `<EngineOverrideIndicator />` — yellow banner shown on `/admin/engine-settings` rows where `is_override=true`, AND on every snapshot card affected by an active override.

## H1 — Coach Compliance View
- **New component** `<CoachComplianceView />` — new tab in Coach Dashboard. Roster grid (rows=players, cols=last 7 days). Cell = traffic light (green/yellow/red/grey) from `game_plan_days.is_completed` + `custom_activity_logs` count + session presence. Click cell → drill into that day. Read-only; uses existing `is_linked_coach` RPC.

## H2 — "Why Am I Seeing This?" Overlay
- **Migration**: `mpi_scores.scoring_inputs jsonb` (already added in A1 — populated by `nightly-mpi-process`).
- **New component** `<WhyButton />` + `<WhyExplanationSheet />` — attached to every HIE prescription, MPI dev prompt, Hammer State recommendation. Bottom sheet shows: inputs used (table+value+timestamp), thresholds applied (from `engine_settings`), logic path, neuro tags, confidence.
- **New hook** `useWhyExplanation(sourceType, sourceId)` — assembles the explanation from `hie_snapshots.weakness_clusters[*].data_points`, `mpi_scores.scoring_inputs`, `hammer_state_snapshots.*_inputs`.

---

## Execution Order (sequential, ship-able)

1. A2 — Nightly HIE batch + cron
2. A3 — Dirty trigger + refresh worker + cron
3. A4 — Engine Health Dashboard
4. F1+F2 — Sleep consistency + session_start_moods migrations + Practice Hub mood chip
5. D1+D2 — `hammer_state_snapshots` + `compute-hammer-state` + cron + `useHammerState`
6. C1+C2 — `useReadinessState` + `<ReadinessChip />` adopted across surfaces
7. C3 — Route aliases
8. B1+B2+B3 — TodayCommandBar + QuickLogSheet + useNextAction + expanded useSessionDefaults
9. D3 — Hammer State surfaces (Practice Hub weighting, HIE ordering, Calendar overlay)
10. F3+F4+F5 — Fuel timing + environment_snapshots + wearable_metrics scaffolding
11. E — `module_neuro_map` insert + owner editor + apply in `compute-hammer-state` + `<WhyButton />` labels
12. G1 — `schema_version` columns + `jsonbMigrations.ts`
13. G2 — Drill versioning
14. G3 — Session ledger
15. G4 — Override transparency
16. H1 — Coach Compliance View
17. H2 — `<WhyButton />` everywhere + `useWhyExplanation`

## Files Summary

**New edge functions (3)**: `nightly-hie-process`, `hie-refresh-worker`, `compute-hammer-state`
**New cron jobs (3)**: `nightly-hie-6am`, `hie-refresh-15min`, `hammer-state-15min`
**New tables (6)**: `hie_dirty_users`, `session_start_moods`, `hammer_state_snapshots`, `environment_snapshots`, `wearable_metrics`, `drill_definitions_versions`, `performance_sessions_ledger`
**New columns**: `vault_focus_quizzes.sleep_consistency_score`, `nutrition_logs.minutes_since_last_meal`, `engine_settings.is_override`, `drill_definitions.current_version_id`, `schema_version` on 5 tables
**New components (8)**: `TodayCommandBar`, `QuickLogSheet`, `ReadinessChip`, `HammerStateBadge`, `WhyButton`, `WhyExplanationSheet`, `EngineOverrideIndicator`, `CoachComplianceView`, `EngineHealthDashboard`
**New hooks (5)**: `useNextAction`, `useReadinessState`, `useHammerState`, `useEngineHealth`, `useWhyExplanation`
**New helper (1)**: `src/lib/jsonbMigrations.ts`
**Edited (additive only)**: `Dashboard.tsx` (TodayCommandBar mount), `hie-analyze/index.ts` (gate drop + cluster ordering), `useSessionDefaults.ts` (multi-module), `App.tsx` (route aliases + 2 new admin routes), `ReadinessCard.tsx` (adopt ReadinessChip), `AdminEngineSettings.tsx` (override indicators + neuro map editor), Practice Hub session intent gate (mood chip), Calendar day cell (recovery overlay)

Nothing existing is removed. Every user-facing badge, page, and route remains functional.

