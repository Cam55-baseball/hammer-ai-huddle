-- Add per-side tracking to hammer daily task completions so switch hitters
-- and ambidextrous throwers get independent checklists for L/R work.
ALTER TABLE public.hammer_daily_task_completions
  ADD COLUMN IF NOT EXISTS side text NULL
  CHECK (side IS NULL OR side IN ('L','R'));

-- Rebuild uniqueness to include side (null-safe via coalesce expression index).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hammer_daily_task_completions_user_id_plan_date_task_id_key'
  ) THEN
    ALTER TABLE public.hammer_daily_task_completions
      DROP CONSTRAINT hammer_daily_task_completions_user_id_plan_date_task_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS hammer_daily_task_completions_uniq_side
  ON public.hammer_daily_task_completions (user_id, plan_date, task_id, COALESCE(side, ''));