

# Hammers Modality — Engine Activation & Hammer State Architecture

Build-ready, additive-only, ordered by phase. Existing modules are preserved; nothing is deleted.

---

## 1. Root-Cause Report — Engine Starvation

Verified against the live database and edge functions.

| Symptom | Confirmed Cause |
|---|---|
| 3 `mpi_scores` rows for 132 active subs | Nightly MPI runs successfully (last batch 2026-04-23 05:00 UTC). Gate is `data_gate_min_sessions = 60`. With only 3 users having any sessions and **none above 60**, every athlete fails `gates.ranking_eligible` and is `continue`'d before the upsert (`nightly-mpi-process/index.ts:520`). |
| 2 `hie_snapshots` rows | **`hie-analyze` is never auto-invoked.** Only call sites: (a) the very end of `calculate-session` (only fires when a full performance session is saved — only 24 ever exist), (b) one-off `hie-verify`, (c) inside `nightly-mpi-process` but **only for athletes that pass the same 60-session gate**. There is no nightly per-user HIE pass and no UI trigger. |
| 24 sessions vs 595 custom_activity_logs | Users live in Custom Activities. `performance_sessions` requires the Practice Hub gates (Intent → Side → Rep → Micro). High friction. |
| 1 mindfulness, 67 tex_vision, 149 focus quizzes, 0 CNS rows | `cns_test_results` table doesn't exist — CNS test data is currently only stored in `vault_focus_quizzes.reaction_time_ms` / `balance_*_seconds`. No table-level surfacing for the engine. |
| Cron health | All 8 cron jobs `active=true` and last-run timestamps current. **Cron is fine. The wiring is not.** |

**The Ferrari has fuel — the fuel line is disconnected.** Two single-line gaps cause 95% of the starvation: HIE is never invoked per-user, and MPI has a 60-session gate that no one can clear.

---

## 2. Phased Execution Plan

### PHASE A — Engine Activation (ship first, no UI changes)

**A1. Provisional MPI/HIE gate split** — `engine_settings` + `nightly-mpi-process` + `hie-analyze`
- Add new `engine_settings` keys: `provisional_min_sessions=1`, `ranking_min_sessions=60` (ranking gate stays strict, snapshot gate becomes 1).
- In `nightly-mpi-process` (lines 506–520): keep `gates.ranking_eligible` strict, but **always upsert** `mpi_scores` with a new `is_provisional` boolean when `count >= provisional_min_sessions OR has any (custom_activity_log | tex_vision | focus_quiz | vault) input`. Provisional rows are excluded from leaderboards (`global_rank=NULL`) but power the dashboard.
- In `hie-analyze`: drop the implicit gate; produce a snapshot at any input level. Stamp `development_confidence` already exists — use it (`0–40` provisional, `40–70` developing, `70+` mature).

**A2. Nightly HIE batch** — new cron + new edge function `nightly-hie-process`
- New function loops every active user (sport from `athlete_mpi_settings`), invokes `hie-analyze` with continuation-token pattern (mirror `nightly-mpi-process` lines 113–129).
- Cron `0 6 * * *` UTC (1 hr after MPI). Reuses `hie_execution_locks` to prevent duplicate work.

**A3. Post-input HIE refresh trigger** — DB trigger
- Add deferred trigger on inserts to `performance_sessions`, `custom_activity_logs`, `tex_vision_sessions`, `vault_focus_quizzes` that calls `pg_notify('hie_dirty', user_id)`. A new `hie-refresh-worker` edge function (invoked from a 15-min cron) consumes the dirty list and refreshes those users' snapshots — bounded throughput, no thundering herd.

**A4. Engine Health Dashboard** — `/admin/engine-health` (owner/admin only)
- Tiles: snapshot coverage %, provisional vs mature, last cron run per job, failed users from `audit_log.action='nightly_mpi_failures'`, lock table size, average computation time.
- Re-uses existing `audit_log` rows. No new tables.

---

### PHASE B — Today Command Bar + Quick Log Mode (drive input velocity)

