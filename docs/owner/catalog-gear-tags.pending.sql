-- PENDING — do NOT apply without named owner authorization.
-- Why: 31 active wk_movement_catalog rows carry the same bulk tag
-- equipment_requirements = '{barbell,rack}', including exercises whose own
-- names say they use other gear. Plans now prefer exercises the player has
-- saved gear for, so a wrong tag can hand "DB Bench Press" to a player with a
-- barbell but no dumbbells (seen on the TEST college plan for Oct 23, 2026).
-- Scope: only rows whose NAME states the gear. Everything else stays as is
-- and is listed at the bottom for the owner to decide.

-- 1. Snapshot first (required by the no-destructive-changes rule).
create table if not exists public.wk_catalog_gear_snapshot_20261022 as
  select slug, equipment_requirements, now() as snapshotted_at
  from public.wk_movement_catalog
  where equipment_requirements = '{barbell,rack}';

-- 2. Name-stated corrections (each guarded by the current value).
update public.wk_movement_catalog set equipment_requirements = '{dumbbell,bench}'
  where slug in ('db_bench','db_row_bench') and equipment_requirements = '{barbell,rack}';
update public.wk_movement_catalog set equipment_requirements = '{dumbbell}'
  where slug in ('rdl_db','goblet_squat') and equipment_requirements = '{barbell,rack}';
update public.wk_movement_catalog set equipment_requirements = '{cable_stack}'
  where slug = 'lat_pulldown' and equipment_requirements = '{barbell,rack}';
update public.wk_movement_catalog set equipment_requirements = '{trap_bar}'
  where slug = 'trap_bar_dl_double_ecc' and equipment_requirements = '{barbell,rack}';

-- 3. Owner decision needed (no vocabulary token or gear unclear from the name):
--   weighted_pullup_concentric, weighted_pullup_double_ecc  (pull-up bar; no token exists)
--   copenhagen_adduction_ecc                                 (bench or partner)
--   glute_bridge                                             (barbell optional?)
--   safety_bar_box_squat                                     (safety bar; no token exists)
--   nordic_curl "Bar-Anchored"                               (barbell in rack — likely correct)
-- Rollback: update from wk_catalog_gear_snapshot_20261022 by slug.
