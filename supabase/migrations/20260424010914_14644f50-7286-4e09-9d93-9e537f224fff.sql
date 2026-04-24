
-- Phase A1: Provisional snapshot support
ALTER TABLE public.mpi_scores
  ADD COLUMN IF NOT EXISTS is_provisional boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scoring_inputs jsonb;

-- Leaderboard queries should skip provisional rows efficiently
CREATE INDEX IF NOT EXISTS idx_mpi_sport_rank_non_provisional
  ON public.mpi_scores (sport, global_rank)
  WHERE is_provisional = false AND global_rank IS NOT NULL;

-- Seed the new gate-split keys (idempotent)
INSERT INTO public.engine_settings (setting_key, setting_value, description)
VALUES
  ('provisional_min_sessions', '1'::jsonb,
    'Minimum sessions OR alternative inputs (custom_activity_logs, tex_vision_sessions, vault_focus_quizzes) required to produce a provisional MPI/HIE snapshot. Provisional snapshots power the dashboard but are excluded from leaderboards.'),
  ('ranking_min_sessions', '60'::jsonb,
    'Minimum performance_sessions required for an athlete to appear on the public leaderboard. Mirrors the legacy data_gate_min_sessions value. Provisional snapshots are excluded from rankings until this threshold is met.')
ON CONFLICT (setting_key) DO NOTHING;
