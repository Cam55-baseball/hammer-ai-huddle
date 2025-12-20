-- Add elite morning check-in fields to vault_focus_quizzes
ALTER TABLE vault_focus_quizzes 
ADD COLUMN IF NOT EXISTS daily_motivation TEXT,
ADD COLUMN IF NOT EXISTS daily_intentions TEXT,
ADD COLUMN IF NOT EXISTS discipline_level INTEGER;

-- Add constraint for discipline_level range (1-5)
ALTER TABLE vault_focus_quizzes 
ADD CONSTRAINT discipline_level_range CHECK (discipline_level IS NULL OR (discipline_level >= 1 AND discipline_level <= 5));

-- Add comment for documentation
COMMENT ON COLUMN vault_focus_quizzes.daily_motivation IS 'User''s daily motivation/why for the day';
COMMENT ON COLUMN vault_focus_quizzes.daily_intentions IS 'User''s daily intentions/goals';
COMMENT ON COLUMN vault_focus_quizzes.discipline_level IS 'Discipline commitment level 1-5 (Struggling to Unbreakable)';