**B1. `<TodayCommandBar />`** — new component, top of `Dashboard.tsx`, above Game Plan
- One row, three slots:
  - **Hammer State badge** (Phase D output) — color + 1-word state.
  - **Next Action** — derived by new `useNextAction()` hook from {time of day, calendar, last session age, readiness}. Examples: "Log warmup (7:42 AM)", "Practice Hitting (no log in 3d)", "Recovery walk (red recovery)".
  - **One CTA**: `[Log Now]` — opens `<QuickLogSheet />`.
- Renders for all users; fully replaces nothing.

**B2. `<QuickLogSheet />`** — bottom sheet, 1 screen, max 4 fields
- Auto-route by recency: detects most-used module last 7 days from `custom_activity_logs` + `performance_sessions`.
- Shows: activity (chip), duration (tap-default), intensity (RPE 1–10 slider), optional note.
- Defaults pulled from expanded `useSessionDefaults` (already exists; expand keys to all modules).
- Saves to `custom_activity_logs` immediately. Intent/side/micro-layer captured **after** save in an optional "Add detail" expand — so logging is never blocked.

**B3. Smart Log routing** — `useNextAction.ts`
- Time windows: 5–10 AM → warmup/readiness, 10 AM–2 PM → practice, 2–7 PM → game/practice, 7–10 PM → recovery/nutrition.
- Calendar override: if a `game_plan_days` event exists today → that wins.
- Returns `{ moduleHint, label, route, ctaLabel }`.

---

### PHASE C — Unified Readiness Layer (synthesis only — zero deletion)

**C1. New hook `useReadinessState()`** — synthesis only, no schema change
- Pulls in parallel:
  - `hie_snapshots.readiness_score` (cognitive/load axis)
  - `physio_daily_reports.regulation_score` via existing `usePhysioDailyReport` (recovery axis)
  - latest `vault_focus_quizzes` (mental/arousal axis)
- Outputs:
  ```ts
  { state: 'green'|'yellow'|'red', score: 0-100, sources: [{ name, score, weight }], confidence }
  ```
- Weighted average with confidence-weighting (missing source → others rebalance).

**C2. New `<ReadinessChip />`** — replaces nothing; adopted by:
- `TodayCommandBar` (compact)
- existing `ReadinessCard` (expanded; tap-source-breakdown)
- Game Plan header
- Practice Hub header

**C3. Route consolidation (soft, no breakage)**
- Add a `<Navigate>` table for legacy `/complete-*` paths → tier equivalents. All `<Route>` entries kept and aliased. No DELETE of routes.

---

### PHASE D — Hammer State (neuro/performance core)

**D1. New table `hammer_state_snapshots`** — append-only, computed every 15 min for active users
```
id, user_id, computed_at,
arousal_score, arousal_inputs jsonb,
recovery_score, recovery_inputs jsonb,
motor_state, motor_inputs jsonb,        -- 'acquisition'|'consolidation'|'retention'
cognitive_load, cognitive_inputs jsonb,
dopamine_load, dopamine_inputs jsonb,   -- reward-frequency throttle metric
overall_state text,                      -- 'prime'|'ready'|'caution'|'recover'
schema_version int default 1
```
- RLS: user reads own; service role writes.

**D2. New edge function `compute-hammer-state`** — pure aggregator over existing data
- **Arousal**: `vault_focus_quizzes.reaction_time_ms` + `mental_readiness` + `tex_vision_sessions.accuracy` (last 24h).
- **Recovery**: `vault_focus_quizzes.hours_slept` + `sleep_quality` + `pain_scale` + `perceived_recovery` + `physio_daily_reports.regulation_score`.
- **Motor learning**: based on spacing — recent reps in same module within {0–24h=acquisition, 24–72h=consolidation, >72h=retention}.
- **Cognitive load**: tex_vision processing-under-load + mind-fuel inputs.
- **Dopamine throttle**: count of "completion celebration" events in last 6h vs target frequency — surfaces a cooldown signal to UI.
- Output one row per run; UI reads latest via `useHammerState()`.

**D3. Surfaces** (additive)
- Dashboard → `<HammerStateBadge />` in TodayCommandBar.
- Practice Hub → drill recommendations weighted by motor_state (acquisition → fewer reps higher quality).
- HIE outputs → `weakness_clusters` ordered by `arousal/recovery` mismatch first.
- Calendar → red-state day shows "Recovery suggested" overlay (does not block).

---

### PHASE E — Neuro Mapping (matrix, applied in code via tags)

