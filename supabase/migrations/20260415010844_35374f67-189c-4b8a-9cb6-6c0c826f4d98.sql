-- 1. Create mistake_type enum
CREATE TYPE public.mistake_type AS ENUM ('hesitation', 'misread', 'panic', 'over_aggressive');

-- 2. Add mistake_type column (nullable, only for mistake-difficulty scenarios)
ALTER TABLE public.baserunning_scenarios
  ADD COLUMN mistake_type public.mistake_type;

-- 3. Add answer_options jsonb column for stable ID-based matching
-- Format: [{"id": "a", "text": "Go now"}, {"id": "b", "text": "Hold"}, ...]
ALTER TABLE public.baserunning_scenarios
  ADD COLUMN answer_options jsonb;

-- 4. Add correct_answer_id to reference stable answer ID
ALTER TABLE public.baserunning_scenarios
  ADD COLUMN correct_answer_id text;