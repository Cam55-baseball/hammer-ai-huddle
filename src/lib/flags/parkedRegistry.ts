/**
 * Parked registry (Step 28 correction). Audits accept an item as "not read"
 * only when it is listed here, locked (tables: RLS on, no policies, no
 * anon/authenticated grants), labelled with a PARKED comment, and listed in
 * docs/wic/parked-features.md.
 */
export const PARKED_TABLES = [
  "game_plan_week_overrides",
  "sprint_analyses",
  "video_pose_analysis",
  "udl_alerts",
  "udl_constraint_overrides",
  "udl_drill_completions",
  "udl_daily_plans",
  "udl_audit_log",
] as const;
export const PARKED_COLUMNS = ["wk_movement_catalog.surface_hint"] as const;
export const PARKED_SWITCHES = [] as const;
export const PARKED_CRON_FUNCTIONS = ["extract-patterns"] as const;
/** SQL the owner or an audit can run to prove every parked table is locked. */
export const PARKED_LOCK_PROOF_SQL = `select c.relname, c.relrowsecurity,
 (select count(*) from pg_policy p where p.polrelid=c.oid) as policies,
 has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') as anon_any,
 has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') as auth_any,
 obj_description(c.oid) like 'PARKED%' as labelled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname = any($1)`;
