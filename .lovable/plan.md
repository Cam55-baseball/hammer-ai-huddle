

# Hammers Modality — Phases A2–H UI Layer (Final Build)

Backend foundation (migrations, edge functions, cron, triggers) is **live**. This plan ships the complete UI/integration layer end-to-end. Additive-only. No deletions.

---

## Build Order

### 1. Hooks Layer (foundations everything else consumes)
- **`useHammerState.ts`** — fetches latest `hammer_state_snapshots` row for current user; realtime-subscribed; returns `{ snapshot, loading, color, label }`.
- **`useReadinessState.ts`** — confidence-weighted synthesis of `hie_snapshots.readiness_score` + `physio_daily_reports.regulation_score` + latest `vault_focus_quizzes`. Returns `{ state: 'green'|'yellow'|'red', score, sources: [{name, score, weight}], confidence }`.
- **`useNextAction.ts`** — derives `{ moduleHint, label, route, ctaLabel }` from time-of-day, today's `game_plan_days`, last session age, readiness state.
- **`useEngineHealth.ts`** — owner/admin only; pulls snapshot coverage %, provisional-vs-mature counts, last cron timestamps from `audit_log`, `hie_dirty_users` queue depth, recent failure counts.
- **`useWhyExplanation.ts`** — `(sourceType, sourceId) => { inputs[], thresholds[], logic, neuroTags, confidence }`. Reads from `hie_snapshots.weakness_clusters[*].data_points`, `mpi_scores.scoring_inputs`, `hammer_state_snapshots.*_inputs`, `engine_settings.module_neuro_map`.
- **Expand `useSessionDefaults.ts`** — multi-module key support; backwards-compatible with current single-module callers.

### 2. Atomic Components
- **`HammerStateBadge.tsx`** — pill: color dot + 1-word state (`Prime` / `Ready` / `Caution` / `Recover`). Tap → expands to 4-axis breakdown (arousal / recovery / motor / cognitive).
- **`ReadinessChip.tsx`** — compact badge (default) + `expanded` variant with source breakdown. Tap → bottom sheet with weighted sources.
- **`WhyButton.tsx` + `WhyExplanationSheet.tsx`** — small `(?)` icon button → bottom sheet showing inputs used, thresholds, logic path, neuro tags, confidence.
- **`EngineOverrideIndicator.tsx`** — yellow inline banner when `engine_settings.is_override = true` for the affecting key.

### 3. Today Command Bar + Quick Log
- **`TodayCommandBar.tsx`** — three-slot row mounted at the top of `Dashboard.tsx`, **above** existing Game Plan section: `[HammerStateBadge] [Next Action label] [Log Now CTA]`. Renders for all roles.
- **`QuickLogSheet.tsx`** — bottom sheet (Sheet from `@/components/ui/sheet`). 4 fields max: activity chip (auto-detected most-used module last 7d), duration (default from `useSessionDefaults`), RPE 1–10 slider, optional note. Saves immediately to `custom_activity_logs`. Optional collapsible "Add detail" section appears post-save for intent/side/micro-layer (never blocks the save).

### 4. Surface Adoption (additive injection — no existing components removed)
- **`Dashboard.tsx`** — mount `<TodayCommandBar />` above existing Game Plan card.
- **`ReadinessCard.tsx`** — adopt `<ReadinessChip variant="expanded" />` inside existing card body alongside current readiness display (does not replace).
- **`SessionIntentGate.tsx`** — append optional 1-tap mood (😞😐🙂😊🤩) + energy (🔋🔋🔋) row that writes to `session_start_moods` on session start. Does not block the existing flow.
- **Calendar day cell** (`src/components/calendar/CalendarView.tsx` and child day-cell component) — when `hammer_state_snapshots.overall_state` for that date = `recover`, show subtle "Recovery suggested" badge overlay. Non-blocking.
- **Practice Hub drill recommendation hook** — read `motor_state` from `useHammerState`; pass weighting hint to existing drill recommender (acquisition → bias toward fewer reps / higher quality; consolidation → bias toward spacing; retention → maintenance volume). Pure addition to scoring weights.