Every module gets a `neuro_systems` tag array stored in `engine_settings.module_neuro_map` (single jsonb row, owner-editable). Used by Hammer State for input weighting and by HIE to label "why am I seeing this".

| Module | Dopamine | Norepinephrine | Acetylcholine | Serotonin | GABA | CNS Load | Missing inputs to add |
|---|---|---|---|---|---|---|---|
| Tex Vision | low | **high** | **high** | — | — | low | reaction-time variance |
| Mind Fuel / Mindfulness | mid | low | mid | **high** | **high** | none | post-session HRV (future) |
| Practice Hub | **high** | **high** | **high** | mid | low | **high** | session start mood (1-tap) |
| Game Hub | **high** | **high** | mid | low | low | **high** | crowd-pressure tag |
| Heat Factory / Hammers Modality | mid | **high** | mid | mid | low | **high** | bar speed (future) |
| Iron Bambino | mid | mid | **high** | mid | mid | mid | already covered |
| Vault | mid | low | low | **high** | mid | none | longitudinal mood trend |
| Nutrition Hub | low | low | mid | **high** | mid | low | **fuel timing (last meal)** |
| Speed Lab | **high** | **high** | mid | low | low | **high** | already strong |
| Baserunning IQ | low | **high** | **high** | low | low | low | decision latency already in |
| Pick-Off Trainer | mid | **high** | **high** | low | low | low | already strong |
| CNS Quick Reaction | low | **high** | mid | low | low | low | **promote to top-level table** |
| Regulation System | low | low | low | **high** | **high** | mid | already strong |

---

### PHASE F — Data Expansion (additive columns)

Migrations (no breaking changes):
1. `vault_focus_quizzes`: already has `hours_slept`, `sleep_quality`, `wake_time`, `bedtime_goal` — add `sleep_consistency_score numeric` (computed from 7-day std-dev).
2. New table `session_start_moods` — `session_id, mood int 1-5, energy int 1-5, captured_at` (1-tap before session).
3. New column `nutrition_logs.minutes_since_last_meal int` (auto-computed, nullable).
4. New table `environment_snapshots` — `user_id, captured_at, weather jsonb, temp_f, humidity, conditions` (auto-attached via existing `get-weather` function on session insert).
5. New table `wearable_metrics` — `user_id, captured_at, source text, hrv_ms, rhr_bpm, sleep_min, raw jsonb, schema_version int default 1` — empty for now, future-proofed for Whoop/Apple/Garmin.

All five flow into `compute-hammer-state` via additional input arrays.

---

### PHASE G — 50-Year Integrity

**G1. JSONB schema versioning** — migration adds `schema_version int default 1` to: `performance_sessions.drill_blocks`, `performance_sessions.composite_indexes`, `performance_sessions.micro_layer_data`, `hie_snapshots.weakness_clusters`, `mpi_scores.composites`, all jsonb columns on `vault_focus_quizzes`. Read-side uses a tiny `migrateJsonb(payload, expected)` helper.

**G2. Drill versioning** — new table `drill_definitions_versions` mirroring `activity_card_versions`. `drill_definitions.current_version_id` → FK. All HIE/MPI references store `version_id` snapshot.

**G3. Append-only session ledger** — new table `performance_sessions_ledger` (id, session_id, snapshot jsonb, captured_at, reason). Trigger captures full row on every insert/update/soft-delete. Existing edit/delete windows still apply, but the truth is preserved forever.

**G4. Engine override transparency** — new column `engine_settings.is_override boolean default true`. Any setting with `is_override=true` AND value differing from `ENGINE_CONTRACT` shows a yellow "Override Active" banner on `/admin/engine-settings` and on every snapshot card it affects (`<EngineOverrideIndicator />`).

---

### PHASE H — Coach Authority Layer

**H1. `<CoachComplianceView />`** — new tab in Coach Dashboard
- Roster grid: rows = players, cols = last 7 days.
- Each cell traffic-light from existing `game_plan_days.is_completed` + `custom_activity_logs` count + presence of any session.
- Click cell → drill into that day's logged items.
- Read-only; uses existing `is_linked_coach` RPC.

