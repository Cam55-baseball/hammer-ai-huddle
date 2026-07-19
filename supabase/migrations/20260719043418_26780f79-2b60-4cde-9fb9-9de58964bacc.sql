-- Fix: all WK movements were flagged as illegal for every offseason quarter,
-- preseason, and RTP, causing wk-generate-daily to fail global validation
-- (bs_unresolved_template etc.) and leaving Speed / Bat Speed / Lifts /
-- Conditioning cards permanently on the Retry state.
UPDATE public.wk_movement_catalog
SET season_legality = jsonb_build_object(
  'in_season', true,
  'post_season', true,
  'preseason', true,
  'os_q1', true,
  'os_q2', true,
  'os_q3', true,
  'os_q4', true,
  'rtp', COALESCE((season_legality->>'rtp')::bool, false)
);