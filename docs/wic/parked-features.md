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
Column types and defaults are reconstructed (ids uuid, times timestamptz, numbers numeric). The 25 old test rows
(12 in udl_daily_plans, 13 in udl_audit_log) could not be recovered.

## Parked columns

| Column | Purpose | Missing | Decision |
|---|---|---|---|
| wk_movement_catalog.surface_hint | Surface hint per movement (turf, grass, mat); filled on all 974 rows | An approved slot and wording on the card | Where on the card, and what words? |

## Parked feature switches (Off, not buildable)

| Switch | Purpose | Missing | Decision |
|---|---|---|---|
| ub_plyo_hand_wrist | Upper-body plyos and hand & wrist work | Plan builder does not yet call the ubPlyo rules | Approve wiring ubPlyo into the daily plan |
| onboarding_off_days | Off-day choice in onboarding | Nothing reads the switch; off days already come from the schedule | Keep a separate onboarding step? |

## Parked UI (hidden, code kept) — switches in `src/lib/flags/parked.ts`

| Item | Where | Switch |
|---|---|---|
| "Game IQ 101 (Coming soon)" menu items (3) | Sidebar (`AppSidebar.tsx`) | `sidebarGameIq101` |
| "Exciting Updates Coming Soon" box | Landing page (`components/parked/ParkedLandingTeasers.tsx`) | `landingComingSoonBox` |
| Motion capture / analytics / rankings teaser cards | Landing page (same file) | `landingTeaserCards` |

## Parked scheduled jobs (unscheduled to save credits, function code kept)

| Job | Function | Purpose | To re-schedule |
|---|---|---|---|
| extract-patterns-daily | extract-patterns | Builds anonymized_pattern_library | Only once something reads the library; restore with `select cron.schedule('extract-patterns-daily', ...)` |
