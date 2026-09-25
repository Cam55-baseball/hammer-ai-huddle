# Parked features — pick-up list

Owner decision (Step 28 correction, 2026-09-25): nothing is deleted. Unused items are **parked**:
kept in code and data, locked from users, labelled, and listed here. An audit accepts a parked item
as "not read" only when it is locked, labelled and listed (registry: `src/lib/flags/parkedRegistry.ts`,
test: `src/test/parkedFeatures.test.ts`).

## Parked tables — service role only (RLS on, 0 policies, no anon/authenticated grants)

| Table | Purpose | Missing to finish | Owner decision needed |
|---|---|---|---|
| game_plan_week_overrides | Per-week manual reorder of Game Plan days | A Game Plan screen that writes and reads week overrides | Is manual week reorder wanted alongside Tell Hammers re-plan? |
| sprint_analyses | AI sprint video analysis (splits, steps, 20–80 grade) | Analysis function + results screen | Build sprint video analysis (AI credit cost)? |
| video_pose_analysis | Pose landmarks per uploaded video | Pose pipeline + consumer screen | Build pose analysis (hosted inference cost)? |
| udl_alerts | Alerts from the old Unified Daily Loop | A UDL engine, or fold into Tell Hammers | Revive UDL or retire for good? |
| udl_constraint_overrides | Owner overrides for UDL thresholds | A UDL engine that reads them | Same as above |
| udl_drill_completions | Drill completions inside a UDL plan | UDL engine + completion screen | Same as above |
| udl_daily_plans | Daily drill plans from the UDL | UDL engine | Same as above |
| udl_audit_log | UDL audit trail | UDL engine | Same as above |

Note: these eight were dropped earlier on 2026-09-25 and rebuilt the same day from the last known column list.
Column types and defaults are reconstructed (ids uuid, times timestamptz, numbers numeric).

### Data loss record (Step 29, 2026-09-25)
Lost when the tables were dropped at 00:46 UTC (commit f923178d) and rebuilt empty at 00:51 UTC (commit 14d9e029):
- `udl_daily_plans` — 12 rows: old test daily drill plans from the retired Unified Daily Loop.
- `udl_audit_log` — 13 rows: the audit trail for those same test plans.
Recovery sources checked: no snapshot table, no branch, no insert in any migration, no copy in git history.
Point-in-time or daily backups cannot be reached from the project workspace on Lovable Cloud.
Result: **not recovered**. They were test data; no athlete's plan read them.

Re-check (WP0, 2026-09-25 15:40 UTC): no `udl_*` snapshot table exists (only `wk_feature_switches_snapshot_20260925`);
no migration inserts rows into either table; git history holds schema only, no row data. No backup or point-in-time
restore is reachable from the project. Owner request to Lovable support: restore rows of `public.udl_daily_plans`
(12 rows) and `public.udl_audit_log` (13 rows) as they stood before 2026-09-25 00:46 UTC (drop migration
`20260925001205`), into a separate schema, touching nothing else.

## Hard rule — no destructive change without explicit instruction (Step 29)
Never DROP a table or column, never DELETE without a WHERE clause, never TRUNCATE, unless the owner's
message for that task names that exact thing to delete. Before any destructive change, copy the affected
rows to a timestamped snapshot table (e.g. `<table>_snapshot_YYYYMMDD`) and report it. Parking is always the default.

## Parked columns

| Column | Purpose | Missing | Decision |
|---|---|---|---|
| wk_movement_catalog.surface_hint | Surface hint per movement (turf, grass, mat); filled on all 974 rows | An approved slot and wording on the card | Where on the card, and what words? |

## Estimated benchmarks — awaiting dated sources (owner decision 2026-09-25)

These 17 grading anchors have a source lead but no date. They are flagged `estimate: true` in
`src/data/gradeBenchmarks.ts`, and athletes see an "estimated benchmark" note next to the grade.
No values were changed. To finish one: add a dated source (`as_of`), then remove `estimate: true`.

ten_yard_dash, seven_yard_dash, forty_yard_dash, pro_agility, sl_broad_jump, sl_vert_jump,
vertical_jump, standing_broad_jump, avg_exit_velo_bp, long_toss_distance, sl_balance_eyes_closed,
three_hundred_yd_shuttle, sl_3x_bound, shoulder_rom_internal, shoulder_rom_external,
hip_internal_rotation, ankle_dorsiflexion. Full anchors: `docs/audits/undated-benchmarks-2026-09-09.md`.

## Feature switches

None parked. `onboarding_off_days` and `ub_plyo_hand_wrist` were set to "all" before Step 28 and were changed
to "off" without an owner instruction; restored to "all" on 2026-09-25 (Step 29). Snapshot of the prior state:
`wk_feature_switches_snapshot_20260925`.

## Parked UI (hidden, code kept) — switches in `src/lib/flags/parked.ts`

| Item | Where | Switch |
|---|---|---|
| "Game IQ 101 (Coming soon)" menu items (3) | Sidebar (`AppSidebar.tsx`) | `sidebarGameIq101` |
| "Exciting Updates Coming Soon" box | Landing page (`components/parked/ParkedLandingTeasers.tsx`) | `landingComingSoonBox` |
| Motion capture / analytics / rankings teaser cards | Landing page (same file) | `landingTeaserCards` |
| "Game IQ 101 · Coming soon" tile | Progress page (`IqInsightCard.tsx`) | `progressGameIqTile` |

## Locked modules (reachable only by typed address, not linked anywhere)

| Screen | Why it stays locked | To finish |
|---|---|---|
| Combine (`/combine/*`) | Results and evaluator paperwork not finished; locked so no partial data is saved | Finish entry + results, then point the routes back at the real pages |
| Softball versions of locked features | Softball pre-launch lockdown (owner decision); no baseball answers for softball | Softball content per `docs/softball/prelaunch-lock-report.md` |
| Game IQ 101 (`GameIqComingSoon`) | Module not finished | Finish Game IQ 101 |
| Old `/coming-soon` page | Not linked; kept, not deleted | Retire or reword when the owner decides |

## Parked scheduled jobs (unscheduled to save credits, function code kept)

| Job | Function | Purpose | To re-schedule |
|---|---|---|---|
| extract-patterns-daily | extract-patterns | Builds anonymized_pattern_library | Only once something reads the library; restore with `select cron.schedule('extract-patterns-daily', ...)` |

## Known simplifications left in for launch (2026-09-25)

| Item | Where | Why it is safe | To finish |
|---|---|---|---|
| Two growth checks use "age 15 or under" instead of real height-check growth | Card builder (`wk-generate-daily`) | Always at least as cautious as the real-growth rule, never less safe | Point both at the height-check growth signal after launch |
