-- Phase 3: Create meal_templates table for saving weekly meal plan templates
CREATE TABLE public.meal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  meals JSONB DEFAULT '[]'::jsonb,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meal_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meal_templates
CREATE POLICY "Users can view own meal templates"
  ON public.meal_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal templates"
  ON public.meal_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal templates"
  ON public.meal_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal templates"
  ON public.meal_templates FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all meal templates"
  ON public.meal_templates FOR SELECT
  USING (has_role(auth.uid(), 'owner'::app_role));

-- Add time_slot column to vault_meal_plans for calendar view
ALTER TABLE public.vault_meal_plans ADD COLUMN IF NOT EXISTS time_slot TEXT DEFAULT 'lunch';

-- Trigger for updated_at
CREATE TRIGGER update_meal_templates_updated_at
  BEFORE UPDATE ON public.meal_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 5: Create shopping_lists table
CREATE TABLE public.shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Shopping List',
  items JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  date_range_start DATE,
  date_range_end DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shopping_lists
CREATE POLICY "Users can view own shopping lists"
  ON public.shopping_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shopping lists"
  ON public.shopping_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shopping lists"
  ON public.shopping_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shopping lists"
  ON public.shopping_lists FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all shopping lists"
  ON public.shopping_lists FOR SELECT
  USING (has_role(auth.uid(), 'owner'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_shopping_lists_updated_at
  BEFORE UPDATE ON public.shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();