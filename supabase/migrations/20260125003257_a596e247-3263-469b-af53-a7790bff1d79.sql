-- Add new columns for bilateral balance testing
ALTER TABLE vault_focus_quizzes
  ADD COLUMN IF NOT EXISTS balance_left_seconds integer,
  ADD COLUMN IF NOT EXISTS balance_right_seconds integer;

-- Migrate existing data (assign old value to both legs as estimate)
UPDATE vault_focus_quizzes 
SET balance_left_seconds = balance_duration_seconds,
    balance_right_seconds = balance_duration_seconds
WHERE balance_duration_seconds IS NOT NULL 
  AND balance_left_seconds IS NULL;