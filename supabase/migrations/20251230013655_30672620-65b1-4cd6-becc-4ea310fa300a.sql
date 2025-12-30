-- Remove the unique constraint on user_id + entry_date to allow multiple meals per day
ALTER TABLE vault_nutrition_logs 
DROP CONSTRAINT IF EXISTS vault_nutrition_logs_user_id_entry_date_key;