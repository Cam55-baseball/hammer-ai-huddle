
-- Phase 1: Database Foundation & Athlete Biometrics

-- ============================================
-- 1. Extend profiles table with biometric data
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sex text CHECK (sex IN ('male', 'female'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_inches numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activity_level text DEFAULT 'moderately_active' 
  CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'));

-- ============================================
-- 2. Create athlete_body_goals table
-- ============================================
CREATE TABLE IF NOT EXISTS athlete_body_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  goal_type text NOT NULL CHECK (goal_type IN ('lose_weight', 'gain_weight', 'lose_fat', 'gain_lean_muscle', 'maintain')),
  starting_weight_lbs numeric,
  target_weight_lbs numeric,
  target_body_fat_percent numeric,
  weekly_change_rate numeric DEFAULT 1,
  started_at timestamptz DEFAULT now(),
  target_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE athlete_body_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own body goals" ON athlete_body_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own body goals" ON athlete_body_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own body goals" ON athlete_body_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own body goals" ON athlete_body_goals
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all body goals" ON athlete_body_goals
  FOR SELECT USING (has_role(auth.uid(), 'owner'::app_role));

-- ============================================
-- 3. Create athlete_events table (game/training/rest days)
-- ============================================
CREATE TABLE IF NOT EXISTS athlete_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_date date NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('game', 'practice', 'training', 'rest', 'travel')),
  event_time time,
  intensity_level integer CHECK (intensity_level BETWEEN 1 AND 10),
  sport text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE athlete_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events" ON athlete_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON athlete_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON athlete_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON athlete_events
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all events" ON athlete_events
  FOR SELECT USING (has_role(auth.uid(), 'owner'::app_role));

-- ============================================
-- 4. Create vault_vitamin_logs table
-- ============================================
CREATE TABLE IF NOT EXISTS vault_vitamin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_date date DEFAULT CURRENT_DATE,
  vitamin_name text NOT NULL,
  dosage text,
  timing text CHECK (timing IN ('morning', 'with_breakfast', 'with_lunch', 'with_dinner', 'evening', 'before_bed')),
  taken_at timestamptz,
  taken boolean DEFAULT false,
  is_recurring boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vault_vitamin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vitamin logs" ON vault_vitamin_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vitamin logs" ON vault_vitamin_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vitamin logs" ON vault_vitamin_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vitamin logs" ON vault_vitamin_logs
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all vitamin logs" ON vault_vitamin_logs
  FOR SELECT USING (has_role(auth.uid(), 'owner'::app_role));

-- ============================================
-- 5. Create nutrition_food_database table
-- ============================================
CREATE TABLE IF NOT EXISTS nutrition_food_database (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE,
  name text NOT NULL,
  brand text,
  serving_size text,
  serving_size_grams numeric,
  calories_per_serving integer,
  protein_g numeric,
  carbs_g numeric,
  fats_g numeric,
  fiber_g numeric,
  sugar_g numeric,
  sodium_mg numeric,
  barcode text,
  source text CHECK (source IN ('usda', 'openfoodfacts', 'user_created')),
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE nutrition_food_database ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view the food database
CREATE POLICY "Authenticated users can view food database" ON nutrition_food_database
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can add their own custom foods
CREATE POLICY "Users can insert custom foods" ON nutrition_food_database
  FOR INSERT WITH CHECK (auth.uid() = created_by OR source IN ('usda', 'openfoodfacts'));

-- Users can update their own custom foods
CREATE POLICY "Users can update own custom foods" ON nutrition_food_database
  FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete their own custom foods
CREATE POLICY "Users can delete own custom foods" ON nutrition_food_database
  FOR DELETE USING (auth.uid() = created_by);

-- ============================================
-- 6. Create vault_meal_plans table
-- ============================================
CREATE TABLE IF NOT EXISTS vault_meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  planned_date date NOT NULL,
  meal_type text CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout', 'pre_game', 'post_game')),
  meal_name text,
  food_items jsonb DEFAULT '[]',
  estimated_calories integer,
  estimated_protein_g numeric,
  estimated_carbs_g numeric,
  estimated_fats_g numeric,
  notes text,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vault_meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal plans" ON vault_meal_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal plans" ON vault_meal_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal plans" ON vault_meal_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal plans" ON vault_meal_plans
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all meal plans" ON vault_meal_plans
  FOR SELECT USING (has_role(auth.uid(), 'owner'::app_role));

-- ============================================
-- 7. Create nutrition_meal_templates table
-- ============================================
CREATE TABLE IF NOT EXISTS nutrition_meal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  meal_type text,
  food_items jsonb DEFAULT '[]',
  total_calories integer,
  total_protein_g numeric,
  total_carbs_g numeric,
  total_fats_g numeric,
  prep_time_minutes integer,
  is_favorite boolean DEFAULT false,
  use_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE nutrition_meal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal templates" ON nutrition_meal_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal templates" ON nutrition_meal_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal templates" ON nutrition_meal_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal templates" ON nutrition_meal_templates
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all meal templates" ON nutrition_meal_templates
  FOR SELECT USING (has_role(auth.uid(), 'owner'::app_role));

-- ============================================
-- 8. Enhance nutrition_streaks table
-- ============================================
ALTER TABLE nutrition_streaks ADD COLUMN IF NOT EXISTS meal_logging_streak integer DEFAULT 0;
ALTER TABLE nutrition_streaks ADD COLUMN IF NOT EXISTS hydration_streak integer DEFAULT 0;
ALTER TABLE nutrition_streaks ADD COLUMN IF NOT EXISTS supplement_streak integer DEFAULT 0;
ALTER TABLE nutrition_streaks ADD COLUMN IF NOT EXISTS weekly_consistency_score numeric DEFAULT 0;
ALTER TABLE nutrition_streaks ADD COLUMN IF NOT EXISTS last_meal_log_date date;
ALTER TABLE nutrition_streaks ADD COLUMN IF NOT EXISTS last_hydration_date date;
ALTER TABLE nutrition_streaks ADD COLUMN IF NOT EXISTS last_supplement_date date;

-- ============================================
-- 9. Enhance vault_nutrition_goals table
-- ============================================
ALTER TABLE vault_nutrition_goals ADD COLUMN IF NOT EXISTS tdee_calculated integer;
ALTER TABLE vault_nutrition_goals ADD COLUMN IF NOT EXISTS goal_adjustment_percent numeric DEFAULT 0;
ALTER TABLE vault_nutrition_goals ADD COLUMN IF NOT EXISTS fiber_goal integer DEFAULT 30;
ALTER TABLE vault_nutrition_goals ADD COLUMN IF NOT EXISTS sugar_limit integer DEFAULT 50;
ALTER TABLE vault_nutrition_goals ADD COLUMN IF NOT EXISTS sodium_limit integer DEFAULT 2300;

-- ============================================
-- 10. Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_athlete_body_goals_user_id ON athlete_body_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_athlete_body_goals_active ON athlete_body_goals(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_athlete_events_user_date ON athlete_events(user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_vault_vitamin_logs_user_date ON vault_vitamin_logs(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_nutrition_food_database_name ON nutrition_food_database(name);
CREATE INDEX IF NOT EXISTS idx_nutrition_food_database_barcode ON nutrition_food_database(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vault_meal_plans_user_date ON vault_meal_plans(user_id, planned_date);
CREATE INDEX IF NOT EXISTS idx_nutrition_meal_templates_user ON nutrition_meal_templates(user_id);