### 5. Engine Health Dashboard
- **`EngineHealthDashboard.tsx`** — full page at `/admin/engine-health`. Tiles:
  - HIE coverage % (active users with snapshot in last 24h)
  - MPI coverage % (provisional vs mature split)
  - Last `nightly-mpi-process` run + status
  - Last `nightly-hie-process` run + status
  - Last `compute-hammer-state` run + status
  - `hie_dirty_users` queue depth (live)
  - 24h failure counts from `audit_log`
- Owner+admin gated (mirrors `AdminEngineSettings.tsx` gating pattern).
- Wire route in `App.tsx`.

### 6. Coach Compliance View
- **`CoachComplianceView.tsx`** — new tab in Coach Dashboard. Roster grid: rows = linked players (via `is_linked_coach` RPC), cols = last 7 days. Each cell traffic-light:
  - Green = `game_plan_days.is_completed = true` OR ≥2 logs that day
  - Yellow = some activity but incomplete
  - Red = no activity
  - Grey = no game plan + no logs
- Click cell → drawer with that day's logged items (read-only).
- Add as a tab inside existing Coach Dashboard route (no new top-level route).

### 7. Why-Buttons Distributed (transparency layer)
- Inject `<WhyButton sourceType="hie" sourceId={cluster.id} />` next to every HIE prescription card.
- Inject `<WhyButton sourceType="mpi" sourceId={score.id} />` next to MPI development prompts.
- Inject `<WhyButton sourceType="hammer" />` next to the Hammer State badge expansion.

### 8. Engine Settings Enhancements
- **`AdminEngineSettings.tsx` / `OwnerEngineSettingsPanel.tsx`** —
  - Show `<EngineOverrideIndicator />` next to any setting where `is_override = true`.
  - Add new editor section: **Neuro Module Map** — visual grid editor for `engine_settings.module_neuro_map` (rows = modules, cols = neuro systems, cell = low/mid/high dropdown).

### 9. Route Aliasing (C3)
- **`App.tsx`** — add `<Navigate>` aliases for legacy `/complete-*` paths → tier equivalents. All existing routes preserved.

### 10. Realtime Wiring
- `useHammerState` subscribes to `hammer_state_snapshots` inserts for current user (15-min cadence + on-demand refreshes).
- `useReadinessState` subscribes to `hie_snapshots` and `physio_daily_reports`.
- `useEngineHealth` polls every 30s (admin page only).

---

## Files Summary (this build)

**New hooks (6)**: `useHammerState`, `useReadinessState`, `useNextAction`, `useEngineHealth`, `useWhyExplanation`, expanded `useSessionDefaults`

**New components (8)**: `TodayCommandBar`, `QuickLogSheet`, `ReadinessChip`, `HammerStateBadge`, `WhyButton`, `WhyExplanationSheet`, `EngineOverrideIndicator`, `CoachComplianceView`

**New page (1)**: `EngineHealthDashboard` at `/admin/engine-health`

**Edited (additive only)**: `Dashboard.tsx` (mount TodayCommandBar), `ReadinessCard.tsx` (adopt ReadinessChip), `SessionIntentGate.tsx` (mood/energy row), `CalendarView.tsx` + day cell (recovery overlay), `App.tsx` (route + aliases), `AdminEngineSettings.tsx` + `OwnerEngineSettingsPanel.tsx` (override indicators + neuro map editor), Practice Hub drill recommender (motor_state weighting), HIE prescription cards / MPI prompts (WhyButton injection)

**No deletions. No breaking changes. Every existing surface remains functional.**

## Verification Checklist
1. Dashboard renders TodayCommandBar above Game Plan; Quick Log writes to `custom_activity_logs` in <2 taps.
2. Hammer State badge updates within 15min of new input (or instant via dirty trigger → refresh worker).
3. ReadinessChip shows source breakdown; missing sources rebalance weights.
4. Engine Health dashboard accessible only to owner/admin; tiles populate from real data.
5. Coach Compliance tab respects `is_linked_coach` RLS; non-coaches see nothing.
6. Why-buttons everywhere produce explanation sheets with real values, not placeholders.
7. Calendar day cells in `recover` state show non-blocking overlay.
8. Session Intent Gate mood/energy capture is optional and does not block session start.
9. Owner can edit Neuro Module Map; saves to `engine_settings`.
10. Override indicators appear on any non-default `engine_settings` row.

