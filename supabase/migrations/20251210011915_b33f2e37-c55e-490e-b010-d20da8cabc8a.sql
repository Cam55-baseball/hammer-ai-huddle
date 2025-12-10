-- Add meal_type column to vault_nutrition_logs table
ALTER TABLE public.vault_nutrition_logs 
ADD COLUMN IF NOT EXISTS meal_type TEXT DEFAULT NULL;