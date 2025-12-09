-- Add sleep quality tracking columns to vault_focus_quizzes table
ALTER TABLE vault_focus_quizzes 
ADD COLUMN IF NOT EXISTS hours_slept DECIMAL(3,1),
ADD COLUMN IF NOT EXISTS sleep_quality INTEGER;

-- Add check constraint for sleep_quality range
ALTER TABLE vault_focus_quizzes
DROP CONSTRAINT IF EXISTS sleep_quality_range;

-- Use a trigger for validation instead of CHECK constraint for better flexibility
CREATE OR REPLACE FUNCTION validate_sleep_quality()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sleep_quality IS NOT NULL AND (NEW.sleep_quality < 1 OR NEW.sleep_quality > 5) THEN
    RAISE EXCEPTION 'sleep_quality must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_sleep_quality_trigger ON vault_focus_quizzes;

CREATE TRIGGER validate_sleep_quality_trigger
BEFORE INSERT OR UPDATE ON vault_focus_quizzes
FOR EACH ROW
EXECUTE FUNCTION validate_sleep_quality();