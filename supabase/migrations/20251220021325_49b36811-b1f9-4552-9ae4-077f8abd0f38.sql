-- Add mood_level and stress_level columns to vault_focus_quizzes
ALTER TABLE vault_focus_quizzes 
ADD COLUMN IF NOT EXISTS mood_level INTEGER,
ADD COLUMN IF NOT EXISTS stress_level INTEGER;

-- Add check constraints for valid ranges
ALTER TABLE vault_focus_quizzes 
ADD CONSTRAINT mood_level_range CHECK (mood_level IS NULL OR (mood_level >= 1 AND mood_level <= 5));

ALTER TABLE vault_focus_quizzes 
ADD CONSTRAINT stress_level_range CHECK (stress_level IS NULL OR (stress_level >= 1 AND stress_level <= 5));