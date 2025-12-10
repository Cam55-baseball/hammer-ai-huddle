-- Add logged_at timestamp for individual meal tracking
ALTER TABLE vault_nutrition_logs 
ADD COLUMN logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();