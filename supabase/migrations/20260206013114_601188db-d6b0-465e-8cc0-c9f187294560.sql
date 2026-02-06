-- Add goal text columns to tracking tables
ALTER TABLE vault_weekly_wellness_quiz 
ADD COLUMN IF NOT EXISTS weekly_goals_text TEXT;

ALTER TABLE vault_performance_tests 
ADD COLUMN IF NOT EXISTS six_week_goals_text TEXT;

ALTER TABLE vault_scout_grades 
ADD COLUMN IF NOT EXISTS long_term_goals_text TEXT;