CREATE TABLE public.nutrition_suggestion_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nutrient_key text NOT NULL,
  food_name text NOT NULL,
  action text NOT NULL CHECK (action IN ('accepted', 'ignored', 'dismissed')),
  effectiveness_delta numeric,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.nutrition_suggestion_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own interactions" ON public.nutrition_suggestion_interactions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);