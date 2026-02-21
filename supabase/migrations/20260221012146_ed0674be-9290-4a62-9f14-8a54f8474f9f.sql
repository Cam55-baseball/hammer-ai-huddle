ALTER TABLE physio_adult_tracking
  ADD COLUMN IF NOT EXISTS mood_stability integer,
  ADD COLUMN IF NOT EXISTS sleep_quality_impact integer,
  ADD COLUMN IF NOT EXISTS wellness_consistency_text text,
  ADD COLUMN IF NOT EXISTS symptom_tags text[];