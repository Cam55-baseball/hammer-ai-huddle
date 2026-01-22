-- Add column to track when progress reports were unlocked by recap generation
ALTER TABLE vault_recaps 
ADD COLUMN unlocked_progress_reports_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;