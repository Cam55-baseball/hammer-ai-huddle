-- Add micros_per_oz to beverage database (preset source)
ALTER TABLE public.hydration_beverage_database
  ADD COLUMN IF NOT EXISTS micros_per_oz jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Add micros (totals for the log = per-oz × amount_oz) to hydration_logs
ALTER TABLE public.hydration_logs
  ADD COLUMN IF NOT EXISTS micros jsonb;

-- Seed common preset beverages with USDA-derived per-oz micronutrient estimates.
-- Keys: vitamin_a_mcg, vitamin_c_mg, vitamin_d_mcg, vitamin_e_mg, vitamin_k_mcg,
--       vitamin_b6_mg, vitamin_b12_mcg, folate_mcg, calcium_mg, iron_mg,
--       magnesium_mg, potassium_mg, zinc_mg

UPDATE public.hydration_beverage_database SET micros_per_oz = '{
  "vitamin_a_mcg":0,"vitamin_c_mg":0,"vitamin_d_mcg":0,"vitamin_e_mg":0,"vitamin_k_mcg":0,
  "vitamin_b6_mg":0,"vitamin_b12_mcg":0,"folate_mcg":0,"calcium_mg":0.4,"iron_mg":0,
  "magnesium_mg":0.4,"potassium_mg":0,"zinc_mg":0
}'::jsonb WHERE liquid_type = 'water';

UPDATE public.hydration_beverage_database SET micros_per_oz = '{
  "vitamin_a_mcg":18,"vitamin_c_mg":0,"vitamin_d_mcg":0.16,"vitamin_e_mg":0,"vitamin_k_mcg":0.04,
  "vitamin_b6_mg":0.005,"vitamin_b12_mcg":0.16,"folate_mcg":0.6,"calcium_mg":15,"iron_mg":0,
  "magnesium_mg":1.4,"potassium_mg":18,"zinc_mg":0.05
}'::jsonb WHERE liquid_type = 'milk';

UPDATE public.hydration_beverage_database SET micros_per_oz = '{
  "vitamin_a_mcg":3,"vitamin_c_mg":10,"vitamin_d_mcg":0,"vitamin_e_mg":0.03,"vitamin_k_mcg":0.03,
  "vitamin_b6_mg":0.013,"vitamin_b12_mcg":0,"folate_mcg":9,"calcium_mg":3.3,"iron_mg":0.06,
  "magnesium_mg":1.4,"potassium_mg":24,"zinc_mg":0.015
}'::jsonb WHERE liquid_type = 'juice';

UPDATE public.hydration_beverage_database SET micros_per_oz = '{
  "vitamin_a_mcg":0,"vitamin_c_mg":0,"vitamin_d_mcg":0,"vitamin_e_mg":0,"vitamin_k_mcg":0.02,
  "vitamin_b6_mg":0.001,"vitamin_b12_mcg":0,"folate_mcg":0.3,"calcium_mg":0.7,"iron_mg":0.005,
  "magnesium_mg":0.9,"potassium_mg":14,"zinc_mg":0.005
}'::jsonb WHERE liquid_type = 'coffee';

UPDATE public.hydration_beverage_database SET micros_per_oz = '{
  "vitamin_a_mcg":0,"vitamin_c_mg":0,"vitamin_d_mcg":0,"vitamin_e_mg":0,"vitamin_k_mcg":0,
  "vitamin_b6_mg":0,"vitamin_b12_mcg":0,"folate_mcg":1.5,"calcium_mg":0,"iron_mg":0.005,
  "magnesium_mg":0.6,"potassium_mg":4,"zinc_mg":0
}'::jsonb WHERE liquid_type = 'tea';

UPDATE public.hydration_beverage_database SET micros_per_oz = '{
  "vitamin_a_mcg":0,"vitamin_c_mg":0,"vitamin_d_mcg":0,"vitamin_e_mg":0,"vitamin_k_mcg":0,
  "vitamin_b6_mg":0.005,"vitamin_b12_mcg":0.04,"folate_mcg":0.3,"calcium_mg":0.3,"iron_mg":0.03,
  "magnesium_mg":0.4,"potassium_mg":4,"zinc_mg":0.005
}'::jsonb WHERE liquid_type = 'sports_drink';

UPDATE public.hydration_beverage_database SET micros_per_oz = '{
  "vitamin_a_mcg":0,"vitamin_c_mg":0,"vitamin_d_mcg":0,"vitamin_e_mg":0,"vitamin_k_mcg":0,
  "vitamin_b6_mg":0,"vitamin_b12_mcg":0,"folate_mcg":0,"calcium_mg":0.6,"iron_mg":0.01,
  "magnesium_mg":0.3,"potassium_mg":0.3,"zinc_mg":0.005
}'::jsonb WHERE liquid_type = 'soda';

UPDATE public.hydration_beverage_database SET micros_per_oz = '{
  "vitamin_a_mcg":0,"vitamin_c_mg":0.3,"vitamin_d_mcg":0,"vitamin_e_mg":0,"vitamin_k_mcg":0.03,
  "vitamin_b6_mg":0.006,"vitamin_b12_mcg":0,"folate_mcg":0.9,"calcium_mg":7,"iron_mg":0.07,
  "magnesium_mg":7.5,"potassium_mg":75,"zinc_mg":0.03
}'::jsonb WHERE liquid_type = 'coconut_water';