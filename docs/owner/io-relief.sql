-- Hammers — disk-IO relief after the Oct 29 2026 outage.
-- Written for the owner to run. Nothing here changes any job's frequency.
-- Run each section separately, during a quiet hour. Each delete is batched so it
-- never holds the disk for long; re-run a batch statement until it reports 0 rows.

---------------------------------------------------------------------------
-- (a) cron.job_run_details: ~381 MB of job history. Keep 14 days.
---------------------------------------------------------------------------
-- One-time purge, in batches of 20,000 rows (repeat until "DELETE 0"):
DELETE FROM cron.job_run_details
WHERE runid IN (
  SELECT runid FROM cron.job_run_details
  WHERE end_time < now() - interval '14 days'
  LIMIT 20000
);

-- Daily purge job (new job, 03:47 UTC; it does not change any existing job).
-- Bounded to 50,000 rows per run so it can never become a long write.
SELECT cron.schedule(
  'purge-cron-run-details-daily',
  '47 3 * * *',
  $$
  DELETE FROM cron.job_run_details
  WHERE runid IN (
    SELECT runid FROM cron.job_run_details
    WHERE end_time < now() - interval '14 days'
    LIMIT 50000
  );
  $$
);

---------------------------------------------------------------------------
-- (b) Snapshot retention — READERS VERIFIED Oct 29 2026 (code search of every
--     reader in src/ and supabase/functions/):
--   engine_snapshot_versions (~1.5 GB, ~967k rows since 2026-05-02):
--     engine-regression-runner reads 30 days back (max); useFoundationVideos
--     reads the latest 2 rows. No reader needs rows older than 30 days.
--     Nothing references this table by foreign key. An existing job already
--     deletes rows older than 180 days; this tightens it to 45 days.
--   hammer_state_snapshots (~460 MB since 2026-04-24):
--     longest readers are update-user-engine-profile (30 days) and
--     regression/extract-patterns (7–30 days); app screens read only each
--     player's latest row.
--     WARNING: deleting a snapshot CASCADE-deletes linked rows in
--     engine_state_predictions, hammer_state_explanations_v2 and
--     advisory_feedback_logs (player feedback). Section (b2) therefore keeps
--     every snapshot that has feedback attached, and every player's latest
--     snapshot. Take the owner snapshot step first, per the no-destructive rule.
---------------------------------------------------------------------------

-- (b1) engine_snapshot_versions: keep 45 days. Batches of 10,000:
DELETE FROM public.engine_snapshot_versions
WHERE id IN (
  SELECT id FROM public.engine_snapshot_versions
  WHERE created_at < now() - interval '45 days'
  LIMIT 10000
);

-- (b2) hammer_state_snapshots: keep 45 days, every player's latest row, and
--      every row with advisory feedback attached. Optional; run only after
--      exporting what you want kept. Batches of 5,000:
DELETE FROM public.hammer_state_snapshots s
WHERE s.id IN (
  SELECT h.id FROM public.hammer_state_snapshots h
  WHERE h.computed_at < now() - interval '45 days'
    AND NOT EXISTS (SELECT 1 FROM public.advisory_feedback_logs f WHERE f.snapshot_id = h.id)
    AND h.computed_at < (SELECT max(x.computed_at) FROM public.hammer_state_snapshots x WHERE x.user_id = h.user_id)
  LIMIT 5000
);

-- After the purges, let the database reclaim space without locking tables:
VACUUM (ANALYZE) cron.job_run_details;
VACUUM (ANALYZE) public.engine_snapshot_versions;
VACUUM (ANALYZE) public.hammer_state_snapshots;
