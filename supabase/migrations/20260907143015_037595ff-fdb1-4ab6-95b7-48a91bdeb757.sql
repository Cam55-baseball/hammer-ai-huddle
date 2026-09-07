ALTER TABLE public.wk_recovery_acks
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz,
  ADD COLUMN IF NOT EXISTS superseded_reason text;

CREATE INDEX IF NOT EXISTS idx_wk_recovery_acks_user_live
  ON public.wk_recovery_acks (user_id, acknowledged_at DESC)
  WHERE superseded_at IS NULL;

-- Acks written by the pre-fix absolute-value proximity window (which counted
-- games already played as "within 48 hours"). Superseded, never deleted.
UPDATE public.wk_recovery_acks
SET superseded_at = now(),
    superseded_reason = 'pre_window_fix_game_proximity'
WHERE superseded_at IS NULL
  AND reduction_reason = 'game_proximity'
  AND acknowledged_at < timestamptz '2026-09-07 01:59:05+00';