**H2. "Why am I seeing this?" overlay**
- Add `<WhyButton />` next to every HIE prescription, MPI dev prompt, and Hammer State recommendation.
- Click → bottom sheet shows: inputs used (table + value + timestamp), thresholds applied (from `engine_settings`), logic path (the cluster name + weight), confidence.
- Pulls from `hie_snapshots.weakness_clusters[*].data_points` (already stored) and a new `mpi_scores.scoring_inputs jsonb` column populated by `nightly-mpi-process`.

---

## 3. Hammer State Architecture (data → UI)

```text
INPUTS (existing tables)                           AGGREGATOR              OUTPUT
─────────────────────────────                      ───────────────         ──────────────
vault_focus_quizzes (sleep, pain, RT) ─┐
tex_vision_sessions (accuracy, speed) ─┤
mindfulness_sessions ──────────────────┤   compute-hammer-state    →  hammer_state_snapshots
performance_sessions (recency, RPE) ───┼─→  (edge function,        →    {arousal, recovery,
custom_activity_logs (CNS load) ───────┤    every 15min via cron   →     motor, cognitive,
physio_daily_reports (regulation) ─────┤    + on-demand on log)    →     dopamine, overall}
nutrition_logs (fuel timing) ──────────┤                                       │
session_start_moods (NEW) ─────────────┤                                       ▼
environment_snapshots (NEW) ───────────┤                              useHammerState()
wearable_metrics (NEW, future) ────────┘                                       │
                                                                               ▼
                                                                  TodayCommandBar (badge)
                                                                  Practice Hub (drill weighting)
                                                                  HIE outputs (cluster ordering)
                                                                  Calendar (overlay)
```

---

## 4. Build Order (sequenced, atomic, ship-able)

1. **A1** Engine gate split → migration + `nightly-mpi-process` + `hie-analyze` edits. *(Unblocks every other user immediately.)*
2. **A2** `nightly-hie-process` + cron. *(Snapshots populate within 24h.)*
3. **A3** Dirty trigger + `hie-refresh-worker`. *(Sub-15-min freshness on log.)*
4. **A4** `/admin/engine-health` dashboard. *(Visibility for ongoing operation.)*
5. **F1–F2** Sleep consistency + session_start_moods migrations. *(Feeds Hammer State.)*
6. **D1–D2** `hammer_state_snapshots` + `compute-hammer-state` + cron. *(Core neuro layer.)*
7. **C1–C2** `useReadinessState` + `<ReadinessChip />`. *(Synthesis layer.)*
8. **B1–B3** TodayCommandBar + QuickLogSheet + smart routing. *(Velocity.)*
9. **D3** Surface Hammer State everywhere (drill weighting, HIE ordering, calendar overlay).
10. **F3–F5** Fuel timing + environment + wearable scaffolding.
11. **E** Neuro module-tag map + apply to UI emphasis.
12. **G1–G4** Schema versioning, drill versioning, ledger, override transparency.
13. **H1–H2** Coach compliance view + "Why am I seeing this?" overlays.

Steps 1–4 ship first and immediately fix the engine starvation. Steps 5–9 deliver the Hammer State + velocity layer the user requested. Steps 10–13 lock in the 50-year standard.

---

## 5. Files Touched (preview)

**New edge functions:** `nightly-hie-process`, `hie-refresh-worker`, `compute-hammer-state`
**New cron jobs:** `nightly-hie-6am`, `hie-refresh-15min`, `hammer-state-15min`
**New migrations:** engine gate keys, hammer_state_snapshots, session_start_moods, environment_snapshots, wearable_metrics, schema_version columns, drill_definitions_versions, performance_sessions_ledger, sleep_consistency_score, minutes_since_last_meal, scoring_inputs, is_override
**New components:** `TodayCommandBar`, `QuickLogSheet`, `ReadinessChip`, `HammerStateBadge`, `WhyButton`, `EngineOverrideIndicator`, `CoachComplianceView`, `EngineHealthDashboard`
**New hooks:** `useNextAction`, `useReadinessState`, `useHammerState`, `useEngineHealth`, `useWhyExplanation`
**Edited (additive only):** `Dashboard.tsx`, `nightly-mpi-process/index.ts`, `hie-analyze/index.ts`, `useSessionDefaults.ts`, `App.tsx` (route aliases), `ReadinessCard.tsx`

Nothing existing is removed. Every user-facing badge, page, and route remains functional.

